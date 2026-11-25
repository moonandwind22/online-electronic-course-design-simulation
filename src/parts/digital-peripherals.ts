import type { PartDef, PinDef } from './types';

const led: PartDef = {
  type: 'LED',
  name: '发光二极管',
  subtitle: 'LED',
  category: 'peripheral',
  domains: ['digital', 'analog', 'power', 'mcs51', 'stm32'],
  description: '普通发光二极管，需串联限流电阻；仿真中按正向压降点亮。',
  width: 34,
  height: 30,
  refPrefix: 'LED',
  pins: [
    { id: 'a', name: 'A', x: 0, y: 15, side: 'left', dir: 'passive' },
    { id: 'k', name: 'K', x: 34, y: 15, side: 'right', dir: 'passive' },
  ],
  params: [
    {
      key: 'color',
      label: '颜色',
      kind: 'select',
      default: 'red',
      options: [
        { value: 'red', label: '红色' },
        { value: 'green', label: '绿色' },
        { value: 'blue', label: '蓝色' },
        { value: 'yellow', label: '黄色' },
        { value: 'white', label: '白色' },
      ],
    },
  ],
  symbol: { kind: 'diode', variant: 'led', color: 'red' },
  keywords: ['LED', '发光二极管', '指示灯'],
};

const seg7cc: PartDef = {
  type: 'SEG7_CC',
  name: '七段数码管（共阴）',
  subtitle: '7-SEG CC',
  category: 'peripheral',
  domains: ['digital', 'mcs51', 'stm32'],
  description: '共阴极七段数码管，段输入高电平点亮。',
  width: 64,
  height: 96,
  refPrefix: 'DS',
  pins: [
    { id: 'g', name: 'g', x: 8, y: 0, side: 'top', dir: 'in' },
    { id: 'f', name: 'f', x: 18, y: 0, side: 'top', dir: 'in' },
    { id: 'com', name: 'COM', x: 28, y: 0, side: 'top', dir: 'power' },
    { id: 'a', name: 'a', x: 38, y: 0, side: 'top', dir: 'in' },
    { id: 'b', name: 'b', x: 48, y: 0, side: 'top', dir: 'in' },
    { id: 'e', name: 'e', x: 8, y: 96, side: 'bottom', dir: 'in' },
    { id: 'd', name: 'd', x: 18, y: 96, side: 'bottom', dir: 'in' },
    { id: 'com2', name: 'COM', x: 28, y: 96, side: 'bottom', dir: 'power' },
    { id: 'c', name: 'c', x: 38, y: 96, side: 'bottom', dir: 'in' },
    { id: 'dp', name: 'dp', x: 48, y: 96, side: 'bottom', dir: 'in' },
  ],
  symbol: { kind: 'seg7', common: 'cc' },
  keywords: ['数码管', '七段', '共阴'],
};

const seg7ca: PartDef = {
  ...seg7cc,
  type: 'SEG7_CA',
  name: '七段数码管（共阳）',
  subtitle: '7-SEG CA',
  description: '共阳极七段数码管，段输入低电平点亮。',
  symbol: { kind: 'seg7', common: 'ca' },
  keywords: ['数码管', '七段', '共阳'],
};

const button: PartDef = {
  type: 'BUTTON',
  name: '轻触按键',
  subtitle: 'PUSH',
  category: 'peripheral',
  domains: ['digital', 'analog', 'power', 'mcs51', 'stm32'],
  description: '常开轻触按键，按下时两端导通；仿真中点击切换状态。',
  width: 44,
  height: 32,
  refPrefix: 'SB',
  pins: [
    { id: 'a', name: 'A', x: 0, y: 16, side: 'left', dir: 'passive' },
    { id: 'b', name: 'B', x: 44, y: 16, side: 'right', dir: 'passive' },
  ],
  params: [{ key: 'momentary', label: '自复位', kind: 'select', default: '1', options: [{ value: '1', label: '是' }, { value: '0', label: '否（自锁）' }] }],
  symbol: { kind: 'switch', variant: 'push' },
  keywords: ['按键', '按钮', '输入'],
};

const toggle: PartDef = {
  type: 'SWITCH',
  name: '拨动开关',
  subtitle: 'SPST',
  category: 'peripheral',
  domains: ['digital', 'analog', 'power', 'mcs51', 'stm32'],
  description: '单刀单掷拨动开关，点击切换通断。',
  width: 44,
  height: 28,
  refPrefix: 'S',
  pins: [
    { id: 'a', name: 'A', x: 0, y: 14, side: 'left', dir: 'passive' },
    { id: 'b', name: 'B', x: 44, y: 14, side: 'right', dir: 'passive' },
  ],
  symbol: { kind: 'switch', variant: 'spst' },
  keywords: ['开关', '拨动', '输入'],
};

const dip8: PartDef = {
  type: 'DIP8',
  name: '8 位拨码开关',
  subtitle: 'DIP-8',
  category: 'peripheral',
  domains: ['digital', 'mcs51', 'stm32'],
  description: '八位拨码开关，每一位连接左右对应引脚，常用于设置初值。',
  width: 80,
  height: 112,
  refPrefix: 'SW',
  pins: [
    ...Array.from({ length: 8 }, (_, i): PinDef => ({
      id: `${i + 1}`,
      number: `${i + 1}`,
      name: `S${i + 1}`,
      x: -10,
      y: 14 + i * 11,
      side: 'left',
      dir: 'passive',
    })),
    ...Array.from({ length: 8 }, (_, i): PinDef => ({
      id: `${16 - i}`,
      number: `${16 - i}`,
      name: `S${8 - i}`,
      x: 90,
      y: 14 + i * 11,
      side: 'right',
      dir: 'passive',
    })),
  ],
  symbol: { kind: 'switch', variant: 'dip' },
  keywords: ['拨码', 'DIP', '输入'],
};

const buzzer: PartDef = {
  type: 'BUZZER',
  name: '有源蜂鸣器',
  subtitle: 'BUZZER',
  category: 'peripheral',
  domains: ['digital', 'mcs51', 'stm32'],
  description: '有源蜂鸣器，两端加电即发声；仿真中以动画与日志提示。',
  width: 34,
  height: 34,
  refPrefix: 'BZ',
  pins: [
    { id: 'p1', name: '+', x: 17, y: 0, side: 'top', dir: 'passive' },
    { id: 'p2', name: '−', x: 17, y: 34, side: 'bottom', dir: 'passive' },
  ],
  symbol: { kind: 'buzzer' },
  keywords: ['蜂鸣器', '声音', '输出'],
};

const clock: PartDef = {
  type: 'CLOCK',
  name: '时钟源',
  subtitle: 'CLOCK',
  category: 'source',
  domains: ['digital'],
  description: '方波时钟源，频率与占空比可调，用于驱动计数器与移位寄存器。',
  width: 54,
  height: 42,
  refPrefix: 'CLK',
  pins: [
    { id: 'out', name: 'OUT', x: 54, y: 18, side: 'right', dir: 'out' },
    { id: 'gnd', name: 'GND', x: 54, y: 32, side: 'right', dir: 'power' },
  ],
  params: [
    { key: 'frequency', label: '频率', kind: 'number', unit: 'Hz', default: 1, min: 0.1, max: 100000, step: 0.1 },
    { key: 'duty', label: '占空比', kind: 'number', unit: '%', default: 50, min: 1, max: 99, step: 1 },
  ],
  symbol: { kind: 'clock' },
  keywords: ['时钟', '方波', '信号源'],
};

const probe: PartDef = {
  type: 'PROBE',
  name: '逻辑探针',
  subtitle: 'PROBE',
  category: 'instrument',
  domains: ['digital', 'mcs51', 'stm32'],
  description: '单端逻辑探针，实时显示所测网络的 0/1/高阻状态。',
  width: 30,
  height: 50,
  refPrefix: 'LP',
  pins: [{ id: 'in', name: 'IN', x: 15, y: 50, side: 'bottom', dir: 'in' }],
  symbol: { kind: 'probe' },
  keywords: ['探针', '逻辑', '测量'],
};

const relay: PartDef = {
  type: 'RELAY',
  name: '继电器模块',
  subtitle: 'RELAY',
  category: 'peripheral',
  domains: ['digital', 'analog', 'power', 'mcs51', 'stm32'],
  description: '5 V 单刀双掷继电器，线圈通电后 COM 切换到 NO。',
  width: 90,
  height: 54,
  refPrefix: 'K',
  pins: [
    { id: 'coil_a', name: 'COIL+', x: 0, y: 40, side: 'left', dir: 'passive' },
    { id: 'coil_b', name: 'COIL−', x: 18, y: 40, side: 'left', dir: 'passive' },
    { id: 'com', name: 'COM', x: 90, y: 14, side: 'right', dir: 'passive' },
    { id: 'no', name: 'NO', x: 90, y: 28, side: 'right', dir: 'passive' },
    { id: 'nc', name: 'NC', x: 90, y: 42, side: 'right', dir: 'passive' },
  ],
  symbol: { kind: 'relay' },
  keywords: ['继电器', '开关', '隔离'],
};

const motor: PartDef = {
  type: 'MOTOR',
  name: '直流电机',
  subtitle: 'DC MOTOR',
  category: 'peripheral',
  domains: ['digital', 'analog', 'power', 'mcs51', 'stm32'],
  description: '小功率直流电机，两端电压决定转速与方向。',
  width: 48,
  height: 48,
  refPrefix: 'M',
  pins: [
    { id: 'm1', name: 'M+', x: 0, y: 24, side: 'left', dir: 'passive' },
    { id: 'm2', name: 'M−', x: 48, y: 24, side: 'right', dir: 'passive' },
  ],
  symbol: { kind: 'motor' },
  keywords: ['电机', '马达', '输出'],
};

const servo: PartDef = {
  type: 'SERVO',
  name: '舵机',
  subtitle: 'SG90',
  category: 'peripheral',
  domains: ['digital', 'mcs51', 'stm32'],
  description: 'SG90 舵机，PWM 脉宽 0.5–2.5 ms 对应 0–180°。',
  width: 56,
  height: 56,
  refPrefix: 'SV',
  pins: [
    { id: 'sig', name: 'SIG', x: 0, y: 42, side: 'left', dir: 'in' },
    { id: 'vplus', name: 'V+', x: 56, y: 14, side: 'right', dir: 'power' },
    { id: 'gnd', name: 'GND', x: 56, y: 42, side: 'right', dir: 'power' },
  ],
  symbol: { kind: 'servo' },
  keywords: ['舵机', 'PWM', '执行器'],
};

const lcdPins: PinDef[] = [
  'VSS',
  'VDD',
  'V0',
  'RS',
  'RW',
  'E',
  'D0',
  'D1',
  'D2',
  'D3',
  'D4',
  'D5',
  'D6',
  'D7',
  'A',
  'K',
].map((name, i) => ({
  id: name.toLowerCase(),
  name,
  number: `${i + 1}`,
  x: 10 + i * 8,
  y: 76,
  side: 'bottom' as const,
  dir: name === 'VSS' || name === 'VDD' || name === 'V0' || name === 'A' || name === 'K' ? 'power' : 'in',
}));

const lcd: PartDef = {
  type: 'LCD1602',
  name: '字符液晶 LCD1602',
  subtitle: 'HD44780',
  category: 'peripheral',
  domains: ['digital', 'mcs51', 'stm32'],
  description: '16×2 字符液晶，兼容 HD44780，支持 8 位并行写模式。',
  width: 140,
  height: 76,
  refPrefix: 'LCD',
  pins: lcdPins,
  symbol: { kind: 'lcd' },
  keywords: ['LCD', '液晶', '1602', '显示'],
};

function powerSymbol(type: string, name: string, net: string): PartDef {
  const isGnd = net === 'GND';
  return {
    type,
    name,
    subtitle: net,
    category: 'source',
    domains: ['digital', 'analog', 'power', 'mcs51', 'stm32'],
    description: `${net} 电源符号，同名符号在全图自动相连。`,
    width: 34,
    height: 28,
    refPrefix: '',
    pins: [
      {
        id: 'p',
        name: net,
        x: 17,
        y: isGnd ? 0 : 28,
        side: isGnd ? 'top' : 'bottom',
        dir: 'power',
      },
    ],
    symbol: { kind: 'power', net },
    keywords: [net, '电源', '地'],
  };
}

export const POWER_SYMBOLS: PartDef[] = [
  powerSymbol('VCC', '电源 VCC', 'VCC'),
  powerSymbol('GND', '地 GND', 'GND'),
  powerSymbol('P5V', '电源 5V', '5V'),
  powerSymbol('P3V3', '电源 3.3V', '3V3'),
  powerSymbol('P12V', '电源 12V', '12V'),
];

export const DIGITAL_PERIPHERALS: PartDef[] = [
  led,
  seg7cc,
  seg7ca,
  button,
  toggle,
  dip8,
  buzzer,
  clock,
  probe,
  relay,
  motor,
  servo,
  lcd,
];
