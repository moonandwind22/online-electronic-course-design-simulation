import type { PinDir } from '../model/types';
import type { PartDef, PinDef, SymbolSpec } from './types';

export interface ChipPinSpec {
  n: string;
  name: string;
  dir?: PinDir;
}

interface ChipOptions {
  type: string;
  name: string;
  subtitle?: string;
  description: string;
  rows: number;
  left: ChipPinSpec[];
  right: ChipPinSpec[];
  width?: number;
  params?: PartDef['params'];
  domains?: PartDef['domains'];
  category?: PartDef['category'];
  keywords?: string[];
  refPrefix?: string;
  symbol?: SymbolSpec;
}

/** 生成双列直插芯片：左侧自上而下，右侧自上而下（引脚号通常从下往上递增） */
export function makeChip(opts: ChipOptions): PartDef {
  const width = opts.width ?? 96;
  const pinLen = 12;
  const height = (opts.rows - 1) * 10 + 28;
  const top = 14;
  const pins: PinDef[] = [];
  opts.left.forEach((p, i) => {
    pins.push({
      id: p.n,
      number: p.n,
      name: p.name,
      x: -pinLen,
      y: top + i * 10,
      side: 'left',
      dir: p.dir ?? 'passive',
    });
  });
  opts.right.forEach((p, i) => {
    pins.push({
      id: p.n,
      number: p.n,
      name: p.name,
      x: width + pinLen,
      y: top + i * 10,
      side: 'right',
      dir: p.dir ?? 'passive',
    });
  });
  return {
    type: opts.type,
    name: opts.name,
    subtitle: opts.subtitle,
    description: opts.description,
    category: opts.category ?? 'chip',
    domains: opts.domains ?? ['digital'],
    width,
    height,
    pins,
    params: opts.params,
    symbol: opts.symbol ?? { kind: 'chip', subtitle: opts.subtitle },
    keywords: opts.keywords,
    refPrefix: opts.refPrefix ?? 'U',
  };
}

export function leftPins(specs: ChipPinSpec[]): ChipPinSpec[] {
  return specs;
}

export function rightPins(specs: ChipPinSpec[]): ChipPinSpec[] {
  return specs;
}
