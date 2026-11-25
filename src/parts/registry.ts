import type { Domain } from '../model/types';
import type { PartDef } from './types';
import { DIGITAL_PARTS } from './digital';
import { PERIPHERAL_PARTS } from './peripherals';
import { MCU_PARTS } from './mcu';

export const ALL_PARTS: PartDef[] = [...DIGITAL_PARTS, ...PERIPHERAL_PARTS, ...MCU_PARTS];

const byType = new Map(ALL_PARTS.map((p) => [p.type, p]));

export function getPart(type: string): PartDef | undefined {
  return byType.get(type);
}

export function partsForDomain(domain: Domain): PartDef[] {
  return ALL_PARTS.filter((p) => p.domain === 'both' || p.domain === domain);
}

const PREFIX: Record<string, string> = {
  LED: 'LED',
  LED_BAR: 'LED',
  SEG7: 'DS',
  SWITCH: 'SW',
  BUTTON: 'SB',
  CLOCK: 'CLK',
  PROBE: 'TP',
  BUZZER: 'BZ',
  TRAFFIC: 'TL',
  RELAY: 'K',
  MOTOR: 'M',
  MCS51_BOARD: 'MCU',
  VCC: 'V',
  GND: 'G',
};

export function labelPrefix(part: PartDef): string {
  if (PREFIX[part.type]) return PREFIX[part.type];
  if (part.category === 'digital') return 'U';
  if (part.category === 'mcu') return 'MCU';
  return 'X';
}

export function nextLabel(part: PartDef, used: Set<string>): string {
  const prefix = labelPrefix(part);
  for (let i = 1; i < 1000; i++) {
    const label = `${prefix}${i}`;
    if (!used.has(label)) return label;
  }
  return `${prefix}${Date.now()}`;
}

export const CATEGORY_LABELS: Record<string, string> = {
  门电路: '门 / 缓冲',
  '缓冲/三态': '缓冲 / 三态',
  '触发器/锁存器': '触发器 / 锁存器',
  计数器: '计数器',
  移位寄存器: '移位寄存器',
  '译码/编码/选择': '译码 / 选择',
  '定时/比较': '定时 / 比较',
  'CMOS 4000 系列': 'CMOS 4000',
  电源地: '电源 / 地',
  '电源/地': '电源 / 地',
  显示: '显示器件',
  输入: '输入器件',
  信号源: '信号源',
  仪器: '仪器',
  执行器: '执行器',
  单片机板卡: '单片机',
};
