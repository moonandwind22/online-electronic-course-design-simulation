import type { Domain } from '../model/types';
import type { ParamDef, PartDef, PinSpec } from './types';
import { pinsOnSide, verticalPins } from './types';

const CHIP_WIDTH = 168;

function chipHeight(rows: number): number {
  return Math.max(132, 40 + rows * 18);
}

interface ChipConfig {
  type: string;
  name: string;
  model: string;
  category: string;
  domains?: Domain[];
  description: string;
  left: PinSpec[];
  right: PinSpec[];
  params?: ParamDef[];
  power?: { vcc?: string[]; gnd?: string[] };
}

function chip(config: ChipConfig): PartDef {
  const rows = Math.max(config.left.length, config.right.length);
  const height = chipHeight(rows);
  return {
    type: config.type,
    name: config.name,
    model: config.model,
    category: config.category,
    domains: config.domains ?? ['digital'],
    refPrefix: 'U',
    width: CHIP_WIDTH,
    height,
    pins: [
      ...pinsOnSide('left', config.left, CHIP_WIDTH, height),
      ...pinsOnSide('right', config.right, CHIP_WIDTH, height),
    ],
    params: config.params,
    symbol: 'chip',
    description: config.description,
    power: config.power,
  };
}

const p = (id: string, number: string, direction: PinSpec['direction'], ttl = false): PinSpec => ({
  id,
  name: id,
  number,
  direction,
  ttl,
});

const GND_PIN = (number: string): PinSpec => ({ id: 'GND', name: 'GND', number, direction: 'power', ttl: false });
const VCC_PIN = (number: string): PinSpec => ({ id: 'VCC', name: 'VCC', number, direction: 'power', ttl: false });

const ledPart: PartDef = {
  type: 'led',
  name: '发光二极管',
  model: 'LED',
  category: '显示与外设',
  domains: ['digital', 'analog', 'power', 'mcs51', 'stm32'],
  refPrefix: 'LED',
  width: 40,
  height: 60,
  pins: [
    { id: 'A', name: 'A', number: '1', x: 20, y: 0, side: 'top', direction: 'passive' },
    { id: 'K', name: 'K', number: '2', x: 20, y: 60, side: 'bottom', direction: 'passive' },
  ],
  params: [
    {
      key: 'color',
      label: '颜色',
      kind: 'select',
      defaultValue: 'red',
      options: [
        { label: '红色', value: 'red' },
        { label: '绿色', value: 'green' },
        { label: '黄色', value: 'yellow' },
        { label: '蓝色', value: 'blue' },
      ],
    },
    { key: 'forward', label: '正向压降', kind: 'number', unit: 'V', defaultValue: 1.8, step: 0.1 },
    { key: 'resistor', label: '限流电阻', kind: 'number', unit: 'Ω', defaultValue: 330, step: 10 },
  ],
  symbol: 'led',
  description: '数字/模拟通用 LED，阳极接高电平、阴极接低电平时点亮。',
};

const sevenSegPart: PartDef = {
  type: 'seven_seg',
  name: '七段数码管',
  model: '7SEG',
  category: '显示与外设',
  domains: ['digital', 'mcs51', 'stm32'],
  refPrefix: 'DS',
  width: 96,
  height: 156,
  pins: [
    ...pinsOnSide(
      'left',
      [
        { id: 'a', name: 'a', number: '3', direction: 'in' },
        { id: 'b', name: 'b', number: '4', direction: 'in' },
        { id: 'c', name: 'c', number: '5', direction: 'in' },
        { id: 'd', name: 'd', number: '6', direction: 'in' },
        { id: 'e', name: 'e', number: '7', direction: 'in' },
        { id: 'f', name: 'f', number: '8', direction: 'in' },
        { id: 'g', name: 'g', number: '9', direction: 'in' },
        { id: 'dp', name: 'dp', number: '10', direction: 'in' },
      ],
      96,
      156,
    ),
    ...pinsOnSide(
      'right',
      [
        { id: 'COM1', name: 'COM', number: '1', direction: 'in' },
        { id: 'COM2', name: 'COM', number: '2', direction: 'in' },
      ],
      96,
      156,
    ),
  ],
  params: [
    {
      key: 'common',
      label: '共极',
      kind: 'select',
      defaultValue: 'cathode',
      options: [
        { label: '共阴极', value: 'cathode' },
        { label: '共阳极', value: 'anode' },
      ],
    },
    {
      key: 'color',
      label: '颜色',
      kind: 'select',
      defaultValue: 'red',
      options: [
        { label: '红色', value: 'red' },
        { label: '绿色', value: 'green' },
        { label: '琥珀', value: 'amber' },
      ],
    },
  ],
  symbol: 'seven-seg',
  description: '8 段数码管，共阴/共阳可选；段引脚 a–g 与 dp 分别对应各段。',
};

const clockPart: PartDef = {
  type: 'clock',
  name: '时钟源',
  model: 'CLOCK',
  category: '显示与外设',
  domains: ['digital'],
  refPrefix: 'CLK',
  width: 104,
  height: 72,
  pins: [
    { id: 'OUT', name: 'OUT', number: '1', x: 104, y: 30, side: 'right', direction: 'out' },
    { id: 'GND', name: 'GND', number: '2', x: 52, y: 72, side: 'bottom', direction: 'power' },
  ],
  params: [
    { key: 'frequency', label: '频率', kind: 'number', unit: 'Hz', defaultValue: 1, min: 0.1, max: 1000000, step: 0.1 },
    { key: 'duty', label: '占空比', kind: 'number', unit: '%', defaultValue: 50, min: 1, max: 99, step: 1 },
  ],
  symbol: 'clock',
  description: '理想逻辑时钟源，输出 0/1 方波。',
};

const buttonPart: PartDef = {
  type: 'button',
  name: '轻触按键',
  model: 'KEY',
  category: '显示与外设',
  domains: ['digital', 'analog', 'mcs51', 'stm32'],
  refPrefix: 'SW',
  width: 64,
  height: 56,
  pins: [
    { id: '1', name: '1', number: '1', x: 0, y: 28, side: 'left', direction: 'passive' },
    { id: '2', name: '2', number: '2', x: 64, y: 28, side: 'right', direction: 'passive' },
  ],
  params: [
    {
      key: 'momentary',
      label: '类型',
      kind: 'select',
      defaultValue: 'no',
      options: [
        { label: '常开', value: 'no' },
        { label: '常闭', value: 'nc' },
      ],
    },
  ],
  symbol: 'button',
  description: '按下时闭合；可在运行中点击画布上的按键交互。',
};

const switchPart: PartDef = {
  type: 'switch',
  name: '拨动开关',
  model: 'SW',
  category: '显示与外设',
  domains: ['digital', 'analog', 'power', 'mcs51', 'stm32'],
  refPrefix: 'SW',
  width: 64,
  height: 56,
  pins: [
    { id: '1', name: '1', number: '1', x: 0, y: 28, side: 'left', direction: 'passive' },
    { id: '2', name: '2', number: '2', x: 64, y: 28, side: 'right', direction: 'passive' },
  ],
  params: [
    {
      key: 'on',
      label: '状态',
      kind: 'select',
      defaultValue: 'off',
      options: [
        { label: '断开', value: 'off' },
        { label: '闭合', value: 'on' },
      ],
    },
  ],
  symbol: 'switch',
  description: '单刀单掷开关；闭合后两端导通。',
};

const resistorPart: PartDef = {
  type: 'resistor',
  name: '电阻',
  model: 'R',
  category: '无源器件',
  domains: ['analog', 'power', 'digital'],
  refPrefix: 'R',
  width: 40,
  height: 72,
  pins: verticalPins(40, 72),
  params: [{ key: 'resistance', label: '阻值', kind: 'number', unit: 'Ω', defaultValue: 1000, min: 0.1, step: 10 }],
  symbol: 'resistor',
  description: '理想线性电阻。',
};

const potentiometerPart: PartDef = {
  type: 'potentiometer',
  name: '电位器',
  model: 'POT',
  category: '无源器件',
  domains: ['analog', 'power'],
  refPrefix: 'RV',
  width: 48,
  height: 80,
  pins: [
    { id: 'a', name: 'A', x: 24, y: 0, side: 'top', direction: 'passive' },
    { id: 'b', name: 'B', x: 24, y: 80, side: 'bottom', direction: 'passive' },
    { id: 'w', name: 'W', x: 48, y: 40, side: 'right', direction: 'passive' },
  ],
  params: [
    { key: 'resistance', label: '总阻值', kind: 'number', unit: 'Ω', defaultValue: 10000, min: 1, step: 100 },
    { key: 'position', label: '位置', kind: 'number', unit: '%', defaultValue: 50, min: 0, max: 100, step: 1 },
  ],
  symbol: 'potentiometer',
  description: '三端可调电阻，W 端位置可调。',
};

const capacitorPart: PartDef = {
  type: 'capacitor',
  name: '电容',
  model: 'C',
  category: '无源器件',
  domains: ['analog', 'power'],
  refPrefix: 'C',
  width: 40,
  height: 72,
  pins: verticalPins(40, 72),
  params: [{ key: 'capacitance', label: '容值', kind: 'number', unit: 'F', defaultValue: 1e-6, min: 1e-12, step: 1e-7 }],
  symbol: 'capacitor',
  description: '理想电容。',
};

const inductorPart: PartDef = {
  type: 'inductor',
  name: '电感',
  model: 'L',
  category: '无源器件',
  domains: ['analog', 'power'],
  refPrefix: 'L',
  width: 40,
  height: 72,
  pins: verticalPins(40, 72),
  params: [{ key: 'inductance', label: '感值', kind: 'number', unit: 'H', defaultValue: 1e-3, min: 1e-9, step: 1e-4 }],
  symbol: 'inductor',
  description: '理想电感。',
};

const diodePart: PartDef = {
  type: 'diode',
  name: '二极管',
  model: 'D',
  category: '半导体',
  domains: ['analog', 'power'],
  refPrefix: 'D',
  width: 72,
  height: 48,
  pins: [
    { id: 'A', name: 'A', number: '1', x: 0, y: 24, side: 'left', direction: 'passive' },
    { id: 'K', name: 'K', number: '2', x: 72, y: 24, side: 'right', direction: 'passive' },
  ],
  params: [{ key: 'vf', label: '正向压降', kind: 'number', unit: 'V', defaultValue: 0.7, step: 0.1 }],
  symbol: 'diode',
  description: 'pn 结二极管，阳极到阴极导通。',
};

const zenerPart: PartDef = {
  ...diodePart,
  type: 'zener',
  name: '稳压二极管',
  model: 'DZ',
  params: [
    { key: 'vz', label: '稳压值', kind: 'number', unit: 'V', defaultValue: 5.1, step: 0.1 },
    { key: 'vf', label: '正向压降', kind: 'number', unit: 'V', defaultValue: 0.7, step: 0.1 },
  ],
  symbol: 'zener',
  description: '反向击穿区稳压的二极管。',
};

const voltageSourcePart: PartDef = {
  type: 'vsource',
  name: '直流电压源',
  model: 'V',
  category: '信号源',
  domains: ['analog', 'power'],
  refPrefix: 'V',
  width: 72,
  height: 96,
  pins: [
    { id: 'pos', name: '+', x: 36, y: 0, side: 'top', direction: 'power' },
    { id: 'neg', name: '−', x: 36, y: 96, side: 'bottom', direction: 'power' },
  ],
  params: [
    { key: 'voltage', label: '电压', kind: 'number', unit: 'V', defaultValue: 5, step: 0.5 },
    { key: 'resistance', label: '内阻', kind: 'number', unit: 'Ω', defaultValue: 0.01, min: 0, step: 0.01 },
  ],
  symbol: 'source-dc',
  description: '理想直流电压源。',
};

const acSourcePart: PartDef = {
  ...voltageSourcePart,
  type: 'vsource_ac',
  name: '交流信号源',
  model: 'VAC',
  params: [
    { key: 'amplitude', label: '幅值', kind: 'number', unit: 'V', defaultValue: 5, step: 0.5 },
    { key: 'frequency', label: '频率', kind: 'number', unit: 'Hz', defaultValue: 1000, min: 0.1, step: 100 },
    { key: 'offset', label: '偏置', kind: 'number', unit: 'V', defaultValue: 0, step: 0.5 },
    {
      key: 'waveform',
      label: '波形',
      kind: 'select',
      defaultValue: 'sine',
      options: [
        { label: '正弦', value: 'sine' },
        { label: '方波', value: 'square' },
        { label: '三角', value: 'triangle' },
      ],
    },
  ],
  symbol: 'source-ac',
  description: '可调正弦/方波/三角信号源。',
};

const batteryPart: PartDef = {
  ...voltageSourcePart,
  type: 'battery',
  name: '电池',
  model: 'BAT',
  params: [
    { key: 'voltage', label: '电压', kind: 'number', unit: 'V', defaultValue: 9, step: 0.5 },
    { key: 'capacity', label: '容量', kind: 'number', unit: 'mAh', defaultValue: 500, step: 100 },
  ],
  symbol: 'battery',
  description: '带容量的直流电池模型。',
};

const groundPart: PartDef = {
  type: 'gnd',
  name: '地',
  model: 'GND',
  category: '电源与地',
  domains: ['digital', 'analog', 'power', 'mcs51', 'stm32'],
  refPrefix: 'GND',
  width: 48,
  height: 44,
  pins: [{ id: '1', name: 'GND', x: 24, y: 0, side: 'top', direction: 'power' }],
  symbol: 'ground',
  description: '参考地，0 V。',
};

const vccPart: PartDef = {
  type: 'vcc',
  name: '电源',
  model: 'VCC',
  category: '电源与地',
  domains: ['digital', 'analog', 'power', 'mcs51', 'stm32'],
  refPrefix: 'PWR',
  width: 48,
  height: 44,
  pins: [{ id: '1', name: 'VCC', x: 24, y: 44, side: 'bottom', direction: 'power' }],
  params: [
    { key: 'voltage', label: '电压', kind: 'number', unit: 'V', defaultValue: 5, step: 0.5 },
    {
      key: 'label',
      label: '网络名',
      kind: 'text',
      defaultValue: 'VCC',
    },
  ],
  symbol: 'rail',
  description: '电源符号，默认 5 V；可改网络名（如 3V3）。',
};

const npnPart: PartDef = {
  type: 'npn',
  name: 'NPN 三极管',
  model: 'Q',
  category: '半导体',
  domains: ['analog'],
  refPrefix: 'Q',
  width: 72,
  height: 80,
  pins: [
    { id: 'B', name: 'B', number: '1', x: 0, y: 40, side: 'left', direction: 'in' },
    { id: 'C', name: 'C', number: '2', x: 48, y: 0, side: 'top', direction: 'passive' },
    { id: 'E', name: 'E', number: '3', x: 48, y: 80, side: 'bottom', direction: 'passive' },
  ],
  params: [
    { key: 'beta', label: 'β', kind: 'number', defaultValue: 100, min: 1, step: 10 },
    { key: 'model', label: '型号', kind: 'select', defaultValue: '2N3904', options: [{ label: '2N3904', value: '2N3904' }, { label: 'S8050', value: 'S8050' }] },
  ],
  symbol: 'npn',
  description: '小信号 NPN 双极型晶体管。',
};

const pnpPart: PartDef = {
  ...npnPart,
  type: 'pnp',
  name: 'PNP 三极管',
  model: 'Q',
  symbol: 'pnp',
  description: '小信号 PNP 双极型晶体管。',
};

const opampPart: PartDef = {
  type: 'opamp',
  name: '运算放大器',
  model: 'LM358',
  category: '运算放大器',
  domains: ['analog'],
  refPrefix: 'U',
  width: 96,
  height: 96,
  pins: [
    { id: 'IN+', name: '+', number: '3', x: 0, y: 30, side: 'left', direction: 'in' },
    { id: 'IN-', name: '−', number: '2', x: 0, y: 66, side: 'left', direction: 'in' },
    { id: 'OUT', name: 'OUT', number: '1', x: 96, y: 48, side: 'right', direction: 'out' },
    { id: 'V+', name: 'V+', number: '8', x: 48, y: 0, side: 'top', direction: 'power' },
    { id: 'V-', name: 'V−', number: '4', x: 48, y: 96, side: 'bottom', direction: 'power' },
  ],
  params: [
    { key: 'gain', label: '开环增益', kind: 'number', unit: 'dB', defaultValue: 100, step: 5 },
    { key: 'vcc', label: '供电', kind: 'number', unit: 'V', defaultValue: 12, step: 1 },
  ],
  symbol: 'opamp',
  description: '通用双运放中的一路，支持单/双电源。',
};

const nmosPart: PartDef = {
  type: 'nmos',
  name: 'N 沟道 MOSFET',
  model: 'IRF540',
  category: '功率器件',
  domains: ['power'],
  refPrefix: 'Q',
  width: 72,
  height: 80,
  pins: [
    { id: 'G', name: 'G', number: '1', x: 0, y: 40, side: 'left', direction: 'in' },
    { id: 'D', name: 'D', number: '2', x: 48, y: 0, side: 'top', direction: 'passive' },
    { id: 'S', name: 'S', number: '3', x: 48, y: 80, side: 'bottom', direction: 'passive' },
  ],
  params: [
    { key: 'rds_on', label: 'Rds(on)', kind: 'number', unit: 'Ω', defaultValue: 0.044, min: 0.001, step: 0.001 },
    { key: 'vth', label: '阈值', kind: 'number', unit: 'V', defaultValue: 2, step: 0.1 },
  ],
  symbol: 'nmos',
  description: '带体二极管的 N 沟道功率 MOSFET。',
};

const igbtPart: PartDef = {
  ...nmosPart,
  type: 'igbt',
  name: 'IGBT',
  model: 'IGBT',
  pins: [
    { id: 'G', name: 'G', number: '1', x: 0, y: 40, side: 'left', direction: 'in' },
    { id: 'C', name: 'C', number: '2', x: 48, y: 0, side: 'top', direction: 'passive' },
    { id: 'E', name: 'E', number: '3', x: 48, y: 80, side: 'bottom', direction: 'passive' },
  ],
  params: [
    { key: 'vce_sat', label: 'Vce(sat)', kind: 'number', unit: 'V', defaultValue: 1.8, step: 0.1 },
    { key: 'vth', label: '阈值', kind: 'number', unit: 'V', defaultValue: 5, step: 0.1 },
  ],
  symbol: 'igbt',
  description: '带饱和压降的 IGBT 教学模型。',
};

const scrPart: PartDef = {
  type: 'scr',
  name: '晶闸管 SCR',
  model: 'SCR',
  category: '功率器件',
  domains: ['power'],
  refPrefix: 'Q',
  width: 72,
  height: 80,
  pins: [
    { id: 'G', name: 'G', number: '1', x: 0, y: 40, side: 'left', direction: 'in' },
    { id: 'A', name: 'A', number: '2', x: 48, y: 0, side: 'top', direction: 'passive' },
    { id: 'K', name: 'K', number: '3', x: 48, y: 80, side: 'bottom', direction: 'passive' },
  ],
  params: [
    { key: 'vgt', label: '触发电压', kind: 'number', unit: 'V', defaultValue: 1.5, step: 0.1 },
    { key: 'vh', label: '维持电流', kind: 'number', unit: 'mA', defaultValue: 5, step: 1 },
  ],
  symbol: 'scr',
  description: '门极触发后锁存的晶闸管。',
};

const pwmPart: PartDef = {
  type: 'pwm',
  name: 'PWM 驱动源',
  model: 'PWM',
  category: '信号源',
  domains: ['power'],
  refPrefix: 'PWM',
  width: 112,
  height: 80,
  pins: [
    { id: 'OUT', name: 'OUT', number: '1', x: 112, y: 36, side: 'right', direction: 'out' },
    { id: 'GND', name: 'GND', number: '2', x: 56, y: 80, side: 'bottom', direction: 'power' },
  ],
  params: [
    { key: 'frequency', label: '频率', kind: 'number', unit: 'Hz', defaultValue: 20000, min: 1, step: 1000 },
    { key: 'duty', label: '占空比', kind: 'number', unit: '%', defaultValue: 50, min: 0, max: 100, step: 1 },
    { key: 'amplitude', label: '幅值', kind: 'number', unit: 'V', defaultValue: 10, step: 1 },
  ],
  symbol: 'clock',
  description: '理想 PWM 方波源，驱动功率管栅极。',
};

const rlLoadPart: PartDef = {
  type: 'rl_load',
  name: 'R-L 负载',
  model: 'RL',
  category: '负载',
  domains: ['power'],
  refPrefix: 'LOAD',
  width: 96,
  height: 64,
  pins: [
    { id: 'A', name: 'A', number: '1', x: 0, y: 32, side: 'left', direction: 'passive' },
    { id: 'B', name: 'B', number: '2', x: 96, y: 32, side: 'right', direction: 'passive' },
  ],
  params: [
    { key: 'resistance', label: '阻值', kind: 'number', unit: 'Ω', defaultValue: 10, min: 0.1, step: 1 },
    { key: 'inductance', label: '感值', kind: 'number', unit: 'H', defaultValue: 1e-3, step: 1e-4 },
  ],
  symbol: 'generic',
  description: '串联 R-L 负载。',
};

const lampPart: PartDef = {
  type: 'lamp',
  name: '灯泡',
  model: 'LAMP',
  category: '显示与外设',
  domains: ['analog', 'power'],
  refPrefix: 'LA',
  width: 48,
  height: 64,
  pins: verticalPins(48, 64),
  params: [
    { key: 'voltage', label: '额定电压', kind: 'number', unit: 'V', defaultValue: 12, step: 1 },
    { key: 'power', label: '额定功率', kind: 'number', unit: 'W', defaultValue: 5, step: 0.5 },
  ],
  symbol: 'lamp',
  description: '白炽灯负载。',
};

const buzzerPart: PartDef = {
  type: 'buzzer',
  name: '有源蜂鸣器',
  model: 'BZ',
  category: '显示与外设',
  domains: ['digital', 'mcs51', 'stm32'],
  refPrefix: 'BZ',
  width: 56,
  height: 60,
  pins: [
    { id: 'pos', name: '+', number: '1', x: 28, y: 0, side: 'top', direction: 'passive' },
    { id: 'neg', name: '−', number: '2', x: 28, y: 60, side: 'bottom', direction: 'passive' },
  ],
  params: [{ key: 'frequency', label: '频率', kind: 'number', unit: 'Hz', defaultValue: 2300, step: 100 }],
  symbol: 'buzzer',
  description: '有源蜂鸣器，通电发声。',
};

function boardPins(prefix: string, startPin: number, count: number): PinSpec[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}.${index}`,
    name: `${prefix}.${index}`,
    number: String(startPin + index),
    direction: 'io' as const,
    ttl: true,
  }));
}

const mcu51Part: PartDef = (() => {
  const width = 232;
  const height = 50 + 18 * 18;
  return {
    type: 'mcu51',
    name: '51 最小系统板',
    model: 'STC89C52RC',
    category: '最小系统',
    domains: ['mcs51'],
    refPrefix: 'MCU',
    width,
    height,
    pins: [
      ...pinsOnSide('left', [...boardPins('P1', 1, 8), ...boardPins('P3', 10, 8), { id: 'RST', name: 'RST', number: '9', direction: 'in', ttl: true }, { id: 'EA', name: 'EA', number: '31', direction: 'in', ttl: true }], width, height),
      ...pinsOnSide('right', [...boardPins('P0', 39, 8), ...boardPins('P2', 21, 8), { id: 'VCC', name: 'VCC', number: '40', direction: 'power' }, { id: 'GND', name: 'GND', number: '20', direction: 'power' }], width, height),
      ...pinsOnSide('bottom', [
        { id: 'XTAL1', name: 'XTAL1', number: '19', direction: 'in' },
        { id: 'XTAL2', name: 'XTAL2', number: '18', direction: 'in' },
        { id: 'UART_TX', name: 'TXD', number: '11', direction: 'out' },
        { id: 'UART_RX', name: 'RXD', number: '10', direction: 'in' },
      ], width, height),
    ],
    params: [
      { key: 'clock', label: '主频', kind: 'number', unit: 'MHz', defaultValue: 12, step: 1 },
      { key: 'firmware', label: '固件', kind: 'text', defaultValue: '' },
    ],
    symbol: 'board',
    description: 'STC89C52RC 最小系统板，P0 开漏、P1–P3 准双向，内置 12 MHz 时钟。',
  } satisfies PartDef;
})();

const stm32Part: PartDef = (() => {
  const width = 232;
  const height = 50 + 18 * 16;
  return {
    type: 'stm32',
    name: 'STM32 最小系统板',
    model: 'STM32F103C8T6',
    category: '最小系统',
    domains: ['stm32'],
    refPrefix: 'MCU',
    width,
    height,
    pins: [
      ...pinsOnSide('left', boardPins('PA', 10, 16), width, height),
      ...pinsOnSide('right', boardPins('PB', 18, 16), width, height),
      ...pinsOnSide('bottom', [
        { id: 'PC13', name: 'PC13', number: '2', direction: 'io', ttl: true },
        { id: 'PC14', name: 'PC14', number: '3', direction: 'io', ttl: true },
        { id: 'PC15', name: 'PC15', number: '4', direction: 'io', ttl: true },
        { id: '3V3', name: '3V3', number: '1', direction: 'power' },
        { id: 'GND', name: 'GND', number: '2', direction: 'power' },
      ], width, height),
    ],
    params: [
      { key: 'clock', label: '主频', kind: 'number', unit: 'MHz', defaultValue: 72, step: 8 },
      { key: 'firmware', label: '固件', kind: 'text', defaultValue: '' },
    ],
    symbol: 'board',
    description: 'STM32F103C8T6 Blue Pill，PC13 板载 LED，USART1 位于 PA9/PA10。',
  } satisfies PartDef;
})();

export const PARTS: PartDef[] = [
  chip({
    type: '74ls00',
    name: '四 2 输入 NAND',
    model: '74LS00',
    category: '逻辑门',
    description: '四个独立 2 输入与非门。',
    left: [p('1A', '1', 'in', true), p('1B', '2', 'in', true), p('1Y', '3', 'out'), p('2A', '4', 'in', true), p('2B', '5', 'in', true), p('2Y', '6', 'out'), GND_PIN('7')],
    right: [VCC_PIN('14'), p('4B', '13', 'in', true), p('4A', '12', 'in', true), p('4Y', '11', 'out'), p('3B', '10', 'in', true), p('3A', '9', 'in', true), p('3Y', '8', 'out')],
    power: { vcc: ['VCC'], gnd: ['GND'] },
  }),
  chip({
    type: '74ls08',
    name: '四 2 输入 AND',
    model: '74LS08',
    category: '逻辑门',
    description: '四个独立 2 输入与门。',
    left: [p('1A', '1', 'in', true), p('1B', '2', 'in', true), p('1Y', '3', 'out'), p('2A', '4', 'in', true), p('2B', '5', 'in', true), p('2Y', '6', 'out'), GND_PIN('7')],
    right: [VCC_PIN('14'), p('4B', '13', 'in', true), p('4A', '12', 'in', true), p('4Y', '11', 'out'), p('3B', '10', 'in', true), p('3A', '9', 'in', true), p('3Y', '8', 'out')],
    power: { vcc: ['VCC'], gnd: ['GND'] },
  }),
  chip({
    type: '74ls32',
    name: '四 2 输入 OR',
    model: '74LS32',
    category: '逻辑门',
    description: '四个独立 2 输入或门。',
    left: [p('1A', '1', 'in', true), p('1B', '2', 'in', true), p('1Y', '3', 'out'), p('2A', '4', 'in', true), p('2B', '5', 'in', true), p('2Y', '6', 'out'), GND_PIN('7')],
    right: [VCC_PIN('14'), p('4B', '13', 'in', true), p('4A', '12', 'in', true), p('4Y', '11', 'out'), p('3B', '10', 'in', true), p('3A', '9', 'in', true), p('3Y', '8', 'out')],
    power: { vcc: ['VCC'], gnd: ['GND'] },
  }),
  chip({
    type: '74ls86',
    name: '四 2 输入 XOR',
    model: '74LS86',
    category: '逻辑门',
    description: '四个独立 2 输入异或门。',
    left: [p('1A', '1', 'in', true), p('1B', '2', 'in', true), p('1Y', '3', 'out'), p('2A', '4', 'in', true), p('2B', '5', 'in', true), p('2Y', '6', 'out'), GND_PIN('7')],
    right: [VCC_PIN('14'), p('4B', '13', 'in', true), p('4A', '12', 'in', true), p('4Y', '11', 'out'), p('3B', '10', 'in', true), p('3A', '9', 'in', true), p('3Y', '8', 'out')],
    power: { vcc: ['VCC'], gnd: ['GND'] },
  }),
  chip({
    type: '74ls04',
    name: '六反相器',
    model: '74LS04',
    category: '逻辑门',
    description: '六个独立反相器。',
    left: [p('1A', '1', 'in', true), p('1Y', '2', 'out'), p('2A', '3', 'in', true), p('2Y', '4', 'out'), p('3A', '5', 'in', true), p('3Y', '6', 'out'), GND_PIN('7')],
    right: [VCC_PIN('14'), p('6A', '13', 'in', true), p('6Y', '12', 'out'), p('5A', '11', 'in', true), p('5Y', '10', 'out'), p('4A', '9', 'in', true), p('4Y', '8', 'out')],
    power: { vcc: ['VCC'], gnd: ['GND'] },
  }),
  chip({
    type: '74ls74',
    name: '双 D 触发器',
    model: '74LS74',
    category: '触发器',
    description: '双上升沿 D 触发器，异步清零/置位。',
    left: [p('1CLR', '1', 'in', true), p('1D', '2', 'in', true), p('1CLK', '3', 'in', true), p('1PRE', '4', 'in', true), p('1Q', '5', 'out'), p('1QN', '6', 'out'), GND_PIN('7')],
    right: [VCC_PIN('14'), p('2CLR', '13', 'in', true), p('2D', '12', 'in', true), p('2CLK', '11', 'in', true), p('2PRE', '10', 'in', true), p('2Q', '9', 'out'), p('2QN', '8', 'out')],
    power: { vcc: ['VCC'], gnd: ['GND'] },
  }),
  chip({
    type: '74ls161',
    name: '四位二进制计数器',
    model: '74LS161',
    category: '计数器',
    description: '同步 4 位二进制计数器，异步清零、同步置数、进位输出。',
    left: [p('CLR', '1', 'in', true), p('CLK', '2', 'in', true), p('A', '3', 'in', true), p('B', '4', 'in', true), p('C', '5', 'in', true), p('D', '6', 'in', true), p('ENP', '7', 'in', true), GND_PIN('8')],
    right: [VCC_PIN('16'), p('RCO', '15', 'out'), p('QD', '14', 'out'), p('QC', '13', 'out'), p('QB', '12', 'out'), p('QA', '11', 'out'), p('ENT', '10', 'in', true), p('LOAD', '9', 'in', true)],
    power: { vcc: ['VCC'], gnd: ['GND'] },
  }),
  chip({
    type: '74ls47',
    name: 'BCD-七段译码器',
    model: '74LS47',
    category: '译码器',
    description: 'BCD 到七段译码/驱动，低有效段输出。',
    left: [p('B', '1', 'in', true), p('C', '2', 'in', true), p('LT', '3', 'in', true), p('BI', '4', 'in', true), p('RBI', '5', 'in', true), p('D', '6', 'in', true), p('A', '7', 'in', true), GND_PIN('8')],
    right: [VCC_PIN('16'), p('f', '15', 'out'), p('g', '14', 'out'), p('a', '13', 'out'), p('b', '12', 'out'), p('c', '11', 'out'), p('d', '10', 'out'), p('e', '9', 'out')],
    power: { vcc: ['VCC'], gnd: ['GND'] },
  }),
  chip({
    type: '74ls138',
    name: '3-8 线译码器',
    model: '74LS138',
    category: '译码器',
    description: '3 位地址译码为 8 路低有效输出。',
    left: [p('A', '1', 'in', true), p('B', '2', 'in', true), p('C', '3', 'in', true), p('G2A', '4', 'in', true), p('G2B', '5', 'in', true), p('G1', '6', 'in', true), p('Y7', '7', 'out'), GND_PIN('8')],
    right: [VCC_PIN('16'), p('Y0', '15', 'out'), p('Y1', '14', 'out'), p('Y2', '13', 'out'), p('Y3', '12', 'out'), p('Y4', '11', 'out'), p('Y5', '10', 'out'), p('Y6', '9', 'out')],
    power: { vcc: ['VCC'], gnd: ['GND'] },
  }),
  chip({
    type: '74ls595',
    name: '8 位移位寄存器',
    model: '74LS595',
    category: '移位寄存器',
    description: '带输出锁存的 8 位移位寄存器，常用于扩展输出。',
    left: [p('QB', '1', 'out'), p('QC', '2', 'out'), p('QD', '3', 'out'), p('QE', '4', 'out'), p('QF', '5', 'out'), p('QG', '6', 'out'), p('QH', '7', 'out'), GND_PIN('8')],
    right: [VCC_PIN('16'), p('QA', '15', 'out'), p('SER', '14', 'in', true), p('OE', '13', 'in', true), p('RCLK', '12', 'in', true), p('SRCLK', '11', 'in', true), p('SRCLR', '10', 'in', true), p('QH2', '9', 'out')],
    power: { vcc: ['VCC'], gnd: ['GND'] },
  }),
  chip({
    type: '74ls373',
    name: '八 D 锁存器',
    model: '74LS373',
    category: '触发器',
    description: '八位透明锁存器，三态输出。',
    left: [p('OE', '1', 'in', true), p('Q0', '2', 'out'), p('D0', '3', 'in', true), p('D1', '4', 'in', true), p('Q1', '5', 'out'), p('Q2', '6', 'out'), p('D2', '7', 'in', true), p('D3', '8', 'in', true), p('Q3', '9', 'out'), GND_PIN('10')],
    right: [VCC_PIN('20'), p('Q7', '19', 'out'), p('D7', '18', 'in', true), p('Q6', '17', 'out'), p('D6', '16', 'in', true), p('Q5', '15', 'out'), p('D5', '14', 'in', true), p('Q4', '13', 'out'), p('D4', '12', 'in', true), p('LE', '11', 'in', true)],
    power: { vcc: ['VCC'], gnd: ['GND'] },
  }),
  chip({
    type: 'cd4017',
    name: '十进制计数器',
    model: 'CD4017',
    category: '计数器',
    description: '十进制约翰逊计数器，10 路译码输出。',
    left: [p('Q5', '1', 'out'), p('Q1', '2', 'out'), p('Q0', '3', 'out'), p('Q2', '4', 'out'), p('Q6', '5', 'out'), p('Q7', '6', 'out'), p('Q3', '7', 'out'), GND_PIN('8')],
    right: [VCC_PIN('16'), p('RST', '15', 'in', true), p('CLK', '14', 'in', true), p('CLKE', '13', 'in', true), p('CO', '12', 'out'), p('Q9', '11', 'out'), p('Q4', '10', 'out'), p('Q8', '9', 'out')],
    power: { vcc: ['VCC'], gnd: ['GND'] },
  }),
  chip({
    type: 'ne555',
    name: '555 定时器',
    model: 'NE555',
    category: '定时',
    domains: ['digital', 'analog'],
    description: '555 定时器，可构成多谐振荡、单稳态等电路。',
    left: [p('GND', '1', 'power'), p('TRIG', '2', 'in'), p('OUT', '3', 'out'), p('RESET', '4', 'in')],
    right: [VCC_PIN('8'), p('DISCH', '7', 'io'), p('THR', '6', 'in'), p('CTRL', '5', 'in')],
  }),
  ledPart,
  sevenSegPart,
  clockPart,
  buttonPart,
  switchPart,
  buzzerPart,
  resistorPart,
  potentiometerPart,
  capacitorPart,
  inductorPart,
  diodePart,
  zenerPart,
  voltageSourcePart,
  acSourcePart,
  batteryPart,
  groundPart,
  vccPart,
  npnPart,
  pnpPart,
  opampPart,
  nmosPart,
  igbtPart,
  scrPart,
  pwmPart,
  rlLoadPart,
  lampPart,
  mcu51Part,
  stm32Part,
];

export const partRegistry = new Map<string, PartDef>(PARTS.map((part) => [part.type, part]));

export function getPart(type: string): PartDef | undefined {
  return partRegistry.get(type);
}

export function listParts(domain: Domain): PartDef[] {
  return PARTS.filter((part) => part.domains.includes(domain));
}

export function listCategories(domain: Domain): string[] {
  const categories: string[] = [];
  for (const part of listParts(domain)) {
    if (!categories.includes(part.category)) categories.push(part.category);
  }
  return categories;
}

export function searchParts(domain: Domain, query: string): PartDef[] {
  const keyword = query.trim().toLowerCase();
  const parts = listParts(domain);
  if (!keyword) return parts;
  return parts.filter((part) =>
    [part.name, part.model ?? '', part.type, part.category].some((field) =>
      field.toLowerCase().includes(keyword),
    ),
  );
}

export function defaultParams(part: PartDef): Record<string, number | string> {
  const params: Record<string, number | string> = {};
  for (const def of part.params ?? []) params[def.key] = def.defaultValue;
  return params;
}
