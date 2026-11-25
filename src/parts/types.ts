import type { Domain } from '../model/types';

export type PartSymbol =
  | 'chip'
  | 'power-vcc'
  | 'power-gnd'
  | 'sevenseg'
  | 'led'
  | 'resistor'
  | 'capacitor'
  | 'inductor'
  | 'diode'
  | 'source'
  | 'switch'
  | 'clock'
  | 'nand'
  | 'board';

export type PinDir = 'left' | 'right' | 'up' | 'down';
export type PinKind = 'input' | 'output' | 'bidir' | 'power' | 'passive';

export interface PinDef {
  id: string;
  name: string;
  number?: string;
  x: number;
  y: number;
  dir: PinDir;
  kind?: PinKind;
}

export interface ParamDef {
  key: string;
  label: string;
  type: 'number' | 'text' | 'select';
  unit?: string;
  min?: number;
  step?: number;
  options?: { value: string; label: string }[];
}

export interface PartDef {
  type: string;
  name: string;
  subtitle: string;
  category: string;
  domains: Domain[] | 'all';
  symbol: PartSymbol;
  width: number;
  height: number;
  pins: PinDef[];
  params: ParamDef[];
  defaults: Record<string, number | string>;
  prefix: string;
  description: string;
  tags?: string[];
}
