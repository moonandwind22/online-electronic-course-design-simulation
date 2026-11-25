import type { CircuitDoc, Domain } from '../model/types';
import { comp, createDoc } from './helpers';

export function buildDigitalExample(): CircuitDoc {
  return createDoc(
    'demo-digital',
    'digital',
    '74LS161 十进制计数器',
    '74LS161 同步计数，74LS47 译码，NAND 反馈实现 0–9 循环。运行后数码管每秒递增一次。',
    [
      comp('CLK1', 'CLOCK', 100, 300, 'CLK1', { freq: 1 }),
      comp('U1', '74LS161', 300, 160, 'U1'),
      comp('U2', '74LS47', 620, 160, 'U2'),
      comp('DS1', 'SEVENSEG', 920, 140, 'DS1', { common: 'anode' }),
      comp('Q1', 'NAND2', 330, 470, 'Q1'),
      comp('PWR1', 'VCC', 958, 380, 'VCC'),
      comp('PWR2', 'GND', 128, 390, 'GND'),
    ],
    [
      { from: ['CLK1', 'OUT'], to: ['U1', 'CLK'], lane: 240, netLabel: 'CLK' },
      { from: ['U1', 'QA'], to: ['U2', 'A'], lane: 540, netLabel: 'BCD_A' },
      { from: ['U1', 'QB'], to: ['U2', 'B'], lane: 560, netLabel: 'BCD_B' },
      { from: ['U1', 'QC'], to: ['U2', 'C'], lane: 580, netLabel: 'BCD_C' },
      { from: ['U1', 'QD'], to: ['U2', 'D'], lane: 600, netLabel: 'BCD_D' },
      { from: ['U2', 'a'], to: ['DS1', 'a'], lane: 800 },
      { from: ['U2', 'b'], to: ['DS1', 'b'], lane: 812 },
      { from: ['U2', 'c'], to: ['DS1', 'c'], lane: 824 },
      { from: ['U2', 'd'], to: ['DS1', 'd'], lane: 836 },
      { from: ['U2', 'e'], to: ['DS1', 'e'], lane: 848 },
      { from: ['U2', 'f'], to: ['DS1', 'f'], lane: 860 },
      { from: ['U2', 'g'], to: ['DS1', 'g'], lane: 872 },
      {
        from: ['Q1', 'Y'],
        to: ['U1', 'CLR'],
        points: [
          { x: 406, y: 498 },
          { x: 250, y: 498 },
          { x: 250, y: 170 },
          { x: 300, y: 170 },
          { x: 300, y: 200 },
        ],
        netLabel: 'CLR',
      },
      { from: ['U1', 'QB'], to: ['Q1', 'A'], lane: 500, netLabel: 'QA_QB' },
      { from: ['U1', 'QD'], to: ['Q1', 'B'], lane: 520, netLabel: 'QD_NAND' },
      {
        from: ['DS1', 'com'],
        to: ['PWR1', '1'],
        points: [
          { x: 980, y: 354 },
          { x: 980, y: 420 },
        ],
      },
      {
        from: ['CLK1', 'GND'],
        to: ['PWR2', '1'],
        points: [
          { x: 150, y: 364 },
          { x: 150, y: 390 },
        ],
      },
    ],
    { x: 30, y: 30, zoom: 0.82 },
  );
}

export function buildAnalogExample(): CircuitDoc {
  return createDoc(
    'demo-analog',
    'analog',
    'RC 低通阶跃响应',
    '12V 直流源经 1kΩ 电阻给 10µF 电容充电，示波器观察 1τ ≈ 10ms 的指数上升。',
    [
      comp('V1', 'VSRC', 180, 260, 'V1', { voltage: 12 }),
      comp('R1', 'RESISTOR', 360, 250, 'R1', { resistance: 1000 }),
      comp('C1', 'CAPACITOR', 540, 280, 'C1', { capacitance: 10 }),
      comp('GND1', 'GND', 158, 360, 'GND1'),
      comp('GND2', 'GND', 618, 380, 'GND2'),
    ],
    [
      { from: ['V1', 'pos'], to: ['R1', '1'], lane: 300, netLabel: 'VIN' },
      { from: ['R1', '2'], to: ['C1', '1'], lane: 460, netLabel: 'VOUT' },
      {
        from: ['C1', '2'],
        to: ['GND2', '1'],
        points: [
          { x: 624, y: 300 },
          { x: 640, y: 380 },
        ],
      },
      {
        from: ['V1', 'neg'],
        to: ['GND1', '1'],
        points: [
          { x: 180, y: 286 },
          { x: 180, y: 360 },
        ],
      },
    ],
    { x: 60, y: 40, zoom: 1 },
  );
}

export function buildPowerExample(): CircuitDoc {
  return createDoc(
    'demo-power',
    'power',
    'Buck 12V → 5V',
    '功率级主回路由开关、储能电感、滤波电容与负载构成，50% 占空比目标输出 5V。',
    [
      comp('V1', 'VSRC', 120, 300, 'V1', { voltage: 12 }),
      comp('SW1', 'SWITCH', 280, 300, 'SW1'),
      comp('L1', 'INDUCTOR', 460, 300, 'L1', { inductance: 220 }),
      comp('R1', 'RESISTOR', 660, 290, 'R1', { resistance: 10 }),
      comp('C1', 'CAPACITOR', 660, 360, 'C1', { capacitance: 470 }),
      comp('GND1', 'GND', 98, 370, 'GND1'),
      comp('GND2', 'GND', 718, 430, 'GND2'),
      comp('GND3', 'GND', 718, 480, 'GND3'),
    ],
    [
      { from: ['V1', 'pos'], to: ['SW1', '1'], lane: 240 },
      { from: ['SW1', '2'], to: ['L1', '1'], lane: 410 },
      { from: ['L1', '2'], to: ['R1', '1'], lane: 600, netLabel: 'SW' },
      { from: ['L1', '2'], to: ['C1', '1'], lane: 620, netLabel: 'VOUT' },
      {
        from: ['R1', '2'],
        to: ['GND2', '1'],
        points: [
          { x: 744, y: 304 },
          { x: 740, y: 430 },
        ],
      },
      {
        from: ['C1', '2'],
        to: ['GND3', '1'],
        points: [
          { x: 744, y: 380 },
          { x: 740, y: 480 },
        ],
      },
      {
        from: ['V1', 'neg'],
        to: ['GND1', '1'],
        points: [
          { x: 120, y: 326 },
          { x: 120, y: 370 },
        ],
      },
    ],
    { x: 40, y: 40, zoom: 0.95 },
  );
}

export function buildMcs51Example(): CircuitDoc {
  return createDoc(
    'demo-mcs51',
    'mcs51',
    '51 单片机 P1.0 流水灯',
    'STC89C52RC 最小系统：P1.0 经 470Ω 限流电阻驱动 LED，烧录 blink51.hex 后观察流水灯。',
    [
      comp('MCU1', 'MCU51', 160, 140, 'MCU1'),
      comp('R1', 'RESISTOR', 520, 190, 'R1', { resistance: 470 }),
      comp('LED1', 'LED', 680, 190, 'LED1', { color: 'red' }),
      comp('GND1', 'GND', 728, 260, 'GND1'),
    ],
    [
      { from: ['MCU1', 'P1.0'], to: ['R1', '1'], lane: 360, netLabel: 'P1_0' },
      { from: ['R1', '2'], to: ['LED1', 'A'], lane: 640 },
      {
        from: ['LED1', 'K'],
        to: ['GND1', '1'],
        points: [
          { x: 760, y: 210 },
          { x: 750, y: 260 },
        ],
      },
    ],
    { x: 70, y: 30, zoom: 0.9 },
  );
}

export function buildStm32Example(): CircuitDoc {
  return createDoc(
    'demo-stm32',
    'stm32',
    'STM32 PC13 板载 LED',
    'STM32F103C8T6 Blue Pill：PC13 经 330Ω 电阻驱动 LED，USART1（PA9/PA10）用于串口输出。',
    [
      comp('MCU1', 'STM32', 160, 140, 'MCU1'),
      comp('R1', 'RESISTOR', 560, 414, 'R1', { resistance: 330 }),
      comp('LED1', 'LED', 700, 414, 'LED1', { color: 'green' }),
      comp('GND1', 'GND', 768, 484, 'GND1'),
    ],
    [
      { from: ['MCU1', 'PC13'], to: ['R1', '1'], lane: 520, netLabel: 'PC13' },
      { from: ['R1', '2'], to: ['LED1', 'A'], lane: 680 },
      {
        from: ['LED1', 'K'],
        to: ['GND1', '1'],
        points: [
          { x: 780, y: 434 },
          { x: 790, y: 484 },
        ],
      },
    ],
    { x: 70, y: 20, zoom: 0.9 },
  );
}

export const EXAMPLE_BUILDERS: Record<Domain, () => CircuitDoc> = {
  digital: buildDigitalExample,
  analog: buildAnalogExample,
  power: buildPowerExample,
  mcs51: buildMcs51Example,
  stm32: buildStm32Example,
};

export function blankDoc(domain: Domain): CircuitDoc {
  const now = Date.now();
  return {
    id: `blank_${domain}_${now.toString(36)}`,
    name: '新建工程',
    domain,
    description: '空白工程',
    components: [],
    wires: [],
    viewport: { x: 60, y: 60, zoom: 1 },
    createdAt: now,
    updatedAt: now,
    firmware: null,
  };
}

export const EXAMPLE_TITLES: Record<Domain, string> = {
  digital: '74LS161 十进制计数器',
  analog: 'RC 低通阶跃响应',
  power: 'Buck 12V → 5V',
  mcs51: '51 单片机 P1.0 流水灯',
  stm32: 'STM32 PC13 板载 LED',
};
