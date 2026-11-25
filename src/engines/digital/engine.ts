import type { CircuitDoc, LogicLevel, NetlistResult } from '../../model/types';
import type { PartDef } from '../../parts/types';
import { buildNetlist } from '../../lib/netlist';
import { getPart } from '../../parts/registry';

interface CounterState {
  value: number;
  clkPrev: LogicLevel;
}

interface ClockState {
  phase: number;
}

interface EngineSnapshot {
  pinLevels: Record<string, LogicLevel>;
  netLevels: Record<string, LogicLevel>;
  nets: Array<{ name: string; level: LogicLevel }>;
  time: number;
  events: number;
}

const truthy = (level: LogicLevel | undefined): 0 | 1 => (level === 0 ? 0 : 1);

const SEGMENT_TABLE: Record<number, string[]> = {
  0: ['a', 'b', 'c', 'd', 'e', 'f'],
  1: ['b', 'c'],
  2: ['a', 'b', 'd', 'e', 'g'],
  3: ['a', 'b', 'c', 'd', 'g'],
  4: ['b', 'c', 'f', 'g'],
  5: ['a', 'c', 'd', 'f', 'g'],
  6: ['a', 'c', 'd', 'e', 'f', 'g'],
  7: ['a', 'b', 'c'],
  8: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  9: ['a', 'b', 'c', 'd', 'f', 'g'],
};

export class DigitalEngine {
  private doc: CircuitDoc;
  private netlist: NetlistResult;
  private partMap = new Map<string, PartDef>();
  private pinNetName = new Map<string, string>();
  private counters = new Map<string, CounterState>();
  private clocks = new Map<string, ClockState>();
  private drives = new Map<string, LogicLevel>();
  private netLevels = new Map<string, LogicLevel>();
  private pinLevels: Record<string, LogicLevel> = {};
  private time = 0;
  private events = 0;
  private lastTickLevels = new Map<string, LogicLevel>();

  constructor(doc: CircuitDoc) {
    this.doc = doc;
    this.netlist = buildNetlist(doc, getPart);
    for (const net of this.netlist.nets) {
      for (const pin of net.pins) this.pinNetName.set(`${pin.componentId}:${pin.pinId}`, net.name);
    }
    for (const comp of doc.components) {
      const part = getPart(comp.type);
      if (!part) continue;
      this.partMap.set(comp.id, part);
      if (comp.type === '74LS161') this.counters.set(comp.id, { value: 0, clkPrev: 'z' });
      if (comp.type === 'CLOCK') this.clocks.set(comp.id, { phase: 0 });
    }
    this.resolveAll();
  }

  reset(): void {
    this.time = 0;
    this.events = 0;
    for (const state of this.counters.values()) {
      state.value = 0;
      state.clkPrev = 'z';
    }
    for (const state of this.clocks.values()) state.phase = 0;
    this.drives.clear();
    this.netLevels.clear();
    this.lastTickLevels.clear();
    this.resolveAll();
  }

  tick(dt: number): void {
    this.time += dt;
    for (const [id, state] of this.clocks) {
      const comp = this.doc.components.find((c) => c.id === id);
      const freq = Number(comp?.params.freq ?? 1);
      state.phase = (state.phase + dt * freq) % 1;
      this.drives.set(`${id}:OUT`, state.phase < 0.5 ? 1 : 0);
    }

    this.resolveAll();

    for (const [id, state] of this.counters) {
      const clk = this.levelOf(id, 'CLK');
      const clr = truthy(this.levelOf(id, 'CLR'));
      if (clr === 0) {
        state.value = 0;
      } else if (state.clkPrev === 0 && clk === 1) {
        const load = truthy(this.levelOf(id, 'LOAD'));
        const enp = truthy(this.levelOf(id, 'ENP'));
        const ent = truthy(this.levelOf(id, 'ENT'));
        if (load === 0) {
          const bits = [
            truthy(this.levelOf(id, 'A')),
            truthy(this.levelOf(id, 'B')),
            truthy(this.levelOf(id, 'C')),
            truthy(this.levelOf(id, 'D')),
          ];
          state.value = bits[0] | (bits[1] << 1) | (bits[2] << 2) | (bits[3] << 3);
        } else if (enp === 1 && ent === 1) {
          state.value = (state.value + 1) & 15;
        }
      }
      state.clkPrev = clk;
    }

    this.resolveAll();

    let changes = 0;
    for (const net of this.netlist.nets) {
      const level = this.netLevels.get(net.name) ?? 'z';
      if (this.lastTickLevels.get(net.name) !== level) changes += 1;
    }
    this.events += changes;
    this.lastTickLevels = new Map(this.netLevels);
  }

  private levelOf(componentId: string, pinId: string): LogicLevel {
    const netName = this.pinNetName.get(`${componentId}:${pinId}`);
    return netName ? this.netLevels.get(netName) ?? 'z' : 'z';
  }

  private resolveAll(): void {
    // 固定多轮迭代，让组合反馈（计数器 → NAND → CLR → 计数器）在同一 tick 内收敛。
    for (let pass = 0; pass < 8; pass += 1) {
      this.computeDrives();
      this.resolveNets();
      for (const [id, state] of this.counters) {
        if (truthy(this.levelOf(id, 'CLR')) === 0 && state.value !== 0) {
          state.value = 0;
        }
      }
    }
    this.buildPinLevels();
  }

  private computeDrives(): void {
    const drives = new Map<string, LogicLevel>();

    for (const comp of this.doc.components) {
      if (!this.partMap.has(comp.id)) continue;
      switch (comp.type) {
        case 'VCC':
          drives.set(`${comp.id}:1`, 1);
          break;
        case 'GND':
          drives.set(`${comp.id}:1`, 0);
          break;
        case 'CLOCK': {
          const state = this.clocks.get(comp.id);
          if (state) drives.set(`${comp.id}:OUT`, state.phase < 0.5 ? 1 : 0);
          break;
        }
        case 'SWITCH': {
          const closed = Boolean(comp.state?.closed);
          drives.set(`${comp.id}:1`, closed ? 1 : 'z');
          drives.set(`${comp.id}:2`, closed ? 1 : 'z');
          break;
        }
        case 'NAND2': {
          const a = truthy(this.levelOf(comp.id, 'A'));
          const b = truthy(this.levelOf(comp.id, 'B'));
          drives.set(`${comp.id}:Y`, a === 1 && b === 1 ? 0 : 1);
          break;
        }
        case '74LS161': {
          const state = this.counters.get(comp.id);
          if (!state) break;
          ['QA', 'QB', 'QC', 'QD'].forEach((pinId, bit) => {
            drives.set(`${comp.id}:${pinId}`, ((state.value >> bit) & 1) as LogicLevel);
          });
          const ent = truthy(this.levelOf(comp.id, 'ENT'));
          drives.set(`${comp.id}:RCO`, state.value === 15 && ent === 1 ? 1 : 0);
          break;
        }
        case '74LS47': {
          const lt = truthy(this.levelOf(comp.id, 'LT'));
          const bi = truthy(this.levelOf(comp.id, 'BI'));
          const value =
            truthy(this.levelOf(comp.id, 'A')) |
            (truthy(this.levelOf(comp.id, 'B')) << 1) |
            (truthy(this.levelOf(comp.id, 'C')) << 2) |
            (truthy(this.levelOf(comp.id, 'D')) << 3);
          const segments =
            bi === 0 ? [] : lt === 0 ? ['a', 'b', 'c', 'd', 'e', 'f', 'g'] : SEGMENT_TABLE[value] ?? [];
          ['a', 'b', 'c', 'd', 'e', 'f', 'g'].forEach((seg) => {
            drives.set(`${comp.id}:${seg}`, segments.includes(seg) ? 0 : 1);
          });
          break;
        }
        default:
          break;
      }
    }

    this.drives = drives;
  }

  private resolveNets(): void {
    const next = new Map<string, LogicLevel>();
    for (const net of this.netlist.nets) {
      let hasLow = false;
      let hasHigh = false;
      for (const pin of net.pins) {
        const drive = this.drives.get(`${pin.componentId}:${pin.pinId}`);
        if (drive === 0) hasLow = true;
        if (drive === 1) hasHigh = true;
      }
      const level: LogicLevel = hasHigh && hasLow ? 'x' : hasHigh ? 1 : hasLow ? 0 : 'z';
      next.set(net.name, level);
    }
    this.netLevels = next;
  }

  private buildPinLevels(): void {
    const pinLevels: Record<string, LogicLevel> = {};
    for (const [key, netName] of this.pinNetName) {
      pinLevels[key] = this.netLevels.get(netName) ?? 'z';
    }
    for (const comp of this.doc.components) {
      const part = this.partMap.get(comp.id);
      if (!part) continue;
      for (const pin of part.pins) {
        const key = `${comp.id}:${pin.id}`;
        if (!(key in pinLevels)) pinLevels[key] = 'z';
      }
    }
    this.pinLevels = pinLevels;
  }

  snapshot(): EngineSnapshot {
    const nets = this.netlist.nets.map((n) => ({
      name: n.name,
      level: this.netLevels.get(n.name) ?? ('z' as LogicLevel),
    }));
    const netLevels: Record<string, LogicLevel> = {};
    for (const n of nets) netLevels[n.name] = n.level;
    return {
      pinLevels: this.pinLevels,
      netLevels,
      nets,
      time: this.time,
      events: this.events,
    };
  }

  signalNets(max = 8): string[] {
    const candidates = this.netlist.nets.filter((n) => !n.isPower).map((n) => n.name);
    const signal = candidates.filter((name) => (this.lastTickLevels.get(name) ?? 'z') !== 'z');
    return (signal.length > 0 ? signal : candidates).slice(0, max);
  }

  netLevelByName(name: string): LogicLevel {
    return this.netLevels.get(name) ?? 'z';
  }
}
