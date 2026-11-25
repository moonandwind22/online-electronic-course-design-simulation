import { SimEngine } from 'brownout';
import type { CircuitDoc } from '../../model/types';
import { buildNetlist } from '../../lib/netlist';
import { getPart } from '../../parts/registry';

interface DeviceSpec {
  kind: string;
  pins: Record<string, string>;
  /** 部分 brownout 模型按引脚顺序判断极性（电压源 pos 必须在前）。 */
  pinOrder?: string[];
  params: (comp: CircuitDoc['components'][number]) => Record<string, number | string>;
}

const SPECS: Record<string, DeviceSpec> = {
  RESISTOR: {
    kind: 'resistor',
    pins: { '1': 'a', '2': 'b' },
    params: (c) => ({ resistance: Math.max(0.1, Number(c.params.resistance ?? 1000)) }),
  },
  CAPACITOR: {
    kind: 'capacitor',
    pins: { '1': 'a', '2': 'b' },
    params: (c) => ({
      capacitance: Math.max(1e-12, Number(c.params.capacitance ?? 10) * 1e-6),
      esr: 0.05,
      leakageResistance: 1e9,
      style: 'ceramic',
    }),
  },
  INDUCTOR: {
    kind: 'inductor',
    pins: { '1': 'a', '2': 'b' },
    params: (c) => ({
      inductance: Math.max(1e-9, Number(c.params.inductance ?? 220) * 1e-6),
      dcr: 0.05,
      coreLossResistance: 1e6,
    }),
  },
  VSRC: {
    kind: 'voltage_source',
    pins: { pos: 'pos', neg: 'neg' },
    pinOrder: ['pos', 'neg'],
    params: (c) => ({ voltage: Number(c.params.voltage ?? 12) }),
  },
  LED: {
    kind: 'led',
    pins: { A: 'a', K: 'k' },
    params: (c) => {
      const colors: Record<string, string> = { red: 'red', green: 'green', amber: 'amber', blue: 'blue' };
      const color = colors[String(c.params.color)] ?? 'red';
      return { color, iRated: 0.02 };
    },
  },
  DIODE: {
    kind: 'diode',
    pins: { A: 'a', K: 'k' },
    params: (c) => ({ vf: Number(c.params.vf ?? 0.7) }),
  },
  SWITCH: {
    kind: 'switch',
    pins: { '1': 'a', '2': 'b' },
    params: (c) => ({ closed: c.state?.closed ? 1 : 0 }),
  },
};

export interface AnalogBuildResult {
  circuit: {
    components: Array<{
      id: string;
      kind: string;
      position: { x: number; y: number };
      rotation: number;
      pins: Array<{ id: string }>;
      params: Record<string, number | string>;
    }>;
    wires: Array<{ from_component: string; from_pin: string; to_component: string; to_pin: string }>;
  };
  measurement: { componentId: string; pinId: string; netName: string } | null;
  source: { componentId: string; pinId: string; netName: string } | null;
  supported: string[];
}

export function buildAnalogCircuit(doc: CircuitDoc): AnalogBuildResult {
  const netlist = buildNetlist(doc, getPart);
  const components: AnalogBuildResult['circuit']['components'] = [];
  const pinAlias = new Map<string, string>();
  const supported = new Set<string>();

  for (const comp of doc.components) {
    const spec = SPECS[comp.type];
    const part = getPart(comp.type);
    if (!spec || !part) continue;
    const order = spec.pinOrder ?? part.pins.map((p) => p.id);
    components.push({
      id: comp.id,
      kind: spec.kind,
      position: { x: comp.x, y: comp.y },
      rotation: comp.rot,
      pins: order.map((id) => ({ id: spec.pins[id] ?? id })),
      params: spec.params(comp),
    });
    for (const p of part.pins) pinAlias.set(`${comp.id}:${p.id}`, spec.pins[p.id] ?? p.id);
    supported.add(comp.id);
  }

  const wires: AnalogBuildResult['circuit']['wires'] = [];
  for (const net of netlist.nets) {
    const pins = net.pins.filter((p) => supported.has(p.componentId)).map((p) => ({
      componentId: p.componentId,
      pinId: pinAlias.get(`${p.componentId}:${p.pinId}`) ?? p.pinId,
    }));
    for (let i = 1; i < pins.length; i += 1) {
      wires.push({
        from_component: pins[i - 1].componentId,
        from_pin: pins[i - 1].pinId,
        to_component: pins[i].componentId,
        to_pin: pins[i].pinId,
      });
    }
  }

  const pickPin = (netName: string): AnalogBuildResult['measurement'] => {
    const net = netlist.nets.find((n) => n.name === netName);
    if (!net) return null;
    for (const p of net.pins) {
      if (!supported.has(p.componentId)) continue;
      return {
        componentId: p.componentId,
        pinId: pinAlias.get(`${p.componentId}:${p.pinId}`) ?? p.pinId,
        netName,
      };
    }
    return null;
  };

  return {
    circuit: { components, wires },
    measurement: pickPin('VOUT') ?? pickPin('N1'),
    source: pickPin('VIN') ?? pickPin('N2'),
    supported: [...supported],
  };
}

export class AnalogEngine {
  private engine = new SimEngine();
  private build: AnalogBuildResult;
  private measureNet: string | null = null;
  private sourceNet: string | null = null;
  private time = 0;
  private vmax = 1;

  constructor(doc: CircuitDoc) {
    this.build = buildAnalogCircuit(doc);
    this.engine.setIntegrationMethod('trap');
    this.engine.load(this.build.circuit);
    if (this.build.measurement) {
      this.measureNet =
        this.engine.getNetIdForPin(this.build.measurement.componentId, this.build.measurement.pinId) ?? null;
    }
    if (this.build.source) {
      this.sourceNet =
        this.engine.getNetIdForPin(this.build.source.componentId, this.build.source.pinId) ?? null;
    }
    this.sampleVoltages();
  }

  reset(): void {
    this.engine.coldLoad(this.build.circuit);
    this.time = 0;
    this.vmax = 1;
    this.sampleVoltages();
  }

  tick(dtSeconds: number): void {
    const step = 5e-5;
    const total = Math.max(0, Math.min(0.2, dtSeconds));
    const steps = Math.max(1, Math.min(4000, Math.ceil(total / step)));
    const h = total / steps;
    for (let i = 0; i < steps; i += 1) {
      this.engine.step(h);
      this.time += h;
    }
  }

  voltage(netId: string | null): number {
    if (!netId) return 0;
    const v = this.engine.netV[netId];
    return Number.isFinite(v) ? v : 0;
  }

  sampleVoltages(): { vout: number; vin: number } {
    const vout = this.voltage(this.measureNet);
    const vin = this.voltage(this.sourceNet);
    this.vmax = Math.max(this.vmax, Math.abs(vout), Math.abs(vin), 1);
    return { vout, vin };
  }

  get elapsed(): number {
    return this.time;
  }

  get maxVoltage(): number {
    return this.vmax;
  }

  failures(): string[] {
    return Object.values(this.engine.getFailures())
      .map((f) => f.message)
      .slice(0, 3);
  }
}
