import type { Domain } from '../model/types';

export type SymbolKind =
  | 'chip'
  | 'resistor'
  | 'potentiometer'
  | 'capacitor'
  | 'inductor'
  | 'diode'
  | 'zener'
  | 'led'
  | 'source-dc'
  | 'source-ac'
  | 'ground'
  | 'rail'
  | 'switch'
  | 'button'
  | 'npn'
  | 'pnp'
  | 'nmos'
  | 'pmos'
  | 'igbt'
  | 'scr'
  | 'opamp'
  | 'seven-seg'
  | 'clock'
  | 'board'
  | 'battery'
  | 'buzzer'
  | 'lamp'
  | 'motor'
  | 'generic';

export type PinDirection = 'in' | 'out' | 'io' | 'power' | 'passive';
export type PinSide = 'left' | 'right' | 'top' | 'bottom';

export interface PinDef {
  id: string;
  name: string;
  number?: string;
  x: number;
  y: number;
  side: PinSide;
  direction?: PinDirection;
  /** TTL 输入悬空时按高电平处理 */
  ttl?: boolean;
}

export interface ParamOption {
  label: string;
  value: string | number;
}

export interface ParamDef {
  key: string;
  label: string;
  kind: 'number' | 'select' | 'text' | 'color';
  unit?: string;
  options?: ParamOption[];
  min?: number;
  max?: number;
  step?: number;
  defaultValue: number | string;
}

export interface PartDef {
  type: string;
  name: string;
  model?: string;
  category: string;
  domains: Domain[];
  refPrefix: string;
  width: number;
  height: number;
  pins: PinDef[];
  params?: ParamDef[];
  symbol: SymbolKind;
  description?: string;
  power?: { vcc?: string[]; gnd?: string[] };
}

export interface PinSpec {
  id: string;
  name: string;
  number?: string;
  direction?: PinDirection;
  ttl?: boolean;
}

export function pinsOnSide(
  side: PinSide,
  specs: PinSpec[],
  width: number,
  height: number,
  inset = 30,
): PinDef[] {
  const count = specs.length;
  const vertical = side === 'left' || side === 'right';
  const start = inset;
  const end = (vertical ? height : width) - inset;
  const step = count > 1 ? (end - start) / (count - 1) : 0;
  return specs.map((spec, index) => ({
    ...spec,
    x: vertical ? (side === 'left' ? 0 : width) : start + step * index,
    y: vertical ? start + step * index : (side === 'top' ? 0 : height),
    side,
  }));
}

export function verticalPins(width: number, height: number, topId = 'a', bottomId = 'b'): PinDef[] {
  return [
    { id: topId, name: topId.toUpperCase(), x: width / 2, y: 0, side: 'top', direction: 'passive' },
    { id: bottomId, name: bottomId.toUpperCase(), x: width / 2, y: height, side: 'bottom', direction: 'passive' },
  ];
}

export function symbolFromPart(part: PartDef): SymbolKind {
  return part.symbol;
}
