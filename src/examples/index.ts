import type { CircuitDoc, Component, Domain, Point } from '../model/types';
import { createComponent, createDoc } from '../model/factory';
import { createId } from '../lib/id';
import { defaultParams, getPart } from '../parts/registry';
import { getPinPosition } from '../parts/geometry';
import { orthoPath, tidyPath } from '../lib/geometry';

export interface Template {
  id: string;
  name: string;
  domain: Domain;
  summary: string;
  hint: string;
  build: () => CircuitDoc;
}

function place(doc: CircuitDoc, type: string, x: number, y: number, label: string, params: Record<string, number | string> = {}): Component {
  const part = getPart(type);
  if (!part) throw new Error(`未知器件 ${type}`);
  const component = createComponent(type, x, y, label, { ...defaultParams(part), ...params });
  doc.components.push(component);
  return component;
}

function pinPoint(component: Component, pinId: string): Point {
  const part = getPart(component.type);
  const position = part ? getPinPosition(component, part, pinId) : undefined;
  if (!position) throw new Error(`引脚 ${component.label}.${pinId} 不存在`);
  return position;
}

function connect(doc: CircuitDoc, a: Component, aPin: string, b: Component, bPin: string, netLabel?: string): void {
  const from = pinPoint(a, aPin);
  const to = pinPoint(b, bPin);
  doc.wires.push({
    id: createId('wire'),
    points: tidyPath(orthoPath(from, to)),
    from: { componentId: a.id, pinId: aPin },
    to: { componentId: b.id, pinId: bPin },
    netLabel,
  });
}

function attachPower(doc: CircuitDoc, component: Component, pinId: string, kind: 'vcc' | 'gnd', offset: Point = { x: 0, y: 0 }, label?: string): Component {
  const point = pinPoint(component, pinId);
  const x = point.x - 24 + offset.x;
  const y = (kind === 'vcc' ? point.y - 84 : point.y + 40) + offset.y;
  const power = place(doc, kind, x, y, label ?? (kind === 'vcc' ? uniqueLabel(doc, 'VCC') : uniqueLabel(doc, 'GND')));
  connect(doc, power, '1', component, pinId);
  return power;
}

function uniqueLabel(doc: CircuitDoc, prefix: string): string {
  let index = 1;
  const labels = new Set(doc.components.map((component) => component.label));
  while (labels.has(`${prefix}${index}`)) index++;
  return `${prefix}${index}`;
}

function buildCounter(): CircuitDoc {
  const doc = createDoc('digital', '74LS161 + 74LS47 数码管计数');
  doc.notes = '实验目的：观察同步二进制计数器与 BCD 译码器的联动。运行时钟后，数码管按 0–9 循环显示。';
  const clk = place(doc, 'clock', 100, 300, 'CLK1', { frequency: 1 });
  const u1 = place(doc, '74ls161', 320, 220, 'U1');
  const u2 = place(doc, '74ls47', 620, 220, 'U2');
  const ds = place(doc, 'seven_seg', 920, 200, 'DS1');

  connect(doc, clk, 'OUT', u1, 'CLK');
  connect(doc, u1, 'QA', u2, 'A');
  connect(doc, u1, 'QB', u2, 'B');
  connect(doc, u1, 'QC', u2, 'C');
  connect(doc, u1, 'QD', u2, 'D');

  for (const segment of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) {
    connect(doc, u2, segment, ds, segment);
  }

  attachPower(doc, u1, 'VCC', 'vcc');
  attachPower(doc, u1, 'GND', 'gnd');
  attachPower(doc, u2, 'VCC', 'vcc');
  attachPower(doc, u2, 'GND', 'gnd');
  attachPower(doc, clk, 'GND', 'gnd');
  attachPower(doc, u1, 'CLR', 'vcc');
  attachPower(doc, u1, 'ENP', 'vcc');
  attachPower(doc, u1, 'ENT', 'vcc');
  attachPower(doc, u1, 'LOAD', 'vcc');
  attachPower(doc, u2, 'LT', 'vcc');
  attachPower(doc, u2, 'BI', 'vcc');
  attachPower(doc, u2, 'RBI', 'vcc');
  attachPower(doc, ds, 'COM1', 'gnd');
  attachPower(doc, ds, 'COM2', 'gnd');

  doc.viewport = { x: 40, y: 40, zoom: 0.8 };
  return doc;
}

function buildRc(): CircuitDoc {
  const doc = createDoc('analog', 'RC 低通滤波电路');
  doc.notes = '实验目的：观察一阶 RC 低通电路的阶跃响应，测量时间常数 τ = RC。';
  const v1 = place(doc, 'vsource', 220, 260, 'V1', { voltage: 5 });
  const r1 = place(doc, 'resistor', 380, 220, 'R1', { resistance: 1000 });
  r1.rot = 90;
  const c1 = place(doc, 'capacitor', 520, 240, 'C1', { capacitance: 1e-6 });

  connect(doc, v1, 'pos', r1, 'b');
  connect(doc, r1, 'a', c1, 'a');
  attachPower(doc, v1, 'neg', 'gnd');
  attachPower(doc, c1, 'b', 'gnd');

  doc.viewport = { x: 80, y: 60, zoom: 1 };
  return doc;
}

function buildBuck(): CircuitDoc {
  const doc = createDoc('power', 'Buck 12V → 5V 降压变换器');
  doc.notes = '实验目的：观察 Buck 电路开关节点与输出电压纹波；PWM 占空比 50% 时理论输出约 5 V。';
  const vin = place(doc, 'vsource', 140, 280, 'VIN', { voltage: 12 });
  const q1 = place(doc, 'nmos', 300, 220, 'Q1');
  const pwm = place(doc, 'pwm', 140, 500, 'PWM1', { duty: 50 });
  const d1 = place(doc, 'diode', 460, 360, 'D1');
  const l1 = place(doc, 'inductor', 580, 300, 'L1', { inductance: 100e-6 });
  l1.rot = 90;
  const c1 = place(doc, 'capacitor', 760, 300, 'C1', { capacitance: 470e-6 });
  const load = place(doc, 'rl_load', 860, 320, 'LOAD1', { resistance: 5, inductance: 0 });

  connect(doc, vin, 'pos', q1, 'D');
  connect(doc, pwm, 'OUT', q1, 'G');
  connect(doc, q1, 'S', l1, 'b');
  connect(doc, q1, 'S', d1, 'K');
  connect(doc, l1, 'a', c1, 'a');
  connect(doc, l1, 'a', load, 'A');
  attachPower(doc, vin, 'neg', 'gnd');
  attachPower(doc, d1, 'A', 'gnd');
  attachPower(doc, c1, 'b', 'gnd');
  attachPower(doc, load, 'B', 'gnd');
  attachPower(doc, pwm, 'GND', 'gnd');

  doc.viewport = { x: 40, y: 40, zoom: 0.9 };
  return doc;
}

function buildMcu51(): CircuitDoc {
  const doc = createDoc('mcs51', '51 单片机 P1.0 流水灯');
  doc.notes = '实验目的：上传 blink51.hex 后观察 P1.0 驱动 LED 闪烁；可在串口终端查看固件输出。';
  const mcu = place(doc, 'mcu51', 160, 120, 'MCU1');
  const r1 = place(doc, 'resistor', 560, 220, 'R1', { resistance: 330 });
  const led1 = place(doc, 'led', 520, 150, 'LED1');

  connect(doc, mcu, 'P1.0', r1, 'a');
  connect(doc, r1, 'b', led1, 'A');
  attachPower(doc, led1, 'K', 'gnd');
  attachPower(doc, mcu, 'VCC', 'vcc');
  attachPower(doc, mcu, 'GND', 'gnd');
  attachPower(doc, mcu, 'EA', 'vcc');
  attachPower(doc, mcu, 'RST', 'gnd');

  doc.viewport = { x: 20, y: 0, zoom: 0.8 };
  return doc;
}

function buildStm32(): CircuitDoc {
  const doc = createDoc('stm32', 'STM32 PC13 板载 LED 闪烁');
  doc.notes = '实验目的：上传 blink_stm32.hex 后观察 PC13 LED 闪烁，并在串口终端读取 USART1 输出。';
  const mcu = place(doc, 'stm32', 160, 120, 'MCU1');
  const r1 = place(doc, 'resistor', 520, 540, 'R1', { resistance: 330 });
  const led1 = place(doc, 'led', 480, 480, 'LED1');

  connect(doc, mcu, 'PC13', r1, 'a');
  connect(doc, r1, 'b', led1, 'A');
  attachPower(doc, led1, 'K', 'gnd');
  attachPower(doc, mcu, '3V3', 'vcc', { x: 0, y: -60 }, '3V3');
  attachPower(doc, mcu, 'GND', 'gnd');

  doc.viewport = { x: 20, y: 0, zoom: 0.8 };
  return doc;
}

export const TEMPLATES: Template[] = [
  {
    id: 'counter-161-47',
    name: '74LS161 数码管计数',
    domain: 'digital',
    summary: '74LS161 + 74LS47 + 共阴数码管，1 Hz 时钟计数',
    hint: '打开后点击运行，观察数码管 0–9 循环；暂停后可查看引脚与网络状态。',
    build: buildCounter,
  },
  {
    id: 'rc-lowpass',
    name: 'RC 低通滤波',
    domain: 'analog',
    summary: '5 V 阶跃输入，R = 1 kΩ、C = 1 µF',
    hint: '打开示波器面板，运行后观察电容电压按 τ = 1 ms 充电。',
    build: buildRc,
  },
  {
    id: 'buck-12-5',
    name: 'Buck 12V → 5V',
    domain: 'power',
    summary: '50% 占空比 PWM 驱动功率 MOSFET 与续流二极管',
    hint: '运行后查看开关节点波形与输出电压平均值。',
    build: buildBuck,
  },
  {
    id: 'mcs51-blink',
    name: '51 P1.0 LED 闪烁',
    domain: 'mcs51',
    summary: 'STC89C52RC 最小系统 + 限流电阻 + LED',
    hint: '在固件面板上传 blink51.hex，烧录后运行。',
    build: buildMcu51,
  },
  {
    id: 'stm32-blink',
    name: 'STM32 PC13 闪烁',
    domain: 'stm32',
    summary: 'STM32F103C8T6 Blue Pill 板载 LED',
    hint: '上传 blink_stm32.hex 后运行，串口终端可查看 USART1 输出。',
    build: buildStm32,
  },
];

export function findTemplate(id: string): Template | undefined {
  return TEMPLATES.find((template) => template.id === id);
}

export function templatesForDomain(domain: Domain): Template[] {
  return TEMPLATES.filter((template) => template.domain === domain);
}
