import type { CircuitDoc, PinRef, Wire } from '../model/types';
import { getPart } from '../parts/registry';
import { pinKey } from './geometry';

export interface Net {
  id: string;
  name: string;
  kind: 'power' | 'ground' | 'labeled' | 'auto';
  pins: PinRef[];
  label?: string;
}

export interface Netlist {
  nets: Net[];
  pinToNet: Map<string, string>;
  netByName: Map<string, Net>;
  /** 未连接任何导线的引脚 */
  unconnected: PinRef[];
}

class UnionFind {
  private parent = new Map<string, string>();

  find(k: string): string {
    let p = this.parent.get(k);
    if (p === undefined) {
      this.parent.set(k, k);
      return k;
    }
    if (p === k) return k;
    const root = this.find(p);
    this.parent.set(k, root);
    return root;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(rb, ra);
  }
}

function wireEnds(w: Wire): PinRef[] {
  const ends: PinRef[] = [];
  if (w.from) ends.push(w.from);
  if (w.to) ends.push(w.to);
  return ends;
}

export function buildNetlist(doc: CircuitDoc): Netlist {
  const uf = new UnionFind();
  const validPins = new Set<string>();

  for (const comp of doc.components) {
    const part = getPart(comp.type);
    if (!part) continue;
    for (const pin of part.pins) validPins.add(pinKey(comp.id, pin.id));
  }

  const valid = (r: PinRef | undefined): r is PinRef =>
    !!r && validPins.has(pinKey(r.comp, r.pin));

  for (const w of doc.wires) {
    const ends = wireEnds(w).filter(valid);
    for (let i = 1; i < ends.length; i++) {
      uf.union(pinKey(ends[0].comp, ends[0].pin), pinKey(ends[i].comp, ends[i].pin));
    }
  }

  // 相同网络标签的导线合并
  const byLabel = new Map<string, string>();
  for (const w of doc.wires) {
    if (!w.netLabel) continue;
    const ends = wireEnds(w).filter(valid);
    if (!ends.length) continue;
    const key = pinKey(ends[0].comp, ends[0].pin);
    const first = byLabel.get(w.netLabel);
    if (first) uf.union(first, key);
    else byLabel.set(w.netLabel, key);
  }

  const groups = new Map<string, PinRef[]>();
  for (const key of validPins) {
    const root = uf.find(key);
    const idx = key.indexOf('|');
    const ref = { comp: key.slice(0, idx), pin: key.slice(idx + 1) };
    const arr = groups.get(root);
    if (arr) arr.push(ref);
    else groups.set(root, [ref]);
  }

  // 只保留至少有一次导线连接的组
  const connectedRoots = new Set<string>();
  for (const w of doc.wires) {
    const ends = wireEnds(w).filter(valid);
    for (const e of ends) connectedRoots.add(uf.find(pinKey(e.comp, e.pin)));
  }
  for (const label of byLabel.keys()) {
    const first = byLabel.get(label)!;
    connectedRoots.add(uf.find(first));
  }

  const compById = new Map(doc.components.map((c) => [c.id, c]));
  const labelByPin = new Map<string, string>();
  for (const w of doc.wires) {
    if (!w.netLabel) continue;
    for (const e of wireEnds(w).filter(valid)) {
      labelByPin.set(pinKey(e.comp, e.pin), w.netLabel);
    }
  }

  const drafts: { root: string; refs: PinRef[]; priority: number; name: string; kind: Net['kind']; label?: string }[] = [];
  for (const root of connectedRoots) {
    const refs = (groups.get(root) ?? []).slice().sort(comparePin);
    if (!refs.length) continue;

    // 命名优先级：用户标签 > 电源符号 > 自动
    let label: string | undefined;
    for (const ref of refs) {
      const l = labelByPin.get(pinKey(ref.comp, ref.pin));
      if (l && (!label || l < label)) label = l;
    }
    const powerTypes = new Set<string>();
    for (const ref of refs) {
      const comp = compById.get(ref.comp);
      if (!comp) continue;
      if (comp.type === 'VCC' || comp.type === 'GND') powerTypes.add(comp.type);
    }

    let name: string;
    let kind: Net['kind'];
    let priority: number;
    if (label) {
      name = label;
      kind = 'labeled';
      priority = 0;
    } else if (powerTypes.has('VCC')) {
      name = 'VCC';
      kind = 'power';
      priority = 1;
    } else if (powerTypes.has('GND')) {
      name = 'GND';
      kind = 'ground';
      priority = 1;
    } else {
      name = '';
      kind = 'auto';
      priority = 2;
    }
    drafts.push({ root, refs, priority, name, kind, label });
  }

  drafts.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.name !== b.name) return a.name.localeCompare(b.name, 'zh-CN');
    return comparePin(a.refs[0], b.refs[0]);
  });

  let autoIndex = 1;
  const names = new Set<string>();
  const nets: Net[] = [];
  const pinToNet = new Map<string, string>();
  const netByName = new Map<string, Net>();

  for (const d of drafts) {
    let name = d.name;
    if (!name) {
      while (names.has(`N${autoIndex}`)) autoIndex++;
      name = `N${autoIndex++}`;
    }
    while (names.has(name)) name = `${name}_${autoIndex++}`;
    names.add(name);
    const net: Net = {
      id: name,
      name,
      kind: d.kind,
      pins: d.refs,
      label: d.label,
    };
    nets.push(net);
    netByName.set(name, net);
    for (const ref of d.refs) pinToNet.set(pinKey(ref.comp, ref.pin), name);
  }

  const unconnected: PinRef[] = [];
  for (const comp of doc.components) {
    const part = getPart(comp.type);
    if (!part) continue;
    for (const pin of part.pins) {
      const key = pinKey(comp.id, pin.id);
      if (!pinToNet.has(key)) unconnected.push({ comp: comp.id, pin: pin.id });
    }
  }

  return { nets, pinToNet, netByName, unconnected };
}

function comparePin(a: PinRef, b: PinRef): number {
  const ca = a.comp.localeCompare(b.comp, 'en');
  if (ca !== 0) return ca;
  const na = Number(a.pin);
  const nb = Number(b.pin);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.pin.localeCompare(b.pin, 'en');
}

export function sortedNetPins(net: Net): PinRef[] {
  return net.pins.slice().sort(comparePin);
}
