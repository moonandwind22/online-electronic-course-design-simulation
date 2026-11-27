import { create } from 'zustand';

export type DockTab = 'logic' | 'scope' | 'serial' | 'firmware' | 'log' | 'netlist';
export type Theme = 'light' | 'dark';
export type PanelKey = 'palette' | 'inspector' | 'dock';

interface Toast {
  id: number;
  message: string;
  level: 'info' | 'ok' | 'warn' | 'error';
}

interface UiState {
  theme: Theme;
  paletteQuery: string;
  paletteCategory: string;
  inspectorTab: 'props' | 'pins' | 'checks';
  dockTab: DockTab;
  aiOpen: boolean;
  toast: Toast | null;
  shortcutsOpen: boolean;
  canvasSize: { width: number; height: number };
  panelSizes: Record<PanelKey, number>;
  panelCollapsed: Record<PanelKey, boolean>;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setPaletteQuery: (q: string) => void;
  setPaletteCategory: (category: string) => void;
  setInspectorTab: (tab: 'props' | 'pins' | 'checks') => void;
  setDockTab: (tab: DockTab) => void;
  setAiOpen: (open: boolean) => void;
  showToast: (message: string, level?: Toast['level']) => void;
  setShortcutsOpen: (open: boolean) => void;
  setCanvasSize: (size: { width: number; height: number }) => void;
  setPanelSize: (panel: PanelKey, size: number) => void;
  togglePanel: (panel: PanelKey, collapsed?: boolean) => void;
}

let toastSeq = 0;

export const useUiStore = create<UiState>()((set) => ({
  theme: (typeof localStorage !== 'undefined' && localStorage.getItem('ecs.theme') === 'dark' ? 'dark' : 'light'),
  paletteQuery: '',
  paletteCategory: '全部',
  inspectorTab: 'props',
  dockTab: 'logic',
  aiOpen: false,
  toast: null,
  shortcutsOpen: false,
  canvasSize: { width: 900, height: 560 },
  panelSizes: { palette: 264, inspector: 316, dock: 236 },
  panelCollapsed: { palette: false, inspector: false, dock: false },

  toggleTheme: () =>
    set((s) => {
      const theme = s.theme === 'light' ? 'dark' : 'light';
      if (typeof localStorage !== 'undefined') localStorage.setItem('ecs.theme', theme);
      return { theme };
    }),

  setTheme: (theme) => set({ theme }),
  setPaletteQuery: (paletteQuery) => set({ paletteQuery }),
  setPaletteCategory: (paletteCategory) => set({ paletteCategory }),
  setInspectorTab: (inspectorTab) => set({ inspectorTab }),
  setDockTab: (dockTab) => set({ dockTab }),
  setAiOpen: (aiOpen) => set({ aiOpen }),
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
  setCanvasSize: (canvasSize) => set({ canvasSize }),

  setPanelSize: (panel, size) =>
    set((s) => ({ panelSizes: { ...s.panelSizes, [panel]: size } })),

  togglePanel: (panel, collapsed) =>
    set((s) => ({
      panelCollapsed: {
        ...s.panelCollapsed,
        [panel]: collapsed === undefined ? !s.panelCollapsed[panel] : collapsed,
      },
    })),

  showToast: (message, level = 'info') => {
    toastSeq += 1;
    const toast = { id: toastSeq, message, level };
    set({ toast });
    setTimeout(() => {
      if (useUiStore.getState().toast?.id === toast.id) set({ toast: null });
    }, 2600);
  },
}));
