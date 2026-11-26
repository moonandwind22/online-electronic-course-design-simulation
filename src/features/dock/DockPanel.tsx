import { useMemo, useRef } from 'react';
import {
  Activity,
  AudioLines,
  Cpu,
  ScrollText,
  Sparkles,
  Terminal,
  Upload,
  Trash2,
  Play,
} from 'lucide-react';
import type { CheckIssue, NetlistResult } from '../../model/types';
import { useCircuitStore } from '../../store/useCircuitStore';
import { useSimStore, type ScopeState } from '../../store/useSimStore';
import { useUiStore, type DockTab } from '../../store/useUiStore';
import { getPart } from '../../parts/registry';
import { buildCompactNetlist } from '../ai/formats';

interface DockProps {
  netlist: NetlistResult;
  checks: CheckIssue[];
}

const TABS: Array<{ id: DockTab; label: string; icon: typeof Activity }> = [
  { id: 'logic', label: '逻辑分析仪', icon: Activity },
  { id: 'scope', label: '示波器', icon: AudioLines },
  { id: 'serial', label: '串口终端', icon: Terminal },
  { id: 'firmware', label: '固件', icon: Cpu },
  { id: 'log', label: '仿真日志', icon: ScrollText },
  { id: 'netlist', label: 'AI 网表', icon: Sparkles },
];

export function DockPanel({ netlist, checks }: DockProps) {
  const doc = useCircuitStore((s) => s.doc);
  const setFirmware = useCircuitStore((s) => s.setFirmware);
  const tab = useUiStore((s) => s.dockTab);
  const setTab = useUiStore((s) => s.setDockTab);
  const setAiOpen = useUiStore((s) => s.setAiOpen);
  const showToast = useUiStore((s) => s.showToast);
  const running = useSimStore((s) => s.running);
  const time = useSimStore((s) => s.time);
  const events = useSimStore((s) => s.events);
  const waveforms = useSimStore((s) => s.waveforms);
  const scope = useSimStore((s) => s.scope);
  const log = useSimStore((s) => s.log);
  const clearLog = useSimStore((s) => s.clearLog);
  const pinLevels = useSimStore((s) => s.pinLevels);
  const mcu = useSimStore((s) => s.mcu);
  const serial = useSimStore((s) => s.serial);
  const clearSerial = useSimStore((s) => s.clearSerial);
  const netLevels = useSimStore((s) => s.netLevels);
  const fileRef = useRef<HTMLInputElement>(null);

  const compact = useMemo(
    () =>
      buildCompactNetlist(
        doc,
        netlist,
        checks,
        { running, time, events, netLevels, pinLevels, notes: [] },
        getPart,
      ),
    [doc, netlist, checks, running, time, events, netLevels, pinLevels],
  );

  const uploadFirmware = async (file: File) => {
    const text = await file.text();
    if (!text.trim().startsWith(':')) {
      showToast('只支持 Intel HEX 文件（以 : 开头）', 'error');
      return;
    }
    let size = 0;
    for (const line of text.split(/\r?\n/)) {
      if (line.startsWith(':') && line.length >= 11 && line.slice(7, 9) === '00') {
        size += parseInt(line.slice(1, 3), 16) || 0;
      }
    }
    let crc = 0;
    for (let i = 0; i < text.length; i += 1) crc = (crc + text.charCodeAt(i)) >>> 0;
    setFirmware({ name: file.name, hex: text, size, crc32: crc });
    showToast(`已载入固件 ${file.name} (${size} B)`, 'ok');
  };

  return (
    <section className="app-dock">
      <div className="dock-head">
        <div className="dock-tabs">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`dock-tab ${tab === id ? 'is-active' : ''}`}
              onClick={() => setTab(id)}
            >
              <Icon className="icon" /> {label}
            </button>
          ))}
        </div>
        <div className="dock-actions">
          <span className={`chip ${running ? 'chip--accent' : 'chip--muted'}`}>
            {running ? 'RUNNING' : 'PAUSED'}
          </span>
          {tab === 'log' && (
            <button className="icon-btn" onClick={clearLog} title="清空日志">
              <Trash2 className="icon" />
            </button>
          )}
        </div>
      </div>

      <div className="dock-body">
        {tab === 'logic' && (
          <>
            <div className="dock-wave">
              {waveforms.length > 0 ? <WaveBoard waves={waveforms} /> : <DockEmpty text="运行仿真后，逻辑分析仪会显示时钟、计数与译码网络波形。" />}
            </div>
            <aside className="dock-side">
              <div className="inspect-label">
                <span>信号</span>
                <span className="gt-mono">{waveforms.length}/8</span>
              </div>
              {waveforms.map((w, i) => {
                const level = netLevels[w.name] ?? 'z';
                return (
                  <div className="channel-row" key={w.name}>
                    <span className={`channel-swatch channel-swatch--${(i % 4) + 1}`} />
                    <span>{w.name}</span>
                    <span className="channel-value">{String(level).toUpperCase()}</span>
                  </div>
                );
              })}
              {waveforms.length === 0 && <div className="channel-row">等待采样…</div>}
              <div className="inspect-label mt-12">
                <span>仿真</span>
              </div>
              <div className="param-row">
                <span className="param-key">时间</span>
                <span className="param-val">{time.toFixed(2)} s</span>
              </div>
              <div className="param-row">
                <span className="param-key">网络变化</span>
                <span className="param-val">{events}</span>
              </div>
              <div className="param-row">
                <span className="param-key">时钟</span>
                <span className="param-val">1 Hz</span>
              </div>
            </aside>
          </>
        )}

        {tab === 'scope' && (
          <>
            <div className="dock-wave">
              {scope.ch1.length > 0 ? (
                <ScopeBoard scope={scope} />
              ) : (
                <DockEmpty
                  text={
                    doc.domain === 'analog' || doc.domain === 'power'
                      ? '点击顶栏“运行”，示波器将显示 brownout 求解器输出的 VOUT 曲线。'
                      : '当前工程属于数字域；切换到模电或电力电子工程可查看模拟波形。'
                  }
                />
              )}
            </div>
            <aside className="dock-side">
              <div className="inspect-label"><span>通道</span><span className="gt-mono">2 CH</span></div>
              <div className="channel-row">
                <span className="channel-swatch channel-swatch--1" />
                {scope.label1}
                <span className="channel-value">{latest(scope.ch1).toFixed(2)} V</span>
              </div>
              <div className="channel-row">
                <span className="channel-swatch channel-swatch--3" />
                {scope.label2}
                <span className="channel-value">{latest(scope.ch2).toFixed(2)} V</span>
              </div>
              <div className="inspect-label mt-12"><span>测量</span></div>
              <div className="param-row"><span className="param-key">Vpp</span><span className="param-val">{vpp(scope.ch1).toFixed(2)} V</span></div>
              <div className="param-row"><span className="param-key">Vavg</span><span className="param-val">{avg(scope.ch1).toFixed(2)} V</span></div>
              <div className="param-row"><span className="param-key">纵轴</span><span className="param-val">0–{scope.vmax.toFixed(1)} V</span></div>
              <div className="param-row"><span className="param-key">时间窗</span><span className="param-val">{(scope.ch1.length * 0.5).toFixed(0)} ms</span></div>
              <div className="inspect-label mt-12"><span>状态</span></div>
              <div className="param-row"><span className="param-key">引擎</span><span className="param-val">brownout · MNA</span></div>
            </aside>
          </>
        )}

        {tab === 'serial' && (
          <>
            <div className="terminal">
              <div className="terminal-line terminal-dim">[serial] USART1 · 9600 8N1 · {doc.firmware ? `${doc.firmware.name} 已载入` : '等待固件'}</div>
              {serial && <div className="terminal-line terminal-ok" style={{ whiteSpace: 'pre-wrap' }}>{serial}</div>}
              {!serial && <div className="terminal-line terminal-dim">等待串口数据…</div>}
              {log.slice(-14).map((line, i) => (
                <div className="terminal-line" key={i}>
                  <span className="terminal-time">[{line.t.toFixed(2)}s]</span>{' '}
                  <span className={line.level === 'warn' ? 'terminal-warn' : line.level === 'ok' ? 'terminal-ok' : ''}>{line.text}</span>
                </div>
              ))}
              <div className="terminal-prompt">
                <span>8051&gt;</span>
                <span className="terminal-cursor" />
              </div>
            </div>
            <aside className="dock-side">
              <div className="inspect-label">
                <span>串口</span>
                <button className="icon-btn" onClick={clearSerial} title="清空串口">
                  <Trash2 className="icon" />
                </button>
              </div>
              <div className="param-row"><span className="param-key">波特率</span><span className="param-val">9600</span></div>
              <div className="param-row"><span className="param-key">数据位</span><span className="param-val">8</span></div>
              <div className="param-row"><span className="param-key">校验</span><span className="param-val">NONE</span></div>
              <div className="param-row"><span className="param-key">停止位</span><span className="param-val">1</span></div>
              {mcu && (
                <>
                  <div className="inspect-label mt-12"><span>MCU</span></div>
                  <div className="param-row"><span className="param-key">PC</span><span className="param-val">0x{mcu.pc.toString(16).padStart(4, '0').toUpperCase()}</span></div>
                  <div className="param-row"><span className="param-key">周期</span><span className="param-val">{mcu.cycles}</span></div>
                </>
              )}
            </aside>
          </>
        )}

        {tab === 'firmware' && (
          <>
            <div className="terminal">
              <div className="inspect-label"><span>固件烧录</span><span className="gt-mono">Intel HEX</span></div>
              <div
                className="fw-drop"
                onClick={() => fileRef.current?.click()}
                style={{ cursor: 'pointer' }}
              >
                <Upload className="icon" />
                <span className="fw-drop-title">点击选择 .hex 文件</span>
                <span className="fw-drop-sub">当前为界面流程，MCS-51 / STM32 内核将读取同一份固件</span>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".hex,.ihx,text/plain"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadFirmware(file);
                  e.target.value = '';
                }}
              />
              {doc.firmware ? (
                <div className="fw-file">
                  <span className="fw-file-icon"><Cpu className="icon" /></span>
                  <span className="fw-file-copy">
                    <span className="fw-file-name">{doc.firmware.name}</span>
                    <span className="fw-file-meta">{doc.firmware.size} bytes · checksum 0x{doc.firmware.crc32?.toString(16).toUpperCase() ?? '----'}</span>
                  </span>
                  <button className="icon-btn" onClick={() => setFirmware(null)} title="移除固件">
                    <Trash2 className="icon" />
                  </button>
                </div>
              ) : (
                <div className="burn-list mt-8">
                  <div className="burn-step"><Play className="icon" /> 解析 Intel HEX</div>
                  <div className="burn-step"><Play className="icon" /> 校验地址与校验和</div>
                  <div className="burn-step"><Play className="icon" /> 写入代码空间并复位</div>
                </div>
              )}
            </div>
            <aside className="dock-side">
              <div className="inspect-label"><span>目标</span></div>
              <div className="param-row"><span className="param-key">板卡</span><span className="param-val">{doc.domain === 'stm32' ? 'STM32F103C8T6' : doc.domain === 'mcs51' ? 'STC89C52RC' : '—'}</span></div>
              <div className="param-row"><span className="param-key">固件</span><span className="param-val">{doc.firmware ? doc.firmware.name : '未载入'}</span></div>
              <div className="param-row"><span className="param-key">大小</span><span className="param-val">{doc.firmware?.size ?? 0} B</span></div>
              {mcu && (
                <>
                  <div className="inspect-label mt-12"><span>运行状态</span></div>
                  <div className="param-row"><span className="param-key">PC</span><span className="param-val">0x{mcu.pc.toString(16).padStart(4, '0').toUpperCase()}</span></div>
                  <div className="param-row"><span className="param-key">周期</span><span className="param-val">{mcu.cycles}</span></div>
                  <div className="param-row"><span className="param-key">P1 锁存</span><span className="param-val">0x{mcu.latches[1].toString(16).padStart(2, '0').toUpperCase()}</span></div>
                </>
              )}
            </aside>
          </>
        )}

        {tab === 'log' && (
          <div className="terminal">
            {log.length === 0 && <div className="terminal-line terminal-dim">暂无日志。点击顶栏“运行”开始仿真。</div>}
            {log.map((line, i) => (
              <div className="terminal-line" key={i}>
                <span className="terminal-time">[{line.t.toFixed(3)}s]</span>{' '}
                <span className={line.level === 'warn' ? 'terminal-warn' : line.level === 'ok' ? 'terminal-ok' : ''}>{line.text}</span>
              </div>
            ))}
            <div className="terminal-prompt"><span>log&gt;</span><span className="terminal-cursor" /></div>
          </div>
        )}

        {tab === 'netlist' && (
          <div className="terminal">
            <div className="inspect-label">
              <span>紧凑文本预览</span>
              <button className="btn btn--primary btn--sm" onClick={() => setAiOpen(true)}>
                <Sparkles className="icon" /> 打开完整面板
              </button>
            </div>
            <pre className="ai-preview">{compact.split('\n').slice(0, 26).join('\n')}</pre>
          </div>
        )}
      </div>
    </section>
  );
}

function DockEmpty({ text }: { text: string }) {
  return <div className="dock-empty">{text}</div>;
}

const latest = (arr: number[]): number => (arr.length > 0 ? arr[arr.length - 1] : 0);
const avg = (arr: number[]): number => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const vpp = (arr: number[]): number => {
  if (arr.length === 0) return 0;
  let min = Infinity;
  let max = -Infinity;
  for (const v of arr) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return max - min;
};

function ScopeBoard({ scope }: { scope: ScopeState }) {
  const W = 640;
  const H = 200;
  const pad = 22;
  const y = (v: number) => H - pad - (Math.max(0, v) / scope.vmax) * (H - pad * 2);
  const x = (i: number) => (i / 240) * W;
  const line = (arr: number[]) =>
    arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const area = scope.ch1.length > 0 ? `${line(scope.ch1)} L${x(scope.ch1.length - 1)} ${H - pad} L0 ${H - pad} Z` : '';
  return (
    <svg className="scope-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {Array.from({ length: 9 }).map((_, i) => (
        <line key={`v${i}`} x1={i * 80} y1={0} x2={i * 80} y2={H} className={i % 4 === 0 ? 'wave-grid--strong' : 'wave-grid'} />
      ))}
      {Array.from({ length: 5 }).map((_, i) => (
        <line key={`h${i}`} x1={0} y1={pad + (i * (H - pad * 2)) / 4} x2={W} y2={pad + (i * (H - pad * 2)) / 4} className={i === 4 ? 'wave-grid--strong' : 'wave-grid'} />
      ))}
      {area && <path d={area} fill="color-mix(in srgb, var(--golden-chart-5) 10%, transparent)" />}
      {scope.ch2.length > 0 && <path d={line(scope.ch2)} className="trace-2 trace--thin" />}
      {scope.ch1.length > 0 && <path d={line(scope.ch1)} className="trace-3" />}
    </svg>
  );
}

function WaveBoard({ waves }: { waves: Array<{ name: string; samples: number[] }> }) {
  const rows = waves.slice(0, 8);
  const height = 200;
  const width = 640;
  const rowH = height / Math.max(rows.length, 1);
  return (
    <svg className="scope-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {Array.from({ length: 17 }).map((_, i) => (
        <line key={`v${i}`} x1={i * 40} y1={0} x2={i * 40} y2={height} className={i % 4 === 0 ? 'wave-grid--strong' : 'wave-grid'} />
      ))}
      {rows.map((row, i) => {
        const base = i * rowH + rowH / 2;
        const amp = rowH * 0.32;
        const stepX = width / 240;
        let d = '';
        const start = 240 - row.samples.length;
        row.samples.forEach((s, j) => {
          const x = (start + j) * stepX;
          const y = base + (0.5 - s) * 2 * amp;
          d += j === 0 ? `M${x.toFixed(1)} ${y.toFixed(1)}` : `H${x.toFixed(1)} V${y.toFixed(1)}`;
        });
        return <path key={row.name} d={d} className={`trace-${(i % 4) + 1} trace--thin`} />;
      })}
    </svg>
  );
}
