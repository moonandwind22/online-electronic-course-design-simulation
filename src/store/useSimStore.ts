import { create } from 'zustand';
import { createId } from '../lib/id';

export type SimStatus = 'idle' | 'running' | 'paused' | 'error';
export type SimSpeed = 0.1 | 0.5 | 1 | 'max';
export type LogicLevel = '0' | '1' | 'x' | 'z';

export interface SimLogEntry {
  id: string;
  time: number;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

interface SimState {
  status: SimStatus;
  speed: SimSpeed;
  simTime: number;
  events: number;
  levels: Record<string, LogicLevel>;
  analog: Record<string, number>;
  logs: SimLogEntry[];
  engineError: string | null;

  setStatus: (status: SimStatus) => void;
  setSpeed: (speed: SimSpeed) => void;
  tick: (dt: number, events?: number) => void;
  setLevels: (levels: Record<string, LogicLevel>) => void;
  setAnalog: (values: Record<string, number>) => void;
  log: (level: SimLogEntry['level'], message: string) => void;
  clearLogs: () => void;
  reset: () => void;
  setError: (message: string | null) => void;
}

let logSeq = 0;

export const useSimStore = create<SimState>((set) => ({
  status: 'idle',
  speed: 1,
  simTime: 0,
  events: 0,
  levels: {},
  analog: {},
  logs: [],
  engineError: null,

  setStatus: (status) => set({ status }),
  setSpeed: (speed) => set({ speed }),

  tick: (dt, events = 0) =>
    set((state) => ({
      simTime: state.simTime + dt,
      events: state.events + events,
    })),

  setLevels: (levels) => set({ levels }),
  setAnalog: (analog) => set({ analog }),

  log: (level, message) =>
    set((state) => ({
      logs: [
        ...state.logs.slice(-199),
        { id: `log_${++logSeq}`, time: state.simTime, level, message },
      ],
    })),

  clearLogs: () => set({ logs: [] }),

  reset: () =>
    set({
      status: 'idle',
      simTime: 0,
      events: 0,
      levels: {},
      analog: {},
      logs: [],
      engineError: null,
    }),

  setError: (message) => set({ engineError: message, status: message ? 'error' : 'idle' }),
}));
