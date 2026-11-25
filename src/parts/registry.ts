import type { PartCategory, PartDef } from './types';
import { ANALOG_PARTS, POWER_PARTS } from './analog';
import { DIGITAL_CHIPS } from './digital-chips';
import { DIGITAL_PERIPHERALS, POWER_SYMBOLS } from './digital-peripherals';
import { MCU_PARTS } from './mcu';
import type { Domain } from '../model/types';

const ALL_PARTS: PartDef[] = [
  ...DIGITAL_CHIPS,
  ...DIGITAL_PERIPHERALS,
  ...ANALOG_PARTS,
  ...POWER_PARTS,
  ...POWER_SYMBOLS,
  ...MCU_PARTS,
];

const seen = new Set<string>();
for (const p of ALL_PARTS) {
  if (seen.has(p.type)) {
    // 开发期防重复；生产构建中保持首个定义
    console.warn(`[parts] duplicate type: ${p.type}`);
  }
  seen.add(p.type);
}

export const PART_LIST: PartDef[] = ALL_PARTS.filter((p, i) => ALL_PARTS.findIndex((q) => q.type === p.type) === i);

const PART_MAP = new Map(PART_LIST.map((p) => [p.type, p]));

export function getPart(type: string): PartDef | undefined {
  return PART_MAP.get(type);
}

export function requirePart(type: string): PartDef {
  const p = PART_MAP.get(type);
  if (!p) throw new Error(`未知器件类型: ${type}`);
  return p;
}

export function partsForDomain(domain: Domain): PartDef[] {
  return PART_LIST.filter(
    (p) =>
      p.domains.includes(domain) ||
      (p.category === 'source' && (p.type.startsWith('P') || p.type === 'VCC' || p.type === 'GND')),
  );
}

export const CATEGORY_LABELS: Record<PartCategory, string> = {
  logic: '逻辑门',
  chip: '数字 IC',
  peripheral: '外设',
  analog: '模拟器件',
  power: '功率器件',
  mcu: '单片机',
  instrument: '仪器',
  source: '电源 / 信号源',
};

export const CATEGORY_ORDER: PartCategory[] = [
  'chip',
  'logic',
  'peripheral',
  'analog',
  'power',
  'mcu',
  'instrument',
  'source',
];

/** 精简 SVG 缩略图使用的引脚信息（器件库面板） */
export function thumbPins(part: PartDef) {
  return part.pins.slice(0, 6);
}
