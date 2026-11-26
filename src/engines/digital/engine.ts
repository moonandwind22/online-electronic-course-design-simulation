import type { CircuitDoc, Component, LogicLevel, NetlistResult } from '../../model/types';
import type { PartDef } from '../../parts/types';
import { buildNetlist } from '../../lib/netlist';
import { getPart } from '../../parts/registry';
import { Mcs51, type Mcs51Snapshot } from '../mcs51/cpu';
import { DIGITAL_CHIPS } from '../../parts/digitalChips';
import { createModel, type ModelFn } from './models';
import { resolveDrivers, type Driver, type Strength } from './resolver';

interface ClockState {
  level: 0 | 1;
  half: number;
  nextEdge: number;
}

interface DeviceRuntime {
  comp: Component;
  part: PartDef;
  state: Record<string, any>;
  model: ModelFn | null;
}

interface EngineSnapshot {
  pinLevels: Record<string, LogicLevel>;
  netLevels: Record<string, LogicLevel>;
  nets: Array<{ name: string; level: LogicLevel }>;
  time: number;
  events: number;
}

const MODEL_BY_TYPE = new Map<string, ModelFn>();
for (const spec of DIGITAL_CHIPS) {
  MODEL_BY_TYPE.set(spec.type, createModel(spec.model));
}
MODEL_BY_TYPE.set(
  'NAND2',
  createModel({
    kind: 'gates',
    gates: [{ op: 'nand', inputs: ['A', 'B'], output: 'Y' }],
  }),
);

const MAX_SETTLE_PASSES = 80;
const MAX_EVENTS_PER_TICK = 20000;

const key = (componentId: string, pinId: string) => `${componentId}:${pinId}`;

const TTL = (level: LogicLevel | undefined): 0 | 1 => (level === 0 ? 0 : 1);

const SOURCE_TYPES = new Set(['VCC', 'GND', 'CLOCK', 'LOGIC_SWITCH', 'BUTTON', 'SWITCH']);

export class DigitalEngine {
  private doc: CircuitDoc;
  private netlist: NetlistResult;
  private devices = new Map<string, DeviceRuntime>();
  private clocks = new Map<string, ClockState>();
  private mcus = new Map<string, Mcs51>();
  private pinNetName = new Map<string, string>();
  private netComponents = new Map<string, Set<string>>();
  private drives = new Map<string, Driver>();
  private compDrives = new Map<string, Set<string>>();
  private netLevels = new Map<string, LogicLevel>();
  private pinLevels: Record<string, LogicLevel> = {};
  private dirty = new Set<string>();
  private time = 0;
  private events = 0;
  private warnings: string[] = [];

  constructor(doc: CircuitDoc) {
    this.doc = doc;
    this.netlist = buildNetlist(doc, getPart);
    for (const net of this.netlist.nets) {
      const comps = new Set<string>();
      for (const pin of net.pins) {
        this.pinNetName.set(key(pin.componentId, pin.pinId), net.name);
        comps.add(pin.componentId);
      }
      this.netComponents.set(net.name, comps);
    }
    for (const comp of doc.components) {
      const part = getPart(comp.type);
      if (!part) continue;
      this.devices.set(comp.id, {
        comp,
        part,
        state: {},
        model: MODEL_BY_TYPE.get(comp.type) ?? null,
      });
      if (comp.type === 'CLOCK') {
        const freq = Math.max(0.01, Number(comp.params.freq ?? 1));
        const half = 0.5 / freq;
        this.clocks.set(comp.id, { level: 0, half, nextEdge: half });
      }
      if (comp.type === 'MCU51') {
        this.mcus.set(comp.id, new Mcs51(doc.firmware?.hex ?? null));
      }
    }
    this.primeSources();
    this.markAllDirty();
    this.settle();
    this.events = 0;
  }

  reset(): void {
    this.time = 0;
    this.events = 0;
    this.warnings = [];
    this.drives.clear();
    this.compDrives.clear();
    this.netLevels.clear();
    for (const rt of this.devices.values()) rt.state = {};
    for (const [id, clock] of this.clocks) {
      void id;
      clock.level = 0;
      clock.nextEdge = clock.half;
    }
    for (const mcu of this.mcus.values()) mcu.reset();
    this.primeSources();
    this.markAllDirty();
    this.settle();
    this.events = 0;
  }

  /** 先让电源/时钟/开关建立网络电平，避免时序器件首次评估时把 Z 当成高电平。 */
  private primeSources(): void {
    for (const [id, rt] of this.devices) {
      if (SOURCE_TYPES.has(rt.comp.type)) this.evaluate(id);
    }
    this.syncNets();
  }

  tick(dt: number): void {
    if (dt <= 0) return;
    const target = this.time + dt;
    this.markAllDirty();
    this.settle();

    let guard = 0;
    while (this.time < target - 1e-12) {
      const next = this.nextClockEdge(target);
      if (next === null) {
        this.time = target;
        break;
      }
      this.time = Math.max(this.time, next);
      let toggled = false;
      for (const clock of this.clocks.values()) {
        if (clock.nextEdge <= this.time + 1e-12) {
          clock.level = clock.level ? 0 : 1;
          clock.nextEdge += clock.half;
          toggled = true;
        }
      }
      if (!toggled) break;
      this.markAllDirty();
      this.settle();
      guard += 1;
      if (guard > MAX_EVENTS_PER_TICK) {
        this.warnings.push('时钟事件超出单帧预算，已跳到目标时刻（可能存在高频振荡）');
        this.time = target;
        break;
      }
    }
    this.time = target;

    // MCS-51：12 MHz 下 1 机器周期 = 1 µs；按本帧仿真时间推进 CPU。
    if (this.mcus.size > 0 && this.doc.firmware?.hex) {
      const cycles = Math.min(200_000, Math.floor(dt / 1e-6));
      if (cycles > 0) {
        for (const [id, mcu] of this.mcus) {
          const portBits = (prefix: string, count: number): number => {
            let mask = 0;
            for (let i = 0; i < count; i += 1) {
              const level = this.levelOf(id, `${prefix}.${i}`);
              if (level === 0) mask &= ~(1 << i);
              else mask |= 1 << i;
            }
            return mask;
          };
          mcu.setPortPins(0, portBits('P0', 8));
          mcu.setPortPins(1, portBits('P1', 8));
          mcu.setPortPins(2, portBits('P2', 2));
          mcu.run(cycles);
          this.dirty.add(id);
        }
        this.settle();
      }
    }
    this.buildPinLevels();
  }

  private nextClockEdge(target: number): number | null {
    let next: number | null = null;
    for (const clock of this.clocks.values()) {
      if (clock.nextEdge <= target + 1e-12 && (next === null || clock.nextEdge < next)) {
        next = clock.nextEdge;
      }
    }
    return next;
  }

  private markAllDirty(): void {
    for (const id of this.devices.keys()) this.dirty.add(id);
  }

  private settle(): void {
    let pass = 0;
    while (this.dirty.size > 0 && pass < MAX_SETTLE_PASSES) {
      const batch = [...this.dirty];
      this.dirty.clear();
      for (const id of batch) this.evaluate(id);
      const changed = this.syncNets();
      if (changed.length > 0) {
        for (const net of changed) {
          for (const compId of this.netComponents.get(net) ?? []) this.dirty.add(compId);
        }
      }
      pass += 1;
    }
    if (this.dirty.size > 0) {
      this.warnings.push('组合逻辑在 80 轮 delta 循环内未收敛，可能存在反馈振荡');
      this.dirty.clear();
    }
    this.buildPinLevels();
  }

  private evaluate(componentId: string): void {
    const rt = this.devices.get(componentId);
    if (!rt) return;
    const previous = this.compDrives.get(componentId);
    if (previous) {
      for (const pinKey of previous) this.drives.delete(pinKey);
    }
    this.compDrives.set(componentId, new Set());

    const drive = (pinId: string, level: LogicLevel, strength: Strength = 'strong') => {
      this.drives.set(key(componentId, pinId), { level, strength });
      this.compDrives.get(componentId)?.add(key(componentId, pinId));
    };

    switch (rt.comp.type) {
      case 'VCC':
        drive('1', 1);
        return;
      case 'GND':
        drive('1', 0);
        return;
      case 'CLOCK': {
        const clock = this.clocks.get(componentId);
        if (clock) drive('OUT', clock.level);
        return;
      }
      case 'LOGIC_SWITCH':
        drive('OUT', rt.comp.state?.closed ? 1 : 0);
        return;
      case 'BUTTON':
        drive('OUT', rt.comp.state?.pressed ? 0 : 1);
        return;
      case 'SWITCH': {
        const closed = Boolean(rt.comp.state?.closed);
        drive('1', closed ? 1 : 'z');
        drive('2', closed ? 1 : 'z');
        return;
      }
      case 'BUZZER':
        rt.state.sounding = TTL(this.levelOf(componentId, 'IN')) === 1;
        return;
      case 'PROBE':
        rt.state.level = this.levelOf(componentId, 'IN');
        return;
      case 'RESISTOR': {
        // 数字域把限流/上拉电阻近似为单向弱连接：一侧有驱动、另一侧悬空时传递电平。
        const a = this.levelExcluding(componentId, '1');
        const b = this.levelExcluding(componentId, '2');
        if (a !== 'z' && b === 'z') drive('2', a, 'weak');
        if (b !== 'z' && a === 'z') drive('1', b, 'weak');
        return;
      }
      case 'MCU51': {
        const mcu = this.mcus.get(componentId);
        if (!mcu) return;
        const p1 = mcu.portLatch(1);
        const p0 = mcu.portLatch(0);
        const p2 = mcu.portLatch(2);
        for (let i = 0; i < 8; i += 1) {
          drive(`P1.${i}`, ((p1 >> i) & 1) as LogicLevel);
          drive(`P0.${i}`, ((p0 >> i) & 1) === 1 ? 'z' : 0);
        }
        for (let i = 0; i < 2; i += 1) {
          drive(`P2.${i}`, ((p2 >> i) & 1) as LogicLevel);
        }
        return;
      }
      default:
        break;
    }

    if (!rt.model) return;
    rt.model({
      input: (pinId) => this.levelOf(componentId, pinId),
      drive,
      state: rt.state,
    });
  }

  private levelOf(componentId: string, pinId: string): LogicLevel {
    const netName = this.pinNetName.get(key(componentId, pinId));
    return netName ? this.netLevels.get(netName) ?? 'z' : 'z';
  }

  /** 排除该器件自身驱动后的网络电平，用于电阻等无源器件的双向传递。 */
  private levelExcluding(componentId: string, pinId: string): LogicLevel {
    const netName = this.pinNetName.get(key(componentId, pinId));
    if (!netName) return 'z';
    const drivers: Driver[] = [];
    if (netName === 'VCC' || netName === '3V3') drivers.push({ level: 1, strength: 'strong' });
    if (netName === 'GND') drivers.push({ level: 0, strength: 'strong' });
    for (const [pinKey, driver] of this.drives) {
      if (pinKey.startsWith(`${componentId}:`)) continue;
      if (this.pinNetName.get(pinKey) === netName) drivers.push(driver);
    }
    return resolveDrivers(drivers);
  }

  private syncNets(): string[] {
    const changed: string[] = [];
    for (const net of this.netlist.nets) {
      const drivers: Driver[] = [];
      if (net.name === 'VCC' || net.name === '3V3') drivers.push({ level: 1, strength: 'strong' });
      if (net.name === 'GND') drivers.push({ level: 0, strength: 'strong' });
      for (const pin of net.pins) {
        const driver = this.drives.get(key(pin.componentId, pin.pinId));
        if (driver) drivers.push(driver);
      }
      const level = resolveDrivers(drivers);
      if (this.netLevels.get(net.name) !== level) {
        this.netLevels.set(net.name, level);
        this.events += 1;
        changed.push(net.name);
      }
    }
    return changed;
  }

  private buildPinLevels(): void {
    const pinLevels: Record<string, LogicLevel> = {};
    for (const [pinKey, netName] of this.pinNetName) {
      pinLevels[pinKey] = this.netLevels.get(netName) ?? 'z';
    }
    for (const [componentId, rt] of this.devices) {
      for (const pin of rt.part.pins) {
        const pinKey = key(componentId, pin.id);
        if (pinKey in pinLevels) continue;
        // 未接线的输出引脚也要显示模型驱动电平（便于检查器/测试读取）。
        pinLevels[pinKey] = this.drives.get(pinKey)?.level ?? 'z';
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
    const signal = candidates.filter((name) => (this.netLevels.get(name) ?? 'z') !== 'z');
    return (signal.length > 0 ? signal : candidates).slice(0, max);
  }

  netLevelByName(name: string): LogicLevel {
    return this.netLevels.get(name) ?? 'z';
  }

  getWarnings(): string[] {
    return [...this.warnings];
  }

  mcuSnapshot(): { componentId: string; state: Mcs51Snapshot } | null {
    for (const [id, mcu] of this.mcus) {
      return { componentId: id, state: mcu.snapshot() };
    }
    return null;
  }

  takeSerial(): number[] {
    const out: number[] = [];
    for (const mcu of this.mcus.values()) out.push(...mcu.takeTxBytes());
    return out;
  }

  receiveSerial(componentId: string, byte: number): void {
    this.mcus.get(componentId)?.receiveByte(byte);
  }

  /** 运行中切换开关/按键，无需重建引擎。 */
  setControls(components: Component[]): void {
    for (const comp of components) {
      const rt = this.devices.get(comp.id);
      if (!rt) continue;
      rt.comp = { ...rt.comp, state: comp.state };
      this.dirty.add(comp.id);
    }
    this.settle();
  }
}
