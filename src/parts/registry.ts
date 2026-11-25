import type { Domain } from '../model/types';
import type { ParamDef, PartDef, PinDef, PinDir, PinKind, PartSymbol } from './types';
import { DIGITAL_CHIPS, type DigitalChipSpec } from './digitalChips';

// ---------- 构建辅助 ----------

const pin = (
  id: string,
  name: string,
  x: number,
  y: number,
  dir: PinDir,
  kind: PinKind = 'passive',
  number?: string,
): PinDef => ({ id, name, x, y, dir, kind, number });

const numberParam = (key: string, label: string, unit: string, min: number, step: number): ParamDef => ({
  key,
  label,
  type: 'number',
  unit,
  min,
  step,
});

const def = (d: Omit<PartDef, 'tags'> & { tags?: string[] }): PartDef => d;

const PASSIVE = (symbol: PartSymbol, type: string, name: string, subtitle: string, pins: PinDef[], params: ParamDef[], defaults: Record<string, number | string>, description: string, prefix = 'X'): PartDef =>
  def({
    type,
    name,
    subtitle,
    category: '基础器件',
    domains: 'all',
    symbol,
    width: 84,
    height: 40,
    pins,
    params,
    defaults,
    prefix,
    description,
  });

// ---------- 数字 IC 转换 ----------

export function chipToPart(spec: DigitalChipSpec): PartDef {
  const n = spec.left.length + spec.right.length;
  const perSide = Math.max(spec.left.length, spec.right.length);
  const width = 150;
  const top = 40;
  const pitch = 24;
  const pins: PinDef[] = [];
  spec.left.forEach((pin, i) => {
    pins.push({
      id: pin.id,
      name: pin.name,
      number: String(i + 1),
      x: 0,
      y: top + i * pitch,
      dir: 'left',
      kind: pin.kind,
    });
  });
  spec.right.forEach((pin, i) => {
    pins.push({
      id: pin.id,
      name: pin.name,
      number: String(n - i),
      x: width,
      y: top + i * pitch,
      dir: 'right',
      kind: pin.kind,
    });
  });
  return {
    type: spec.type,
    name: spec.name,
    subtitle: spec.subtitle,
    category: spec.category,
    domains: spec.domains ?? ['digital', 'mcs51', 'stm32'],
    symbol: 'chip',
    width,
    height: top + (perSide - 1) * pitch + 24,
    pins,
    params: [],
    defaults: {},
    prefix: 'U',
    description: spec.description,
    tags: spec.tags,
  };
}

export const CHIP_PARTS: PartDef[] = DIGITAL_CHIPS.map(chipToPart);

// ---------- 器件定义 ----------

export const PARTS: PartDef[] = [
  ...CHIP_PARTS,
  // —— 通用门 ——
  def({
    type: 'NAND2',
    name: 'NAND2',
    subtitle: '二输入与非门',
    category: '逻辑门',
    domains: ['digital'],
    symbol: 'nand',
    width: 76,
    height: 56,
    pins: [
      pin('A', 'A', 0, 16, 'left', 'input'),
      pin('B', 'B', 0, 40, 'left', 'input'),
      pin('Y', 'Y', 76, 28, 'right', 'output'),
    ],
    params: [],
    defaults: {},
    prefix: 'Q',
    description: '标准二输入与非门，输入悬空按高电平处理。',
    tags: ['gate', 'nand', '逻辑'],
  }),

  // —— 显示与指示 ——
  def({
    type: 'SEVENSEG',
    name: '七段数码管',
    subtitle: '共阳 / 共阴单 digit',
    category: '显示与指示',
    domains: ['digital', 'mcs51', 'stm32'],
    symbol: 'sevenseg',
    width: 120,
    height: 214,
    pins: [
      ...['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'].map((s, i) => pin(s, s, 0, 26 + i * 20, 'left', 'input')),
      pin('com', 'COM', 60, 214, 'down', 'power'),
    ],
    params: [
      {
        key: 'common',
        label: '公共端',
        type: 'select',
        options: [
          { value: 'anode', label: '共阳极' },
          { value: 'cathode', label: '共阴极' },
        ],
      },
    ],
    defaults: { common: 'anode' },
    prefix: 'DS',
    description: '七段数码管，段输入高或低有效由公共端类型决定。',
    tags: ['display', '7seg', '数码管'],
  }),
  def({
    type: 'LED',
    name: 'LED',
    subtitle: '发光二极管',
    category: '显示与指示',
    domains: 'all',
    symbol: 'led',
    width: 80,
    height: 40,
    pins: [pin('A', 'A', 0, 20, 'left', 'input'), pin('K', 'K', 80, 20, 'right', 'input')],
    params: [
      {
        key: 'color',
        label: '颜色',
        type: 'select',
        options: [
          { value: 'red', label: '红色' },
          { value: 'green', label: '绿色' },
          { value: 'amber', label: '琥珀' },
          { value: 'blue', label: '蓝色' },
        ],
      },
    ],
    defaults: { color: 'red' },
    prefix: 'LED',
    description: '发光二极管，阳极高于阴极时点亮，需串联限流电阻。',
    tags: ['led', '指示'],
  }),

  def({
    type: 'LOGIC_SWITCH',
    name: '逻辑开关',
    subtitle: '单刀单掷（0/1）',
    category: '基础器件',
    domains: 'all',
    symbol: 'switch',
    width: 84,
    height: 40,
    pins: [pin('OUT', 'OUT', 84, 20, 'right', 'output'), pin('GND', 'GND', 42, 40, 'down', 'power')],
    params: [],
    defaults: {},
    prefix: 'SW',
    description: '拨动开关，双击切换 0/1，输出直接驱动数字网络。',
    tags: ['switch', 'input', '逻辑开关'],
  }),
  def({
    type: 'BUTTON',
    name: '按键',
    subtitle: '轻触按键（低有效）',
    category: '基础器件',
    domains: 'all',
    symbol: 'switch',
    width: 84,
    height: 40,
    pins: [pin('OUT', 'OUT', 84, 20, 'right', 'output'), pin('GND', 'GND', 42, 40, 'down', 'power')],
    params: [],
    defaults: {},
    prefix: 'SW',
    description: '轻触按键，按下输出低电平，松开输出高电平（内置上拉）。',
    tags: ['button', 'key', '按键'],
  }),
  def({
    type: 'BUZZER',
    name: '蜂鸣器',
    subtitle: '有源蜂鸣器',
    category: '显示与指示',
    domains: 'all',
    symbol: 'buzzer',
    width: 80,
    height: 62,
    pins: [pin('IN', 'IN', 0, 30, 'left', 'input'), pin('GND', 'GND', 40, 62, 'down', 'power')],
    params: [],
    defaults: {},
    prefix: 'BZ',
    description: '有源蜂鸣器，IN 为高电平时发声（界面动画提示）。',
    tags: ['buzzer', 'sound', '蜂鸣器'],
  }),
  def({
    type: 'PROBE',
    name: '逻辑探针',
    subtitle: '0/1/高阻指示',
    category: '显示与指示',
    domains: 'all',
    symbol: 'probe',
    width: 64,
    height: 54,
    pins: [pin('IN', 'IN', 0, 27, 'left', 'input')],
    params: [],
    defaults: {},
    prefix: 'TP',
    description: '逻辑探针，显示被测网络的高低电平或高阻状态。',
    tags: ['probe', 'logic', '探针'],
  }),

  // —— 电源与地 ——
  def({
    type: 'VCC',
    name: 'VCC',
    subtitle: '正电源符号',
    category: '电源与地',
    domains: 'all',
    symbol: 'power-vcc',
    width: 44,
    height: 42,
    pins: [pin('1', 'VCC', 22, 40, 'down', 'power')],
    params: [],
    defaults: {},
    prefix: 'PWR',
    description: '正电源网络。连接到该符号的引脚会加入全局 VCC。',
    tags: ['power', 'vcc'],
  }),
  def({
    type: 'GND',
    name: 'GND',
    subtitle: '参考地符号',
    category: '电源与地',
    domains: 'all',
    symbol: 'power-gnd',
    width: 44,
    height: 42,
    pins: [pin('1', 'GND', 22, 0, 'up', 'power')],
    params: [],
    defaults: {},
    prefix: 'PWR',
    description: '参考地网络。所有 GND 引脚自动汇入该网络。',
    tags: ['power', 'gnd'],
  }),

  // —— 基础器件 ——
  PASSIVE(
    'resistor',
    'RESISTOR',
    '电阻',
    '1/4W 通用电阻',
    [pin('1', '1', 0, 14, 'left'), pin('2', '2', 84, 14, 'right')],
    [numberParam('resistance', '阻值', 'Ω', 0.1, 10)],
    { resistance: 1000 },
    '通用电阻，模电与 LED 限流使用。',
    'R',
  ),
  PASSIVE(
    'capacitor',
    'CAPACITOR',
    '电容',
    '无极性电容',
    [pin('1', '1', 0, 20, 'left'), pin('2', '2', 84, 20, 'right')],
    [numberParam('capacitance', '容值', 'µF', 0.001, 0.1)],
    { capacitance: 10 },
    '通用电容，用于滤波、定时与耦合。',
    'C',
  ),
  PASSIVE(
    'inductor',
    'INDUCTOR',
    '电感',
    '功率电感',
    [pin('1', '1', 0, 14, 'left'), pin('2', '2', 84, 14, 'right')],
    [numberParam('inductance', '感值', 'µH', 0.1, 1)],
    { inductance: 220 },
    '储能电感，Buck / Boost 拓扑使用。',
    'L',
  ),
  PASSIVE(
    'diode',
    'DIODE',
    '二极管',
    '整流 / 续流',
    [pin('A', 'A', 0, 20, 'left'), pin('K', 'K', 84, 20, 'right')],
    [numberParam('vf', '正向压降', 'V', 0.1, 0.05)],
    { vf: 0.7 },
    '通用二极管，用于整流与续流。',
    'D',
  ),
  def({
    type: 'VSRC',
    name: '直流源',
    subtitle: '理想电压源',
    category: '信号源',
    domains: ['analog', 'power'],
    symbol: 'source',
    width: 84,
    height: 52,
    pins: [pin('neg', '-', 0, 26, 'left', 'passive'), pin('pos', '+', 84, 26, 'right', 'passive')],
    params: [numberParam('voltage', '电压', 'V', 0, 1)],
    defaults: { voltage: 12 },
    prefix: 'V',
    description: '理想直流电压源，负极在左、正极在右。',
    tags: ['source', 'vdc'],
  }),
  def({
    type: 'CLOCK',
    name: '时钟源',
    subtitle: '方波时钟',
    category: '信号源',
    domains: ['digital', 'mcs51'],
    symbol: 'clock',
    width: 100,
    height: 64,
    pins: [pin('OUT', 'OUT', 100, 32, 'right', 'output'), pin('GND', 'GND', 50, 64, 'down', 'power')],
    params: [numberParam('freq', '频率', 'Hz', 0.1, 0.1)],
    defaults: { freq: 1 },
    prefix: 'CLK',
    description: '理想方波时钟源，占空比 50%。',
    tags: ['clock', 'source', '方波'],
  }),
  def({
    type: 'SWITCH',
    name: '开关',
    subtitle: '单刀单掷',
    category: '基础器件',
    domains: 'all',
    symbol: 'switch',
    width: 84,
    height: 40,
    pins: [pin('1', '1', 0, 20, 'left'), pin('2', '2', 84, 20, 'right')],
    params: [],
    defaults: {},
    prefix: 'SW',
    description: '手动开关，点击器件可切换通断状态。',
    tags: ['switch', '开关'],
  }),

  // —— MCU 板卡 ——
  def({
    type: 'MCU51',
    name: 'STC89C52RC',
    subtitle: '51 最小系统板',
    category: '单片机',
    domains: ['mcs51'],
    symbol: 'board',
    width: 280,
    height: 380,
    pins: [
      ...Array.from({ length: 8 }, (_, i) => pin(`P1.${i}`, `P1.${i}`, 0, 44 + i * 26, 'left', 'bidir')),
      pin('RST', 'RST', 0, 268, 'left', 'input'),
      pin('TXD', 'TXD', 0, 294, 'left', 'output'),
      pin('RXD', 'RXD', 0, 320, 'left', 'input'),
      pin('VCC', 'VCC', 0, 346, 'left', 'power'),
      pin('GND', 'GND', 0, 372, 'left', 'power'),
      ...Array.from({ length: 8 }, (_, i) => pin(`P0.${i}`, `P0.${i}`, 280, 44 + i * 26, 'right', 'bidir')),
      pin('XTAL1', 'XTAL1', 280, 268, 'right', 'input'),
      pin('XTAL2', 'XTAL2', 280, 294, 'right', 'output'),
      pin('EA', 'EA', 280, 320, 'right', 'input'),
      pin('P2.0', 'P2.0', 280, 346, 'right', 'bidir'),
      pin('P2.1', 'P2.1', 280, 372, 'right', 'bidir'),
    ],
    params: [],
    defaults: {},
    prefix: 'MCU',
    description: 'STC89C52RC 最小系统板，12 MHz 时钟，P1 口板载流水灯。',
    tags: ['8051', 'mcu', '51'],
  }),
  def({
    type: 'STM32',
    name: 'STM32F103C8T6',
    subtitle: 'Blue Pill 最小系统板',
    category: '单片机',
    domains: ['stm32'],
    symbol: 'board',
    width: 300,
    height: 380,
    pins: [
      ...Array.from({ length: 8 }, (_, i) => pin(`PA${i}`, `PA${i}`, 0, 44 + i * 26, 'left', 'bidir')),
      pin('3V3', '3V3', 0, 268, 'left', 'power'),
      pin('GND', 'GND', 0, 294, 'left', 'power'),
      pin('NRST', 'NRST', 0, 320, 'left', 'input'),
      pin('BOOT0', 'BOOT0', 0, 346, 'left', 'input'),
      ...Array.from({ length: 8 }, (_, i) => pin(`PB${i}`, `PB${i}`, 300, 44 + i * 26, 'right', 'bidir')),
      pin('PC13', 'PC13', 300, 268, 'right', 'bidir'),
      pin('PA9', 'PA9', 300, 294, 'right', 'bidir'),
      pin('PA10', 'PA10', 300, 320, 'right', 'bidir'),
      pin('GND2', 'GND', 300, 346, 'right', 'power'),
      pin('5V', '5V', 300, 372, 'right', 'power'),
    ],
    params: [],
    defaults: {},
    prefix: 'MCU',
    description: 'STM32F103C8T6 Blue Pill，Cortex-M3 @72MHz，PC13 板载 LED，USART1 位于 PA9/PA10。',
    tags: ['stm32', 'mcu', 'bluepill'],
  }),
];

// ---------- 查询 ----------

const byType = new Map(PARTS.map((p) => [p.type, p]));

export const getPart = (type: string): PartDef | undefined => byType.get(type);

export const allParts = (): PartDef[] => PARTS;

export const partsForDomain = (domain: Domain): PartDef[] =>
  PARTS.filter((p) => p.domains === 'all' || p.domains.includes(domain));

export const CATEGORY_ORDER = [
  '逻辑门',
  '触发器',
  '计数器',
  '移位寄存器',
  '译码与选择',
  '运算与比较',
  '显示与指示',
  '基础器件',
  '信号源',
  '电源与地',
  '单片机',
];

export const PARTS_BY_TYPE = byType;
