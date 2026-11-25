import type { CircuitDoc, FirmwareSlot } from '../model/types';
import type { Level } from './digital/resolver';

export type SpeedMode = '0.1x' | '0.5x' | '1x' | 'max';

export interface McuPorts {
  latch: [number, number, number, number];
  pins: [number, number, number, number];
}

export interface McuSnapshot {
  state: 'idle' | 'running' | 'halted' | 'error';
  pc: number;
  a: number;
  b: number;
  sp: number;
  psw: number;
  dptr: number;
  cycles: number;
  instructions: number;
  ports: McuPorts;
  sfr: Record<string, number>;
  firmware?: Pick<FirmwareSlot, 'name' | 'size' | 'crc32' | 'entry' | 'valid'>;
  uartLog: string[];
  error?: string;
}

export interface PartRuntime {
  [key: string]: unknown;
}

export interface EngineSnapshot {
  time: number;
  eventCount: number;
  netValues: Record<string, Level>;
  parts: Record<string, PartRuntime>;
  warnings: string[];
  conflicts: string[];
  mcu?: McuSnapshot;
  assembling: boolean;
}

export interface EngineOptions {
  onSerial?: (text: string) => void;
}

export interface SimulationEngine {
  advance(seconds: number): void;
  snapshot(): EngineSnapshot;
  refreshPart(compId: string): void;
  hasMcu: boolean;
  serialInput(text: string): void;
}

export function emptySnapshot(doc: CircuitDoc | null): EngineSnapshot {
  return {
    time: 0,
    eventCount: 0,
    netValues: {},
    parts: {},
    warnings: [],
    conflicts: [],
    assembling: !!doc && doc.domain === 'mcs51',
  };
}
