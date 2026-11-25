export const SFR = {
  P0: 0x80,
  SP: 0x81,
  DPL: 0x82,
  DPH: 0x83,
  PCON: 0x87,
  TCON: 0x88,
  TMOD: 0x89,
  TL0: 0x8a,
  TL1: 0x8b,
  TH0: 0x8c,
  TH1: 0x8d,
  P1: 0x90,
  SCON: 0x98,
  SBUF: 0x99,
  P2: 0xa0,
  IE: 0xa8,
  P3: 0xb0,
  IP: 0xb8,
  PSW: 0xd0,
  ACC: 0xe0,
  B: 0xf0,
} as const;

export const SFR_NAMES: Record<number, string> = {
  0x80: 'P0',
  0x81: 'SP',
  0x82: 'DPL',
  0x83: 'DPH',
  0x87: 'PCON',
  0x88: 'TCON',
  0x89: 'TMOD',
  0x8a: 'TL0',
  0x8b: 'TL1',
  0x8c: 'TH0',
  0x8d: 'TH1',
  0x90: 'P1',
  0x98: 'SCON',
  0x99: 'SBUF',
  0xa0: 'P2',
  0xa8: 'IE',
  0xb0: 'P3',
  0xb8: 'IP',
  0xd0: 'PSW',
  0xe0: 'ACC',
  0xf0: 'B',
};

export function isPortAddress(addr: number): boolean {
  return addr === 0x80 || addr === 0x90 || addr === 0xa0 || addr === 0xb0;
}

export function portIndex(addr: number): number {
  return (addr >> 4) & 0x03;
}

export function hex2(n: number): string {
  return n.toString(16).toUpperCase().padStart(2, '0');
}
