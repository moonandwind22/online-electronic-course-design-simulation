import type { Level, Strength } from './resolver';
import { cmos, ttl } from './resolver';

export interface ModelEnv {
  type: string;
  read(pin: string): Level;
  readBit(pin: string): 0 | 1;
  write(pin: string, value: 0 | 1 | 'Z', strength?: Strength): void;
  state: Record<string, any>;
  display: Record<string, any>;
  time: number;
  paramNumber(key: string, fallback: number): number;
  paramString(key: string, fallback: string): string;
  partState: Record<string, any>;
  warn(msg: string): void;
}

export type ModelFn = (env: ModelEnv) => void;

type GateOp = 'nand' | 'and' | 'or' | 'nor' | 'xor' | 'xnor' | 'not' | 'buf';

interface GateSpec {
  op: GateOp;
  groups: [string, string, string][];
  oc?: boolean;
}

const GATE_GROUPS: Record<string, GateSpec> = {
  '74LS00': {
    op: 'nand',
    groups: [
      ['1A', '1B', '1Y'],
      ['2A', '2B', '2Y'],
      ['3A', '3B', '3Y'],
      ['4A', '4B', '4Y'],
    ],
  },
  '74LS03': {
    op: 'nand',
    oc: true,
    groups: [
      ['1A', '1B', '1Y'],
      ['2A', '2B', '2Y'],
      ['3A', '3B', '3Y'],
      ['4A', '4B', '4Y'],
    ],
  },
  '74LS37': {
    op: 'nand',
    groups: [
      ['1A', '1B', '1Y'],
      ['2A', '2B', '2Y'],
      ['3A', '3B', '3Y'],
      ['4A', '4B', '4Y'],
    ],
  },
  '74LS38': {
    op: 'nand',
    oc: true,
    groups: [
      ['1A', '1B', '1Y'],
      ['2A', '2B', '2Y'],
      ['3A', '3B', '3Y'],
      ['4A', '4B', '4Y'],
    ],
  },
  '74LS132': {
    op: 'nand',
    groups: [
      ['1A', '1B', '1Y'],
      ['2A', '2B', '2Y'],
      ['3A', '3B', '3Y'],
      ['4A', '4B', '4Y'],
    ],
  },
  '74LS08': {
    op: 'and',
    groups: [
      ['1A', '1B', '1Y'],
      ['2A', '2B', '2Y'],
      ['3A', '3B', '3Y'],
      ['4A', '4B', '4Y'],
    ],
  },
  '74LS09': {
    op: 'and',
    oc: true,
    groups: [
      ['1A', '1B', '1Y'],
      ['2A', '2B', '2Y'],
      ['3A', '3B', '3Y'],
      ['4A', '4B', '4Y'],
    ],
  },
  '74LS32': {
    op: 'or',
    groups: [
      ['1A', '1B', '1Y'],
      ['2A', '2B', '2Y'],
      ['3A', '3B', '3Y'],
      ['4A', '4B', '4Y'],
    ],
  },
  '74LS86': {
    op: 'xor',
    groups: [
      ['1A', '1B', '1Y'],
      ['2A', '2B', '2Y'],
      ['3A', '3B', '3Y'],
      ['4A', '4B', '4Y'],
    ],
  },
  '74LS266': {
    op: 'xnor',
    oc: true,
    groups: [
      ['1A', '1B', '1Y'],
      ['2A', '2B', '2Y'],
      ['3A', '3B', '3Y'],
      ['4A', '4B', '4Y'],
    ],
  },
  '74LS02': {
    op: 'nor',
    groups: [
      ['1A', '1B', '1Y'],
      ['2A', '2B', '2Y'],
      ['3A', '3B', '3Y'],
      ['4A', '4B', '4Y'],
    ],
  },
  '74LS33': {
    op: 'nor',
    oc: true,
    groups: [
      ['1A', '1B', '1Y'],
      ['2A', '2B', '2Y'],
      ['3A', '3B', '3Y'],
      ['4A', '4B', '4Y'],
    ],
  },
  '74LS10': {
    op: 'nand',
    groups: [
      ['1A', '1B', '1Y'],
      ['2A', '2B', '2Y'],
      ['3A', '3B', '3Y'],
    ],
  },
  '74LS11': {
    op: 'and',
    groups: [
      ['1A', '1B', '1Y'],
      ['2A', '2B', '2Y'],
      ['3A', '3B', '3Y'],
    ],
  },
  '74LS27': {
    op: 'nor',
    groups: [
      ['1A', '1B', '1Y'],
      ['2A', '2B', '2Y'],
      ['3A', '3B', '3Y'],
    ],
  },
  '74LS20': {
    op: 'nand',
    groups: [
      ['1A', '1B', '1Y'],
      ['2A', '2B', '2Y'],
    ],
  },
  '74LS21': {
    op: 'and',
    groups: [
      ['1A', '1B', '1Y'],
      ['2A', '2B', '2Y'],
    ],
  },
  '74LS04': {
    op: 'not',
    groups: [
      ['1A', '1A', '1Y'],
      ['2A', '2A', '2Y'],
      ['3A', '3A', '3Y'],
      ['4A', '4A', '4Y'],
      ['5A', '5A', '5Y'],
      ['6A', '6A', '6Y'],
    ],
  },
  '74LS05': {
    op: 'not',
    oc: true,
    groups: [
      ['1A', '1A', '1Y'],
      ['2A', '2A', '2Y'],
      ['3A', '3A', '3Y'],
      ['4A', '4A', '4Y'],
      ['5A', '5A', '5Y'],
      ['6A', '6A', '6Y'],
    ],
  },
  '74LS06': {
    op: 'not',
    oc: true,
    groups: [
      ['1A', '1A', '1Y'],
      ['2A', '2A', '2Y'],
      ['3A', '3A', '3Y'],
      ['4A', '4A', '4Y'],
      ['5A', '5A', '5Y'],
      ['6A', '6A', '6Y'],
    ],
  },
  '74LS07': {
    op: 'buf',
    oc: true,
    groups: [
      ['1A', '1A', '1Y'],
      ['2A', '2A', '2Y'],
      ['3A', '3A', '3Y'],
      ['4A', '4A', '4Y'],
      ['5A', '5A', '5Y'],
      ['6A', '6A', '6Y'],
    ],
  },
  CD4011: {
    op: 'nand',
    groups: [
      ['1A', '1B', '1Y'],
      ['2A', '2B', '2Y'],
      ['3A', '3B', '3Y'],
      ['4A', '4B', '4Y'],
    ],
  },
  CD4030: {
    op: 'xor',
    groups: [
      ['1A', '1B', '1Y'],
      ['2A', '2B', '2Y'],
      ['3A', '3B', '3Y'],
      ['4A', '4B', '4Y'],
    ],
  },
};

function gateOut(op: GateOp, a: 0 | 1, b: 0 | 1): 0 | 1 {
  switch (op) {
    case 'nand':
      return a && b ? 0 : 1;
    case 'and':
      return a && b ? 1 : 0;
    case 'or':
      return a || b ? 1 : 0;
    case 'nor':
      return a || b ? 0 : 1;
    case 'xor':
      return a !== b ? 1 : 0;
    case 'xnor':
      return a === b ? 1 : 0;
    case 'not':
      return a ? 0 : 1;
    case 'buf':
      return a;
  }
}

function evaluateGate(env: ModelEnv, spec: GateSpec): void {
  for (const [aPin, bPin, yPin] of spec.groups) {
    const a = env.readBit(aPin);
    const b = env.readBit(bPin);
    const y = gateOut(spec.op, a, b);
    if (spec.oc) env.write(yPin, y === 0 ? 0 : 'Z', 'strong');
    else env.write(yPin, y);
  }
}

function rising(env: ModelEnv, key: string, value: 0 | 1): boolean {
  const prev = env.state[key] as 0 | 1 | undefined;
  env.state[key] = value;
  return prev === 0 && value === 1;
}

function writeBits(env: ModelEnv, pins: string[], value: number): void {
  pins.forEach((pin, i) => env.write(pin, ((value >> i) & 1) as 0 | 1));
}

function readBits(env: ModelEnv, pins: string[]): number {
  let v = 0;
  pins.forEach((pin, i) => {
    if (env.readBit(pin)) v |= 1 << i;
  });
  return v;
}

function octalLatch(
  env: ModelEnv,
  mode: 'latch' | 'edge' | 'inverted',
  oePin: string | null,
  ctrlPin: string,
): void {
  const oe = oePin ? ttl(env.read(oePin)) : 0;
  const dPins = Array.from({ length: 8 }, (_, i) => `${i + 1}D`);
  const qPins = Array.from({ length: 8 }, (_, i) => (mode === 'inverted' ? '~' : '') + `${i + 1}Q`);
  if (oe === 1) {
    for (const q of qPins) env.write(q, 'Z');
    return;
  }
  const ctrl = ttl(env.read(ctrlPin));
  let load = false;
  if (mode === 'latch') load = ctrl === 1;
  else load = rising(env, 'prevCtrl', ctrl);
  if (load) env.state.q = readBits(env, dPins);
  const q = (env.state.q as number | undefined) ?? 0;
  for (let i = 0; i < 8; i++) {
    const bit = (q >> i) & 1;
    env.write(qPins[i], (mode === 'inverted' ? (bit ? 0 : 1) : bit) as 0 | 1);
  }
}

const SEG_TABLE: Record<number, string> = {
  0: 'abcdef',
  1: 'bc',
  2: 'abdeg',
  3: 'abcdg',
  4: 'bcfg',
  5: 'acdfg',
  6: 'acdefg',
  7: 'abc',
  8: 'abcdefg',
  9: 'abcdfg',
};

function bcdToSeg(env: ModelEnv, activeHigh: boolean): void {
  const digit = readBits(env, ['A', 'B', 'C', 'D']);
  const lt = ttl(env.read('~LT'));
  const bi = ttl(env.read('~BI'));
  const rbi = ttl(env.read('~RBI'));
  let segs = SEG_TABLE[digit] ?? '';
  if (bi === 0) segs = '';
  else if (lt === 0) segs = 'abcdefg';
  else if (rbi === 0 && digit === 0) segs = '';
  for (const s of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) {
    const on = segs.includes(s);
    const pin = activeHigh ? s : `~${s}`;
    env.write(pin, (activeHigh ? (on ? 1 : 0) : on ? 0 : 1) as 0 | 1);
  }
  env.display.digit = digit;
  env.display.segs = segs;
}

export function evaluateModel(env: ModelEnv): void {
  const t = env.type;
  const g = GATE_GROUPS[t];
  if (g) {
    evaluateGate(env, g);
    return;
  }

  switch (t) {
    case '74LS30': {
      let all = true;
      for (const p of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']) all = all && ttl(env.read(p)) === 1;
      env.write('Y', all ? 0 : 1);
      return;
    }
    case '74LS125':
    case '74LS126': {
      const activeHigh = t === '74LS126';
      for (let i = 1; i <= 4; i++) {
        const oe = ttl(env.read(`${i}OE`));
        const enabled = activeHigh ? oe === 1 : oe === 0;
        if (enabled) env.write(`${i}Y`, ttl(env.read(`${i}A`)));
        else env.write(`${i}Y`, 'Z');
      }
      return;
    }
    case '74LS240':
    case '74LS241':
    case '74LS244': {
      const inv = t === '74LS240';
      const oe1 = ttl(env.read('1OE'));
      const oe2 = ttl(env.read('2OE'));
      for (let i = 1; i <= 8; i++) {
        const oe = i <= 4 ? oe1 : oe2;
        if (oe === 0) {
          const a = ttl(env.read(`${i}A`));
          env.write(`${i}Y`, (inv ? (a ? 0 : 1) : a) as 0 | 1);
        } else {
          env.write(`${i}Y`, 'Z');
        }
      }
      return;
    }
    case '74LS245':
    case '74LS640':
    case '74LS645': {
      const inv = t === '74LS640';
      const oe = ttl(env.read('OE'));
      const dir = ttl(env.read('DIR'));
      for (let i = 1; i <= 8; i++) {
        const aPin = `A${i}`;
        const bPin = `B${i}`;
        if (oe === 1) {
          env.write(aPin, 'Z');
          env.write(bPin, 'Z');
          continue;
        }
        if (dir === 1) {
          const a = ttl(env.read(aPin));
          env.write(bPin, (inv ? (a ? 0 : 1) : a) as 0 | 1);
          env.write(aPin, 'Z');
        } else {
          const b = ttl(env.read(bPin));
          env.write(aPin, (inv ? (b ? 0 : 1) : b) as 0 | 1);
          env.write(bPin, 'Z');
        }
      }
      return;
    }
    case '74LS74': {
      for (const stage of ['1', '2'] as const) {
        const qKey = `q${stage}`;
        const prevKey = `prev${stage}`;
        const clr = ttl(env.read(`~${stage}CLR`));
        const pre = ttl(env.read(`~${stage}PRE`));
        const d = ttl(env.read(`${stage}D`));
        const clk = ttl(env.read(`${stage}CLK`));
        let q = (env.state[qKey] as 0 | 1 | undefined) ?? 0;
        const edge = rising(env, prevKey, clk);
        if (clr === 0) q = 0;
        else if (pre === 0) q = 1;
        else if (edge) q = d;
        env.state[qKey] = q;
        env.write(`${stage}Q`, q);
        env.write(`~${stage}Q`, (q ? 0 : 1) as 0 | 1);
      }
      return;
    }
    case '74LS273':
    case '74LS374':
    case '74LS534': {
      const inv = t === '74LS534';
      if (t === '74LS273') {
        const clr = ttl(env.read('~CLR'));
        if (clr === 0) env.state.q = 0;
      }
      octalLatch(env, inv ? 'inverted' : 'edge', t === '74LS273' ? null : '~OE', 'CLK');
      return;
    }
    case '74LS373':
    case '74LS573':
      octalLatch(env, 'latch', '~OE', 'LE');
      return;
    case '74LS574':
      octalLatch(env, 'edge', '~OE', 'CLK');
      return;
    case '74LS173': {
      const clr = ttl(env.read('~CLR'));
      if (clr === 0) env.state.q = 0;
      const enabled = ttl(env.read('~EN1')) === 0 && ttl(env.read('~EN2')) === 0;
      const clk = ttl(env.read('CLK'));
      if (rising(env, 'prevClk', clk) && enabled) env.state.q = readBits(env, ['1D', '2D', '3D', '4D']);
      const q = (env.state.q as number | undefined) ?? 0;
      const oe = ttl(env.read('~1OE')) === 1 || ttl(env.read('~2OE')) === 1;
      for (let i = 0; i < 4; i++) {
        env.write(`${i + 1}Q`, oe ? 'Z' : (((q >> i) & 1) as 0 | 1));
      }
      return;
    }
    case '74LS160':
    case '74LS161':
    case '74LS162':
    case '74LS163': {
      const decade = t === '74LS160' || t === '74LS162';
      const syncClear = t === '74LS162' || t === '74LS163';
      const mod = decade ? 10 : 16;
      const clr = ttl(env.read('~CLR'));
      const clk = ttl(env.read('CLK'));
      const edge = rising(env, 'prevClk', clk);
      let count = (env.state.count as number | undefined) ?? 0;
      if (!syncClear && clr === 0) count = 0;
      if (edge) {
        if (syncClear && clr === 0) count = 0;
        else if (ttl(env.read('~LOAD')) === 0) count = readBits(env, ['A', 'B', 'C', 'D']) % mod;
        else if (ttl(env.read('ENP')) === 1 && ttl(env.read('ENT')) === 1) count = (count + 1) % mod;
      }
      env.state.count = count;
      writeBits(env, ['QA', 'QB', 'QC', 'QD'], count);
      env.write('RCO', ttl(env.read('ENT')) === 1 && count === mod - 1 ? 1 : 0);
      env.display.count = count;
      return;
    }
    case '74LS164': {
      if (ttl(env.read('~CLR')) === 0) env.state.bits = 0;
      const clk = ttl(env.read('CLK'));
      if (rising(env, 'prevClk', clk)) {
        const serial = ttl(env.read('A')) && ttl(env.read('B')) ? 1 : 0;
        env.state.bits = (((env.state.bits as number | undefined) ?? 0) << 1) | serial;
        env.state.bits = (env.state.bits as number) & 0xff;
      }
      const bits = (env.state.bits as number | undefined) ?? 0;
      for (let i = 0; i < 8; i++) env.write(`Q${'ABCDEFGH'[i]}`, (((bits >> i) & 1) as 0 | 1));
      return;
    }
    case '74LS165': {
      const shld = ttl(env.read('~SHLD'));
      const clk = ttl(env.read('CLK')) && ttl(env.read('CLKINH')) === 0 ? 1 : 0;
      const edge = rising(env, 'prevClk', clk);
      let bits = (env.state.bits as number | undefined) ?? 0;
      if (edge) {
        if (shld === 0) {
          bits = readBits(env, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
        } else {
          bits = ((bits << 1) | ttl(env.read('SER'))) & 0xff;
        }
      }
      env.state.bits = bits;
      const qh = (bits >> 7) & 1;
      env.write('QH', qh as 0 | 1);
      env.write('~QH', (qh ? 0 : 1) as 0 | 1);
      env.display.bits = bits;
      return;
    }
    case '74LS194': {
      if (ttl(env.read('~CLR')) === 0) env.state.bits = 0;
      const clk = ttl(env.read('CLK'));
      let bits = ((env.state.bits as number | undefined) ?? 0) & 0xf;
      if (rising(env, 'prevClk', clk)) {
        const s0 = ttl(env.read('S0'));
        const s1 = ttl(env.read('S1'));
        if (s1 === 1 && s0 === 1) bits = readBits(env, ['A', 'B', 'C', 'D']);
        else if (s1 === 0 && s0 === 1) bits = ((bits << 1) | ttl(env.read('SR'))) & 0xf;
        else if (s1 === 1 && s0 === 0) bits = ((bits >> 1) | (ttl(env.read('SL')) << 3)) & 0xf;
      }
      env.state.bits = bits;
      writeBits(env, ['QA', 'QB', 'QC', 'QD'], bits);
      return;
    }
    case '74HC595': {
      if (ttl(env.read('~SRCLR')) === 0) env.state.bits = 0;
      const sclk = ttl(env.read('SRCLK'));
      if (rising(env, 'prevSclk', sclk)) {
        env.state.bits = ((((env.state.bits as number | undefined) ?? 0) << 1) | ttl(env.read('SER'))) & 0xff;
      }
      const rclk = ttl(env.read('RCLK'));
      if (rising(env, 'prevRclk', rclk)) env.state.latch = env.state.bits ?? 0;
      const bits = (env.state.bits as number | undefined) ?? 0;
      const latch = (env.state.latch as number | undefined) ?? 0;
      const oe = ttl(env.read('~OE'));
      for (let i = 0; i < 8; i++) {
        const pin = `Q${'ABCDEFGH'[i]}`;
        env.write(pin, oe === 0 ? ((((latch >> i) & 1) as 0 | 1)) : 'Z');
      }
      env.write("QH'", ((bits >> 7) & 1) as 0 | 1);
      return;
    }
    case '74LS138': {
      const enabled = ttl(env.read('G1')) === 1 && ttl(env.read('~G2A')) === 0 && ttl(env.read('~G2B')) === 0;
      const sel = readBits(env, ['A', 'B', 'C']);
      for (let i = 0; i < 8; i++) {
        env.write(`~Y${i}`, enabled && i === sel ? 0 : 1);
      }
      return;
    }
    case '74LS139': {
      for (const grp of ['1', '2']) {
        const enabled = ttl(env.read(`~${grp}E`)) === 0;
        const sel = readBits(env, [`${grp}A`, `${grp}B`]);
        for (let i = 0; i < 4; i++) {
          env.write(`~${grp}Y${i}`, enabled && i === sel ? 0 : 1);
        }
      }
      return;
    }
    case '74LS47':
      bcdToSeg(env, false);
      return;
    case '74LS48':
      bcdToSeg(env, true);
      return;
    case '74LS151': {
      const enabled = ttl(env.read('~G')) === 0;
      const sel = readBits(env, ['A', 'B', 'C']);
      const y = enabled ? ttl(env.read(`D${sel}`)) : 0;
      env.write('Y', y);
      env.write('~Y', (y ? 0 : 1) as 0 | 1);
      return;
    }
    case '74LS157': {
      const enabled = ttl(env.read('~G')) === 0;
      const s = ttl(env.read('S'));
      for (let i = 1; i <= 4; i++) {
        const y = enabled ? ttl(env.read(`${i}${s ? 'B' : 'A'}`)) : 0;
        env.write(`${i}Y`, y);
      }
      return;
    }
    case 'CD4013': {
      for (const stage of ['1', '2'] as const) {
        const qKey = `q${stage}`;
        const prevKey = `prev${stage}`;
        const r = ttl(env.read(`${stage}R`));
        const s = ttl(env.read(`${stage}S`));
        const clk = cmos(env.read(`${stage}CLK`));
        const d = cmos(env.read(`${stage}D`));
        let q = (env.state[qKey] as 0 | 1 | undefined) ?? 0;
        const edge = rising(env, prevKey, clk);
        if (r === 1) q = 0;
        else if (s === 1) q = 1;
        else if (edge) q = d;
        env.state[qKey] = q;
        env.write(`${stage}Q`, q);
        env.write(`~${stage}Q`, (q ? 0 : 1) as 0 | 1);
      }
      return;
    }
    case 'CD4017': {
      if (cmos(env.read('RST')) === 1) env.state.count = 0;
      const clk = cmos(env.read('CLK')) && cmos(env.read('CLKINH')) === 0 ? 1 : 0;
      if (rising(env, 'prevClk', clk)) {
        env.state.count = (((env.state.count as number | undefined) ?? 0) + 1) % 10;
      }
      const count = (env.state.count as number | undefined) ?? 0;
      for (let i = 0; i < 10; i++) env.write(`Q${i}`, (i === count ? 1 : 0) as 0 | 1);
      env.write('CO', (count <= 4 ? 1 : 0) as 0 | 1);
      env.display.count = count;
      return;
    }
    case 'NE555': {
      const resetLow = ttl(env.read('~RESET')) === 0;
      const trigLow = ttl(env.read('TRIG')) === 0;
      const thrHigh = ttl(env.read('THR')) === 1;
      let out = (env.state.out as 0 | 1 | undefined) ?? 0;
      if (resetLow) out = 0;
      else if (trigLow) out = 1;
      else if (thrHigh) out = 0;
      env.state.out = out;
      env.write('OUT', out);
      env.write('DIS', out ? 'Z' : 0, 'strong');
      env.display.on = out === 1;
      return;
    }
    case 'VCC':
      env.write('VCC', 1, 'strong');
      return;
    case 'GND':
      env.write('GND', 0, 'strong');
      return;
    case 'LED': {
      const lit = env.read('A') === 1 && env.read('K') === 0;
      env.display.lit = lit;
      return;
    }
    case 'LED_BAR': {
      const k = env.read('K');
      const bits: boolean[] = [];
      for (let i = 1; i <= 8; i++) bits.push(env.read(`A${i}`) === 1 && k === 0);
      env.display.bits = bits;
      return;
    }
    case 'SEG7': {
      const common = env.paramString('common', 'ca');
      const com = env.read('COM');
      const segs: Record<string, boolean> = {};
      for (const s of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp']) {
        const v = env.read(s);
        segs[s] = common === 'ca' ? com === 1 && v === 0 : com === 0 && v === 1;
      }
      env.display.segs = segs;
      env.display.common = common;
      return;
    }
    case 'SWITCH': {
      const on = !!env.partState.on;
      env.write('OUT', on ? 0 : 1, on ? 'strong' : 'weak');
      env.display.on = on;
      return;
    }
    case 'BUTTON': {
      const pressed = !!env.partState.pressed;
      env.write('OUT', pressed ? 0 : 1, pressed ? 'strong' : 'weak');
      env.display.pressed = pressed;
      return;
    }
    case 'CLOCK': {
      const freq = Math.max(0.1, env.paramNumber('freq', 1));
      const period = 1 / freq;
      const half = period / 2;
      const level = env.time % period < half ? 1 : 0;
      env.write('OUT', level as 0 | 1, 'strong');
      env.state.nextEdge = (Math.floor(env.time / half) + 1) * half;
      env.display.freq = freq;
      env.display.level = level;
      return;
    }
    case 'PROBE': {
      const v = env.read('IN');
      env.display.level = v;
      return;
    }
    case 'BUZZER': {
      const on = env.read('IN') === 1;
      env.display.on = on;
      return;
    }
    case 'TRAFFIC': {
      env.display.r = env.read('R') === 1;
      env.display.y = env.read('Y') === 1;
      env.display.g = env.read('G') === 1;
      return;
    }
    case 'RELAY': {
      const coil = env.read('IN') === 1;
      const com = env.read('COM');
      env.write('NO', coil ? com : 'Z', 'strong');
      env.write('NC', coil ? 'Z' : com, 'strong');
      env.display.coil = coil;
      return;
    }
    case 'MOTOR': {
      const on = env.read('IN') === 1;
      env.display.spin = on;
      return;
    }
    default:
      return;
  }
}

export const MODEL_TYPES = new Set([
  ...Object.keys(GATE_GROUPS),
  '74LS30',
  '74LS125',
  '74LS126',
  '74LS240',
  '74LS241',
  '74LS244',
  '74LS245',
  '74LS640',
  '74LS645',
  '74LS74',
  '74LS173',
  '74LS273',
  '74LS373',
  '74LS374',
  '74LS534',
  '74LS573',
  '74LS574',
  '74LS160',
  '74LS161',
  '74LS162',
  '74LS163',
  '74LS164',
  '74LS165',
  '74LS194',
  '74HC595',
  '74LS138',
  '74LS139',
  '74LS47',
  '74LS48',
  '74LS151',
  '74LS157',
  'CD4013',
  'CD4017',
  'NE555',
  'VCC',
  'GND',
  'LED',
  'LED_BAR',
  'SEG7',
  'SWITCH',
  'BUTTON',
  'CLOCK',
  'PROBE',
  'BUZZER',
  'TRAFFIC',
  'RELAY',
  'MOTOR',
]);
