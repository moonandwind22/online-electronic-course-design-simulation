import type { LogicLevel } from '../../model/types';
import type { ChipModelSpec, GateOp, GateSpec } from '../../parts/digitalChips';

export type Strength = 'strong' | 'weak';

export interface ModelIO {
  input: (pinId: string) => LogicLevel;
  drive: (pinId: string, level: LogicLevel, strength?: Strength) => void;
  state: Record<string, any>;
}

export type ModelFn = (io: ModelIO) => void;

const b = (level: LogicLevel): 0 | 1 => (level === 0 ? 0 : 1);

const valueOf = (bits: Array<0 | 1>): number =>
  bits.reduce<number>((acc, bit, i) => acc | (bit << i), 0);

const L = (v: number): LogicLevel => (v ? 1 : 0);

const bitsOf = (value: number, count: number): Array<0 | 1> =>
  Array.from({ length: count }, (_, i) => (((value >> i) & 1) as 0 | 1));

const gateValue = (gate: GateSpec, io: ModelIO): 0 | 1 => {
  const inputs = gate.inputs.map((pin) => b(io.input(pin)));
  switch (gate.op) {
    case 'and':
      return inputs.every((v) => v === 1) ? 1 : 0;
    case 'nand':
      return inputs.every((v) => v === 1) ? 0 : 1;
    case 'or':
      return inputs.some((v) => v === 1) ? 1 : 0;
    case 'nor':
      return inputs.some((v) => v === 1) ? 0 : 1;
    case 'xor':
      return inputs.filter((v) => v === 1).length % 2 === 1 ? 1 : 0;
    case 'xnor':
      return inputs.filter((v) => v === 1).length % 2 === 1 ? 0 : 1;
    case 'not':
      return inputs[0] === 1 ? 0 : 1;
    case 'buffer':
    default:
      return inputs[0] ?? 0;
  }
};

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

const enabled = (io: ModelIO, pin: string | undefined, active: 'low' | 'high'): boolean => {
  if (!pin) return true;
  return active === 'low' ? b(io.input(pin)) === 0 : b(io.input(pin)) === 1;
};

export function createModel(spec: ChipModelSpec): ModelFn {
  switch (spec.kind) {
    case 'gates':
      return (io) => {
        for (const gate of spec.gates) {
          const value = gateValue(gate, io);
          io.drive(gate.output, gate.oc && value === 1 ? 'z' : value);
        }
      };

    case 'buffers':
      return (io) => {
        for (const unit of spec.units) {
          const on = enabled(io, unit.oe, unit.active ?? 'low');
          if (!on) {
            io.drive(unit.y, 'z');
            continue;
          }
          const signal = b(io.input(unit.a));
          io.drive(unit.y, unit.invert ? (signal === 1 ? 0 : 1) : signal);
        }
      };

    case 'transceiver':
      return (io) => {
        if (b(io.input(spec.oe)) === 1) {
          for (const pin of [...spec.a, ...spec.b]) io.drive(pin, 'z');
          return;
        }
        const dir = b(io.input(spec.dir));
        if (dir === 1) {
          spec.a.forEach((pin, i) => io.drive(spec.b[i], b(io.input(pin))));
        } else {
          spec.b.forEach((pin, i) => io.drive(spec.a[i], b(io.input(pin))));
        }
      };

    case 'dff':
      return (io) => {
        const st = io.state;
        if (!st.q) st.q = spec.units.map(() => 0);
        if (!st.prev) st.prev = {};
        spec.units.forEach((unit, i) => {
          const clkPin = unit.clk ?? spec.clk;
          const clrPin = unit.clr ?? spec.clr;
          const prePin = unit.pre ?? spec.pre;
          const clk = clkPin ? b(io.input(clkPin)) : 1;
          const prev = st.prev[i] as 0 | 1 | undefined;
          if (clrPin && b(io.input(clrPin)) === 0) {
            st.q[i] = 0;
          } else if (prePin && b(io.input(prePin)) === 0) {
            st.q[i] = 1;
          } else if (
            prev !== undefined &&
            (spec.edge === 'rising' ? prev === 0 && clk === 1 : prev === 1 && clk === 0)
          ) {
            st.q[i] = b(io.input(unit.d));
          }
          st.prev[i] = clk;
          io.drive(unit.q, st.q[i]);
          if (unit.qn) io.drive(unit.qn, st.q[i] ? 0 : 1);
        });
      };

    case 'register':
      return (io) => {
        const st = io.state;
        if (!st.q) st.q = spec.d.map(() => 0);
        const clrOn = !!(spec.clr && enabled(io, spec.clr, spec.clrActive ?? 'low'));
        if (clrOn) st.q = spec.q.map(() => 0);
        const clk = b(io.input(spec.clk));
        if (st.prev !== undefined && st.prev === 0 && clk === 1) {
          st.q = spec.d.map((pin) => b(io.input(pin)));
        }
        st.prev = clk;
        if (enabled(io, spec.oe, spec.oeActive ?? 'low')) {
          spec.q.forEach((pin, i) => io.drive(pin, st.q[i]));
        } else {
          for (const pin of spec.q) io.drive(pin, 'z');
        }
      };

    case 'latch':
      return (io) => {
        const st = io.state;
        if (!st.q) st.q = spec.d.map(() => 0);
        if (b(io.input(spec.le)) === 1) {
          st.q = spec.d.map((pin) => b(io.input(pin)));
        }
        if (enabled(io, spec.oe, spec.oeActive ?? 'low')) {
          spec.q.forEach((pin, i) => io.drive(pin, st.q[i]));
        } else {
          for (const pin of spec.q) io.drive(pin, 'z');
        }
      };

    case 'counter':
      return (io) => {
        const st = io.state;
        if (st.count === undefined) st.count = 0;
        const clr = b(io.input(spec.pins.clr));
        if (spec.clear === 'async' && clr === 0) st.count = 0;
        const clk = b(io.input(spec.pins.clk));
        if (st.prev !== undefined && st.prev === 0 && clk === 1) {
          if (spec.clear === 'sync' && clr === 0) {
            st.count = 0;
          } else if (b(io.input(spec.pins.load)) === 0) {
            st.count = valueOf(spec.pins.a.map((pin) => b(io.input(pin))));
          } else if (b(io.input(spec.pins.enp)) === 1 && b(io.input(spec.pins.ent)) === 1) {
            st.count = (st.count + 1) % spec.mod;
          }
        }
        st.prev = clk;
        bitsOf(st.count, spec.bits).forEach((bit, i) => io.drive(spec.pins.q[i], bit));
        io.drive(spec.pins.rco, st.count === spec.mod - 1 && b(io.input(spec.pins.ent)) === 1 ? 1 : 0);
      };

    case 'ripple':
      return (io) => {
        const st = io.state;
        if (!st.counts) st.counts = spec.units.map(() => 0);
        if (!st.prev) st.prev = {};
        spec.units.forEach((unit, ui) => {
          const clrActive = spec.clearActive === 'high' ? 1 : 0;
          if (b(io.input(unit.clr)) === clrActive) st.counts[ui] = 0;
          const clk = b(io.input(unit.clk));
          const prev = st.prev[ui] as 0 | 1 | undefined;
          if (
            prev !== undefined &&
            (spec.edge === 'falling' ? prev === 1 && clk === 0 : prev === 0 && clk === 1)
          ) {
            st.counts[ui] = (st.counts[ui] + 1) & 0xf;
          }
          st.prev[ui] = clk;
          unit.q.forEach((pin, i) => io.drive(pin, L((st.counts[ui] >> i) & 1)));
        });
      };

    case 'shift164':
      return (io) => {
        const st = io.state;
        if (st.q === undefined) st.q = 0;
        if (b(io.input(spec.clr)) === 0) st.q = 0;
        const clk = b(io.input(spec.clk));
        if (st.prev !== undefined && st.prev === 0 && clk === 1) {
          const bit = b(io.input(spec.a)) & b(io.input(spec.b));
          st.q = ((st.q << 1) | bit) & 0xff;
        }
        st.prev = clk;
        spec.q.forEach((pin, i) => io.drive(pin, L((st.q >> i) & 1)));
      };

    case 'shift595':
      return (io) => {
        const st = io.state;
        if (st.shift === undefined) st.shift = 0;
        if (st.store === undefined) st.store = 0;
        if (b(io.input(spec.srclr)) === 0) st.shift = 0;
        const srclk = b(io.input(spec.srclk));
        if (st.prevSr !== undefined && st.prevSr === 0 && srclk === 1) {
          st.shift = ((st.shift << 1) | b(io.input(spec.ser))) & 0xff;
        }
        st.prevSr = srclk;
        const rclk = b(io.input(spec.rclk));
        if (st.prevRc !== undefined && st.prevRc === 0 && rclk === 1) {
          st.store = st.shift;
        }
        st.prevRc = rclk;
        io.drive(spec.qh, L((st.shift >> 7) & 1));
        if (b(io.input(spec.oe)) === 0) {
          spec.q.forEach((pin, i) => io.drive(pin, L((st.store >> i) & 1)));
        } else {
          for (const pin of spec.q) io.drive(pin, 'z');
        }
      };

    case 'decoder3to8':
      return (io) => {
        const on = b(io.input(spec.g1)) === 1 && b(io.input(spec.g2a)) === 0 && b(io.input(spec.g2b)) === 0;
        const sel = b(io.input(spec.a)) | (b(io.input(spec.b)) << 1) | (b(io.input(spec.c)) << 2);
        spec.y.forEach((pin, i) => io.drive(pin, on && i === sel ? 0 : 1));
      };

    case 'decoder2to4':
      return (io) => {
        for (const unit of spec.units) {
          const on = b(io.input(unit.g)) === 0;
          const sel = b(io.input(unit.a)) | (b(io.input(unit.b)) << 1);
          unit.y.forEach((pin, i) => io.drive(pin, on && i === sel ? 0 : 1));
        }
      };

    case 'mux8':
      return (io) => {
        const on = b(io.input(spec.g)) === 0;
        const sel = b(io.input(spec.a)) | (b(io.input(spec.b)) << 1) | (b(io.input(spec.c)) << 2);
        const y = on ? b(io.input(spec.d[sel])) : 0;
        io.drive(spec.y, y);
        io.drive(spec.w, y === 1 ? 0 : 1);
      };

    case 'bcd7':
      return (io) => {
        const lt = b(io.input(spec.lt));
        const bi = b(io.input(spec.bi));
        const value =
          b(io.input(spec.a)) |
          (b(io.input(spec.b)) << 1) |
          (b(io.input(spec.c)) << 2) |
          (b(io.input(spec.d)) << 3);
        const segments = bi === 0 ? [] : lt === 0 ? ['a', 'b', 'c', 'd', 'e', 'f', 'g'] : SEGMENT_TABLE[value] ?? [];
        const onLevel: LogicLevel = spec.active === 'low' ? 0 : 1;
        const offLevel: LogicLevel = spec.active === 'low' ? 1 : 0;
        spec.seg.forEach((pin, i) => {
          const name = ['a', 'b', 'c', 'd', 'e', 'f', 'g'][i];
          io.drive(pin, segments.includes(name) ? onLevel : offLevel);
        });
      };

    case 'adder4':
      return (io) => {
        const a = valueOf(spec.a.map((pin) => b(io.input(pin))));
        const bVal = valueOf(spec.b.map((pin) => b(io.input(pin))));
        const sum = a + bVal + b(io.input(spec.cin));
        bitsOf(sum, 4).forEach((bit, i) => io.drive(spec.s[i], bit));
        io.drive(spec.cout, sum > 0xf ? 1 : 0);
      };

    case 'comparator4':
      return (io) => {
        const a = valueOf(spec.a.map((pin) => b(io.input(pin))));
        const bVal = valueOf(spec.b.map((pin) => b(io.input(pin))));
        const tri = (pin: string, fallback: 0 | 1): 0 | 1 => {
          const level = io.input(pin);
          return level === 0 ? 0 : level === 1 ? 1 : fallback;
        };
        if (a > bVal) {
          io.drive(spec.ogt, 1);
          io.drive(spec.oeq, 0);
          io.drive(spec.olt, 0);
        } else if (a < bVal) {
          io.drive(spec.ogt, 0);
          io.drive(spec.oeq, 0);
          io.drive(spec.olt, 1);
        } else {
          io.drive(spec.ogt, tri(spec.igt, 0));
          io.drive(spec.oeq, tri(spec.ieq, 1));
          io.drive(spec.olt, tri(spec.ilt, 0));
        }
      };

    case 'cd4017':
      return (io) => {
        const st = io.state;
        if (st.index === undefined) st.index = 0;
        if (b(io.input(spec.reset)) === 1) st.index = 0;
        const clk = b(io.input(spec.clk));
        if (st.prev !== undefined && st.prev === 0 && clk === 1 && b(io.input(spec.clkEn)) === 0) {
          st.index = (st.index + 1) % 10;
        }
        st.prev = clk;
        spec.q.forEach((pin, i) => io.drive(pin, i === st.index ? 1 : 0));
        io.drive(spec.cout, st.index < 5 ? 1 : 0);
      };

    default:
      return () => undefined;
  }
}

export const GATE_OP_LABEL: Record<GateOp, string> = {
  and: '与',
  or: '或',
  nand: '与非',
  nor: '或非',
  xor: '异或',
  xnor: '同或',
  not: '非',
  buffer: '缓冲',
};
