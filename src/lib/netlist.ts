import type { CircuitDoc, Net, NetlistResult, PinRef } from '../model/types';
import type { PartDef } from '../parts/types';

const pinKey = (componentId: string, pinId: string) => `${componentId}:${pinId}`;

const SUPPLY_ALIASES: Record<string, string> = {
  VCC: 'VCC',
  VDD: 'VCC',
  '5V': 'VCC',
  '3V3': '3V3',
  '3.3V': '3V3',
  GND: 'GND',
  VSS: 'GND',
};

class DSU {
  private parent = new Map<string, string>();

  add(key: string): void {
    if (!this.parent.has(key)) this.parent.set(key, key);
  }

  find(key: string): string {
    this.add(key);
    let root = key;
    while (this.parent.get(root) !== root) root = this.parent.get(root) as string;
    let cur = key;
    while (this.parent.get(cur) !== root) {
      const next = this.parent.get(cur) as string;
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(rb, ra);
  }

  keys(): string[] {
    return [...this.parent.keys()];
  }
}

export function buildNetlist(doc: CircuitDoc, getPart: (type: string) => PartDef | undefined): NetlistResult {
  const dsu = new DSU();
  const partMap = new Map<string, PartDef>();
  const connected = new Set<string>();
  const labelledWires: Array<{ key: string; label: string }> = [];

  for (const comp of doc.components) {
    const part = getPart(comp.type);
    if (!part) continue;
    partMap.set(comp.id, part);
    for (const p of part.pins) dsu.add(pinKey(comp.id, p.id));

    for (const p of part.pins) {
      const alias = SUPPLY_ALIASES[p.name.toUpperCase()];
      if (alias) {
        dsu.union(`__power_${alias}`, pinKey(comp.id, p.id));
        connected.add(pinKey(comp.id, p.id));
      }
    }
    if (comp.type === 'VCC') {
      dsu.union('__power_VCC', pinKey(comp.id, '1'));
      connected.add(pinKey(comp.id, '1'));
    }
    if (comp.type === 'GND') {
      dsu.union('__power_GND', pinKey(comp.id, '1'));
      connected.add(pinKey(comp.id, '1'));
    }
  }

  for (const wire of doc.wires) {
    if (!wire.from || !wire.to) continue;
    const fromKey = pinKey(wire.from.componentId, wire.from.pinId);
    const toKey = pinKey(wire.to.componentId, wire.to.pinId);
    dsu.union(fromKey, toKey);
    connected.add(fromKey);
    connected.add(toKey);
    if (wire.netLabel) labelledWires.push({ key: fromKey, label: wire.netLabel });
  }

  const labels = new Map<string, string>();
  const labelAnchors = new Map<string, string>();
  for (const { key, label } of labelledWires) {
    const anchor = labelAnchors.get(label);
    if (anchor) {
      dsu.union(anchor, key);
    } else {
      labelAnchors.set(label, key);
    }
  }
  for (const [label, key] of labelAnchors) {
    const root = dsu.find(key);
    if (!labels.has(root)) labels.set(root, label);
  }

  const groups = new Map<string, PinRef[]>();
  for (const key of dsu.keys()) {
    if (key.startsWith('__power_')) continue;
    if (!connected.has(key)) continue;
    const root = dsu.find(key);
    if (!groups.has(root)) groups.set(root, []);
    const [componentId, pinId] = key.split(':');
    groups.get(root)?.push({ componentId, pinId });
  }

  const roots = [...groups.keys()].sort((a, b) => {
    const ka = (groups.get(a) ?? []).map((p) => pinKey(p.componentId, p.pinId)).sort()[0] ?? '';
    const kb = (groups.get(b) ?? []).map((p) => pinKey(p.componentId, p.pinId)).sort()[0] ?? '';
    return ka.localeCompare(kb);
  });

  const nets: Net[] = [];
  const usedNames = new Set<string>();
  const uniqueName = (base: string): string => {
    if (!usedNames.has(base)) {
      usedNames.add(base);
      return base;
    }
    let i = 2;
    while (usedNames.has(`${base}_${i}`)) i++;
    const name = `${base}_${i}`;
    usedNames.add(name);
    return name;
  };

  const pinNet = new Map<string, string>();
  let autoIndex = 0;

  const supplyOf = (pins: PinRef[]): string | null => {
    let vcc = false;
    let gnd = false;
    let v33 = false;
    for (const p of pins) {
      const comp = doc.components.find((c) => c.id === p.componentId);
      if (!comp) continue;
      if (comp.type === 'VCC') vcc = true;
      if (comp.type === 'GND') gnd = true;
      const part = partMap.get(comp.id);
      const name = part?.pins.find((x) => x.id === p.pinId)?.name.toUpperCase() ?? '';
      if (name === 'VCC' || name === 'VDD' || name === '5V') vcc = true;
      if (name === 'GND' || name === 'VSS') gnd = true;
      if (name === '3V3' || name === '3.3V') v33 = true;
    }
    if (vcc && gnd) return null;
    if (vcc) return 'VCC';
    if (gnd) return 'GND';
    if (v33) return '3V3';
    return null;
  };

  for (const root of roots) {
    const pins = (groups.get(root) ?? []).sort((a, b) =>
      pinKey(a.componentId, a.pinId).localeCompare(pinKey(b.componentId, b.pinId)),
    );
    if (pins.length === 0) continue;

    let name: string;
    let isPower = false;
    let label: string | undefined;
    const supply = supplyOf(pins);
    if (supply) {
      name = uniqueName(supply);
      isPower = true;
    } else if (labels.has(root)) {
      label = labels.get(root);
      name = uniqueName(label ?? `N${autoIndex + 1}`);
    } else {
      name = uniqueName(`N${autoIndex + 1}`);
      autoIndex += 1;
    }

    const net: Net = { id: `net_${name}`, name, pins, isPower, label };
    nets.push(net);
    for (const p of pins) pinNet.set(pinKey(p.componentId, p.pinId), net.id);
  }

  const unconnected: PinRef[] = [];
  for (const comp of doc.components) {
    const part = partMap.get(comp.id);
    if (!part) continue;
    for (const p of part.pins) {
      if (!pinNet.has(pinKey(comp.id, p.id))) unconnected.push({ componentId: comp.id, pinId: p.id });
    }
  }

  return { nets, pinNet, unconnected };
}

export function netKey(componentId: string, pinId: string): string {
  return pinKey(componentId, pinId);
}

export function findNet(netlist: NetlistResult, componentId: string, pinId: string): Net | undefined {
  const id = netlist.pinNet.get(pinKey(componentId, pinId));
  return id ? netlist.nets.find((n) => n.id === id) : undefined;
}

export function pinRefsToText(pins: PinRef[], doc: CircuitDoc, getPart: (type: string) => PartDef | undefined): string {
  const comps = new Map(doc.components.map((c) => [c.id, c]));
  return pins
    .map((p) => {
      const comp = comps.get(p.componentId);
      const part = comp ? getPart(comp.type) : undefined;
      const pin = part?.pins.find((x) => x.id === p.pinId);
      return `${comp?.label ?? p.componentId}.${pin?.number ?? pin?.name ?? p.pinId}(${pin?.name ?? p.pinId})`;
    })
    .join(', ');
}
