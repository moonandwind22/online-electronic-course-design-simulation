import type { Domain } from '../model/types';

export type PinType = 'in' | 'out' | 'io' | 'power' | 'passive';
export type PinDir = 'left' | 'right' | 'up' | 'down';

export type SymbolKind =
  | 'ic'
  | 'led'
  | 'seg7'
  | 'switch'
  | 'button'
  | 'clock'
  | 'power'
  | 'ground'
  | 'buzzer'
  | 'probe'
  | 'traffic'
  | 'relay'
  | 'motor'
  | 'board';

export interface PinDef {
  id: string;
  name: string;
  num: string;
  x: number;
  y: number;
  dir: PinDir;
  type: PinType;
}

export interface ParamDef {
  key: string;
  label: string;
  kind: 'number' | 'select' | 'text';
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  defaultValue: number | string;
}

export interface PartDef {
  type: string;
  name: string;
  summary: string;
  category: 'digital' | 'peripheral' | 'mcu';
  family: string;
  domain: Domain | 'both';
  width: number;
  height: number;
  pins: PinDef[];
  params?: ParamDef[];
  symbol: SymbolKind;
  /** 板载 LED 等由引擎渲染的静态说明 */
  notes?: string;
  initialState?: Record<string, unknown>;
}

export interface DipPinSpec {
  num: number;
  id?: string;
  name?: string;
  type?: PinType;
}

const PITCH = 22;
const MARGIN = 24;
const DIP_WIDTH = 200;

/**
 * 按 DIP 封装编号排布引脚：1..rows 在左侧自上而下，rows+1..n 在右侧自下而上。
 * pins 数组仅需按编号给出引脚，NC 引脚可省略。
 */
export function dipPart(spec: {
  type: string;
  name: string;
  summary: string;
  family: string;
  pins: DipPinSpec[];
  params?: ParamDef[];
  width?: number;
  category?: PartDef['category'];
  domain?: PartDef['domain'];
  notes?: string;
  symbol?: SymbolKind;
}): PartDef {
  const maxNum = Math.max(...spec.pins.map((p) => p.num));
  const rows = Math.ceil(maxNum / 2);
  const width = spec.width ?? DIP_WIDTH;
  const height = rows * PITCH + MARGIN * 2;
  const pins: PinDef[] = spec.pins.map((p) => {
    const left = p.num <= rows;
    const row = left ? p.num - 1 : 2 * rows - p.num;
    return {
      id: p.id ?? p.name ?? String(p.num),
      name: p.name ?? p.id ?? String(p.num),
      num: String(p.num),
      x: left ? 0 : width,
      y: MARGIN + row * PITCH,
      dir: left ? 'left' : 'right',
      type: p.type ?? 'in',
    };
  });
  return {
    type: spec.type,
    name: spec.name,
    summary: spec.summary,
    category: spec.category ?? 'digital',
    family: spec.family,
    domain: spec.domain ?? 'both',
    width,
    height,
    pins,
    params: spec.params,
    symbol: spec.symbol ?? 'ic',
    notes: spec.notes,
  };
}

export function pinDef(
  id: string,
  name: string,
  x: number,
  y: number,
  dir: PinDir,
  type: PinType = 'passive',
  num?: string,
): PinDef {
  return { id, name, num: num ?? id, x, y, dir, type };
}
