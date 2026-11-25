import type { Component, CircuitDoc, PinRef, Point, Wire } from '../model/types';
import { getPart } from '../parts/registry';
import { getPinPosition } from '../parts/geometry';
import { pointOnSegment } from '../lib/geometry';

class DisjointSet {
  private parent = new Map<string, string>();

  add(node: string): void {
    if (!this.parent.has(node)) this.parent.set(node, node);
  }

  find(node: string): string {
    this.add(node);
    let root = node;
    while (this.parent.get(root) !== root) {
      root = this.parent.get(root) as string;
    }
    let current = node;
    while (this.parent.get(current) !== root) {
      const next = this.parent.get(current) as string;
      this.parent.set(current, root);
      current = next;
    }
    return root;
  }

  union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.parent.set(rootB, rootA);
  }
}

export interface NetlistPin {
  ref: string;
  componentId: string;
  componentLabel: string;
  componentType: string;
  pinId: string;
  pinName: string;
  pinNumber?: string;
  direction?: string;
  position?: Point;
}

export interface Net {
  id: string;
  name: string;
  pins: NetlistPin[];
  powerNames: string[];
  labels: string[];
  hasWire: boolean;
}

export interface Netlist {
  nets: Net[];
  pinNet: Map<string, string>;
  unconnected: NetlistPin[];
}

export function pinKey(ref: PinRef): string {
  return `${ref.componentId}.${ref.pinId}`;
}

function powerNameOf(component: Component): string | null {
  if (component.type === 'gnd') return 'GND';
  if (component.type === 'vcc') {
    const label = component.params.label;
    return typeof label === 'string' && label.trim() ? label.trim() : 'VCC';
  }
  return null;
}

const pinSortKey = (pin: NetlistPin): string =>
  `${pin.componentLabel}|${pin.pinNumber ?? pin.pinId}|${pin.componentId}|${pin.pinId}`;

function makeNetlistPin(component: Component, pinId: string, pinName: string, pinNumber?: string, direction?: string): NetlistPin | null {
  const part = getPart(component.type);
  if (!part) return null;
  const position = getPinPosition(component, part, pinId);
  return {
    ref: `${component.label}.${pinId}`,
    componentId: component.id,
    componentLabel: component.label,
    componentType: component.type,
    pinId,
    pinName,
    pinNumber,
    direction,
    position,
  };
}

function wireTouchesPin(wire: Wire, point: Point, tolerance: number): boolean {
  const points = wire.points;
  if (points.length === 0) return false;
  if (Math.hypot(points[0].x - point.x, points[0].y - point.y) <= tolerance) return true;
  const last = points[points.length - 1];
  if (Math.hypot(last.x - point.x, last.y - point.y) <= tolerance) return true;
  for (let i = 1; i < points.length; i++) {
    if (pointOnSegment(point, points[i - 1], points[i], tolerance)) return true;
  }
  return false;
}

function wiresTouch(a: Wire, b: Wire, tolerance: number): boolean {
  const endpointsA = [a.points[0], a.points[a.points.length - 1]].filter(Boolean);
  const endpointsB = [b.points[0], b.points[b.points.length - 1]].filter(Boolean);
  for (const point of endpointsA) {
    if (wireTouchesPin(b, point, tolerance)) return true;
  }
  for (const point of endpointsB) {
    if (wireTouchesPin(a, point, tolerance)) return true;
  }
  return false;
}

export function buildNetlist(doc: CircuitDoc, tolerance = 4): Netlist {
  const uf = new DisjointSet();
  const components = new Map<string, Component>(doc.components.map((component) => [component.id, component]));
  const pinNodes: Array<{ node: string; pin: NetlistPin }> = [];

  for (const component of doc.components) {
    const part = getPart(component.type);
    if (!part) continue;
    for (const pin of part.pins) {
      const netPin = makeNetlistPin(component, pin.id, pin.name, pin.number, pin.direction);
      if (!netPin) continue;
      const node = `pin:${component.id}:${pin.id}`;
      uf.add(node);
      pinNodes.push({ node, pin: netPin });
    }
  }

  for (const wire of doc.wires) {
    uf.add(`wire:${wire.id}`);
  }

  for (let i = 0; i < doc.wires.length; i++) {
    for (let j = i + 1; j < doc.wires.length; j++) {
      if (wiresTouch(doc.wires[i], doc.wires[j], tolerance)) {
        uf.union(`wire:${doc.wires[i].id}`, `wire:${doc.wires[j].id}`);
      }
    }
  }

  for (const entry of pinNodes) {
    if (!entry.pin.position) continue;
    for (const wire of doc.wires) {
      if (wireTouchesPin(wire, entry.pin.position, tolerance)) {
        uf.union(entry.node, `wire:${wire.id}`);
      }
    }
  }

  interface Group {
    root: string;
    pins: NetlistPin[];
    wires: Wire[];
    powerNames: string[];
    labels: string[];
  }

  const groups = new Map<string, Group>();
  const ensureGroup = (root: string): Group => {
    let group = groups.get(root);
    if (!group) {
      group = { root, pins: [], wires: [], powerNames: [], labels: [] };
      groups.set(root, group);
    }
    return group;
  };

  for (const entry of pinNodes) {
    const group = ensureGroup(uf.find(entry.node));
    group.pins.push(entry.pin);
    const component = components.get(entry.pin.componentId);
    if (component) {
      const powerName = powerNameOf(component);
      if (powerName && !group.powerNames.includes(powerName)) group.powerNames.push(powerName);
    }
  }

  for (const wire of doc.wires) {
    const group = ensureGroup(uf.find(`wire:${wire.id}`));
    group.wires.push(wire);
    if (wire.netLabel && wire.netLabel.trim() && !group.labels.includes(wire.netLabel.trim())) {
      group.labels.push(wire.netLabel.trim());
    }
  }

  // 同一电源名的分组视为全局网络，合并
  const powerRoots = new Map<string, string>();
  const remap = new Map<string, string>();
  for (const group of groups.values()) {
    for (const powerName of group.powerNames) {
      const existing = powerRoots.get(powerName);
      if (existing) {
        remap.set(group.root, existing);
        const target = groups.get(existing);
        const source = groups.get(group.root);
        if (target && source) {
          target.pins.push(...source.pins);
          target.wires.push(...source.wires);
          target.labels.push(...source.labels);
        }
      } else {
        powerRoots.set(powerName, group.root);
      }
    }
  }
  const resolveRoot = (root: string): string => {
    let current = root;
    while (remap.has(current)) current = remap.get(current) as string;
    return current;
  };

  const merged = new Map<string, Group>();
  for (const group of groups.values()) {
    const root = resolveRoot(group.root);
    if (root !== group.root && merged.has(root)) continue;
    let target = merged.get(root);
    if (!target) {
      target = { root, pins: [], wires: [], powerNames: [], labels: [] };
      merged.set(root, target);
    }
    for (const pin of group.pins) {
      if (!target.pins.some((existing) => existing.componentId === pin.componentId && existing.pinId === pin.pinId)) {
        target.pins.push(pin);
      }
    }
    target.wires.push(...group.wires);
    for (const powerName of group.powerNames) {
      if (!target.powerNames.includes(powerName)) target.powerNames.push(powerName);
    }
    for (const label of group.labels) {
      if (!target.labels.includes(label)) target.labels.push(label);
    }
  }

  const sortedGroups = [...merged.values()].sort((a, b) => {
    const aKey = a.pins.map(pinSortKey).sort()[0] ?? '~';
    const bKey = b.pins.map(pinSortKey).sort()[0] ?? '~';
    return aKey.localeCompare(bKey);
  });

  const nets: Net[] = [];
  const pinNet = new Map<string, string>();
  const unconnected: NetlistPin[] = [];
  let autoIndex = 1;

  const powerPriority = (names: string[]): number => {
    if (names.includes('GND')) return 0;
    if (names.length > 0) return 1;
    return 2;
  };

  sortedGroups.sort((a, b) => powerPriority(a.powerNames) - powerPriority(b.powerNames));

  for (const group of sortedGroups) {
    const pins = group.pins.sort((a, b) => pinSortKey(a).localeCompare(pinSortKey(b)));
    if (pins.length === 0 && group.wires.length === 0) continue;
    if (pins.length === 1 && group.wires.length === 0) {
      unconnected.push(pins[0]);
      continue;
    }
    let name: string;
    if (group.labels.length > 0) name = group.labels[0];
    else if (group.powerNames.length > 0) name = group.powerNames[0];
    else name = `N${autoIndex++}`;

    const net: Net = {
      id: name,
      name,
      pins,
      powerNames: group.powerNames,
      labels: group.labels,
      hasWire: group.wires.length > 0,
    };
    nets.push(net);
    for (const pin of pins) pinNet.set(`${pin.componentId}.${pin.pinId}`, net.id);
  }

  return { nets, pinNet, unconnected };
}

export function netNameForPin(netlist: Netlist, ref: PinRef): string | undefined {
  return netlist.pinNet.get(pinKey(ref));
}

export function collectJunctions(doc: CircuitDoc): Point[] {
  const counts = new Map<string, { point: Point; count: number }>();
  for (const wire of doc.wires) {
    for (const point of [wire.points[0], wire.points[wire.points.length - 1]]) {
      if (!point) continue;
      const key = `${Math.round(point.x)}:${Math.round(point.y)}`;
      const entry = counts.get(key);
      if (entry) entry.count++;
      else counts.set(key, { point, count: 1 });
    }
  }
  return [...counts.values()].filter((entry) => entry.count >= 3).map((entry) => entry.point);
}

export function netColor(name: string | undefined): string {
  if (!name) return 'var(--wire)';
  if (name === 'GND') return 'var(--muted)';
  if (name === 'VCC' || name === '3V3' || name === '5V') return 'var(--red)';
  return 'var(--wire)';
}
