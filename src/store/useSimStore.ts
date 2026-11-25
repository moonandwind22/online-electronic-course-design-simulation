import { create } from 'zustand';
import type { LogicLevel } from '../model/types';

export interface WaveSample {
  name: string;
  samples: number[];
}

export interface SimLogLine {
  t: number;
  level: 'info' | 'ok' | 'warn';
  text: string;
}

export interface ScopeState {
  ch1: number[];
  ch2: number[];
  vmax: number;
  label1: string;
  label2: string;
}

const emptyScope = (): ScopeState => ({
  ch1: [],
  ch2: [],
  vmax: 12,
  label1: 'CH1 VOUT',
  label2: 'CH2 VIN',
});

const WAVE_LENGTH = 240;

interface SimState {
  running: boolean;
  speed: number;
  time: number;
  events: number;
  resetToken: number;
  nets: Array<{ name: string; level: LogicLevel }>;
  netLevels: Record<string, LogicLevel>;
  pinLevels: Record<string, LogicLevel>;
  waveforms: WaveSample[];
  scope: ScopeState;
  log: SimLogLine[];
  setRunning: (running: boolean) => void;
  toggleRunning: () => void;
  setSpeed: (speed: number) => void;
  reset: () => void;
  applyTick: (payload: {
    time: number;
    events: number;
    nets: Array<{ name: string; level: LogicLevel }>;
    netLevels: Record<string, LogicLevel>;
    pinLevels: Record<string, LogicLevel>;
    waves: WaveSample[];
  }) => void;
  appendScope: (ch1: number[], ch2: number[], vmax: number, labels?: [string, string]) => void;
  advanceTime: (time: number) => void;
  logLine: (text: string, level?: SimLogLine['level'], t?: number) => void;
  clearLog: () => void;
}

export const useSimStore = create<SimState>()((set, get) => ({
  running: false,
  speed: 1,
  time: 0,
  events: 0,
  resetToken: 0,
  nets: [],
  netLevels: {},
  pinLevels: {},
  waveforms: [],
  scope: emptyScope(),
  log: [],

  setRunning: (running) => set({ running }),
  toggleRunning: () => set((s) => ({ running: !s.running })),
  setSpeed: (speed) => set({ speed }),
  reset: () =>
    set((s) => ({
      running: false,
      time: 0,
      events: 0,
      resetToken: s.resetToken + 1,
      nets: [],
      netLevels: {},
      pinLevels: {},
      waveforms: [],
      scope: emptyScope(),
    })),

  applyTick: ({ time, events, nets, netLevels, pinLevels, waves }) => {
    const prev = get().waveforms;
    const waveforms = waves.map((w) => {
      const old = prev.find((p) => p.name === w.name);
      const samples = old ? [...old.samples, ...w.samples] : [...w.samples];
      return { name: w.name, samples: samples.slice(-WAVE_LENGTH) };
    });
    set({ time, events, nets, netLevels, pinLevels, waveforms });
  },

  appendScope: (ch1, ch2, vmax, labels) => {
    const prev = get().scope;
    if (prev.ch1.length >= WAVE_LENGTH) {
      set({ scope: { ...prev, vmax: Math.max(prev.vmax, vmax, 1) } });
      return;
    }
    set({
      scope: {
        ch1: [...prev.ch1, ...ch1].slice(0, WAVE_LENGTH),
        ch2: [...prev.ch2, ...ch2].slice(0, WAVE_LENGTH),
        vmax: Math.max(vmax, 1),
        label1: labels?.[0] ?? prev.label1,
        label2: labels?.[1] ?? prev.label2,
      },
    });
  },

  advanceTime: (time) => set({ time }),

  logLine: (text, level = 'info', t) => {
    const time = t ?? get().time;
    set((s) => ({ log: [...s.log.slice(-199), { t: time, level, text }] }));
  },

  clearLog: () => set({ log: [] }),
}));
