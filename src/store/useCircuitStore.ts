import { create } from 'zustand';
import type { CircuitDoc, Domain, PinRef, Point, Wire } from '../model/types';
import { getPart } from '../parts/registry';
import { uid } from '../lib/id';
import { loadLastDoc, scheduleSave } from '../lib/storage';
import { EXAMPLE_BUILDERS, blankDoc } from '../examples';
import { forceWireEndpoints, reanchorWires, syncJoinedWires } from '../lib/wires';

export type Tool = 'select' | 'wire';

const HISTORY_LIMIT = 50;

const clone = (doc: CircuitDoc): CircuitDoc => structuredClone(doc);

interface Selection {
  components: string[];
  wires: string[];
}

interface CircuitState {
  doc: CircuitDoc;
  selection: Selection;
  tool: Tool;
  past: CircuitDoc[];
  future: CircuitDoc[];
  loadDomain: (domain: Domain, doc?: CircuitDoc) => void;
  setDoc: (doc: CircuitDoc) => void;
  loadExample: (domain: Domain) => void;
  createBlank: (domain: Domain) => void;
  renameProject: (name: string) => void;
  addComponent: (type: string, x: number, y: number) => string | null;
  updateComponent: (id: string, patch: Partial<CircuitDoc['components'][number]>) => void;
  setParam: (id: string, key: string, value: number | string) => void;
  renameComponent: (id: string, label: string) => void;
  toggleState: (id: string, key: string, value?: unknown) => void;
  beginHistory: () => void;
  moveComponents: (ids: string[], dx: number, dy: number) => void;
  rotateSelection: () => void;
  mirrorSelection: () => void;
  deleteSelection: () => void;
  addWire: (from: PinRef, to: PinRef, points: Point[], netLabel?: string) => void;
  addWireToWire: (from: PinRef, targetWireId: string, points: Point[], netLabel?: string) => void;
  updateWirePoints: (id: string, points: Point[]) => void;
  setTool: (tool: Tool) => void;
  selectComponent: (id: string, additive?: boolean) => void;
  selectWire: (id: string, additive?: boolean) => void;
  selectComponents: (ids: string[]) => void;
  clearSelection: () => void;
  setViewport: (viewport: CircuitDoc['viewport']) => void;
  setFirmware: (firmware: CircuitDoc['firmware']) => void;
  undo: () => void;
  redo: () => void;
  touch: () => void;
}

const initialDoc = EXAMPLE_BUILDERS.digital();

export const useCircuitStore = create<CircuitState>()((set, get) => ({
  doc: initialDoc,
  selection: { components: [], wires: [] },
  tool: 'select',
  past: [],
  future: [],

  loadDomain: (domain, doc) => {
    const next = doc ?? loadLastDoc(domain) ?? EXAMPLE_BUILDERS[domain]();
    set({
      doc: next,
      selection: { components: [], wires: [] },
      tool: 'select',
      past: [],
      future: [],
    });
    scheduleSave(next);
  },

  setDoc: (doc) => {
    set({ doc, past: [], future: [], selection: { components: [], wires: [] } });
    scheduleSave(doc);
  },

  loadExample: (domain) => {
    const next = EXAMPLE_BUILDERS[domain]();
    set({
      doc: next,
      selection: { components: [], wires: [] },
      tool: 'select',
      past: [],
      future: [],
    });
    scheduleSave(next);
  },

  createBlank: (domain) => {
    const next = blankDoc(domain);
    set({
      doc: next,
      selection: { components: [], wires: [] },
      tool: 'select',
      past: [],
      future: [],
    });
    scheduleSave(next);
  },

  renameProject: (name) => {
    const { doc } = get();
    const next = { ...doc, name, updatedAt: Date.now() };
    set({ doc: next });
    scheduleSave(next);
  },

  addComponent: (type, x, y) => {
    const part = getPart(type);
    if (!part) return null;
    const { doc } = get();
    let index = 1;
    const labels = new Set(doc.components.map((c) => c.label));
    while (labels.has(`${part.prefix}${index}`)) index += 1;
    const id = uid('cmp');
    const component = {
      id,
      type,
      x,
      y,
      rot: 0 as const,
      mirror: false,
      label: `${part.prefix}${index}`,
      params: { ...part.defaults },
    };
    const next = {
      ...doc,
      components: [...doc.components, component],
      updatedAt: Date.now(),
    };
    set({
      doc: next,
      past: [...get().past, clone(doc)].slice(-HISTORY_LIMIT),
      future: [],
      selection: { components: [id], wires: [] },
    });
    scheduleSave(next);
    return id;
  },

  updateComponent: (id, patch) => {
    const { doc } = get();
    const next = {
      ...doc,
      components: doc.components.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      updatedAt: Date.now(),
    };
    set({ doc: next, past: [...get().past, clone(doc)].slice(-HISTORY_LIMIT), future: [] });
    scheduleSave(next);
  },

  setParam: (id, key, value) => {
    const { doc } = get();
    const next = {
      ...doc,
      components: doc.components.map((c) =>
        c.id === id ? { ...c, params: { ...c.params, [key]: value } } : c,
      ),
      updatedAt: Date.now(),
    };
    set({ doc: next, past: [...get().past, clone(doc)].slice(-HISTORY_LIMIT), future: [] });
    scheduleSave(next);
  },

  renameComponent: (id, label) => {
    const { doc } = get();
    const next = {
      ...doc,
      components: doc.components.map((c) => (c.id === id ? { ...c, label } : c)),
      updatedAt: Date.now(),
    };
    set({ doc: next });
    scheduleSave(next);
  },

  toggleState: (id, key, value) => {
    const { doc } = get();
    const next = {
      ...doc,
      components: doc.components.map((c) => {
        if (c.id !== id) return c;
        const state = { ...(c.state ?? {}) };
        state[key] = value === undefined ? !state[key] : value;
        return { ...c, state };
      }),
      updatedAt: Date.now(),
    };
    set({ doc: next });
    scheduleSave(next);
  },

  beginHistory: () => {
    const { doc, past } = get();
    set({ past: [...past, clone(doc)].slice(-HISTORY_LIMIT), future: [] });
  },

  moveComponents: (ids, dx, dy) => {
    if (ids.length === 0 || (dx === 0 && dy === 0)) return;
    const { doc } = get();
    const moved = new Set(ids);
    const components = doc.components.map((c) =>
      moved.has(c.id) ? { ...c, x: Math.round(c.x + dx), y: Math.round(c.y + dy) } : c,
    );
    const wires = syncJoinedWires(reanchorWires(doc.wires, components, moved));
    const next = {
      ...doc,
      components,
      wires,
      updatedAt: Date.now(),
    };
    set({ doc: next });
    scheduleSave(next);
  },

  rotateSelection: () => {
    const { doc, selection } = get();
    if (selection.components.length === 0) return;
    const moved = new Set(selection.components);
    const components = doc.components.map((c) =>
      moved.has(c.id)
        ? { ...c, rot: (((c.rot + 90) % 360) as CircuitDoc['components'][number]['rot']) }
        : c,
    );
    const next = {
      ...doc,
      components,
      wires: syncJoinedWires(reanchorWires(doc.wires, components, moved)),
      updatedAt: Date.now(),
    };
    set({ doc: next, past: [...get().past, clone(doc)].slice(-HISTORY_LIMIT), future: [] });
    scheduleSave(next);
  },

  mirrorSelection: () => {
    const { doc, selection } = get();
    if (selection.components.length === 0) return;
    const moved = new Set(selection.components);
    const components = doc.components.map((c) =>
      moved.has(c.id) ? { ...c, mirror: !c.mirror } : c,
    );
    const next = {
      ...doc,
      components,
      wires: syncJoinedWires(reanchorWires(doc.wires, components, moved)),
      updatedAt: Date.now(),
    };
    set({ doc: next, past: [...get().past, clone(doc)].slice(-HISTORY_LIMIT), future: [] });
    scheduleSave(next);
  },

  deleteSelection: () => {
    const { doc, selection } = get();
    if (selection.components.length === 0 && selection.wires.length === 0) return;
    const comps = new Set(selection.components);
    const selectedWires = new Set(selection.wires);
    const removedWires = new Set(
      doc.wires
        .filter(
          (w) =>
            selectedWires.has(w.id) ||
            (w.from && comps.has(w.from.componentId)) ||
            (w.to && comps.has(w.to.componentId)),
        )
        .map((w) => w.id),
    );
    const next: CircuitDoc = {
      ...doc,
      components: doc.components.filter((c) => !comps.has(c.id)),
      wires: doc.wires
        .filter((w) => !removedWires.has(w.id))
        .map((w) => (w.join && removedWires.has(w.join.wireId) ? { ...w, join: undefined } : w)),
      updatedAt: Date.now(),
    };
    set({
      doc: next,
      past: [...get().past, clone(doc)].slice(-HISTORY_LIMIT),
      future: [],
      selection: { components: [], wires: [] },
    });
    scheduleSave(next);
  },

  addWire: (from, to, points, netLabel) => {
    const { doc } = get();
    if (from.componentId === to.componentId && from.pinId === to.pinId) return;
    const exists = doc.wires.some(
      (w) =>
        w.from &&
        w.to &&
        ((w.from.componentId === from.componentId &&
          w.from.pinId === from.pinId &&
          w.to.componentId === to.componentId &&
          w.to.pinId === to.pinId) ||
          (w.to.componentId === from.componentId &&
            w.to.pinId === from.pinId &&
            w.from.componentId === to.componentId &&
            w.from.pinId === to.pinId)),
    );
    if (exists) return;
    const wire: Wire = { id: uid('wire'), points, from, to, netLabel };
    const next = { ...doc, wires: [...doc.wires, wire], updatedAt: Date.now() };
    set({
      doc: next,
      past: [...get().past, clone(doc)].slice(-HISTORY_LIMIT),
      future: [],
      selection: { components: [], wires: [wire.id] },
    });
    scheduleSave(next);
  },

  addWireToWire: (from, targetWireId, points, netLabel) => {
    const { doc } = get();
    const target = doc.wires.find((w) => w.id === targetWireId);
    if (!target || points.length < 2) return;
    const exists = doc.wires.some(
      (w) =>
        w.join?.wireId === targetWireId &&
        w.from?.componentId === from.componentId &&
        w.from?.pinId === from.pinId,
    );
    if (exists) return;
    const draft: Wire = {
      id: '__new',
      points: points.map((p) => ({ ...p })),
      from,
      join: { wireId: targetWireId },
      netLabel,
    };
    const snapped = syncJoinedWires([...doc.wires, draft]).find((w) => w.id === '__new') ?? draft;
    const wire: Wire = {
      ...snapped,
      id: uid('wire'),
      points: forceWireEndpoints([snapped], doc.components)[0].points,
    };
    const next = { ...doc, wires: [...doc.wires, wire], updatedAt: Date.now() };
    set({
      doc: next,
      past: [...get().past, clone(doc)].slice(-HISTORY_LIMIT),
      future: [],
      selection: { components: [], wires: [wire.id] },
    });
    scheduleSave(next);
  },

  updateWirePoints: (id, points) => {
    const { doc } = get();
    const wire = doc.wires.find((w) => w.id === id);
    if (!wire || points.length < 2) return;
    const updated = forceWireEndpoints(
      [{ ...wire, points: points.map((p) => ({ ...p })) }],
      doc.components,
    )[0];
    let wires = syncJoinedWires(doc.wires.map((w) => (w.id === id ? updated : w)));
    wires = forceWireEndpoints(wires, doc.components);
    const next = { ...doc, wires, updatedAt: Date.now() };
    set({ doc: next });
    scheduleSave(next);
  },

  setTool: (tool) => set({ tool }),

  selectComponent: (id, additive = false) => {
    const { selection } = get();
    if (additive) {
      const exists = selection.components.includes(id);
      set({
        selection: {
          components: exists
            ? selection.components.filter((x) => x !== id)
            : [...selection.components, id],
          wires: [],
        },
      });
    } else {
      set({ selection: { components: [id], wires: [] } });
    }
  },

  selectWire: (id, additive = false) => {
    const { selection } = get();
    if (additive) {
      const exists = selection.wires.includes(id);
      set({
        selection: {
          components: [],
          wires: exists ? selection.wires.filter((x) => x !== id) : [...selection.wires, id],
        },
      });
    } else {
      set({ selection: { components: [], wires: [id] } });
    }
  },

  selectComponents: (ids) => set({ selection: { components: ids, wires: [] } }),

  clearSelection: () => set({ selection: { components: [], wires: [] } }),

  setViewport: (viewport) => {
    const { doc } = get();
    const next = { ...doc, viewport };
    set({ doc: next });
    scheduleSave(next);
  },

  setFirmware: (firmware) => {
    const { doc } = get();
    const next = { ...doc, firmware, updatedAt: Date.now() };
    set({ doc: next });
    scheduleSave(next);
  },

  undo: () => {
    const { past, future, doc } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    set({
      doc: previous,
      past: past.slice(0, -1),
      future: [clone(doc), ...future].slice(0, HISTORY_LIMIT),
      selection: { components: [], wires: [] },
    });
    scheduleSave(previous);
  },

  redo: () => {
    const { past, future, doc } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      doc: next,
      past: [...past, clone(doc)].slice(-HISTORY_LIMIT),
      future: future.slice(1),
      selection: { components: [], wires: [] },
    });
    scheduleSave(next);
  },

  touch: () => {
    const { doc } = get();
    const next = { ...doc, updatedAt: Date.now() };
    set({ doc: next });
    scheduleSave(next);
  },
}));
