import { pinDef, type PartDef } from '../types';

const W = 500;
const H = 540;

export const MCU_PARTS: PartDef[] = [
  {
    type: 'MCS51_BOARD',
    name: '51 最小系统板',
    summary: 'STC89C52RC / AT89C52 兼容，12 MHz 时钟，P0 开漏、P1–P3 准双向',
    category: 'mcu',
    family: '单片机板卡',
    domain: 'mcs51',
    width: W,
    height: H,
    symbol: 'board',
    notes: 'P1.0 板载 LED（低电平点亮）；支持 Intel HEX 烧录、SFR 与串口监视',
    pins: [
      ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) =>
        pinDef(`P1.${i}`, `P1.${i}`, 0, 100 + i * 40, 'left', 'io', `P1.${i}`),
      ),
      ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) =>
        pinDef(`P3.${i}`, `P3.${i}`, W, 100 + i * 40, 'right', 'io', `P3.${i}`),
      ),
      ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) =>
        pinDef(`P0.${i}`, `P0.${i}`, 100 + i * 40, 0, 'up', 'io', `P0.${i}`),
      ),
      ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) =>
        pinDef(`P2.${i}`, `P2.${i}`, 100 + i * 40, H, 'down', 'io', `P2.${i}`),
      ),
      pinDef('RST', 'RST', 0, 440, 'left', 'in'),
      pinDef('EA', 'EA', 0, 490, 'left', 'in'),
      pinDef('VCC', 'VCC', W, 440, 'right', 'power'),
      pinDef('GND', 'GND', W, 490, 'right', 'power'),
    ],
  },
];
