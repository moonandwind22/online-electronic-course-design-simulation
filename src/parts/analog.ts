import type { PartDef, PinDef } from './types';

const h2 = (id1: string, name1: string, id2: string, name2: string, w = 44, h = 30): PinDef[] => [
  { id: id1, name: name1, x: 0, y: h / 2, side: 'left', dir: 'passive' },
  { id: id2, name: name2, x: w, y: h / 2, side: 'right', dir: 'passive' },
];

const resistor: PartDef = {
  type: 'RESISTOR',
  name: '电阻',
  subtitle: 'R',
  category: 'analog',
  domains: ['analog', 'power', 'digital', 'mcs51', 'stm32'],
  description: '固定电阻，单位欧姆。',
  width: 44,
  height: 30,
  refPrefix: 'R',
  pins: h2('a', '1', 'b', '2'),
  params: [
    { key: 'resistance', label: '阻值', kind: 'number', unit: 'Ω', default: 1000, min: 0.1, max: 1e8, step: 100 },
  ],
  symbol: { kind: 'passive', shape: 'resistor' },
  keywords: ['电阻', '限流', '分压'],
};

const pot: PartDef = {
  type: 'POT',
  name: '电位器',
  subtitle: 'POT',
  category: 'analog',
  domains: ['analog', 'power'],
  description: '三端可调电位器，用于分压与调零。',
  width: 66,
  height: 46,
  refPrefix: 'RP',
  pins: [
    { id: 'cw', name: 'CW', x: 0, y: 32, side: 'left', dir: 'passive' },
    { id: 'wiper', name: 'W', x: 66, y: 14, side: 'right', dir: 'passive' },
    { id: 'ccw', name: 'CCW', x: 0, y: 14, side: 'left', dir: 'passive' },
  ],
  params: [
    { key: 'rTotal', label: '总阻值', kind: 'number', unit: 'Ω', default: 10000, min: 10, max: 1e7, step: 100 },
    { key: 'position', label: '位置', kind: 'number', unit: '%', default: 50, min: 0, max: 100, step: 1, displayScale: 100 },
  ],
  symbol: { kind: 'pot' },
  keywords: ['电位器', '可调', '分压'],
};

const capacitor: PartDef = {
  type: 'CAP',
  name: '电容',
  subtitle: 'C',
  category: 'analog',
  domains: ['analog', 'power'],
  description: '无极性电容，单位法拉（界面以 µF 显示）。',
  width: 44,
  height: 34,
  refPrefix: 'C',
  pins: [
    { id: 'a', name: '1', x: 0, y: 17, side: 'left', dir: 'passive' },
    { id: 'b', name: '2', x: 44, y: 17, side: 'right', dir: 'passive' },
  ],
  params: [
    { key: 'capacitance', label: '容值', kind: 'number', unit: 'µF', default: 1e-6, min: 1e-12, max: 1, step: 0.1, displayScale: 1e6 },
  ],
  symbol: { kind: 'passive', shape: 'capacitor' },
  keywords: ['电容', '滤波', '储能'],
};

const ecap: PartDef = {
  ...capacitor,
  type: 'ECAP',
  name: '电解电容',
  subtitle: 'C-E',
  description: '有极性电解电容，注意正负极；带等效串联电阻。',
  params: [
    { key: 'capacitance', label: '容值', kind: 'number', unit: 'µF', default: 100e-6, min: 1e-9, max: 1, step: 1, displayScale: 1e6 },
    { key: 'esr', label: 'ESR', kind: 'number', unit: 'Ω', default: 0.1, min: 0.001, max: 10, step: 0.01 },
  ],
  symbol: { kind: 'passive', shape: 'electrolytic' },
  keywords: ['电解电容', '滤波'],
};

const inductor: PartDef = {
  type: 'INDUCTOR',
  name: '电感',
  subtitle: 'L',
  category: 'analog',
  domains: ['analog', 'power'],
  description: '功率电感，单位亨利（界面以 mH 显示），带直流电阻。',
  width: 52,
  height: 30,
  refPrefix: 'L',
  pins: h2('a', '1', 'b', '2', 52),
  params: [
    { key: 'inductance', label: '感值', kind: 'number', unit: 'mH', default: 1e-3, min: 1e-9, max: 10, step: 0.1, displayScale: 1000 },
    { key: 'dcr', label: '直流电阻', kind: 'number', unit: 'Ω', default: 0.05, min: 0, max: 100, step: 0.01 },
  ],
  symbol: { kind: 'passive', shape: 'inductor' },
  keywords: ['电感', '储能', 'Buck'],
};

const diode: PartDef = {
  type: 'DIODE',
  name: '整流二极管',
  subtitle: 'D',
  category: 'analog',
  domains: ['analog', 'power', 'digital'],
  description: '普通硅整流二极管，正向压降约 0.7 V。',
  width: 44,
  height: 30,
  refPrefix: 'D',
  pins: h2('a', 'A', 'k', 'K'),
  params: [{ key: 'vf', label: '正向压降', kind: 'number', unit: 'V', default: 0.7, min: 0.1, max: 2, step: 0.05 }],
  symbol: { kind: 'diode', variant: 'diode' },
  keywords: ['二极管', '整流', '续流'],
};

const zener: PartDef = {
  ...diode,
  type: 'ZENER',
  name: '稳压二极管',
  subtitle: 'DZ',
  description: '稳压（齐纳）二极管，反向击穿后钳位。',
  refPrefix: 'DZ',
  params: [
    { key: 'vf', label: '正向压降', kind: 'number', unit: 'V', default: 0.7, min: 0.1, max: 2, step: 0.05 },
    { key: 'vz', label: '稳压值', kind: 'number', unit: 'V', default: 5.1, min: 1, max: 100, step: 0.1 },
  ],
  symbol: { kind: 'diode', variant: 'zener' },
  keywords: ['稳压管', '齐纳', '钳位'],
};

const schottky: PartDef = {
  ...diode,
  type: 'FAST_DIODE',
  name: '快速恢复二极管',
  subtitle: 'D-FF',
  description: '快速恢复 / 肖特基二极管，适合开关电源续流。',
  params: [{ key: 'vf', label: '正向压降', kind: 'number', unit: 'V', default: 0.4, min: 0.1, max: 1.2, step: 0.05 }],
  symbol: { kind: 'diode', variant: 'schottky' },
  domains: ['analog', 'power'],
  keywords: ['肖特基', '续流', '开关电源'],
};

const npn: PartDef = {
  type: 'NPN',
  name: 'NPN 三极管',
  subtitle: 'Q-NPN',
  category: 'analog',
  domains: ['analog', 'power'],
  description: 'NPN 双极型三极管，用于放大与开关。',
  width: 44,
  height: 58,
  refPrefix: 'Q',
  pins: [
    { id: 'c', name: 'C', x: 44, y: 6, side: 'right', dir: 'passive' },
    { id: 'b', name: 'B', x: 0, y: 28, side: 'left', dir: 'passive' },
    { id: 'e', name: 'E', x: 44, y: 52, side: 'right', dir: 'passive' },
  ],
  params: [{ key: 'betaF', label: 'β', kind: 'number', default: 100, min: 10, max: 1000, step: 10 }],
  symbol: { kind: 'transistor', variant: 'npn' },
  keywords: ['三极管', 'NPN', '放大'],
};

const pnp: PartDef = {
  ...npn,
  type: 'PNP',
  name: 'PNP 三极管',
  subtitle: 'Q-PNP',
  description: 'PNP 双极型三极管。',
  symbol: { kind: 'transistor', variant: 'pnp' },
  keywords: ['三极管', 'PNP'],
};

const nmos: PartDef = {
  type: 'NMOS',
  name: 'N 沟道 MOSFET',
  subtitle: 'Q-NMOS',
  category: 'analog',
  domains: ['analog', 'power'],
  description: 'N 沟道增强型 MOSFET，用于开关与功率变换。',
  width: 44,
  height: 58,
  refPrefix: 'Q',
  pins: [
    { id: 'd', name: 'D', x: 44, y: 6, side: 'right', dir: 'passive' },
    { id: 'g', name: 'G', x: 0, y: 28, side: 'left', dir: 'passive' },
    { id: 's', name: 'S', x: 44, y: 52, side: 'right', dir: 'passive' },
  ],
  params: [
    { key: 'vto', label: '阈值', kind: 'number', unit: 'V', default: 2.0, min: 0.3, max: 10, step: 0.1 },
    { key: 'k', label: '跨导', kind: 'number', default: 2, min: 0.001, max: 100, step: 0.1 },
  ],
  symbol: { kind: 'transistor', variant: 'nmos' },
  keywords: ['MOSFET', 'NMOS', '开关'],
};

const pmos: PartDef = {
  ...nmos,
  type: 'PMOS',
  name: 'P 沟道 MOSFET',
  subtitle: 'Q-PMOS',
  description: 'P 沟道增强型 MOSFET，常用于高边开关。',
  symbol: { kind: 'transistor', variant: 'pmos' },
  keywords: ['MOSFET', 'PMOS'],
};

function opampChip(type: string, name: string, subtitle: string, desc: string, variant: 'opamp' | 'comparator'): PartDef {
  return {
    type,
    name,
    subtitle,
    category: 'analog',
    domains: ['analog', 'power'],
    description: desc,
    width: 96,
    height: 58,
    refPrefix: 'U',
    pins: [
      { id: '1', name: 'OUT1', number: '1', x: 0, y: 10, side: 'left', dir: 'out' },
      { id: '2', name: 'IN1−', number: '2', x: 0, y: 20, side: 'left', dir: 'in' },
      { id: '3', name: 'IN1+', number: '3', x: 0, y: 30, side: 'left', dir: 'in' },
      { id: '4', name: 'GND', number: '4', x: 0, y: 40, side: 'left', dir: 'power' },
      { id: '5', name: 'IN2+', number: '5', x: 96, y: 40, side: 'right', dir: 'in' },
      { id: '6', name: 'IN2−', number: '6', x: 96, y: 30, side: 'right', dir: 'in' },
      { id: '7', name: 'OUT2', number: '7', x: 96, y: 20, side: 'right', dir: 'out' },
      { id: '8', name: 'VCC', number: '8', x: 96, y: 10, side: 'right', dir: 'power' },
    ],
    symbol: variant === 'opamp' ? { kind: 'opamp' } : { kind: 'chip', subtitle },
    keywords: [type, subtitle, variant === 'opamp' ? '运放' : '比较器'],
  };
}

const opamp: PartDef = {
  ...opampChip('LM358', '双运算放大器', 'LM358', '通用双运放，单电源/双电源均可，GBW 约 1 MHz。', 'opamp'),
  params: [{ key: 'gbw', label: 'GBW', kind: 'number', unit: 'MHz', default: 1e6, min: 1e4, max: 1e8, step: 1e5, displayScale: 1e-6 }],
};
const comparator: PartDef = opampChip('LM393', '双比较器', 'LM393', '双电压比较器，开集输出，需外部上拉电阻。', 'comparator');

const ne555: PartDef = {
  type: 'NE555',
  name: '555 定时器',
  subtitle: 'NE555',
  category: 'analog',
  domains: ['analog', 'power', 'digital'],
  description: '经典 555 定时器，可配置为单稳态与多谐振荡器。',
  width: 96,
  height: 58,
  refPrefix: 'U',
  pins: [
    { id: '1', name: 'GND', number: '1', x: 0, y: 10, side: 'left', dir: 'power' },
    { id: '2', name: 'TRIG', number: '2', x: 0, y: 20, side: 'left', dir: 'in' },
    { id: '3', name: 'OUT', number: '3', x: 0, y: 30, side: 'left', dir: 'out' },
    { id: '4', name: '/RESET', number: '4', x: 0, y: 40, side: 'left', dir: 'in' },
    { id: '5', name: 'CTRL', number: '5', x: 96, y: 40, side: 'right', dir: 'in' },
    { id: '6', name: 'THR', number: '6', x: 96, y: 30, side: 'right', dir: 'in' },
    { id: '7', name: 'DISCH', number: '7', x: 96, y: 20, side: 'right', dir: 'passive' },
    { id: '8', name: 'VCC', number: '8', x: 96, y: 10, side: 'right', dir: 'power' },
  ],
  symbol: { kind: 'chip', subtitle: 'NE555' },
  keywords: ['555', '定时器', '振荡器'],
};

const reg7805: PartDef = {
  type: 'REG7805',
  name: '三端稳压器 7805',
  subtitle: 'L7805',
  category: 'analog',
  domains: ['analog', 'power'],
  description: '固定 5 V 线性稳压器，输入需高于输出至少 2 V。',
  width: 76,
  height: 58,
  refPrefix: 'U',
  pins: [
    { id: 'in', name: 'IN', x: 0, y: 18, side: 'left', dir: 'passive' },
    { id: 'gnd', name: 'GND', x: 38, y: 58, side: 'bottom', dir: 'passive' },
    { id: 'out', name: 'OUT', x: 76, y: 18, side: 'right', dir: 'passive' },
  ],
  params: [{ key: 'vout', label: '输出', kind: 'number', unit: 'V', default: 5, min: 1.2, max: 30, step: 0.1 }],
  symbol: { kind: 'generic', glyph: '7805' },
  keywords: ['稳压', '7805', '电源'],
};

const lm317: PartDef = {
  ...reg7805,
  type: 'LM317',
  name: '可调稳压器 LM317',
  subtitle: 'LM317',
  description: '可调线性稳压器，输出 1.25 V 起，通过分压电阻设定。',
  width: 76,
  height: 58,
  pins: [
    { id: 'in', name: 'IN', x: 0, y: 18, side: 'left', dir: 'passive' },
    { id: 'adj', name: 'ADJ', x: 38, y: 58, side: 'bottom', dir: 'passive' },
    { id: 'out', name: 'OUT', x: 76, y: 18, side: 'right', dir: 'passive' },
  ],
  symbol: { kind: 'generic', glyph: 'LM317' },
  keywords: ['稳压', 'LM317', '可调'],
  params: [],
};

const dcSource: PartDef = {
  type: 'DC_SOURCE',
  name: '直流电源',
  subtitle: 'VDC',
  category: 'source',
  domains: ['analog', 'power'],
  description: '理想直流电压源，负极通常作为电路参考地。',
  width: 64,
  height: 60,
  refPrefix: 'V',
  pins: [
    { id: 'pos', name: '+', x: 64, y: 14, side: 'right', dir: 'passive' },
    { id: 'neg', name: '−', x: 64, y: 46, side: 'right', dir: 'passive' },
  ],
  params: [{ key: 'voltage', label: '电压', kind: 'number', unit: 'V', default: 12, min: 0, max: 400, step: 0.5 }],
  symbol: { kind: 'source', variant: 'dc' },
  keywords: ['电源', '直流', '电压源'],
};

const battery: PartDef = {
  ...dcSource,
  type: 'BATTERY',
  name: '电池',
  subtitle: 'BAT',
  description: '电池组，带内阻与容量模型。',
  symbol: { kind: 'source', variant: 'battery' },
  params: [
    { key: 'voltage', label: '电压', kind: 'number', unit: 'V', default: 9, min: 0, max: 60, step: 0.5 },
    { key: 'rInternal', label: '内阻', kind: 'number', unit: 'Ω', default: 0.5, min: 0, max: 100, step: 0.1 },
  ],
  keywords: ['电池', '电源'],
};

const signalGen: PartDef = {
  type: 'SIGNAL_GEN',
  name: '信号发生器',
  subtitle: 'SIG',
  category: 'source',
  domains: ['analog'],
  description: '可调正弦 / 方波 / 三角波信号源，用于频响与瞬态实验。',
  width: 84,
  height: 66,
  refPrefix: 'X',
  pins: [
    { id: 'pos', name: 'OUT', x: 84, y: 18, side: 'right', dir: 'passive' },
    { id: 'neg', name: 'GND', x: 84, y: 48, side: 'right', dir: 'power' },
  ],
  params: [
    {
      key: 'waveform',
      label: '波形',
      kind: 'select',
      default: 'sine',
      options: [
        { value: 'sine', label: '正弦' },
        { value: 'square', label: '方波' },
        { value: 'triangle', label: '三角' },
      ],
    },
    { key: 'amplitude', label: '幅值', kind: 'number', unit: 'V', default: 2.5, min: 0.01, max: 50, step: 0.1 },
    { key: 'offset', label: '偏置', kind: 'number', unit: 'V', default: 2.5, min: -100, max: 100, step: 0.1 },
    { key: 'frequency', label: '频率', kind: 'number', unit: 'Hz', default: 1000, min: 0.1, max: 1e6, step: 100 },
  ],
  symbol: { kind: 'source', variant: 'ac' },
  keywords: ['信号源', '正弦', '方波'],
};

const pwmSrc: PartDef = {
  type: 'PWM_SRC',
  name: 'PWM 驱动源',
  subtitle: 'PWM',
  category: 'source',
  domains: ['power', 'analog'],
  description: '理想 PWM 电压源，驱动 MOSFET 栅极，频率/占空比/幅值可调。',
  width: 84,
  height: 66,
  refPrefix: 'PWM',
  pins: [
    { id: 'pos', name: 'OUT', x: 84, y: 18, side: 'right', dir: 'passive' },
    { id: 'neg', name: 'GND', x: 84, y: 48, side: 'right', dir: 'power' },
  ],
  params: [
    { key: 'frequency', label: '频率', kind: 'number', unit: 'kHz', default: 50e3, min: 100, max: 1e6, step: 1, displayScale: 1e-3, hint: '默认 50 kHz' },
    { key: 'duty', label: '占空比', kind: 'number', unit: '%', default: 50, min: 1, max: 99, step: 1 },
    { key: 'vHigh', label: '高电平', kind: 'number', unit: 'V', default: 10, min: 1, max: 30, step: 0.5 },
  ],
  symbol: { kind: 'source', variant: 'pwm' },
  keywords: ['PWM', '驱动', '占空比'],
};

const fuse: PartDef = {
  type: 'FUSE',
  name: '保险丝',
  subtitle: 'FUSE',
  category: 'analog',
  domains: ['analog', 'power'],
  description: '过流熔断保护，超过额定电流一定时间后断开。',
  width: 44,
  height: 30,
  refPrefix: 'F',
  pins: h2('a', '1', 'b', '2'),
  params: [{ key: 'iRating', label: '额定电流', kind: 'number', unit: 'A', default: 1, min: 0.01, max: 100, step: 0.1 }],
  symbol: { kind: 'passive', shape: 'fuse' },
  keywords: ['保险丝', '保护'],
};

const thermistor: PartDef = {
  type: 'THERMISTOR',
  name: '热敏电阻',
  subtitle: 'NTC',
  category: 'analog',
  domains: ['analog'],
  description: 'NTC 热敏电阻，温度升高阻值下降。',
  width: 44,
  height: 34,
  refPrefix: 'RT',
  pins: h2('a', '1', 'b', '2'),
  params: [
    { key: 'rNominal', label: '25℃ 阻值', kind: 'number', unit: 'Ω', default: 10000, min: 10, max: 1e7, step: 100 },
    { key: 'beta', label: 'B 值', kind: 'number', default: 3950, min: 500, max: 10000, step: 100 },
  ],
  symbol: { kind: 'passive', shape: 'thermistor' },
  keywords: ['热敏', '温度', '传感器'],
};

const ldr: PartDef = {
  type: 'LDR',
  name: '光敏电阻',
  subtitle: 'LDR',
  category: 'analog',
  domains: ['analog'],
  description: '光敏电阻，光照增强时阻值下降。',
  width: 44,
  height: 34,
  refPrefix: 'RL',
  pins: h2('a', '1', 'b', '2'),
  params: [],
  symbol: { kind: 'passive', shape: 'ldr' },
  keywords: ['光敏', '光照', '传感器'],
};

const voltmeter: PartDef = {
  type: 'VOLTMETER',
  name: '直流电压表',
  subtitle: 'V',
  category: 'instrument',
  domains: ['analog', 'power'],
  description: '并联在网络上测量电压，模拟内阻 1 MΩ。',
  width: 48,
  height: 48,
  refPrefix: 'PV',
  pins: [
    { id: 'p', name: '+', x: 0, y: 30, side: 'left', dir: 'passive' },
    { id: 'n', name: '−', x: 48, y: 30, side: 'right', dir: 'passive' },
  ],
  symbol: { kind: 'meter', variant: 'voltmeter' },
  keywords: ['电压表', '测量'],
};

const ammeter: PartDef = {
  ...voltmeter,
  type: 'AMMETER',
  name: '直流电流表',
  subtitle: 'A',
  description: '串联在支路中测量电流，模拟内阻 0.01 Ω。',
  refPrefix: 'PA',
  symbol: { kind: 'meter', variant: 'ammeter' },
  keywords: ['电流表', '测量'],
};

const igbt: PartDef = {
  ...nmos,
  type: 'IGBT',
  name: 'IGBT 功率开关',
  subtitle: 'IGBT',
  description: '绝缘栅双极型晶体管，教学模型以 MOSFET 行为近似。',
  params: [
    { key: 'vto', label: '阈值', kind: 'number', unit: 'V', default: 4, min: 1, max: 10, step: 0.5 },
    { key: 'k', label: '跨导', kind: 'number', default: 10, min: 0.1, max: 200, step: 0.5 },
  ],
  symbol: { kind: 'transistor', variant: 'igbt' },
  domains: ['power'],
  keywords: ['IGBT', '功率', '开关'],
};

const scr: PartDef = {
  type: 'SCR',
  name: '晶闸管 SCR',
  subtitle: 'SCR',
  category: 'power',
  domains: ['power'],
  description: '单向晶闸管，门极触发后维持导通，电流低于维持电流后关断。',
  width: 52,
  height: 58,
  refPrefix: 'Q',
  pins: [
    { id: 'a', name: 'A', x: 52, y: 6, side: 'right', dir: 'passive' },
    { id: 'g', name: 'G', x: 0, y: 38, side: 'left', dir: 'passive' },
    { id: 'k', name: 'K', x: 52, y: 52, side: 'right', dir: 'passive' },
  ],
  params: [
    { key: 'vgt', label: '触发电压', kind: 'number', unit: 'V', default: 1.5, min: 0.2, max: 5, step: 0.1 },
    { key: 'ih', label: '维持电流', kind: 'number', unit: 'mA', default: 5e-3, min: 0.001, max: 1, step: 0.001, displayScale: 1000 },
  ],
  symbol: { kind: 'diode', variant: 'scr' },
  keywords: ['晶闸管', 'SCR', '可控整流'],
};

const idealSwitch: PartDef = {
  type: 'IDEAL_SWITCH',
  name: '理想开关',
  subtitle: 'SW',
  category: 'power',
  domains: ['power'],
  description: '理想单刀单掷开关，用于拓扑教学与波形对照。',
  width: 44,
  height: 28,
  refPrefix: 'S',
  pins: h2('a', '1', 'b', '2'),
  symbol: { kind: 'switch', variant: 'spst' },
  keywords: ['开关', '理想'],
};

export const ANALOG_PARTS: PartDef[] = [
  resistor,
  pot,
  capacitor,
  ecap,
  inductor,
  diode,
  zener,
  schottky,
  npn,
  pnp,
  nmos,
  pmos,
  opamp,
  comparator,
  ne555,
  reg7805,
  lm317,
  dcSource,
  battery,
  signalGen,
  pwmSrc,
  fuse,
  thermistor,
  ldr,
  voltmeter,
  ammeter,
];

export const POWER_PARTS: PartDef[] = [igbt, scr, idealSwitch];
