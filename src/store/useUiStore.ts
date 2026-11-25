import { create } from 'zustand';
import type { Domain } from '../model/types';
import { DOMAIN_ORDER } from '../model/types';

export type Theme = 'dark' | 'light';
export type DockTab = 'log' | 'logic' | 'scope' | 'serial' | 'firmware';
export type InspectorTab = 'props' | 'pins' | 'nets';

const THEME_KEY = 'ecs.theme';

function initialTheme(): Theme {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  }
  return 'dark';
}

export interface Toast {
  id: number;
  kind: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

interface UiState {
  theme: Theme;
  activeDomain: Domain;
  paletteQuery: string;
  paletteCategory: string | null;
  dockTab: DockTab;
  dockOpen: boolean;
  aiOpen: boolean;
  hubOpen: boolean;
  inspectorTab: InspectorTab;
  toast: Toast | null;

  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setDomain: (domain: Domain) => void;
  setPaletteQuery: (query: string) => void;
  setPaletteCategory: (category: string | null) => void;
  setDockTab: (tab: DockTab) => void;
  setDockOpen: (open: boolean) => void;
  setAiOpen: (open: boolean) => void;
  setHubOpen: (open: boolean) => void;
  setInspectorTab: (tab: InspectorTab) => void;
  showToast: (message: string, kind?: Toast['kind']) => void;
  dismissToast: () => void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;
let toastSeq = 0;

export const useUiStore = create<UiState>((set) => ({
  theme: initialTheme(),
  activeDomain: 'digital',
  paletteQuery: '',
  paletteCategory: null,
  dockTab: 'log',
  dockOpen: true,
  aiOpen: false,
  hubOpen: false,
  inspectorTab: 'props',
  toast: null,

  setTheme: (theme) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(THEME_KEY, theme);
    set({ theme });
  },

  toggleTheme: () =>
    set((state) => {
      const theme = state.theme === 'dark' ? 'light' : 'dark';
      if (typeof localStorage !== 'undefined') localStorage.setItem(THEME_KEY, theme);
      return { theme };
    }),

  setDomain: (domain) => {
    if (!DOMAIN_ORDER.includes(domain)) return;
    set({ activeDomain: domain, paletteCategory: null });
  },

  setPaletteQuery: (paletteQuery) => set({ paletteQuery }),
  setPaletteCategory: (paletteCategory) => set({ paletteCategory }),
  setDockTab: (dockTab) => set({ dockTab, dockOpen: true }),
  setDockOpen: (dockOpen) => set({ dockOpen }),
  setAiOpen: (aiOpen) => set({ aiOpen }),
  setHubOpen: (hubOpen) => set({ hubOpen }),
  setInspectorTab: (inspectorTab) => set({ inspectorTab }),

  showToast: (message, kind = 'info') => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: { id: ++toastSeq, kind, message } });
    toastTimer = setTimeout(() => set({ toast: null }), 2600);
  },

  dismissToast: () => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: null });
  },
}));
