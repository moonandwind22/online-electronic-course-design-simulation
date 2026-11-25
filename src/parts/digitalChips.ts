import type { Domain } from '../model/types';
import type { PinKind } from './types';

export interface ChipPin {
  id: string;
  name: string;
  kind: PinKind;
}

export type GateOp = 'and' | 'or' | 'nand' | 'nor' | 'xor' | 'xnor' | 'not' | 'buffer';

export interface GateSpec {
  op: GateOp;
  inputs: string[];
  output: string;
  oc?: boolean;
}

export interface BufferUnit {
  a: string;
  y: string;
  oe?: string;
  active?: 'low' | 'high';
  invert?: boolean;
}

export interface DffUnit {
  d: string;
  q: string;
  qn?: string;
  clk?: string;
  pre?: string;
  clr?: string;
}

export type ChipModelSpec =
  | { kind: 'gates'; gates: GateSpec[] }
  | { kind: 'buffers'; units: BufferUnit[] }
  | { kind: 'transceiver'; dir: string; oe: string; a: string[]; b: string[] }
  | {
      kind: 'dff';
      units: DffUnit[];
      clk?: string;
      pre?: string;
      clr?: string;
      edge: 'rising' | 'falling';
    }
  | {
      kind: 'register';
      d: string[];
      q: string[];
      clk: string;
      clr?: string;
      oe?: string;
      clrActive?: 'low' | 'high';
      oeActive?: 'low' | 'high';
    }
  | { kind: 'latch'; d: string[]; q: string[]; le: string; oe?: string; oeActive?: 'low' | 'high' }
  | {
      kind: 'counter';
      bits: number;
      mod: number;
      clear: 'async' | 'sync';
      pins: {
        clk: string;
        clr: string;
        load: string;
        enp: string;
        ent: string;
        a: string[];
        q: string[];
        rco: string;
      };
    }
  | {
      kind: 'ripple';
      units: Array<{ clk: string; clr: string; q: string[] }>;
      edge: 'falling' | 'rising';
      clearActive: 'low' | 'high';
    }
  | { kind: 'shift164'; a: string; b: string; clk: string; clr: string; q: string[] }
  | {
      kind: 'shift595';
      ser: string;
      srclk: string;
      rclk: string;
      srclr: string;
      oe: string;
      q: string[];
      qh: string;
    }
  | {
      kind: 'decoder3to8';
      a: string;
      b: string;
      c: string;
      g1: string;
      g2a: string;
      g2b: string;
      y: string[];
    }
  | { kind: 'decoder2to4'; units: Array<{ a: string; b: string; g: string; y: string[] }> }
  | {
      kind: 'mux8';
      d: string[];
      a: string;
      b: string;
      c: string;
      g: string;
      y: string;
      w: string;
    }
  | {
      kind: 'bcd7';
      a: string;
      b: string;
      c: string;
      d: string;
      lt: string;
      bi: string;
      rbi: string;
      seg: string[];
      active: 'low' | 'high';
    }
  | { kind: 'adder4'; a: string[]; b: string[]; cin: string; s: string[]; cout: string }
  | {
      kind: 'comparator4';
      a: string[];
      b: string[];
      ilt: string;
      ieq: string;
      igt: string;
      olt: string;
      oeq: string;
      ogt: string;
    }
  | { kind: 'cd4017'; clk: string; clkEn: string; reset: string; q: string[]; cout: string };

export interface DigitalChipSpec {
  type: string;
  name: string;
  subtitle: string;
  category: string;
  description: string;
  tags: string[];
  domains?: Domain[];
  left: ChipPin[];
  right: ChipPin[];
  model: ChipModelSpec;
}

const p = (id: string, name: string = id, kind: PinKind = 'passive'): ChipPin => ({ id, name, kind });
const inp = (id: string): ChipPin => p(id, id, 'input');
const out = (id: string): ChipPin => p(id, id, 'output');
const pw = (id: string): ChipPin => p(id, id, 'power');
const gate = (op: GateOp, inputs: string[], output: string, oc = false): GateSpec => ({
  op,
  inputs,
  output,
  oc,
});

const DOMAINS: Domain[] = ['digital', 'mcs51', 'stm32'];

// ---------- 通用门芯片构造 ----------

function quad2(
  type: string,
  name: string,
  subtitle: string,
  op: GateOp,
  oc = false,
  norPinout = false,
): DigitalChipSpec {
  const left: ChipPin[] = norPinout
    ? [
        out('1Y'), inp('1A'), inp('1B'),
        out('2Y'), inp('2A'), inp('2B'),
        pw('GND'),
      ]
    : [
        inp('1A'), inp('1B'), out('1Y'),
        inp('2A'), inp('2B'), out('2Y'),
        pw('GND'),
      ];
  const right: ChipPin[] = [
    pw('VCC'),
    inp('4B'), inp('4A'), out('4Y'),
    inp('3B'), inp('3A'), out('3Y'),
  ];
  return {
    type,
    name,
    subtitle,
    category: '逻辑门',
    description: `${subtitle}，四组二输入，标准 14 脚 DIP 封装。`,
    tags: ['gate', op, type.toLowerCase()],
    domains: DOMAINS,
    left,
    right,
    model: {
      kind: 'gates',
      gates: [
        gate(op, ['1A', '1B'], '1Y', oc),
        gate(op, ['2A', '2B'], '2Y', oc),
        gate(op, ['3A', '3B'], '3Y', oc),
        gate(op, ['4A', '4B'], '4Y', oc),
      ],
    },
  };
}

function hexInv(type: string, name: string, subtitle: string, oc = false): DigitalChipSpec {
  const gates: GateSpec[] = Array.from({ length: 6 }, (_, i) =>
    gate('not', [`${i + 1}A`], `${i + 1}Y`, oc),
  );
  return {
    type,
    name,
    subtitle,
    category: '逻辑门',
    description: `${subtitle}，六路反相器，标准 14 脚 DIP 封装。`,
    tags: ['gate', 'not', type.toLowerCase()],
    domains: DOMAINS,
    left: [inp('1A'), out('1Y'), inp('2A'), out('2Y'), inp('3A'), out('3Y'), pw('GND')],
    right: [pw('VCC'), inp('6A'), out('6Y'), inp('5A'), out('5Y'), inp('4A'), out('4Y')],
    model: { kind: 'gates', gates },
  };
}

function hexBuf(type: string, name: string, subtitle: string, oc = false): DigitalChipSpec {
  const gates: GateSpec[] = Array.from({ length: 6 }, (_, i) =>
    gate('buffer', [`${i + 1}A`], `${i + 1}Y`, oc),
  );
  return {
    type,
    name,
    subtitle,
    category: '逻辑门',
    description: `${subtitle}，六路同相缓冲器，标准 14 脚 DIP 封装。`,
    tags: ['buffer', type.toLowerCase()],
    domains: DOMAINS,
    left: [inp('1A'), out('1Y'), inp('2A'), out('2Y'), inp('3A'), out('3Y'), pw('GND')],
    right: [pw('VCC'), inp('6A'), out('6Y'), inp('5A'), out('5Y'), inp('4A'), out('4Y')],
    model: { kind: 'gates', gates },
  };
}

function triple3(type: string, name: string, subtitle: string, op: GateOp): DigitalChipSpec {
  return {
    type,
    name,
    subtitle,
    category: '逻辑门',
    description: `${subtitle}，三组三输入，标准 14 脚 DIP 封装。`,
    tags: ['gate', op, type.toLowerCase()],
    domains: DOMAINS,
    left: [inp('1A'), inp('1B'), inp('2A'), inp('2B'), inp('2C'), out('2Y'), pw('GND')],
    right: [pw('VCC'), inp('1C'), out('1Y'), inp('3C'), inp('3B'), inp('3A'), out('3Y')],
    model: {
      kind: 'gates',
      gates: [
        gate(op, ['1A', '1B', '1C'], '1Y'),
        gate(op, ['2A', '2B', '2C'], '2Y'),
        gate(op, ['3A', '3B', '3C'], '3Y'),
      ],
    },
  };
}

function dual4(type: string, name: string, subtitle: string, op: GateOp): DigitalChipSpec {
  return {
    type,
    name,
    subtitle,
    category: '逻辑门',
    description: `${subtitle}，两组四输入，标准 14 脚 DIP 封装。`,
    tags: ['gate', op, type.toLowerCase()],
    domains: DOMAINS,
    left: [
      inp('1A'), inp('1B'), p('NC3', 'NC'), inp('1C'), inp('1D'), out('1Y'), pw('GND'),
    ],
    right: [
      pw('VCC'), inp('2D'), inp('2C'), p('NC11', 'NC'), inp('2B'), inp('2A'), out('2Y'),
    ],
    model: {
      kind: 'gates',
      gates: [
        gate(op, ['1A', '1B', '1C', '1D'], '1Y'),
        gate(op, ['2A', '2B', '2C', '2D'], '2Y'),
      ],
    },
  };
}

const octalBufferPins = {
  left: [
    inp('1OE'), inp('1A1'), out('1Y1'), inp('1A2'), out('1Y2'),
    inp('1A3'), out('1Y3'), inp('1A4'), out('1Y4'), pw('GND'),
  ],
  right: [
    pw('VCC'), inp('2OE'), inp('2A1'), out('2Y1'), inp('2A2'),
    out('2Y2'), inp('2A3'), out('2Y3'), inp('2A4'), out('2Y4'),
  ],
};

// ---------- 芯片清单 ----------

export const DIGITAL_CHIPS: DigitalChipSpec[] = [
  // 门 / 缓冲
  quad2('74LS00', '74LS00', '四组二输入与非门', 'nand'),
  quad2('74LS03', '74LS03', '四组二输入与非门（开集）', 'nand', true),
  quad2('74LS08', '74LS08', '四组二输入与门', 'and'),
  quad2('74LS09', '74LS09', '四组二输入与门（开集）', 'and', true),
  quad2('74LS32', '74LS32', '四组二输入或门', 'or'),
  quad2('74LS37', '74LS37', '四组二输入与非缓冲器', 'nand'),
  quad2('74LS38', '74LS38', '四组二输入与非缓冲器（开集）', 'nand', true),
  quad2('74LS86', '74LS86', '四组二输入异或门', 'xor'),
  quad2('74LS132', '74LS132', '四组二输入施密特与非门', 'nand'),
  quad2('74LS136', '74LS136', '四组二输入异或门（开集）', 'xor', true),
  quad2('74LS266', '74LS266', '四组二输入同或门（开集）', 'xnor', true),
  quad2('74LS02', '74LS02', '四组二输入或非门', 'nor', false, true),
  quad2('74LS28', '74LS28', '四组二输入或非缓冲器', 'nor', false, true),
  quad2('74LS33', '74LS33', '四组二输入或非缓冲器（开集）', 'nor', true, true),
  hexInv('74LS04', '74LS04', '六路反相器'),
  hexInv('74LS05', '74LS05', '六路反相器（开集）', true),
  hexInv('74LS06', '74LS06', '六路高压反相器（开集）', true),
  hexBuf('74LS07', '74LS07', '六路同相缓冲器（开集）', true),
  hexInv('74HC14', '74HC14', '六路施密特反相器'),
  triple3('74LS10', '74LS10', '三组三输入与非门', 'nand'),
  triple3('74LS11', '74LS11', '三组三输入与门', 'and'),
  dual4('74LS20', '74LS20', '两组四输入与非门', 'nand'),
  dual4('74LS21', '74LS21', '两组四输入与门', 'and'),
  {
    type: '74LS30',
    name: '74LS30',
    subtitle: '8 输入与非门',
    category: '逻辑门',
    description: '单组八输入与非门，标准 14 脚 DIP 封装。',
    tags: ['gate', 'nand', '74ls30'],
    domains: DOMAINS,
    left: [inp('A'), inp('B'), inp('C'), inp('D'), inp('E'), inp('F'), pw('GND')],
    right: [pw('VCC'), p('NC13', 'NC'), inp('H'), inp('G'), p('NC10', 'NC'), p('NC9', 'NC'), out('Y')],
    model: { kind: 'gates', gates: [gate('nand', ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], 'Y')] },
  },
  {
    type: '74LS125',
    name: '74LS125',
    subtitle: '四路三态缓冲器（低有效）',
    category: '逻辑门',
    description: '四路三态缓冲器，输出使能低有效。',
    tags: ['buffer', 'tri-state', '74ls125'],
    domains: DOMAINS,
    left: [inp('1OE'), inp('1A'), out('1Y'), inp('2OE'), inp('2A'), out('2Y'), pw('GND')],
    right: [pw('VCC'), inp('4OE'), inp('4A'), out('4Y'), inp('3OE'), inp('3A'), out('3Y')],
    model: {
      kind: 'buffers',
      units: [
        { a: '1A', y: '1Y', oe: '1OE', active: 'low' },
        { a: '2A', y: '2Y', oe: '2OE', active: 'low' },
        { a: '3A', y: '3Y', oe: '3OE', active: 'low' },
        { a: '4A', y: '4Y', oe: '4OE', active: 'low' },
      ],
    },
  },
  {
    type: '74LS126',
    name: '74LS126',
    subtitle: '四路三态缓冲器（高有效）',
    category: '逻辑门',
    description: '四路三态缓冲器，输出使能高有效。',
    tags: ['buffer', 'tri-state', '74ls126'],
    domains: DOMAINS,
    left: [inp('1OE'), inp('1A'), out('1Y'), inp('2OE'), inp('2A'), out('2Y'), pw('GND')],
    right: [pw('VCC'), inp('4OE'), inp('4A'), out('4Y'), inp('3OE'), inp('3A'), out('3Y')],
    model: {
      kind: 'buffers',
      units: [
        { a: '1A', y: '1Y', oe: '1OE', active: 'high' },
        { a: '2A', y: '2Y', oe: '2OE', active: 'high' },
        { a: '3A', y: '3Y', oe: '3OE', active: 'high' },
        { a: '4A', y: '4Y', oe: '4OE', active: 'high' },
      ],
    },
  },
  {
    type: '74LS240',
    name: '74LS240',
    subtitle: '八路反相缓冲器（三态）',
    category: '逻辑门',
    description: '八路反相三态缓冲器，两组低有效输出使能。',
    tags: ['buffer', 'tri-state', '74ls240'],
    domains: DOMAINS,
    ...octalBufferPins,
    model: {
      kind: 'buffers',
      units: [
        ...[1, 2, 3, 4].map((i) => ({ a: `1A${i}`, y: `1Y${i}`, oe: '1OE', active: 'low' as const, invert: true })),
        ...[1, 2, 3, 4].map((i) => ({ a: `2A${i}`, y: `2Y${i}`, oe: '2OE', active: 'low' as const, invert: true })),
      ],
    },
  },
  {
    type: '74LS241',
    name: '74LS241',
    subtitle: '八路缓冲器（三态）',
    category: '逻辑门',
    description: '八路三态缓冲器，两组低有效输出使能。',
    tags: ['buffer', 'tri-state', '74ls241'],
    domains: DOMAINS,
    ...octalBufferPins,
    model: {
      kind: 'buffers',
      units: [
        ...[1, 2, 3, 4].map((i) => ({ a: `1A${i}`, y: `1Y${i}`, oe: '1OE', active: 'low' as const })),
        ...[1, 2, 3, 4].map((i) => ({ a: `2A${i}`, y: `2Y${i}`, oe: '2OE', active: 'low' as const })),
      ],
    },
  },
  {
    type: '74LS244',
    name: '74LS244',
    subtitle: '八路缓冲器（三态）',
    category: '逻辑门',
    description: '八路三态缓冲器，常用于地址/数据总线驱动。',
    tags: ['buffer', 'tri-state', '74ls244'],
    domains: DOMAINS,
    ...octalBufferPins,
    model: {
      kind: 'buffers',
      units: [
        ...[1, 2, 3, 4].map((i) => ({ a: `1A${i}`, y: `1Y${i}`, oe: '1OE', active: 'low' as const })),
        ...[1, 2, 3, 4].map((i) => ({ a: `2A${i}`, y: `2Y${i}`, oe: '2OE', active: 'low' as const })),
      ],
    },
  },
  {
    type: '74LS245',
    name: '74LS245',
    subtitle: '八路双向收发器',
    category: '逻辑门',
    description: '八路双向总线收发器，DIR 控制方向，OE 低有效。',
    tags: ['buffer', 'transceiver', '74ls245'],
    domains: DOMAINS,
    left: [
      inp('DIR'), p('A1', 'A1', 'bidir'), p('A2', 'A2', 'bidir'), p('A3', 'A3', 'bidir'),
      p('A4', 'A4', 'bidir'), p('A5', 'A5', 'bidir'), p('A6', 'A6', 'bidir'),
      p('A7', 'A7', 'bidir'), p('A8', 'A8', 'bidir'), pw('GND'),
    ],
    right: [
      pw('VCC'), inp('OE'), p('B1', 'B1', 'bidir'), p('B2', 'B2', 'bidir'),
      p('B3', 'B3', 'bidir'), p('B4', 'B4', 'bidir'), p('B5', 'B5', 'bidir'),
      p('B6', 'B6', 'bidir'), p('B7', 'B7', 'bidir'), p('B8', 'B8', 'bidir'),
    ],
    model: {
      kind: 'transceiver',
      dir: 'DIR',
      oe: 'OE',
      a: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8'],
      b: ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8'],
    },
  },

  // 触发器 / 锁存器
  {
    type: '74LS74',
    name: '74LS74',
    subtitle: '双 D 触发器',
    category: '触发器',
    description: '双上升沿 D 触发器，异步置位/清零低有效。',
    tags: ['flip-flop', 'dff', '74ls74'],
    domains: DOMAINS,
    left: [inp('1CLR'), inp('1D'), inp('1CLK'), inp('1PRE'), out('1Q'), out('1QN'), pw('GND')],
    right: [pw('VCC'), inp('2CLR'), inp('2D'), inp('2CLK'), inp('2PRE'), out('2Q'), out('2QN')],
    model: {
      kind: 'dff',
      edge: 'rising',
      units: [
        { d: '1D', clk: '1CLK', pre: '1PRE', clr: '1CLR', q: '1Q', qn: '1QN' },
        { d: '2D', clk: '2CLK', pre: '2PRE', clr: '2CLR', q: '2Q', qn: '2QN' },
      ],
    },
  },
  {
    type: '74LS175',
    name: '74LS175',
    subtitle: '四 D 触发器（双轨输出）',
    category: '触发器',
    description: '四上升沿 D 触发器，公共时钟与异步清零（低有效）。',
    tags: ['flip-flop', 'dff', '74ls175'],
    domains: DOMAINS,
    left: [inp('CLR'), out('Q0'), out('Q0N'), inp('D0'), inp('D1'), out('Q1N'), out('Q1'), pw('GND')],
    right: [pw('VCC'), out('Q3'), out('Q3N'), inp('D3'), inp('D2'), out('Q2N'), out('Q2'), inp('CP')],
    model: {
      kind: 'dff',
      clk: 'CP',
      clr: 'CLR',
      edge: 'rising',
      units: [
        { d: 'D0', q: 'Q0', qn: 'Q0N' },
        { d: 'D1', q: 'Q1', qn: 'Q1N' },
        { d: 'D2', q: 'Q2', qn: 'Q2N' },
        { d: 'D3', q: 'Q3', qn: 'Q3N' },
      ],
    },
  },
  {
    type: '74LS273',
    name: '74LS273',
    subtitle: '八 D 触发器',
    category: '触发器',
    description: '八上升沿 D 触发器，公共时钟与异步清零（低有效）。',
    tags: ['flip-flop', 'register', '74ls273'],
    domains: DOMAINS,
    left: [
      inp('CLR'), out('1Q'), inp('1D'), out('2Q'), inp('2D'), out('3Q'),
      inp('3D'), out('4Q'), inp('4D'), pw('GND'),
    ],
    right: [
      pw('VCC'), inp('8D'), out('8Q'), inp('7D'), out('7Q'), inp('6D'),
      out('6Q'), inp('5D'), out('5Q'), inp('CLK'),
    ],
    model: {
      kind: 'register',
      d: ['1D', '2D', '3D', '4D', '5D', '6D', '7D', '8D'],
      q: ['1Q', '2Q', '3Q', '4Q', '5Q', '6Q', '7Q', '8Q'],
      clk: 'CLK',
      clr: 'CLR',
      clrActive: 'low',
    },
  },
  {
    type: '74LS373',
    name: '74LS373',
    subtitle: '八 D 锁存器（三态）',
    category: '触发器',
    description: '八路透明 D 锁存器，LE 高电平透明，OE 低有效。',
    tags: ['latch', '74ls373'],
    domains: DOMAINS,
    left: [
      inp('OE'), out('1Q'), inp('1D'), out('2Q'), inp('2D'), out('3Q'),
      inp('3D'), out('4Q'), inp('4D'), pw('GND'),
    ],
    right: [
      pw('VCC'), inp('8D'), out('8Q'), inp('7D'), out('7Q'), inp('6D'),
      out('6Q'), inp('5D'), out('5Q'), inp('LE'),
    ],
    model: {
      kind: 'latch',
      d: ['1D', '2D', '3D', '4D', '5D', '6D', '7D', '8D'],
      q: ['1Q', '2Q', '3Q', '4Q', '5Q', '6Q', '7Q', '8Q'],
      le: 'LE',
      oe: 'OE',
      oeActive: 'low',
    },
  },
  {
    type: '74LS374',
    name: '74LS374',
    subtitle: '八 D 触发器（三态）',
    category: '触发器',
    description: '八上升沿 D 触发器，三态输出，OE 低有效。',
    tags: ['register', '74ls374'],
    domains: DOMAINS,
    left: [
      inp('OE'), out('1Q'), inp('1D'), out('2Q'), inp('2D'), out('3Q'),
      inp('3D'), out('4Q'), inp('4D'), pw('GND'),
    ],
    right: [
      pw('VCC'), inp('8D'), out('8Q'), inp('7D'), out('7Q'), inp('6D'),
      out('6Q'), inp('5D'), out('5Q'), inp('CLK'),
    ],
    model: {
      kind: 'register',
      d: ['1D', '2D', '3D', '4D', '5D', '6D', '7D', '8D'],
      q: ['1Q', '2Q', '3Q', '4Q', '5Q', '6Q', '7Q', '8Q'],
      clk: 'CLK',
      oe: 'OE',
      oeActive: 'low',
    },
  },

  // 计数器
  {
    type: '74LS160',
    name: '74LS160',
    subtitle: '同步十进制计数器',
    category: '计数器',
    description: '同步十进制计数器，异步清零、同步置数，RCO 进位输出。',
    tags: ['counter', 'decade', '74ls160'],
    domains: DOMAINS,
    left: [
      inp('CLR'), inp('CLK'), inp('A'), inp('B'), inp('C'), inp('D'), inp('ENP'), pw('GND'),
    ],
    right: [
      pw('VCC'), out('RCO'), out('QD'), out('QC'), out('QB'), out('QA'), inp('ENT'), inp('LOAD'),
    ],
    model: {
      kind: 'counter',
      bits: 4,
      mod: 10,
      clear: 'async',
      pins: {
        clk: 'CLK', clr: 'CLR', load: 'LOAD', enp: 'ENP', ent: 'ENT',
        a: ['A', 'B', 'C', 'D'], q: ['QA', 'QB', 'QC', 'QD'], rco: 'RCO',
      },
    },
  },
  {
    type: '74LS161',
    name: '74LS161',
    subtitle: '同步四位二进制计数器',
    category: '计数器',
    description: '4 位同步二进制计数器，异步清零 / 同步置数，QA 为最低位。',
    tags: ['counter', '74ls', '同步'],
    domains: DOMAINS,
    left: [
      inp('CLR'), inp('CLK'), inp('A'), inp('B'), inp('C'), inp('D'), inp('ENP'), pw('GND'),
    ],
    right: [
      pw('VCC'), out('RCO'), out('QD'), out('QC'), out('QB'), out('QA'), inp('ENT'), inp('LOAD'),
    ],
    model: {
      kind: 'counter',
      bits: 4,
      mod: 16,
      clear: 'async',
      pins: {
        clk: 'CLK', clr: 'CLR', load: 'LOAD', enp: 'ENP', ent: 'ENT',
        a: ['A', 'B', 'C', 'D'], q: ['QA', 'QB', 'QC', 'QD'], rco: 'RCO',
      },
    },
  },
  {
    type: '74LS162',
    name: '74LS162',
    subtitle: '同步十进制计数器（同步清零）',
    category: '计数器',
    description: '同步十进制计数器，同步清零、同步置数。',
    tags: ['counter', 'decade', '74ls162'],
    domains: DOMAINS,
    left: [
      inp('CLR'), inp('CLK'), inp('A'), inp('B'), inp('C'), inp('D'), inp('ENP'), pw('GND'),
    ],
    right: [
      pw('VCC'), out('RCO'), out('QD'), out('QC'), out('QB'), out('QA'), inp('ENT'), inp('LOAD'),
    ],
    model: {
      kind: 'counter',
      bits: 4,
      mod: 10,
      clear: 'sync',
      pins: {
        clk: 'CLK', clr: 'CLR', load: 'LOAD', enp: 'ENP', ent: 'ENT',
        a: ['A', 'B', 'C', 'D'], q: ['QA', 'QB', 'QC', 'QD'], rco: 'RCO',
      },
    },
  },
  {
    type: '74LS163',
    name: '74LS163',
    subtitle: '同步四位二进制计数器（同步清零）',
    category: '计数器',
    description: '4 位同步二进制计数器，同步清零、同步置数。',
    tags: ['counter', '74ls163'],
    domains: DOMAINS,
    left: [
      inp('CLR'), inp('CLK'), inp('A'), inp('B'), inp('C'), inp('D'), inp('ENP'), pw('GND'),
    ],
    right: [
      pw('VCC'), out('RCO'), out('QD'), out('QC'), out('QB'), out('QA'), inp('ENT'), inp('LOAD'),
    ],
    model: {
      kind: 'counter',
      bits: 4,
      mod: 16,
      clear: 'sync',
      pins: {
        clk: 'CLK', clr: 'CLR', load: 'LOAD', enp: 'ENP', ent: 'ENT',
        a: ['A', 'B', 'C', 'D'], q: ['QA', 'QB', 'QC', 'QD'], rco: 'RCO',
      },
    },
  },
  {
    type: '74LS393',
    name: '74LS393',
    subtitle: '双四位二进制计数器',
    category: '计数器',
    description: '双 4 位异步二进制计数器，下降沿触发，高电平清零。',
    tags: ['counter', 'ripple', '74ls393'],
    domains: DOMAINS,
    left: [inp('1CLK'), inp('1CLR'), out('1QA'), out('1QB'), out('1QC'), out('1QD'), pw('GND')],
    right: [pw('VCC'), inp('2CLK'), inp('2CLR'), out('2QA'), out('2QB'), out('2QC'), out('2QD')],
    model: {
      kind: 'ripple',
      edge: 'falling',
      clearActive: 'high',
      units: [
        { clk: '1CLK', clr: '1CLR', q: ['1QA', '1QB', '1QC', '1QD'] },
        { clk: '2CLK', clr: '2CLR', q: ['2QA', '2QB', '2QC', '2QD'] },
      ],
    },
  },
  {
    type: 'CD4017',
    name: 'CD4017',
    subtitle: '十进制计数/分配器',
    category: '计数器',
    description: '十进制计数器，十路译码输出，上升沿计数，复位高有效。',
    tags: ['counter', 'decade', 'cd4017'],
    domains: DOMAINS,
    left: [
      out('Q5'), out('Q1'), out('Q0'), out('Q2'), out('Q6'), out('Q7'), out('Q8'), pw('GND'),
    ],
    right: [
      pw('VCC'), inp('RST'), inp('CLK_EN'), inp('CLK'), out('CO'), out('Q3'), out('Q4'), out('Q9'),
    ],
    model: {
      kind: 'cd4017',
      clk: 'CLK',
      clkEn: 'CLK_EN',
      reset: 'RST',
      q: ['Q0', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9'],
      cout: 'CO',
    },
  },

  // 移位寄存器
  {
    type: '74LS164',
    name: '74LS164',
    subtitle: '8 位串入并出移位寄存器',
    category: '移位寄存器',
    description: '8 位串行输入、并行输出移位寄存器，上升沿移位，低有效清零。',
    tags: ['shift', 'sipo', '74ls164'],
    domains: DOMAINS,
    left: [inp('A'), inp('B'), out('QA'), out('QB'), out('QC'), out('QD'), pw('GND')],
    right: [pw('VCC'), out('QE'), out('QF'), out('QG'), out('QH'), inp('CLR'), inp('CLK')],
    model: {
      kind: 'shift164',
      a: 'A',
      b: 'B',
      clk: 'CLK',
      clr: 'CLR',
      q: ['QA', 'QB', 'QC', 'QD', 'QE', 'QF', 'QG', 'QH'],
    },
  },
  {
    type: '74HC595',
    name: '74HC595',
    subtitle: '8 位移位寄存器（带锁存）',
    category: '移位寄存器',
    description: '8 位串入并出移位寄存器，带输出锁存与三态控制。',
    tags: ['shift', '595', '74hc595'],
    domains: DOMAINS,
    left: [out('QB'), out('QC'), out('QD'), out('QE'), out('QF'), out('QG'), out('QH'), pw('GND')],
    right: [pw('VCC'), out('QA'), inp('SER'), inp('OE'), inp('RCLK'), inp('SRCLK'), inp('SRCLR'), out('QHp')],
    model: {
      kind: 'shift595',
      ser: 'SER',
      srclk: 'SRCLK',
      rclk: 'RCLK',
      srclr: 'SRCLR',
      oe: 'OE',
      q: ['QA', 'QB', 'QC', 'QD', 'QE', 'QF', 'QG', 'QH'],
      qh: 'QHp',
    },
  },

  // 译码 / 选择
  {
    type: '74LS138',
    name: '74LS138',
    subtitle: '3 线-8 线译码器',
    category: '译码与选择',
    description: '3-8 译码器，输出低有效，G1 高有效，G2A/G2B 低有效。',
    tags: ['decoder', '138', '74ls138'],
    domains: DOMAINS,
    left: [inp('A'), inp('B'), inp('C'), inp('G2A'), inp('G2B'), inp('G1'), out('Y7'), pw('GND')],
    right: [pw('VCC'), out('Y6'), out('Y5'), out('Y4'), out('Y3'), out('Y2'), out('Y1'), out('Y0')],
    model: {
      kind: 'decoder3to8',
      a: 'A',
      b: 'B',
      c: 'C',
      g1: 'G1',
      g2a: 'G2A',
      g2b: 'G2B',
      y: ['Y0', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y7'],
    },
  },
  {
    type: '74LS139',
    name: '74LS139',
    subtitle: '双 2 线-4 线译码器',
    category: '译码与选择',
    description: '双 2-4 译码器，输出低有效，使能低有效。',
    tags: ['decoder', '139', '74ls139'],
    domains: DOMAINS,
    left: [inp('1G'), inp('1A'), inp('1B'), out('1Y0'), out('1Y1'), out('1Y2'), out('1Y3'), pw('GND')],
    right: [pw('VCC'), inp('2G'), inp('2A'), inp('2B'), out('2Y0'), out('2Y1'), out('2Y2'), out('2Y3')],
    model: {
      kind: 'decoder2to4',
      units: [
        { a: '1A', b: '1B', g: '1G', y: ['1Y0', '1Y1', '1Y2', '1Y3'] },
        { a: '2A', b: '2B', g: '2G', y: ['2Y0', '2Y1', '2Y2', '2Y3'] },
      ],
    },
  },
  {
    type: '74LS151',
    name: '74LS151',
    subtitle: '8 选 1 数据选择器',
    category: '译码与选择',
    description: '8 选 1 数据选择器，Y 原码输出、W 反码输出，G 低有效。',
    tags: ['mux', '151', '74ls151'],
    domains: DOMAINS,
    left: [
      inp('D0'), inp('D1'), inp('D2'), inp('D3'), inp('D4'), inp('D5'), inp('D6'), pw('GND'),
    ],
    right: [pw('VCC'), inp('G'), inp('C'), inp('B'), inp('A'), out('W'), out('Y'), inp('D7')],
    model: {
      kind: 'mux8',
      d: ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'],
      a: 'A',
      b: 'B',
      c: 'C',
      g: 'G',
      y: 'Y',
      w: 'W',
    },
  },
  {
    type: '74LS47',
    name: '74LS47',
    subtitle: 'BCD-七段译码驱动器',
    category: '译码与选择',
    description: 'BCD 到七段译码器，输出低有效，可直接驱动共阳数码管。',
    tags: ['decoder', '74ls', '七段'],
    domains: DOMAINS,
    left: [inp('B'), inp('C'), inp('LT'), inp('BI'), inp('RBI'), inp('D'), inp('A'), pw('GND')],
    right: [pw('VCC'), out('f'), out('g'), out('a'), out('b'), out('c'), out('d'), out('e')],
    model: {
      kind: 'bcd7',
      a: 'A',
      b: 'B',
      c: 'C',
      d: 'D',
      lt: 'LT',
      bi: 'BI',
      rbi: 'RBI',
      seg: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
      active: 'low',
    },
  },
  {
    type: '74LS48',
    name: '74LS48',
    subtitle: 'BCD-七段译码驱动器（高有效）',
    category: '译码与选择',
    description: 'BCD 到七段译码器，输出高有效，可驱动共阴数码管。',
    tags: ['decoder', '74ls48', '七段'],
    domains: DOMAINS,
    left: [inp('B'), inp('C'), inp('LT'), inp('BI'), inp('RBI'), inp('D'), inp('A'), pw('GND')],
    right: [pw('VCC'), out('f'), out('g'), out('a'), out('b'), out('c'), out('d'), out('e')],
    model: {
      kind: 'bcd7',
      a: 'A',
      b: 'B',
      c: 'C',
      d: 'D',
      lt: 'LT',
      bi: 'BI',
      rbi: 'RBI',
      seg: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
      active: 'high',
    },
  },

  // 运算 / 比较
  {
    type: '74LS283',
    name: '74LS283',
    subtitle: '4 位二进制全加器',
    category: '运算与比较',
    description: '4 位二进制全加器，带进位输入与进位输出。',
    tags: ['adder', '283', '74ls283'],
    domains: DOMAINS,
    left: [inp('A1'), inp('B1'), inp('A2'), inp('B2'), inp('A3'), inp('B3'), inp('C0'), pw('GND')],
    right: [pw('VCC'), out('S0'), out('S1'), out('S2'), inp('B4'), inp('A4'), out('S3'), out('C4')],
    model: {
      kind: 'adder4',
      a: ['A1', 'A2', 'A3', 'A4'],
      b: ['B1', 'B2', 'B3', 'B4'],
      cin: 'C0',
      s: ['S0', 'S1', 'S2', 'S3'],
      cout: 'C4',
    },
  },
  {
    type: '74LS85',
    name: '74LS85',
    subtitle: '4 位数值比较器',
    category: '运算与比较',
    description: '4 位数值比较器，支持级联输入，输出 A>B、A=B、A<B。',
    tags: ['comparator', '85', '74ls85'],
    domains: DOMAINS,
    left: [inp('B3'), inp('ILT'), inp('IEQ'), inp('IGT'), out('OGT'), out('OEQ'), out('OLT'), pw('GND')],
    right: [pw('VCC'), inp('A3'), inp('B2'), inp('A2'), inp('A1'), inp('B1'), inp('A0'), inp('B0')],
    model: {
      kind: 'comparator4',
      a: ['A0', 'A1', 'A2', 'A3'],
      b: ['B0', 'B1', 'B2', 'B3'],
      ilt: 'ILT',
      ieq: 'IEQ',
      igt: 'IGT',
      olt: 'OLT',
      oeq: 'OEQ',
      ogt: 'OGT',
    },
  },

  // 高速 CMOS 兼容型号
  quad2('74HC00', '74HC00', '四组二输入与非门（CMOS）', 'nand'),
  quad2('74HC02', '74HC02', '四组二输入或非门（CMOS）', 'nor', false, true),
  quad2('74HC08', '74HC08', '四组二输入与门（CMOS）', 'and'),
  quad2('74HC32', '74HC32', '四组二输入或门（CMOS）', 'or'),
  quad2('74HC86', '74HC86', '四组二输入异或门（CMOS）', 'xor'),
];
