import { makeChip, type ChipPinSpec } from './chip';
import type { PartDef } from './types';

function quad2(
  type: string,
  name: string,
  subtitle: string,
  description: string,
  opts: { oc?: boolean; invertOut?: boolean; keyword?: string } = {},
): PartDef {
  const inv = opts.invertOut;
  return makeChip({
    type,
    name,
    subtitle,
    description,
    rows: 7,
    left: [
      { n: '1', name: '1A', dir: 'in' },
      { n: '2', name: '1B', dir: 'in' },
      { n: '3', name: `1${inv ? '/Y' : 'Y'}`, dir: 'out' },
      { n: '4', name: '2A', dir: 'in' },
      { n: '5', name: '2B', dir: 'in' },
      { n: '6', name: `2${inv ? '/Y' : 'Y'}`, dir: 'out' },
      { n: '7', name: 'GND', dir: 'power' },
    ],
    right: [
      { n: '14', name: 'VCC', dir: 'power' },
      { n: '13', name: '4B', dir: 'in' },
      { n: '12', name: '4A', dir: 'in' },
      { n: '11', name: `4${inv ? '/Y' : 'Y'}`, dir: 'out' },
      { n: '10', name: '3B', dir: 'in' },
      { n: '9', name: '3A', dir: 'in' },
      { n: '8', name: `3${inv ? '/Y' : 'Y'}`, dir: 'out' },
    ],
    keywords: [type, subtitle, opts.keyword ?? ''].filter(Boolean),
  });
}

function quad2Nor(
  type: string,
  name: string,
  subtitle: string,
  description: string,
  opts: { oc?: boolean } = {},
): PartDef {
  return makeChip({
    type,
    name,
    subtitle,
    description,
    rows: 7,
    left: [
      { n: '1', name: '1Y', dir: 'out' },
      { n: '2', name: '1A', dir: 'in' },
      { n: '3', name: '1B', dir: 'in' },
      { n: '4', name: '2Y', dir: 'out' },
      { n: '5', name: '2A', dir: 'in' },
      { n: '6', name: '2B', dir: 'in' },
      { n: '7', name: 'GND', dir: 'power' },
    ],
    right: [
      { n: '14', name: 'VCC', dir: 'power' },
      { n: '13', name: '4Y', dir: 'out' },
      { n: '12', name: '4B', dir: 'in' },
      { n: '11', name: '4A', dir: 'in' },
      { n: '10', name: '3Y', dir: 'out' },
      { n: '9', name: '3B', dir: 'in' },
      { n: '8', name: '3A', dir: 'in' },
    ],
    keywords: [type, subtitle, opts.oc ? '开集' : ''].filter(Boolean),
  });
}

function hexInverter(
  type: string,
  name: string,
  subtitle: string,
  description: string,
  oc = false,
): PartDef {
  return makeChip({
    type,
    name,
    subtitle,
    description,
    rows: 7,
    left: [
      { n: '1', name: '1A', dir: 'in' },
      { n: '2', name: '1Y', dir: 'out' },
      { n: '3', name: '2A', dir: 'in' },
      { n: '4', name: '2Y', dir: 'out' },
      { n: '5', name: '3A', dir: 'in' },
      { n: '6', name: '3Y', dir: 'out' },
      { n: '7', name: 'GND', dir: 'power' },
    ],
    right: [
      { n: '14', name: 'VCC', dir: 'power' },
      { n: '13', name: '6A', dir: 'in' },
      { n: '12', name: '6Y', dir: 'out' },
      { n: '11', name: '5A', dir: 'in' },
      { n: '10', name: '5Y', dir: 'out' },
      { n: '9', name: '4A', dir: 'in' },
      { n: '8', name: '4Y', dir: 'out' },
    ],
    keywords: [type, subtitle, oc ? '开集' : ''],
  });
}

function triple3(
  type: string,
  name: string,
  subtitle: string,
  description: string,
  gate: 'and' | 'nand' | 'nor',
  oc = false,
): PartDef {
  return makeChip({
    type,
    name,
    subtitle,
    description,
    rows: 7,
    left: [
      { n: '1', name: '1A', dir: 'in' },
      { n: '2', name: '1B', dir: 'in' },
      { n: '3', name: '2A', dir: 'in' },
      { n: '4', name: '2B', dir: 'in' },
      { n: '5', name: '2C', dir: 'in' },
      { n: '6', name: '2Y', dir: 'out' },
      { n: '7', name: 'GND', dir: 'power' },
    ],
    right: [
      { n: '14', name: 'VCC', dir: 'power' },
      { n: '13', name: '1Y', dir: 'out' },
      { n: '12', name: '1C', dir: 'in' },
      { n: '11', name: '3C', dir: 'in' },
      { n: '10', name: '3B', dir: 'in' },
      { n: '9', name: '3A', dir: 'in' },
      { n: '8', name: '3Y', dir: 'out' },
    ],
    keywords: [type, subtitle, gate, oc ? '开集' : ''],
  });
}

function dual4(
  type: string,
  name: string,
  subtitle: string,
  description: string,
  oc = false,
): PartDef {
  return makeChip({
    type,
    name,
    subtitle,
    description,
    rows: 7,
    left: [
      { n: '1', name: '1A', dir: 'in' },
      { n: '2', name: '1B', dir: 'in' },
      { n: '3', name: 'NC', dir: 'passive' },
      { n: '4', name: '1C', dir: 'in' },
      { n: '5', name: '1D', dir: 'in' },
      { n: '6', name: '1Y', dir: 'out' },
      { n: '7', name: 'GND', dir: 'power' },
    ],
    right: [
      { n: '14', name: 'VCC', dir: 'power' },
      { n: '13', name: '2D', dir: 'in' },
      { n: '12', name: '2C', dir: 'in' },
      { n: '11', name: 'NC', dir: 'passive' },
      { n: '10', name: '2B', dir: 'in' },
      { n: '9', name: '2A', dir: 'in' },
      { n: '8', name: '2Y', dir: 'out' },
    ],
    keywords: [type, subtitle, oc ? '开集' : ''],
  });
}

function clone(
  base: PartDef,
  type: string,
  name: string,
  subtitle: string,
  description: string,
  keywords: string[] = [],
): PartDef {
  return {
    ...base,
    type,
    name,
    subtitle,
    description,
    keywords: [...(base.keywords ?? []), ...keywords],
  };
}

const gate00 = quad2('74LS00', '四 2 输入与非门', '74LS00', '四个独立的 2 输入与非门，TTL 推挽输出。');
const gate02 = quad2Nor('74LS02', '四 2 输入或非门', '74LS02', '四个独立的 2 输入或非门，TTL 推挽输出。');
const gate04 = hexInverter('74LS04', '六反相器', '74LS04', '六个独立反相器，TTL 推挽输出。');
const gate08 = quad2('74LS08', '四 2 输入与门', '74LS08', '四个独立的 2 输入与门，TTL 推挽输出。');
const gate10 = triple3('74LS10', '三 3 输入与非门', '74LS10', '三个独立的 3 输入与非门。', 'nand');
const gate11 = triple3('74LS11', '三 3 输入与门', '74LS11', '三个独立的 3 输入与门。', 'and');
const gate20 = dual4('74LS20', '双 4 输入与非门', '74LS20', '两个独立的 4 输入与非门。');
const gate27 = triple3('74LS27', '三 3 输入或非门', '74LS27', '三个独立的 3 输入或非门。', 'nor');
const gate32 = quad2('74LS32', '四 2 输入或门', '74LS32', '四个独立的 2 输入或门。');
const gate86 = quad2('74LS86', '四 2 输入异或门', '74LS86', '四个独立的 2 输入异或门。');

const gate30 = makeChip({
  type: '74LS30',
  name: '8 输入与非门',
  subtitle: '74LS30',
  description: '单个 8 输入与非门，多余输入需接高电平。',
  rows: 7,
  left: [
    { n: '1', name: 'A', dir: 'in' },
    { n: '2', name: 'B', dir: 'in' },
    { n: '3', name: 'C', dir: 'in' },
    { n: '4', name: 'D', dir: 'in' },
    { n: '5', name: 'E', dir: 'in' },
    { n: '6', name: 'F', dir: 'in' },
    { n: '7', name: 'GND', dir: 'power' },
  ],
  right: [
    { n: '14', name: 'VCC', dir: 'power' },
    { n: '13', name: 'NC', dir: 'passive' },
    { n: '12', name: 'H', dir: 'in' },
    { n: '11', name: 'G', dir: 'in' },
    { n: '10', name: 'NC', dir: 'passive' },
    { n: '9', name: 'NC', dir: 'passive' },
    { n: '8', name: 'Y', dir: 'out' },
  ],
  keywords: ['74LS30', '8输入', 'NAND'],
});

const buf125 = makeChip({
  type: '74LS125',
  name: '四三态总线缓冲器',
  subtitle: '74LS125',
  description: '四个独立三态缓冲器，/OE 低电平有效，输出可直接挂总线。',
  rows: 7,
  left: [
    { n: '1', name: '/1OE', dir: 'in' },
    { n: '2', name: '1A', dir: 'in' },
    { n: '3', name: '1Y', dir: 'out' },
    { n: '4', name: '/2OE', dir: 'in' },
    { n: '5', name: '2A', dir: 'in' },
    { n: '6', name: '2Y', dir: 'out' },
    { n: '7', name: 'GND', dir: 'power' },
  ],
  right: [
    { n: '14', name: 'VCC', dir: 'power' },
    { n: '13', name: '/4OE', dir: 'in' },
    { n: '12', name: '4A', dir: 'in' },
    { n: '11', name: '4Y', dir: 'out' },
    { n: '10', name: '/3OE', dir: 'in' },
    { n: '9', name: '3A', dir: 'in' },
    { n: '8', name: '3Y', dir: 'out' },
  ],
  keywords: ['74LS125', '三态', '缓冲'],
});

const buf126 = makeChip({
  type: '74LS126',
  name: '四三态总线缓冲器',
  subtitle: '74LS126',
  description: '四个独立三态缓冲器，OE 高电平有效。',
  rows: 7,
  left: buf125.pins.filter((p) => p.side === 'left').map((p) => ({
    n: p.id,
    name: p.name.replace('/1OE', '1OE').replace('/2OE', '2OE'),
    dir: p.dir,
  })),
  right: buf125.pins.filter((p) => p.side === 'right').map((p) => ({
    n: p.id,
    name: p.name.replace('/3OE', '3OE').replace('/4OE', '4OE'),
    dir: p.dir,
  })),
  keywords: ['74LS126', '三态', '缓冲'],
});

const buf244 = makeChip({
  type: '74LS244',
  name: '八路三态缓冲器',
  subtitle: '74LS244',
  description: '八路同相三态缓冲器，两组各四位，/OE 分别控制。',
  rows: 10,
  width: 100,
  left: [
    { n: '1', name: '/1OE', dir: 'in' },
    { n: '2', name: '1A1', dir: 'in' },
    { n: '3', name: '1Y1', dir: 'out' },
    { n: '4', name: '1A2', dir: 'in' },
    { n: '5', name: '1Y2', dir: 'out' },
    { n: '6', name: '1A3', dir: 'in' },
    { n: '7', name: '1Y3', dir: 'out' },
    { n: '8', name: '1A4', dir: 'in' },
    { n: '9', name: '1Y4', dir: 'out' },
    { n: '10', name: 'GND', dir: 'power' },
  ],
  right: [
    { n: '20', name: 'VCC', dir: 'power' },
    { n: '19', name: '/2OE', dir: 'in' },
    { n: '18', name: '2A1', dir: 'in' },
    { n: '17', name: '2Y1', dir: 'out' },
    { n: '16', name: '2A2', dir: 'in' },
    { n: '15', name: '2Y2', dir: 'out' },
    { n: '14', name: '2A3', dir: 'in' },
    { n: '13', name: '2Y3', dir: 'out' },
    { n: '12', name: '2A4', dir: 'in' },
    { n: '11', name: '2Y4', dir: 'out' },
  ],
  keywords: ['74LS244', '三态', '总线驱动'],
});

const buf245 = makeChip({
  type: '74LS245',
  name: '八路双向收发器',
  subtitle: '74LS245',
  description: '八路双向三态收发器，DIR 控制方向，/OE 低有效使能。',
  rows: 10,
  width: 100,
  left: [
    { n: '1', name: 'DIR', dir: 'in' },
    { n: '2', name: 'A1', dir: 'io' },
    { n: '3', name: 'A2', dir: 'io' },
    { n: '4', name: 'A3', dir: 'io' },
    { n: '5', name: 'A4', dir: 'io' },
    { n: '6', name: 'A5', dir: 'io' },
    { n: '7', name: 'A6', dir: 'io' },
    { n: '8', name: 'A7', dir: 'io' },
    { n: '9', name: 'A8', dir: 'io' },
    { n: '10', name: 'GND', dir: 'power' },
  ],
  right: [
    { n: '20', name: 'VCC', dir: 'power' },
    { n: '19', name: '/OE', dir: 'in' },
    { n: '18', name: 'B1', dir: 'io' },
    { n: '17', name: 'B2', dir: 'io' },
    { n: '16', name: 'B3', dir: 'io' },
    { n: '15', name: 'B4', dir: 'io' },
    { n: '14', name: 'B5', dir: 'io' },
    { n: '13', name: 'B6', dir: 'io' },
    { n: '12', name: 'B7', dir: 'io' },
    { n: '11', name: 'B8', dir: 'io' },
  ],
  keywords: ['74LS245', '双向', '总线'],
});

const buf365 = makeChip({
  type: '74LS365',
  name: '六路三态缓冲器',
  subtitle: '74LS365',
  description: '六路同相三态缓冲器，两组使能分别控制三路。',
  rows: 8,
  left: [
    { n: '1', name: '/1E', dir: 'in' },
    { n: '2', name: 'A1', dir: 'in' },
    { n: '3', name: 'Y1', dir: 'out' },
    { n: '4', name: 'A2', dir: 'in' },
    { n: '5', name: 'Y2', dir: 'out' },
    { n: '6', name: 'A3', dir: 'in' },
    { n: '7', name: 'Y3', dir: 'out' },
    { n: '8', name: 'GND', dir: 'power' },
  ],
  right: [
    { n: '16', name: 'VCC', dir: 'power' },
    { n: '15', name: '/2E', dir: 'in' },
    { n: '14', name: 'A6', dir: 'in' },
    { n: '13', name: 'Y6', dir: 'out' },
    { n: '12', name: 'A5', dir: 'in' },
    { n: '11', name: 'Y5', dir: 'out' },
    { n: '10', name: 'A4', dir: 'in' },
    { n: '9', name: 'Y4', dir: 'out' },
  ],
  keywords: ['74LS365', '三态'],
});

const buf366 = clone(buf365, '74LS366', '六路反相三态缓冲器', '74LS366', '与 74LS365 引脚兼容，输出反相。', ['反相']);

const dff74 = makeChip({
  type: '74LS74',
  name: '双 D 上升沿触发器',
  subtitle: '74LS74',
  description: '两个独立 D 触发器，上升沿触发，带异步置位 /PRE 与清零 /CLR。',
  rows: 7,
  left: [
    { n: '1', name: '/1CLR', dir: 'in' },
    { n: '2', name: '1D', dir: 'in' },
    { n: '3', name: '1CLK', dir: 'in' },
    { n: '4', name: '/1PRE', dir: 'in' },
    { n: '5', name: '1Q', dir: 'out' },
    { n: '6', name: '/1Q', dir: 'out' },
    { n: '7', name: 'GND', dir: 'power' },
  ],
  right: [
    { n: '14', name: 'VCC', dir: 'power' },
    { n: '13', name: '/2CLR', dir: 'in' },
    { n: '12', name: '2D', dir: 'in' },
    { n: '11', name: '2CLK', dir: 'in' },
    { n: '10', name: '/2PRE', dir: 'in' },
    { n: '9', name: '2Q', dir: 'out' },
    { n: '8', name: '/2Q', dir: 'out' },
  ],
  keywords: ['74LS74', 'D触发器', '边沿'],
});

const reg175 = makeChip({
  type: '74LS175',
  name: '四 D 触发器',
  subtitle: '74LS175',
  description: '四个 D 触发器共享时钟，上升沿锁存，带异步清零与互补输出。',
  rows: 8,
  left: [
    { n: '1', name: '/CLR', dir: 'in' },
    { n: '2', name: '1Q', dir: 'out' },
    { n: '3', name: '/1Q', dir: 'out' },
    { n: '4', name: '1D', dir: 'in' },
    { n: '5', name: '2D', dir: 'in' },
    { n: '6', name: '2Q', dir: 'out' },
    { n: '7', name: '/2Q', dir: 'out' },
    { n: '8', name: 'GND', dir: 'power' },
  ],
  right: [
    { n: '16', name: 'VCC', dir: 'power' },
    { n: '15', name: '/3Q', dir: 'out' },
    { n: '14', name: '3Q', dir: 'out' },
    { n: '13', name: '3D', dir: 'in' },
    { n: '12', name: '4D', dir: 'in' },
    { n: '11', name: '/4Q', dir: 'out' },
    { n: '10', name: '4Q', dir: 'out' },
    { n: '9', name: 'CLK', dir: 'in' },
  ],
  keywords: ['74LS175', '寄存器', 'D触发器'],
});

function octalReg(
  type: string,
  name: string,
  subtitle: string,
  description: string,
  mode: 'd' | 'latch',
  clear: boolean,
): PartDef {
  const busPins = (): { left: ChipPinSpec[]; right: ChipPinSpec[] } => ({
    left: [
      { n: '1', name: clear ? '/CLR' : '/OE', dir: 'in' },
      { n: '2', name: 'Q0', dir: 'out' },
      { n: '3', name: 'D0', dir: 'in' },
      { n: '4', name: 'D1', dir: 'in' },
      { n: '5', name: 'Q1', dir: 'out' },
      { n: '6', name: 'Q2', dir: 'out' },
      { n: '7', name: 'D2', dir: 'in' },
      { n: '8', name: 'D3', dir: 'in' },
      { n: '9', name: 'Q3', dir: 'out' },
      { n: '10', name: 'GND', dir: 'power' },
    ],
    right: [
      { n: '20', name: 'VCC', dir: 'power' },
      { n: '19', name: 'Q7', dir: 'out' },
      { n: '18', name: 'D7', dir: 'in' },
      { n: '17', name: 'D6', dir: 'in' },
      { n: '16', name: 'Q6', dir: 'out' },
      { n: '15', name: 'Q5', dir: 'out' },
      { n: '14', name: 'D5', dir: 'in' },
      { n: '13', name: 'D4', dir: 'in' },
      { n: '12', name: 'Q4', dir: 'out' },
      { n: '11', name: mode === 'd' ? 'CLK' : 'LE', dir: 'in' },
    ],
  });
  const p = busPins();
  return makeChip({
    type,
    name,
    subtitle,
    description,
    rows: 10,
    width: 100,
    left: p.left,
    right: p.right,
    keywords: [type, subtitle, mode === 'd' ? 'D寄存器' : '锁存器'],
  });
}

const reg273 = makeChip({
  type: '74LS273',
  name: '八 D 触发器（带清零）',
  subtitle: '74LS273',
  description: '八个 D 触发器共享时钟，上升沿锁存，/CLR 异步清零，输出无三态。',
  rows: 10,
  width: 100,
  left: [
    { n: '1', name: '/CLR', dir: 'in' },
    { n: '2', name: 'Q0', dir: 'out' },
    { n: '3', name: 'D0', dir: 'in' },
    { n: '4', name: 'D1', dir: 'in' },
    { n: '5', name: 'Q1', dir: 'out' },
    { n: '6', name: 'Q2', dir: 'out' },
    { n: '7', name: 'D2', dir: 'in' },
    { n: '8', name: 'D3', dir: 'in' },
    { n: '9', name: 'Q3', dir: 'out' },
    { n: '10', name: 'GND', dir: 'power' },
  ],
  right: [
    { n: '20', name: 'VCC', dir: 'power' },
    { n: '19', name: 'Q7', dir: 'out' },
    { n: '18', name: 'D7', dir: 'in' },
    { n: '17', name: 'D6', dir: 'in' },
    { n: '16', name: 'Q6', dir: 'out' },
    { n: '15', name: 'Q5', dir: 'out' },
    { n: '14', name: 'D5', dir: 'in' },
    { n: '13', name: 'D4', dir: 'in' },
    { n: '12', name: 'Q4', dir: 'out' },
    { n: '11', name: 'CLK', dir: 'in' },
  ],
  keywords: ['74LS273', '寄存器', 'D触发器'],
});

const reg373 = octalReg('74LS373', '八 D 透明锁存器', '74LS373', '八位透明锁存器，LE 高电平直通、下降沿锁存，/OE 控制三态输出。', 'latch', false);
const reg374 = octalReg('74LS374', '八 D 边沿触发器', '74LS374', '八位 D 触发器，上升沿锁存，/OE 三态输出。', 'd', false);
const reg573 = octalReg('74LS573', '八 D 透明锁存器', '74LS573', '与 74LS373 功能相同，引脚排列更适合 PCB 布线。', 'latch', false);
const reg574 = octalReg('74LS574', '八 D 边沿触发器', '74LS574', '与 74LS374 功能相同，引脚排列更适合 PCB 布线。', 'd', false);

const cnt160 = makeChip({
  type: '74LS160',
  name: '同步十进制计数器',
  subtitle: '74LS160',
  description: '同步 BCD 加计数器，异步清零、同步置数，带进位输出 RCO。',
  rows: 8,
  width: 100,
  left: [
    { n: '1', name: '/CLR', dir: 'in' },
    { n: '2', name: 'CLK', dir: 'in' },
    { n: '3', name: 'A', dir: 'in' },
    { n: '4', name: 'B', dir: 'in' },
    { n: '5', name: 'C', dir: 'in' },
    { n: '6', name: 'D', dir: 'in' },
    { n: '7', name: 'ENP', dir: 'in' },
    { n: '8', name: 'GND', dir: 'power' },
  ],
  right: [
    { n: '16', name: 'VCC', dir: 'power' },
    { n: '15', name: 'RCO', dir: 'out' },
    { n: '14', name: 'QD', dir: 'out' },
    { n: '13', name: 'QC', dir: 'out' },
    { n: '12', name: 'QB', dir: 'out' },
    { n: '11', name: 'QA', dir: 'out' },
    { n: '10', name: 'ENT', dir: 'in' },
    { n: '9', name: '/LOAD', dir: 'in' },
  ],
  keywords: ['74LS160', '计数器', 'BCD'],
});

const cnt161 = clone(cnt160, '74LS161', '同步四位二进制计数器', '74LS161', '同步 4 位二进制加计数器，异步清零、同步置数，带进位输出。', ['二进制']);
const cnt162 = clone(cnt160, '74LS162', '同步十进制计数器', '74LS162', '同步 BCD 加计数器，同步清零与同步置数。', ['同步清零']);
const cnt163 = clone(cnt160, '74LS163', '同步四位二进制计数器', '74LS163', '同步 4 位二进制加计数器，同步清零与同步置数。', ['同步清零']);

const cnt90 = makeChip({
  type: '74LS90',
  name: '十进制计数器',
  subtitle: '74LS90',
  description: '二分频 + 五进制异步计数器，可级联组成 BCD 计数；/R0 复零、/R9 置九。',
  rows: 7,
  left: [
    { n: '1', name: 'CP0', dir: 'in' },
    { n: '2', name: '/R0(1)', dir: 'in' },
    { n: '3', name: '/R0(2)', dir: 'in' },
    { n: '4', name: 'NC', dir: 'passive' },
    { n: '5', name: 'VCC', dir: 'power' },
    { n: '6', name: '/R9(1)', dir: 'in' },
    { n: '7', name: '/R9(2)', dir: 'in' },
  ],
  right: [
    { n: '14', name: 'GND', dir: 'power' },
    { n: '13', name: 'NC', dir: 'passive' },
    { n: '12', name: 'CP1', dir: 'in' },
    { n: '11', name: 'Q3', dir: 'out' },
    { n: '10', name: 'Q0', dir: 'out' },
    { n: '9', name: 'Q1', dir: 'out' },
    { n: '8', name: 'Q2', dir: 'out' },
  ],
  keywords: ['74LS90', '计数器'],
});

const cnt93 = makeChip({
  type: '74LS93',
  name: '四位二进制计数器',
  subtitle: '74LS93',
  description: '二分频 + 八分频异步计数器，可级联组成 4 位二进制计数。',
  rows: 7,
  left: [
    { n: '1', name: 'CP1', dir: 'in' },
    { n: '2', name: '/R0(1)', dir: 'in' },
    { n: '3', name: '/R0(2)', dir: 'in' },
    { n: '4', name: 'NC', dir: 'passive' },
    { n: '5', name: 'VCC', dir: 'power' },
    { n: '6', name: 'NC', dir: 'passive' },
    { n: '7', name: 'NC', dir: 'passive' },
  ],
  right: [
    { n: '14', name: 'GND', dir: 'power' },
    { n: '13', name: 'NC', dir: 'passive' },
    { n: '12', name: 'CP0', dir: 'in' },
    { n: '11', name: 'Q3', dir: 'out' },
    { n: '10', name: 'Q0', dir: 'out' },
    { n: '9', name: 'Q1', dir: 'out' },
    { n: '8', name: 'Q2', dir: 'out' },
  ],
  keywords: ['74LS93', '计数器', '二进制'],
});

function upDownCounter(type: string, name: string, subtitle: string, desc: string, respin: boolean): PartDef {
  if (!respin) {
    return makeChip({
      type,
      name,
      subtitle,
      description: desc,
      rows: 8,
      width: 100,
      left: [
        { n: '1', name: 'UP/DN', dir: 'in' },
        { n: '2', name: 'CLK', dir: 'in' },
        { n: '3', name: 'A', dir: 'in' },
        { n: '4', name: 'B', dir: 'in' },
        { n: '5', name: 'C', dir: 'in' },
        { n: '6', name: 'D', dir: 'in' },
        { n: '7', name: '/EN', dir: 'in' },
        { n: '8', name: 'GND', dir: 'power' },
      ],
      right: [
        { n: '16', name: 'VCC', dir: 'power' },
        { n: '15', name: '/RCO', dir: 'out' },
        { n: '14', name: 'QD', dir: 'out' },
        { n: '13', name: 'QC', dir: 'out' },
        { n: '12', name: 'QB', dir: 'out' },
        { n: '11', name: 'QA', dir: 'out' },
        { n: '10', name: '/MAXMIN', dir: 'out' },
        { n: '9', name: '/LOAD', dir: 'in' },
      ],
      keywords: [type, subtitle, '加减计数器'],
    });
  }
  return makeChip({
    type,
    name,
    subtitle,
    description: desc,
    rows: 8,
    width: 100,
    left: [
      { n: '1', name: 'B', dir: 'in' },
      { n: '2', name: 'QB', dir: 'out' },
      { n: '3', name: 'QA', dir: 'out' },
      { n: '4', name: 'DOWN', dir: 'in' },
      { n: '5', name: 'UP', dir: 'in' },
      { n: '6', name: 'QC', dir: 'out' },
      { n: '7', name: 'QD', dir: 'out' },
      { n: '8', name: 'GND', dir: 'power' },
    ],
    right: [
      { n: '16', name: 'VCC', dir: 'power' },
      { n: '15', name: 'A', dir: 'in' },
      { n: '14', name: '/CLR', dir: 'in' },
      { n: '13', name: '/BO', dir: 'out' },
      { n: '12', name: '/CO', dir: 'out' },
      { n: '11', name: '/LOAD', dir: 'in' },
      { n: '10', name: 'C', dir: 'in' },
      { n: '9', name: 'D', dir: 'in' },
    ],
    keywords: [type, subtitle, '加减计数器'],
  });
}

const cnt190 = upDownCounter('74LS190', '同步十进制加减计数器', '74LS190', '同步 BCD 加减计数器，单时钟与 UP/DN 控制方向。', false);
const cnt191 = upDownCounter('74LS191', '同步四位二进制加减计数器', '74LS191', '同步 4 位二进制加减计数器，单时钟与 UP/DN 控制方向。', false);
const cnt192 = upDownCounter('74LS192', '同步十进制可逆计数器', '74LS192', '双时钟（UP/DOWN）BCD 可逆计数器，带独立进位 /CO 与借位 /BO。', true);
const cnt193 = upDownCounter('74LS193', '同步四位二进制可逆计数器', '74LS193', '双时钟 4 位二进制可逆计数器，带进位 /CO 与借位 /BO。', true);

const sh164 = makeChip({
  type: '74LS164',
  name: '8 位串入并出移位寄存器',
  subtitle: '74LS164',
  description: '串行输入、并行输出移位寄存器，上升沿移位，/CLR 异步清零。',
  rows: 7,
  left: [
    { n: '1', name: 'DSA', dir: 'in' },
    { n: '2', name: 'DSB', dir: 'in' },
    { n: '3', name: 'Q0', dir: 'out' },
    { n: '4', name: 'Q1', dir: 'out' },
    { n: '5', name: 'Q2', dir: 'out' },
    { n: '6', name: 'Q3', dir: 'out' },
    { n: '7', name: 'GND', dir: 'power' },
  ],
  right: [
    { n: '14', name: 'VCC', dir: 'power' },
    { n: '13', name: 'Q7', dir: 'out' },
    { n: '12', name: 'Q6', dir: 'out' },
    { n: '11', name: 'Q5', dir: 'out' },
    { n: '10', name: 'Q4', dir: 'out' },
    { n: '9', name: '/CLR', dir: 'in' },
    { n: '8', name: 'CLK', dir: 'in' },
  ],
  keywords: ['74LS164', '移位寄存器'],
});

const sh165 = makeChip({
  type: '74LS165',
  name: '8 位并入串出移位寄存器',
  subtitle: '74LS165',
  description: '并行置入、串行输出移位寄存器，支持级联 DS 输入。',
  rows: 8,
  left: [
    { n: '1', name: '/PL', dir: 'in' },
    { n: '2', name: 'CP', dir: 'in' },
    { n: '3', name: 'D4', dir: 'in' },
    { n: '4', name: 'D5', dir: 'in' },
    { n: '5', name: 'D6', dir: 'in' },
    { n: '6', name: 'D7', dir: 'in' },
    { n: '7', name: '/Q7', dir: 'out' },
    { n: '8', name: 'GND', dir: 'power' },
  ],
  right: [
    { n: '16', name: 'VCC', dir: 'power' },
    { n: '15', name: 'CP INH', dir: 'in' },
    { n: '14', name: 'D3', dir: 'in' },
    { n: '13', name: 'D2', dir: 'in' },
    { n: '12', name: 'D1', dir: 'in' },
    { n: '11', name: 'D0', dir: 'in' },
    { n: '10', name: 'DS', dir: 'in' },
    { n: '9', name: 'Q7', dir: 'out' },
  ],
  keywords: ['74LS165', '移位寄存器', '并串转换'],
});

const sh194 = makeChip({
  type: '74LS194',
  name: '4 位双向通用移位寄存器',
  subtitle: '74LS194',
  description: '可并行置数、左移、右移、保持的四位通用移位寄存器。',
  rows: 8,
  left: [
    { n: '1', name: '/CLR', dir: 'in' },
    { n: '2', name: 'SR', dir: 'in' },
    { n: '3', name: 'A', dir: 'in' },
    { n: '4', name: 'B', dir: 'in' },
    { n: '5', name: 'C', dir: 'in' },
    { n: '6', name: 'D', dir: 'in' },
    { n: '7', name: 'SL', dir: 'in' },
    { n: '8', name: 'GND', dir: 'power' },
  ],
  right: [
    { n: '16', name: 'VCC', dir: 'power' },
    { n: '15', name: 'QA', dir: 'out' },
    { n: '14', name: 'QB', dir: 'out' },
    { n: '13', name: 'QC', dir: 'out' },
    { n: '12', name: 'QD', dir: 'out' },
    { n: '11', name: 'CLK', dir: 'in' },
    { n: '10', name: 'S1', dir: 'in' },
    { n: '9', name: 'S0', dir: 'in' },
  ],
  keywords: ['74LS194', '移位寄存器', '双向'],
});

const sh595 = makeChip({
  type: '74HC595',
  name: '8 位移位寄存器（带锁存）',
  subtitle: '74HC595',
  description: '串入并出移位寄存器，带输出锁存与三态控制，常用于 GPIO 扩展。',
  rows: 8,
  width: 100,
  left: [
    { n: '1', name: 'QB', dir: 'out' },
    { n: '2', name: 'QC', dir: 'out' },
    { n: '3', name: 'QD', dir: 'out' },
    { n: '4', name: 'QE', dir: 'out' },
    { n: '5', name: 'QF', dir: 'out' },
    { n: '6', name: 'QG', dir: 'out' },
    { n: '7', name: 'QH', dir: 'out' },
    { n: '8', name: 'GND', dir: 'power' },
  ],
  right: [
    { n: '16', name: 'VCC', dir: 'power' },
    { n: '15', name: 'QA', dir: 'out' },
    { n: '14', name: 'SER', dir: 'in' },
    { n: '13', name: '/OE', dir: 'in' },
    { n: '12', name: 'RCLK', dir: 'in' },
    { n: '11', name: 'SRCLK', dir: 'in' },
    { n: '10', name: '/SRCLR', dir: 'in' },
    { n: '9', name: "QH'", dir: 'out' },
  ],
  keywords: ['74HC595', '移位寄存器', 'GPIO扩展'],
});

const dec138 = makeChip({
  type: '74LS138',
  name: '3-8 译码器',
  subtitle: '74LS138',
  description: '3 线-8 线译码器，输出低有效，双低有效 + 单高有效使能。',
  rows: 8,
  left: [
    { n: '1', name: 'A0', dir: 'in' },
    { n: '2', name: 'A1', dir: 'in' },
    { n: '3', name: 'A2', dir: 'in' },
    { n: '4', name: '/E1', dir: 'in' },
    { n: '5', name: '/E2', dir: 'in' },
    { n: '6', name: 'E3', dir: 'in' },
    { n: '7', name: 'Y7', dir: 'out' },
    { n: '8', name: 'GND', dir: 'power' },
  ],
  right: [
    { n: '16', name: 'VCC', dir: 'power' },
    { n: '15', name: 'Y0', dir: 'out' },
    { n: '14', name: 'Y1', dir: 'out' },
    { n: '13', name: 'Y2', dir: 'out' },
    { n: '12', name: 'Y3', dir: 'out' },
    { n: '11', name: 'Y4', dir: 'out' },
    { n: '10', name: 'Y5', dir: 'out' },
    { n: '9', name: 'Y6', dir: 'out' },
  ],
  keywords: ['74LS138', '译码器'],
});

const dec139 = makeChip({
  type: '74LS139',
  name: '双 2-4 译码器',
  subtitle: '74LS139',
  description: '两个独立的 2 线-4 线译码器，输出低有效。',
  rows: 8,
  left: [
    { n: '1', name: '/1E', dir: 'in' },
    { n: '2', name: '1A0', dir: 'in' },
    { n: '3', name: '1A1', dir: 'in' },
    { n: '4', name: '1Y0', dir: 'out' },
    { n: '5', name: '1Y1', dir: 'out' },
    { n: '6', name: '1Y2', dir: 'out' },
    { n: '7', name: '1Y3', dir: 'out' },
    { n: '8', name: 'GND', dir: 'power' },
  ],
  right: [
    { n: '16', name: 'VCC', dir: 'power' },
    { n: '15', name: '/2E', dir: 'in' },
    { n: '14', name: '2A0', dir: 'in' },
    { n: '13', name: '2A1', dir: 'in' },
    { n: '12', name: '2Y0', dir: 'out' },
    { n: '11', name: '2Y1', dir: 'out' },
    { n: '10', name: '2Y2', dir: 'out' },
    { n: '9', name: '2Y3', dir: 'out' },
  ],
  keywords: ['74LS139', '译码器'],
});

const enc148 = makeChip({
  type: '74LS148',
  name: '8-3 优先编码器',
  subtitle: '74LS148',
  description: '8 线-3 线优先编码器，输入低有效，带使能输入 /EI 与组输出 /GS、/EO。',
  rows: 8,
  left: [
    { n: '1', name: 'I7', dir: 'in' },
    { n: '2', name: 'I6', dir: 'in' },
    { n: '3', name: 'I5', dir: 'in' },
    { n: '4', name: 'I4', dir: 'in' },
    { n: '5', name: 'I3', dir: 'in' },
    { n: '6', name: 'I2', dir: 'in' },
    { n: '7', name: 'I1', dir: 'in' },
    { n: '8', name: 'GND', dir: 'power' },
  ],
  right: [
    { n: '16', name: 'VCC', dir: 'power' },
    { n: '15', name: '/EI', dir: 'in' },
    { n: '14', name: '/EO', dir: 'out' },
    { n: '13', name: '/GS', dir: 'out' },
    { n: '12', name: 'A2', dir: 'out' },
    { n: '11', name: 'A1', dir: 'out' },
    { n: '10', name: 'A0', dir: 'out' },
    { n: '9', name: 'I0', dir: 'in' },
  ],
  keywords: ['74LS148', '优先编码器'],
});

const mux151 = makeChip({
  type: '74LS151',
  name: '8 选 1 数据选择器',
  subtitle: '74LS151',
  description: '8 选 1 多路选择器，互补输出，/E 低有效使能。',
  rows: 8,
  left: [
    { n: '1', name: 'D3', dir: 'in' },
    { n: '2', name: 'D2', dir: 'in' },
    { n: '3', name: 'D1', dir: 'in' },
    { n: '4', name: 'D0', dir: 'in' },
    { n: '5', name: 'Y', dir: 'out' },
    { n: '6', name: '/Y', dir: 'out' },
    { n: '7', name: '/E', dir: 'in' },
    { n: '8', name: 'GND', dir: 'power' },
  ],
  right: [
    { n: '16', name: 'VCC', dir: 'power' },
    { n: '15', name: 'D4', dir: 'in' },
    { n: '14', name: 'D5', dir: 'in' },
    { n: '13', name: 'D6', dir: 'in' },
    { n: '12', name: 'D7', dir: 'in' },
    { n: '11', name: 'S0', dir: 'in' },
    { n: '10', name: 'S1', dir: 'in' },
    { n: '9', name: 'S2', dir: 'in' },
  ],
  keywords: ['74LS151', '数据选择器', 'MUX'],
});

const mux153 = makeChip({
  type: '74LS153',
  name: '双 4 选 1 数据选择器',
  subtitle: '74LS153',
  description: '两个 4 选 1 多路选择器，共用地址 A/B，各自独立使能。',
  rows: 8,
  left: [
    { n: '1', name: '/1G', dir: 'in' },
    { n: '2', name: 'B', dir: 'in' },
    { n: '3', name: '1C3', dir: 'in' },
    { n: '4', name: '1C2', dir: 'in' },
    { n: '5', name: '1C1', dir: 'in' },
    { n: '6', name: '1C0', dir: 'in' },
    { n: '7', name: '1Y', dir: 'out' },
    { n: '8', name: 'GND', dir: 'power' },
  ],
  right: [
    { n: '16', name: 'VCC', dir: 'power' },
    { n: '15', name: '/2G', dir: 'in' },
    { n: '14', name: 'A', dir: 'in' },
    { n: '13', name: '2C3', dir: 'in' },
    { n: '12', name: '2C2', dir: 'in' },
    { n: '11', name: '2C1', dir: 'in' },
    { n: '10', name: '2C0', dir: 'in' },
    { n: '9', name: '2Y', dir: 'out' },
  ],
  keywords: ['74LS153', '数据选择器'],
});

const mux157 = makeChip({
  type: '74LS157',
  name: '四 2 选 1 数据选择器',
  subtitle: '74LS157',
  description: '四个 2 选 1 选择器，S 选择 A/B 输入，/E 低有效。',
  rows: 8,
  left: [
    { n: '1', name: 'S', dir: 'in' },
    { n: '2', name: '1A', dir: 'in' },
    { n: '3', name: '1B', dir: 'in' },
    { n: '4', name: '1Y', dir: 'out' },
    { n: '5', name: '2A', dir: 'in' },
    { n: '6', name: '2B', dir: 'in' },
    { n: '7', name: '2Y', dir: 'out' },
    { n: '8', name: 'GND', dir: 'power' },
  ],
  right: [
    { n: '16', name: 'VCC', dir: 'power' },
    { n: '15', name: '/E', dir: 'in' },
    { n: '14', name: '4A', dir: 'in' },
    { n: '13', name: '4B', dir: 'in' },
    { n: '12', name: '4Y', dir: 'out' },
    { n: '11', name: '3A', dir: 'in' },
    { n: '10', name: '3B', dir: 'in' },
    { n: '9', name: '3Y', dir: 'out' },
  ],
  keywords: ['74LS157', '数据选择器'],
});

const mux158 = clone(mux157, '74LS158', '四 2 选 1 数据选择器（反相）', '74LS158', '与 74LS157 引脚兼容，输出反相。', ['反相输出']);

const seg47 = makeChip({
  type: '74LS47',
  name: 'BCD-七段译码器',
  subtitle: '74LS47',
  description: 'BCD 到七段共阳极译码驱动，输出低有效，支持 /LT、/BI、/RBI 控制。',
  rows: 8,
  left: [
    { n: '1', name: 'B', dir: 'in' },
    { n: '2', name: 'C', dir: 'in' },
    { n: '3', name: '/LT', dir: 'in' },
    { n: '4', name: '/BI', dir: 'in' },
    { n: '5', name: '/RBI', dir: 'in' },
    { n: '6', name: 'D', dir: 'in' },
    { n: '7', name: 'A', dir: 'in' },
    { n: '8', name: 'GND', dir: 'power' },
  ],
  right: [
    { n: '16', name: 'VCC', dir: 'power' },
    { n: '15', name: 'f', dir: 'out' },
    { n: '14', name: 'g', dir: 'out' },
    { n: '13', name: 'a', dir: 'out' },
    { n: '12', name: 'b', dir: 'out' },
    { n: '11', name: 'c', dir: 'out' },
    { n: '10', name: 'd', dir: 'out' },
    { n: '9', name: 'e', dir: 'out' },
  ],
  keywords: ['74LS47', '七段译码', '共阳'],
});

const seg48 = clone(seg47, '74LS48', 'BCD-七段译码器（高有效）', '74LS48', 'BCD 到七段共阴极译码驱动，输出高有效，带内部上拉。', ['共阴']);

const cmp85 = makeChip({
  type: '74LS85',
  name: '4 位数值比较器',
  subtitle: '74LS85',
  description: '四位二进制数值比较，可级联扩展位宽，输出 A>B、A=B、A<B。',
  rows: 8,
  width: 100,
  left: [
    { n: '1', name: 'B3', dir: 'in' },
    { n: '2', name: 'IA<B', dir: 'in' },
    { n: '3', name: 'IA=B', dir: 'in' },
    { n: '4', name: 'IA>B', dir: 'in' },
    { n: '5', name: 'A>B', dir: 'out' },
    { n: '6', name: 'A=B', dir: 'out' },
    { n: '7', name: 'A<B', dir: 'out' },
    { n: '8', name: 'GND', dir: 'power' },
  ],
  right: [
    { n: '16', name: 'VCC', dir: 'power' },
    { n: '15', name: 'A3', dir: 'in' },
    { n: '14', name: 'A2', dir: 'in' },
    { n: '13', name: 'B2', dir: 'in' },
    { n: '12', name: 'A1', dir: 'in' },
    { n: '11', name: 'B1', dir: 'in' },
    { n: '10', name: 'A0', dir: 'in' },
    { n: '9', name: 'B0', dir: 'in' },
  ],
  keywords: ['74LS85', '比较器'],
});

const add283 = makeChip({
  type: '74LS283',
  name: '4 位超前进位全加器',
  subtitle: '74LS283',
  description: '四位二进制全加器，带进位输入 C0 与进位输出 C4，可级联扩展。',
  rows: 8,
  width: 100,
  left: [
    { n: '1', name: 'S2', dir: 'out' },
    { n: '2', name: 'B2', dir: 'in' },
    { n: '3', name: 'A2', dir: 'in' },
    { n: '4', name: 'S1', dir: 'out' },
    { n: '5', name: 'A1', dir: 'in' },
    { n: '6', name: 'B1', dir: 'in' },
    { n: '7', name: 'C0', dir: 'in' },
    { n: '8', name: 'GND', dir: 'power' },
  ],
  right: [
    { n: '16', name: 'VCC', dir: 'power' },
    { n: '15', name: 'B3', dir: 'in' },
    { n: '14', name: 'A3', dir: 'in' },
    { n: '13', name: 'S3', dir: 'out' },
    { n: '12', name: 'A4', dir: 'in' },
    { n: '11', name: 'B4', dir: 'in' },
    { n: '10', name: 'S4', dir: 'out' },
    { n: '9', name: 'C4', dir: 'out' },
  ],
  keywords: ['74LS283', '加法器'],
});

const cd4011 = clone(gate00, 'CD4011', '四 2 输入与非门（CMOS）', 'CD4011', 'CMOS 四与非门，宽电源电压，输入阻抗高，未用输入必须接固定电平。', ['CMOS']);
const cd4030 = clone(gate86, 'CD4030', '四 2 输入异或门（CMOS）', 'CD4030', 'CMOS 四异或门，常用于 parity 与时钟整形。', ['CMOS']);

const cd4013 = makeChip({
  type: 'CD4013',
  name: '双 D 触发器（CMOS）',
  subtitle: 'CD4013',
  description: '两个独立 CMOS D 触发器，上升沿触发，带置位/复位。',
  rows: 7,
  left: [
    { n: '1', name: 'Q1', dir: 'out' },
    { n: '2', name: '/Q1', dir: 'out' },
    { n: '3', name: 'CLK1', dir: 'in' },
    { n: '4', name: 'RESET1', dir: 'in' },
    { n: '5', name: 'D1', dir: 'in' },
    { n: '6', name: 'SET1', dir: 'in' },
    { n: '7', name: 'GND', dir: 'power' },
  ],
  right: [
    { n: '14', name: 'VCC', dir: 'power' },
    { n: '13', name: 'Q2', dir: 'out' },
    { n: '12', name: '/Q2', dir: 'out' },
    { n: '11', name: 'CLK2', dir: 'in' },
    { n: '10', name: 'RESET2', dir: 'in' },
    { n: '9', name: 'D2', dir: 'in' },
    { n: '8', name: 'SET2', dir: 'in' },
  ],
  keywords: ['CD4013', 'CMOS', 'D触发器'],
});

const cd4017 = makeChip({
  type: 'CD4017',
  name: '十进制计数分配器（CMOS）',
  subtitle: 'CD4017',
  description: '约翰逊十进制计数器，10 个译码输出依次为高，带进位输出。',
  rows: 8,
  left: [
    { n: '1', name: 'Q5', dir: 'out' },
    { n: '2', name: 'Q1', dir: 'out' },
    { n: '3', name: 'Q0', dir: 'out' },
    { n: '4', name: 'Q2', dir: 'out' },
    { n: '5', name: 'Q6', dir: 'out' },
    { n: '6', name: 'Q7', dir: 'out' },
    { n: '7', name: 'Q3', dir: 'out' },
    { n: '8', name: 'GND', dir: 'power' },
  ],
  right: [
    { n: '16', name: 'VCC', dir: 'power' },
    { n: '15', name: 'RESET', dir: 'in' },
    { n: '14', name: 'CLK', dir: 'in' },
    { n: '13', name: 'CLK INH', dir: 'in' },
    { n: '12', name: 'CO', dir: 'out' },
    { n: '11', name: 'Q9', dir: 'out' },
    { n: '10', name: 'Q4', dir: 'out' },
    { n: '9', name: 'Q8', dir: 'out' },
  ],
  keywords: ['CD4017', 'CMOS', '十进制分配'],
});

export const DIGITAL_CHIPS: PartDef[] = [
  gate00,
  gate02,
  clone(gate00, '74LS03', '四 2 输入与非门（开集）', '74LS03', '开集电极输出的四与非门，可直接线与。', ['开集']),
  gate04,
  clone(gate04, '74LS05', '六反相器（开集）', '74LS05', '开集电极输出的六反相器。', ['开集']),
  gate08,
  clone(gate08, '74LS09', '四 2 输入与门（开集）', '74LS09', '开集电极输出的四与门。', ['开集']),
  gate10,
  gate11,
  clone(gate10, '74LS12', '三 3 输入与非门（开集）', '74LS12', '开集输出的三 3 输入与非门，可驱动高电压负载。', ['开集']),
  clone(gate11, '74LS15', '三 3 输入与门（开集）', '74LS15', '开集输出的三 3 输入与门。', ['开集']),
  gate20,
  clone(gate20, '74LS21', '双 4 输入与门', '74LS21', '两个独立的 4 输入与门。', ['与门']),
  clone(gate20, '74LS22', '双 4 输入与非门（开集）', '74LS22', '开集输出的双 4 输入与非门。', ['开集']),
  clone(gate00, '74LS26', '四 2 输入与非门（高压）', '74LS26', '高电压开集输出的四与非门，可驱动 15 V 负载。', ['高压']),
  gate27,
  gate30,
  gate32,
  clone(gate02, '74LS33', '四 2 输入或非门（开集）', '74LS33', '开集输出的四或非门。', ['开集']),
  clone(gate00, '74LS37', '四 2 输入与非缓冲器', '74LS37', '四与非缓冲器，驱动能力强。', ['缓冲']),
  clone(gate00, '74LS38', '四 2 输入与非缓冲器（开集）', '74LS38', '开集输出的四与非缓冲器，可直接驱动 LED/继电器。', ['开集', '缓冲']),
  clone(gate00, '74LS132', '四 2 输入施密特与非门', '74LS132', '带施密特触发输入的与非门，适合慢变信号整形。', ['施密特']),
  gate86,
  clone(gate86, '74LS136', '四 2 输入异或门（开集）', '74LS136', '开集输出的四异或门。', ['开集']),
  clone(gate86, '74LS266', '四 2 输入同或门（开集）', '74LS266', '开集输出的四同或门（异或非）。', ['开集', 'XNOR']),
  buf125,
  buf126,
  buf244,
  buf245,
  buf365,
  buf366,
  clone(buf365, '74LS367', '六路三态缓冲器', '74LS367', '与 74LS365 引脚兼容，使能高有效。', ['高有效']),
  clone(buf366, '74LS368', '六路反相三态缓冲器', '74LS368', '与 74LS366 引脚兼容，使能高有效。', ['高有效']),
  clone(buf244, '74LS540', '八路反相三态缓冲器', '74LS540', '八路反相三态缓冲器，驱动能力强，输出反相。', ['反相']),
  clone(buf244, '74LS541', '八路三态缓冲器', '74LS541', '八路同相三态缓冲器，驱动能力强。', ['同相']),
  dff74,
  reg175,
  reg273,
  reg373,
  reg374,
  reg573,
  reg574,
  cnt90,
  cnt93,
  cnt160,
  cnt161,
  cnt162,
  cnt163,
  cnt190,
  cnt191,
  cnt192,
  cnt193,
  sh164,
  sh165,
  sh194,
  sh595,
  dec138,
  dec139,
  enc148,
  mux151,
  mux153,
  mux157,
  mux158,
  seg47,
  seg48,
  cmp85,
  add283,
  cd4011,
  cd4013,
  cd4017,
  cd4030,
];
