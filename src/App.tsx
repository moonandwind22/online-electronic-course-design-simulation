import { useEffect, useMemo } from 'react';
import {
  CircuitBoard,
  Keyboard,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Sun,
} from 'lucide-react';
import { useCircuitStore } from './store/useCircuitStore';
import { useSimStore } from './store/useSimStore';
import { useUiStore } from './store/useUiStore';
import { useSimulation } from './engines/useSimulation';
import { DOMAINS, domainMeta } from './model/domains';
import { buildNetlist } from './lib/netlist';
import { runChecks } from './lib/checks';
import { getPart } from './parts/registry';
import { PalettePanel } from './features/palette/PalettePanel';
import { Canvas } from './features/editor/Canvas';
import { InspectorPanel } from './features/inspector/InspectorPanel';
import { DockPanel } from './features/dock/DockPanel';
import { AiNetlistDrawer } from './features/ai/AiNetlistDrawer';
import { ToastHost } from './components/Toast';
import { ShortcutsModal } from './components/ShortcutsModal';

const SPEEDS = [0.1, 0.5, 1, 4];

export default function App() {
  const doc = useCircuitStore((s) => s.doc);
  const loadDomain = useCircuitStore((s) => s.loadDomain);
  const renameProject = useCircuitStore((s) => s.renameProject);
  const running = useSimStore((s) => s.running);
  const speed = useSimStore((s) => s.speed);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const setAiOpen = useUiStore((s) => s.setAiOpen);
  const setShortcutsOpen = useUiStore((s) => s.setShortcutsOpen);
  const showToast = useUiStore((s) => s.showToast);

  useSimulation();

  const { netlist, checks } = useMemo(() => {
    const list = buildNetlist(doc, getPart);
    return { netlist: list, checks: runChecks(doc, list, getPart) };
  }, [doc]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    loadDomain('digital');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (typing) return;
      const mod = e.metaKey || e.ctrlKey;
      const circuit = useCircuitStore.getState();
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) circuit.redo();
        else circuit.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        circuit.redo();
        return;
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        useUiStore.getState().setAiOpen(true);
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        circuit.deleteSelection();
      }
      if (e.key.toLowerCase() === 'r') circuit.rotateSelection();
      if (e.key.toLowerCase() === 'x') circuit.mirrorSelection();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleRun = () => {
    const sim = useSimStore.getState();
    if (doc.domain !== 'digital' && doc.domain !== 'analog') {
      showToast('该仿真域的引擎将在后续阶段接入（当前支持数电与模电）', 'warn');
      return;
    }
    if (sim.running) {
      sim.setRunning(false);
      sim.logLine('仿真已暂停', 'info');
    } else {
      sim.setRunning(true);
      sim.logLine(
        doc.domain === 'digital' ? '仿真启动：数字引擎 · 事件驱动' : '仿真启动：brownout · MNA 求解',
        'ok',
      );
    }
  };

  const resetSim = () => {
    const sim = useSimStore.getState();
    sim.reset();
    sim.logLine('仿真已复位', 'info');
    showToast('仿真已复位', 'info');
  };

  const switchDomain = (domain: (typeof DOMAINS)[number]['id']) => {
    if (domain === doc.domain) return;
    useSimStore.getState().setRunning(false);
    loadDomain(domain);
    showToast(`已切换到${domainMeta(domain).label}`, 'info');
  };

  return (
    <main className="app-shell">
      <header className="app-topbar">
        <div className="topbar-home">
          <span className="brand-mark">
            <CircuitBoard className="icon" />
          </span>
          <span className="brand-word">课设工作台</span>
        </div>
        <span className="topbar-divider" />
        <div className="project-block">
          <input
            className="project-name-input"
            value={doc.name}
            onChange={(e) => renameProject(e.target.value)}
            aria-label="工程名称"
          />
          <span className="project-meta">
            {domainMeta(doc.domain).label} · {doc.components.length} 器件 · 自动保存
          </span>
        </div>
        <nav className="domain-tabs">
          {DOMAINS.map((d) => (
            <button
              key={d.id}
              className={`domain-tab ${d.id === doc.domain ? 'is-active' : ''}`}
              onClick={() => switchDomain(d.id)}
              title={d.description}
            >
              {d.short}
            </button>
          ))}
        </nav>
        <div className="topbar-actions">
          <span className="engine-chip">
            <span className={`dot ${running ? 'dot--live' : 'dot--low'}`} />
            {running ? '仿真运行中' : '已暂停'}
          </span>
          <button className={`btn ${running ? 'btn--accent' : 'btn--primary'} btn--sm`} onClick={toggleRun}>
            {running ? <Pause className="icon" /> : <Play className="icon" />}
            {running ? '暂停' : '运行'}
          </button>
          <button className="icon-btn" onClick={resetSim} title="复位仿真">
            <RotateCcw className="icon" />
          </button>
          <select
            className="speed-select"
            value={speed}
            onChange={(e) => useSimStore.getState().setSpeed(Number(e.target.value))}
            aria-label="仿真速度"
            title="仿真速度"
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
          <button className="btn btn--accent btn--sm" onClick={() => setAiOpen(true)} title="AI 网表 (Ctrl/Cmd+Shift+A)">
            <Sparkles className="icon" />
            AI 网表
          </button>
          <button className="icon-btn" onClick={toggleTheme} title={theme === 'light' ? '切换深色主题' : '切换浅色主题'}>
            {theme === 'light' ? <Moon className="icon" /> : <Sun className="icon" />}
          </button>
          <button className="icon-btn" onClick={() => setShortcutsOpen(true)} title="快捷键">
            <Keyboard className="icon" />
          </button>
        </div>
      </header>

      <PalettePanel />
      <section className="app-canvas">
        <Canvas netlist={netlist} />
      </section>
      <InspectorPanel netlist={netlist} checks={checks} />
      <DockPanel netlist={netlist} checks={checks} />

      <footer className="app-statusbar">
        <div className="status-left">
          <span className={`dot ${running ? 'dot--live' : 'dot--low'}`} />
          <span>{domainMeta(doc.domain).engine}</span>
          <span>·</span>
          <span>{running ? 'RUNNING' : 'PAUSED'}</span>
        </div>
        <div className="status-center">
          空格拖拽平移 · 滚轮缩放 · 点击引脚连线 · Ctrl/Cmd+Z 撤销 · F 适配视图
        </div>
        <div className="status-right">
          <span>{doc.components.length} 器件</span>
          <span>{doc.wires.length} 导线</span>
          <span>{netlist.nets.length} 网络</span>
          <span>本地自动保存</span>
        </div>
      </footer>

      <AiNetlistDrawer netlist={netlist} checks={checks} />
      <ShortcutsModal />
      <ToastHost />
    </main>
  );
}
