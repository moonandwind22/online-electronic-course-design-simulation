import type { Domain, PinDir } from '../model/types';

export type PartCategory =
  | 'logic'
  | 'chip'
  | 'peripheral'
  | 'analog'
  | 'power'
  | 'mcu'
  | 'instrument'
  | 'source';

export interface PinDef {
  id: string;
  name: string;
  /** DIP 引脚号 */
  number?: string;
  /** 连接点（局部坐标，元件外沿） */
  x: number;
  y: number;
  side: 'left' | 'right' | 'top' | 'bottom';
  dir: PinDir;
}

export interface ParamOption {
  value: string;
  label: string;
}

export interface ParamDef {
  key: string;
  label: string;
  kind: 'number' | 'select' | 'text';
  /** 显示单位 */
  unit?: string;
  /** 界面显示值 = 存储值 × displayScale（例如 µF：1e6） */
  displayScale?: number;
  min?: number;
  max?: number;
  step?: number;
  options?: ParamOption[];
  default: number | string;
  hint?: string;
}

export type SymbolSpec =
  | { kind: 'chip'; style?: 'dip' | 'wide'; subtitle?: string }
  | { kind: 'gate'; gate: 'and' | 'or' | 'nand' | 'nor' | 'xor' | 'not' | 'buffer'; inputs: number; inverted?: boolean }
  | { kind: 'passive'; shape: 'resistor' | 'capacitor' | 'electrolytic' | 'inductor' | 'fuse' | 'thermistor' | 'ldr' }
  | { kind: 'diode'; variant: 'diode' | 'led' | 'zener' | 'schottky' | 'scr'; color?: string }
  | { kind: 'transistor'; variant: 'npn' | 'pnp' | 'nmos' | 'pmos' | 'igbt' }
  | { kind: 'opamp' }
  | { kind: 'source'; variant: 'dc' | 'ac' | 'pulse' | 'pwm' | 'battery'; label?: string }
  | { kind: 'switch'; variant: 'spst' | 'push' | 'dip' | 'spdt' }
  | { kind: 'pot' }
  | { kind: 'seg7'; common: 'cc' | 'ca' }
  | { kind: 'lcd' }
  | { kind: 'board'; variant: 'mcu51' | 'stm32' }
  | { kind: 'clock' }
  | { kind: 'power'; net: string }
  | { kind: 'meter'; variant: 'voltmeter' | 'ammeter' }
  | { kind: 'relay' }
  | { kind: 'motor' }
  | { kind: 'buzzer' }
  | { kind: 'servo' }
  | { kind: 'probe' }
  | { kind: 'generic'; glyph?: string };

export interface PartDef {
  type: string;
  /** 中文名 */
  name: string;
  /** 型号 / 英文副标题 */
  subtitle?: string;
  category: PartCategory;
  domains: Domain[];
  description: string;
  width: number;
  height: number;
  pins: PinDef[];
  params?: ParamDef[];
  symbol: SymbolSpec;
  keywords?: string[];
  /** 默认位号前缀，如 U / R / C */
  refPrefix?: string;
}

export function paramValue(
  params: Record<string, number | string> | undefined,
  key: string,
  fallback: number | string,
): number | string {
  const v = params?.[key];
  if (v === undefined || v === '') return fallback;
  return v;
}

export function numParam(
  params: Record<string, number | string> | undefined,
  key: string,
  fallback: number,
): number {
  const v = Number(params?.[key]);
  return Number.isFinite(v) && v !== 0 ? v : fallback;
}
