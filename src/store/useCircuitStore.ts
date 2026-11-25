import { create } from 'zustand';
import type { CircuitDoc, Component, Domain, Point, Viewport, Wire } from '../model/types';
import { cloneDoc, createComponent, createDoc, nextLabel, nextRotation } from '../model/factory';
import { defaultParams, getPart } from '../parts/registry';
import { getPinPosition } from '../parts/geometry';
import { createId } from '../lib/id';
import {
  deleteDoc,
  exportDocText,
  flushDocSave,
  loadDoc,
  parseDocText,
  saveDoc,
  scheduleDocSave,
} from '../lib/storage';

const MAX_HISTORY = 50;

interface CircuitState {
  doc: CircuitDoc | null;
  selection: string[];
  selectedWireId: string | null;
  past: CircuitDoc[];
  future: CircuitDoc[];
  transaction: CircuitDoc | null;
  transactionDirty: boolean;

  setDoc: (doc: CircuitDoc | null) => void;
  newDoc: (domain: Domain, name?: string) => void;
  openDoc: (id: string) => boolean;
  closeDoc: () => void;
  saveNow: () => void;

  beginTransaction: () => void;
  endTransaction: () => void;
  commit: (mutator: (doc: CircuitDoc) => void) => void;
  mutate: (mutator: (doc: CircuitDoc) => void) => void;

  addPart: (type: string, x: number, y: number) => Component | null;
  updateParam: (componentId: string, key: string, value: number | string) => void;
  setComponentState: (componentId: string, patch: Record<string, unknown>) => void;
  moveSelection: (dx: number, dy: number) => void;
  setViewport: (viewport: Viewport) => void;
  addWire: (points: Point[], from?: Wire['from'], to?: Wire['to']) => string | null;
  setWireLabel: (wireId: string, label: string) => void;
  deleteSelection: () => void;
  rotateSelection: (delta?: 90 | 270) => void;
  mirrorSelection: () => void;
  toggleSelect: (componentId: string, additive: boolean) => void;
  selectWire: (wireId: string | null) => void;
  clearSelection: () => void;
  undo: () => void;
  redo: () => void;
  importJson: (text: string) => boolean;
  exportJson: () => string | null;
  removeProject: (id: string) => void;
}

function syncAttachedWirePoints(doc: CircuitDoc): void {
  const componentMap = new Map(doc.components.map((component) => [component.id, component]));
  for (const wire of doc.wires) {
    if (!wire.from && !wire.to) continue;
    const points = [...wire.points];
    if (wire.from) {
      const component = componentMap.get(wire.from.componentId);
      const part = component ? getPart(component.type) : undefined;
      const position = component && part ? getPinPosition(component, part, wire.from.pinId) : undefined;
      if (position) points[0] = position;
    }
    if (wire.to) {
      const component = componentMap.get(wire.to.componentId);
      const part = component ? getPart(component.type) : undefined;
      const position = component && part ? getPinPosition(component, part, wire.to.pinId) : undefined;
      if (position) points[points.length - 1] = position;
    }
    wire.points = points;
  }
}

export const useCircuitStore = create<CircuitState>((set, get) => {
  const commit = (mutator: (doc: CircuitDoc) => void) => {
    const current = get().doc;
    if (!current) return;
    const next = cloneDoc(current);
    mutator(next);
    next.updatedAt = Date.now();
    set((state) => ({
      doc: next,
      past: [...state.past.slice(-(MAX_HISTORY - 1)), cloneDoc(current)],
      future: [],
    }));
    scheduleDocSave(next);
  };

  const mutate = (mutator: (doc: CircuitDoc) => void) => {
    const current = get().doc;
    if (!current) return;
    const next = cloneDoc(current);
    mutator(next);
    next.updatedAt = Date.now();
    set((state) => ({
      doc: next,
      transactionDirty: state.transactionDirty || Boolean(state.transaction),
    }));
    if (!get().transaction) scheduleDocSave(next);
  };

  return {
    doc: null,
    selection: [],
    selectedWireId: null,
    past: [],
    future: [],
    transaction: null,
    transactionDirty: false,

    setDoc: (doc) => set({ doc, selection: [], selectedWireId: null, past: [], future: [] }),

    newDoc: (domain, name) => {
      const doc = createDoc(domain, name ?? defaultDocName(domain));
      saveDoc(doc);
      set({ doc, selection: [], selectedWireId: null, past: [], future: [], transaction: null });
    },

    openDoc: (id) => {
      const doc = loadDoc(id);
      if (!doc) return false;
      set({ doc, selection: [], selectedWireId: null, past: [], future: [], transaction: null });
      return true;
    },

    closeDoc: () => {
      flushDocSave();
      set({ doc: null, selection: [], selectedWireId: null, past: [], future: [], transaction: null });
    },

    saveNow: () => {
      const doc = get().doc;
      if (doc) saveDoc(doc);
    },

    beginTransaction: () => {
      const doc = get().doc;
      if (!doc) return;
      set({ transaction: cloneDoc(doc), transactionDirty: false });
    },

    endTransaction: () => {
      const { transaction, transactionDirty, doc } = get();
      if (!transaction) return;
      if (transactionDirty && doc) {
        set((state) => ({
          past: [...state.past.slice(-(MAX_HISTORY - 1)), transaction],
          future: [],
          transaction: null,
          transactionDirty: false,
        }));
        scheduleDocSave(doc);
      } else {
        set({ transaction: null, transactionDirty: false });
      }
    },

    commit,
    mutate,

    addPart: (type, x, y) => {
      const part = getPart(type);
      const doc = get().doc;
      if (!part || !doc) return null;
      const component = createComponent(type, x, y, nextLabel(doc.components, part.refPrefix), defaultParams(part));
      commit((draft) => {
        draft.components.push(component);
      });
      set({ selection: [component.id], selectedWireId: null });
      return component;
    },

    updateParam: (componentId, key, value) => {
      commit((draft) => {
        const component = draft.components.find((entry) => entry.id === componentId);
        if (component) component.params[key] = value;
      });
    },

    setComponentState: (componentId, patch) => {
      commit((draft) => {
        const component = draft.components.find((entry) => entry.id === componentId);
        if (component) component.state = { ...(component.state ?? {}), ...patch };
      });
    },

    moveSelection: (dx, dy) => {
      const selection = new Set(get().selection);
      if (selection.size === 0 || (dx === 0 && dy === 0)) return;
      mutate((draft) => {
        for (const component of draft.components) {
          if (selection.has(component.id)) {
            component.x += dx;
            component.y += dy;
          }
        }
        syncAttachedWirePoints(draft);
      });
    },

    setViewport: (viewport) => {
      mutate((draft) => {
        draft.viewport = viewport;
      });
    },

    addWire: (points, from, to) => {
      const doc = get().doc;
      if (!doc || points.length < 2) return null;
      const wire: Wire = {
        id: createId('wire'),
        points,
        from,
        to,
      };
      commit((draft) => {
        draft.wires.push(wire);
      });
      return wire.id;
    },

    setWireLabel: (wireId, label) => {
      commit((draft) => {
        const wire = draft.wires.find((entry) => entry.id === wireId);
        if (wire) wire.netLabel = label.trim() || undefined;
      });
    },

    deleteSelection: () => {
      const { selection, selectedWireId } = get();
      if (selection.length === 0 && !selectedWireId) return;
      const ids = new Set(selection);
      commit((draft) => {
        draft.components = draft.components.filter((component) => !ids.has(component.id));
        draft.wires = draft.wires.filter((wire) => {
          if (wire.id === selectedWireId) return false;
          if (wire.from && ids.has(wire.from.componentId)) return false;
          if (wire.to && ids.has(wire.to.componentId)) return false;
          return true;
        });
      });
      set({ selection: [], selectedWireId: null });
    },

    rotateSelection: (delta = 90) => {
      const selection = new Set(get().selection);
      if (selection.size === 0) return;
      commit((draft) => {
        for (const component of draft.components) {
          if (selection.has(component.id)) component.rot = nextRotation(component.rot, delta);
        }
        syncAttachedWirePoints(draft);
      });
    },

    mirrorSelection: () => {
      const selection = new Set(get().selection);
      if (selection.size === 0) return;
      commit((draft) => {
        for (const component of draft.components) {
          if (selection.has(component.id)) component.mirror = !component.mirror;
        }
        syncAttachedWirePoints(draft);
      });
    },

    toggleSelect: (componentId, additive) => {
      const { selection } = get();
      if (!additive) {
        set({ selection: [componentId], selectedWireId: null });
        return;
      }
      if (selection.includes(componentId)) {
        set({ selection: selection.filter((id) => id !== componentId) });
      } else {
        set({ selection: [...selection, componentId], selectedWireId: null });
      }
    },

    selectWire: (wireId) => set({ selectedWireId: wireId, selection: wireId ? [] : get().selection }),

    clearSelection: () => set({ selection: [], selectedWireId: null }),

    undo: () => {
      const { past, doc } = get();
      if (!doc || past.length === 0) return;
      const previous = past[past.length - 1];
      set((state) => ({
        doc: previous,
        past: state.past.slice(0, -1),
        future: [cloneDoc(doc), ...state.future].slice(0, MAX_HISTORY),
        selection: state.selection.filter((id) => previous.components.some((component) => component.id === id)),
        selectedWireId: state.selectedWireId && previous.wires.some((wire) => wire.id === state.selectedWireId) ? state.selectedWireId : null,
      }));
      scheduleDocSave(previous);
    },

    redo: () => {
      const { future, doc } = get();
      if (!doc || future.length === 0) return;
      const next = future[0];
      set((state) => ({
        doc: next,
        past: [...state.past, cloneDoc(doc)].slice(-MAX_HISTORY),
        future: state.future.slice(1),
        selection: state.selection.filter((id) => next.components.some((component) => component.id === id)),
        selectedWireId: state.selectedWireId && next.wires.some((wire) => wire.id === state.selectedWireId) ? state.selectedWireId : null,
      }));
      scheduleDocSave(next);
    },

    importJson: (text) => {
      const doc = parseDocText(text);
      if (!doc) return false;
      saveDoc(doc);
      set({ doc, selection: [], selectedWireId: null, past: [], future: [], transaction: null });
      return true;
    },

    exportJson: () => {
      const doc = get().doc;
      return doc ? exportDocText(doc) : null;
    },

    removeProject: (id) => {
      deleteDoc(id);
      const current = get().doc;
      if (current?.id === id) {
        set({ doc: null, selection: [], selectedWireId: null, past: [], future: [], transaction: null });
      }
    },
  };
});

function defaultDocName(domain: Domain): string {
  const names: Record<Domain, string> = {
    digital: '未命名数电工程',
    analog: '未命名模电工程',
    power: '未命名电力电子工程',
    mcs51: '未命名 51 工程',
    stm32: '未命名 STM32 工程',
  };
  return names[domain];
}
