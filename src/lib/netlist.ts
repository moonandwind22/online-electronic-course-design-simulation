import type {
  CircuitDoc,
  ComponentInstance,
  Net,
  NetlistResult,
  PinConnection,
  PinRef,
} from '../model/types';
import type { PartDef } from '../parts/types';
import { pinWorldPosition, pointOnSegment, routeOrthogonal } from './geometry';

const POWER_PART_NAMES: Record<string, string> = {
  VCC: 'VCC',
  GND: 'GND',
  P3V3: '3V3',
  P5V: '5V',
  P12V: '12V',
};

export function pinKey(ref: PinRef): string {
  return `${ref.comp}.${ref.pin}`;
}

class UnionFind {
  private parent = new Map<string, string>();
  add(k: string) {
    if (!this.parent.has(k)) this.parent.set(k, k);
  }
  find(k: string): string {
    this.add(k);
    let root = k;
    while (this.parent.get(root) !== root) root = this.parent.get(root)!;
    let cur = k;
    while (this.parent.get(cur) !== root) {
      const next = this.parent.get(cur)!;
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }
  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(rb, ra);
  }
}

/**
 * 由元件引脚与导线提取网络：
 * - 引脚通过导线端点合并；
 * - 导线端点落在另一条导线线段上时形成 T 型结点；
 * - 同名电源符号（GND / VCC / 5V / 3V3 / 12V）全局合并；
 * - 网络命名优先级：显式标签 > 电源符号 > 自动 N1..Nn。
 */
export function buildNetlist(doc: CircuitDoc, parts: Map<string, PartDef>): NetlistResult {
  const uf = new UnionFind();
  const pinSet = new Map<string, PinRef>();
  const pinPos = new Map<string, { x: number; y: number }>();

  for (const comp of doc.components) {
    const part = parts.get(comp.type);
    if (!part) continue;
    for (const pin of part.pins) {
      const ref = { comp: comp.id, pin: pin.id };
      const key = pinKey(ref);
      pinSet.set(key, ref);
      uf.add(key);
      const pos = pinWorldPosition(comp, part, pin.id);
      if (pos) pinPos.set(key, pos);
    }
  }

  // 导线端点 → 线段的 T 型结点合并
  const wireSegments: { wire: string; a: { x: number; y: number }; b: { x: number; y: number } }[] = [];
  const wireEndpoints: { key: string; ref: PinRef; points: { x: number; y: number }[] }[] = [];

  for (const wire of doc.wires) {
    const fromKey = pinKey(wire.from);
    const toKey = pinKey(wire.to);
    if (!pinSet.has(fromKey) || !pinSet.has(toKey)) continue;
    const fromPos = pinPos.get(fromKey);
    const toPos = pinPos.get(toKey);
    if (!fromPos || !toPos) continue;

    uf.union(fromKey, toKey);
    const route = routeOrthogonal(fromPos, toPos, wire.waypoints ?? []);
    wireEndpoints.push({ key: fromKey, ref: wire.from, points: route });
    wireEndpoints.push({ key: toKey, ref: wire.to, points: route });
    for (let i = 1; i < route.length; i++) {
      wireSegments.push({ wire: wire.id, a: route[i - 1], b: route[i] });
    }
  }

  for (const ep of wireEndpoints) {
    const endpoint = pinPos.get(ep.key);
    if (!endpoint) continue;
    for (const seg of wireSegments) {
      if (!pointOnSegment(endpoint, seg.a, seg.b)) continue;
      // 找到该线段所属导线，把它的两个端点与当前端点合并
      const other = doc.wires.find((w) => w.id === seg.wire);
      if (!other) continue;
      uf.union(ep.key, pinKey(other.from));
      uf.union(ep.key, pinKey(other.to));
    }
  }

  // 直接接触的引脚合并（同一坐标）
  const byPos = new Map<string, string[]>();
  for (const [key, pos] of pinPos) {
    const ck = `${Math.round(pos.x)}:${Math.round(pos.y)}`;
    const arr = byPos.get(ck) ?? [];
    arr.push(key);
    byPos.set(ck, arr);
  }
  for (const arr of byPos.values()) {
    for (let i = 1; i < arr.length; i++) uf.union(arr[0], arr[i]);
  }

  // 电源符号全局合并
  const powerRoots = new Map<string, string>();
  for (const comp of doc.components) {
    const netName = POWER_PART_NAMES[comp.type];
    if (!netName) continue;
    const part = parts.get(comp.type);
    const pin = part?.pins[0];
    if (!pin) continue;
    const key = `${comp.id}.${pin.id}`;
    const existing = powerRoots.get(netName);
    if (existing) uf.union(existing, key);
    else powerRoots.set(netName, key);
  }

  // 分组
  const groups = new Map<string, PinRef[]>();
  for (const [key, ref] of pinSet) {
    const root = uf.find(key);
    const arr = groups.get(root) ?? [];
    arr.push(ref);
    groups.set(root, arr);
  }

  // 显式网络标签
  const labelByRoot = new Map<string, string>();
  for (const wire of doc.wires) {
    if (!wire.netLabel) continue;
    const key = pinKey(wire.from);
    if (!pinSet.has(key)) continue;
    labelByRoot.set(uf.find(key), wire.netLabel.trim());
  }

  const powerNameByRoot = new Map<string, string>();
  for (const [netName, key] of powerRoots) {
    powerNameByRoot.set(uf.find(key), netName);
  }

  // 稳定排序生成 N1..Nn
  const entries = [...groups.entries()].map(([root, pins]) => {
    pins.sort((a, b) => pinKey(a).localeCompare(pinKey(b)));
    return { root, pins };
  });
  entries.sort((a, b) => pinKey(a.pins[0]).localeCompare(pinKey(b.pins[0])));

  const nets: Net[] = [];
  const pinNet = new Map<string, PinConnection>();
  const byName = new Map<string, Net>();
  const usedNames = new Set<string>();
  let auto = 1;

  // 先分配有名字的网络，保证自动编号稳定
  const named = entries.filter((e) => labelByRoot.has(e.root) || powerNameByRoot.has(e.root));
  const unnamed = entries.filter((e) => !labelByRoot.has(e.root) && !powerNameByRoot.has(e.root));

  for (const e of named) {
    const label = labelByRoot.get(e.root);
    const pname = powerNameByRoot.get(e.root);
    const name = label || pname || `N${auto}`;
    const namedKind = label ? 'explicit' : 'power';
    let unique = name;
    let suffix = 2;
    while (usedNames.has(unique)) unique = `${name}_${suffix++}`;
    usedNames.add(unique);
    const net: Net = { id: `net_${unique}`, name: unique, pins: e.pins, named: namedKind };
    nets.push(net);
    byName.set(unique, net);
    for (const p of e.pins) pinNet.set(pinKey(p), { netId: net.id, netName: net.name });
  }

  for (const e of unnamed) {
    let name = `N${auto++}`;
    while (usedNames.has(name)) name = `N${auto++}`;
    usedNames.add(name);
    const net: Net = { id: `net_${name}`, name, pins: e.pins, named: 'auto' };
    nets.push(net);
    byName.set(name, net);
    for (const p of e.pins) pinNet.set(pinKey(p), { netId: net.id, netName: net.name });
  }

  const connected = new Set<string>();
  for (const wire of doc.wires) {
    connected.add(pinKey(wire.from));
    connected.add(pinKey(wire.to));
  }
  const floating: PinRef[] = [];
  for (const [key, ref] of pinSet) {
    const conn = pinNet.get(key);
    const isMulti = conn && (groups.get(uf.find(key))?.length ?? 0) > 1;
    const isPower = !!POWER_PART_NAMES[doc.components.find((c) => c.id === ref.comp)?.type ?? ''];
    if (!connected.has(key) && !isMulti && !isPower) floating.push(ref);
  }
  floating.sort((a, b) => pinKey(a).localeCompare(pinKey(b)));

  // 网络按名字排序，AI 导出确定
  nets.sort((a, b) => {
    const rank = (n: Net) => (n.named === 'power' ? 0 : n.named === 'explicit' ? 1 : 2);
    const dr = rank(a) - rank(b);
    if (dr !== 0) return dr;
    return a.name.localeCompare(b.name, 'en', { numeric: true });
  });

  return { nets, pinNet, floating, byName };
}

export function findComponent(doc: CircuitDoc, id: string): ComponentInstance | undefined {
  return doc.components.find((c) => c.id === id);
}
