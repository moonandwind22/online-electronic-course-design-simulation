import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, Sparkles, Trash2 } from 'lucide-react';
import type { CheckIssue, NetlistResult } from '../../model/types';
import type { ParamDef } from '../../parts/types';
import { getPart } from '../../parts/registry';
import { useCircuitStore } from '../../store/useCircuitStore';
import { useSimStore } from '../../store/useSimStore';
import { useUiStore } from '../../store/useUiStore';
import { domainMeta } from '../../model/domains';
import { buildCompactNetlist } from '../ai/formats';

interface InspectorProps {
  netlist: NetlistResult;
  checks: CheckIssue[];
}

const LEVEL_TEXT: Record<string, string> = { '0': 'LO', '1': 'HI', z: 'Z', x: 'X' };
const LEVEL_CLASS: Record<string, string> = { '0': 'dot--low', '1': 'dot--high', z: 'dot--low', x: 'dot--error' };

export function InspectorPanel({ netlist, checks }: InspectorProps) {
  const doc = useCircuitStore((s) => s.doc);
  const selection = useCircuitStore((s) => s.selection);
  const deleteSelection = useCircuitStore((s) => s.deleteSelection);
  const tab = useUiStore((s) => s.inspectorTab);
  const setTab = useUiStore((s) => s.setInspectorTab);
  const setAiOpen = useUiStore((s) => s.setAiOpen);
  const showToast = useUiStore((s) => s.showToast);
  const collapsed = useUiStore((s) => s.panelCollapsed.inspector);
  const togglePanel = useUiStore((s) => s.togglePanel);
  const pinLevels = useSimStore((s) => s.pinLevels);
  const netLevels = useSimStore((s) => s.netLevels);
  const running = useSimStore((s) => s.running);
  const mcu = useSimStore((s) => s.mcu);
  const simTime = useSimStore((s) => s.time);
  const simEvents = useSimStore((s) => s.events);

  const selectedComp = selection.components.length === 1 ? doc.components.find((c) => c.id === selection.components[0]) : null;
  const selectedPart = selectedComp ? getPart(selectedComp.type) : undefined;
  const selectedWire = selection.wires.length === 1 ? doc.wires.find((w) => w.id === selection.wires[0]) : null;

  const netOfWire = useMemo(() => {
    if (!selectedWire) return null;
    const netId = netlist.wireNet.get(selectedWire.id);
    return netId ? netlist.nets.find((n) => n.id === netId) ?? null : null;
  }, [selectedWire, netlist]);

  const compact = useMemo(
    () =>
      buildCompactNetlist(
        doc,
        netlist,
        checks,
        {
          running,
          time: simTime,
          events: simEvents,
          netLevels,
          pinLevels,
          notes: [],
        },
        getPart,
      ),
    [doc, netlist, checks, running, simTime, simEvents, netLevels, pinLevels],
  );

  const errorCount = checks.filter((c) => c.level === 'error').length;
  const warnCount = checks.filter((c) => c.level === 'warn').length;

  const title = selectedComp
    ? selectedComp.label
    : selectedWire
      ? netOfWire?.name ?? '导线'
      : doc.name;
  const kicker = selectedComp
    ? selectedPart?.name ?? selectedComp.type
    : selectedWire
      ? 'NET / 网络'
      : `${domainMeta(doc.domain).label} · 工程`;
  const chipText = selectedComp
    ? selectedComp.type
    : selectedWire
      ? 'WIRE'
      : domainMeta(doc.domain).short;

  if (collapsed) {
    return (
      <aside className="app-inspector is-collapsed">
        <button className="panel-rail-btn" onClick={() => togglePanel('inspector', false)} title="展开检查器">
          <ChevronLeft className="icon" />
          <span className="panel-rail-label">检查器</span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="app-inspector">
      <div className="inspector-head">
        <div className="inspector-kicker">{kicker}</div>
        <div className="inspector-title-row">
          <span className="inspector-title">{title}</span>
          <span className="panel-head-actions">
            <span className="chip chip--muted">{chipText}</span>
            <button
              className="icon-btn icon-btn--sm"
              onClick={() => togglePanel('inspector', true)}
              title="收起检查器"
            >
              <ChevronRight className="icon" />
            </button>
          </span>
        </div>
      </div>
      <div className="inspector-tabs">
        <button className={`inspector-tab ${tab === 'props' ? 'is-active' : ''}`} onClick={() => setTab('props')}>
          属性
        </button>
        <button className={`inspector-tab ${tab === 'pins' ? 'is-active' : ''}`} onClick={() => setTab('pins')}>
          引脚
        </button>
        <button className={`inspector-tab ${tab === 'checks' ? 'is-active' : ''}`} onClick={() => setTab('checks')}>
          检查 {errorCount + warnCount > 0 ? `(${errorCount + warnCount})` : ''}
        </button>
      </div>
      <div className="inspector-body">
        {tab === 'props' && (
          <>
            {selectedComp && selectedPart && (
              <>
                <section className="inspect-section">
                  <div className="inspect-label">
                    <span>参数</span>
                    <span className="gt-mono">{selectedPart.type}</span>
                  </div>
                  <div className="param-list">
                    <div className="param-row">
                      <span className="param-key">位号</span>
                      <span className="param-val">{selectedComp.label}</span>
                    </div>
                    <div className="param-row">
                      <span className="param-key">位置</span>
                      <span className="param-val">({Math.round(selectedComp.x)}, {Math.round(selectedComp.y)})</span>
                    </div>
                    <div className="param-row">
                      <span className="param-key">旋转</span>
                      <span className="param-val">{selectedComp.rot}°{selectedComp.mirror ? ' · 镜像' : ''}</span>
                    </div>
                    {selectedPart.params.map((param) => (
                      <div className="param-row" key={param.key}>
                        <span className="param-key">{param.label}</span>
                        <ParamEditor compId={selectedComp.id} param={param} value={selectedComp.params[param.key]} />
                      </div>
                    ))}
                  </div>
                </section>
                {(selectedComp.type === 'MCU51' || selectedComp.type === 'STM32') && (
                  <section className="inspect-section">
                    <div className="inspect-label">
                      <span>MCU 状态</span>
                      <span className="gt-mono">{selectedComp.type}</span>
                    </div>
                    {mcu && mcu.componentId === selectedComp.id ? (
                      <div className="param-list">
                        <div className="param-row">
                          <span className="param-key">PC</span>
                          <span className="param-val">0x{mcu.pc.toString(16).padStart(4, '0').toUpperCase()}</span>
                        </div>
                        <div className="param-row">
                          <span className="param-key">A / B</span>
                          <span className="param-val">0x{mcu.a.toString(16).padStart(2, '0').toUpperCase()} / 0x{mcu.b.toString(16).padStart(2, '0').toUpperCase()}</span>
                        </div>
                        <div className="param-row">
                          <span className="param-key">DPTR</span>
                          <span className="param-val">0x{mcu.dptr.toString(16).padStart(4, '0').toUpperCase()}</span>
                        </div>
                        <div className="param-row">
                          <span className="param-key">SP / PSW</span>
                          <span className="param-val">0x{mcu.sp.toString(16).padStart(2, '0').toUpperCase()} / 0x{mcu.psw.toString(16).padStart(2, '0').toUpperCase()}</span>
                        </div>
                        <div className="param-row">
                          <span className="param-key">P1 锁存 / 引脚</span>
                          <span className="param-val">0x{mcu.latches[1].toString(16).padStart(2, '0').toUpperCase()} / 0x{mcu.pins[1].toString(16).padStart(2, '0').toUpperCase()}</span>
                        </div>
                        <div className="param-row">
                          <span className="param-key">周期 / 代码</span>
                          <span className="param-val">{mcu.cycles} / {mcu.codeSize} B</span>
                        </div>
                      </div>
                    ) : (
                      <p className="inspect-desc">运行后显示 PC、A/B、DPTR、PSW 与端口锁存状态。</p>
                    )}
                  </section>
                )}
                <section className="inspect-section">
                  <div className="inspect-label">
                    <span>器件说明</span>
                  </div>
                  <p className="inspect-desc">{selectedPart.description}</p>
                  <button className="btn btn--ghost btn--sm mt-8" onClick={deleteSelection}>
                    <Trash2 className="icon" /> 删除器件
                  </button>
                </section>
              </>
            )}
            {selectedWire && (
              <section className="inspect-section">
                <div className="inspect-label">
                  <span>网络</span>
                  <span className="gt-mono">{selectedWire.netLabel ?? netOfWire?.name ?? '—'}</span>
                </div>
                <div className="param-list">
                  <div className="param-row">
                    <span className="param-key">网络名</span>
                    <span className="param-val">{netOfWire?.name ?? '未命名'}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-key">电平</span>
                    <span className="param-val">
                      <span className={`dot ${LEVEL_CLASS[String(netLevels[netOfWire?.name ?? ''] ?? 'z')]}`} />{' '}
                      {LEVEL_TEXT[String(netLevels[netOfWire?.name ?? ''] ?? 'z')]}
                    </span>
                  </div>
                  <div className="param-row">
                    <span className="param-key">连接引脚</span>
                    <span className="param-val">{netOfWire?.pins.length ?? 0}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-key">导线长度</span>
                    <span className="param-val">{Math.max(0, selectedWire.points.length - 1)} 段</span>
                  </div>
                  <div className="param-row">
                    <span className="param-key">接线方式</span>
                    <span className="param-val">
                      {selectedWire.join ? 'T 型接导线' : selectedWire.from && selectedWire.to ? '引脚 — 引脚' : '单端导线'}
                    </span>
                  </div>
                </div>
                <button className="btn btn--ghost btn--sm mt-8" onClick={deleteSelection}>
                  <Trash2 className="icon" /> 删除导线
                </button>
              </section>
            )}
            {!selectedComp && !selectedWire && (
              <>
                <section className="inspect-section">
                  <div className="inspect-label">
                    <span>工程概览</span>
                    <span className="gt-mono">{domainMeta(doc.domain).short}</span>
                  </div>
                  <p className="inspect-desc">{doc.description}</p>
                  <div className="param-list mt-8">
                    <div className="param-row">
                      <span className="param-key">仿真引擎</span>
                      <span className="param-val">{domainMeta(doc.domain).engine}</span>
                    </div>
                    <div className="param-row">
                      <span className="param-key">器件 / 导线</span>
                      <span className="param-val">{doc.components.length} / {doc.wires.length}</span>
                    </div>
                    <div className="param-row">
                      <span className="param-key">网络数</span>
                      <span className="param-val">{netlist.nets.length}</span>
                    </div>
                    <div className="param-row">
                      <span className="param-key">工程 ID</span>
                      <span className="param-val">{doc.id}</span>
                    </div>
                  </div>
                </section>
                <section className="inspect-section">
                  <div className="inspect-label">
                    <span>AI 网表</span>
                    <span className="gt-mono">3 种格式</span>
                  </div>
                  <div className="ai-card">
                    <div className="ai-card-title">
                      <Sparkles className="icon" /> 接法文法已就绪
                    </div>
                    <div className="ai-card-desc">
                      把当前器件、引脚号、网络、仿真快照与检查结果一键交给 AI 排查。
                    </div>
                    <div className="ai-snippet">{compact.split('\n').slice(0, 6).join('\n')}</div>
                    <div className="btn-row mt-8">
                      <button className="btn btn--primary btn--sm" onClick={() => setAiOpen(true)}>
                        <Sparkles className="icon" /> 打开 AI 网表
                      </button>
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(compact);
                            showToast('已复制紧凑文本网表', 'ok');
                          } catch {
                            showToast('复制失败，请在 AI 网表面板中复制', 'warn');
                          }
                        }}
                      >
                        <Copy className="icon" /> 复制
                      </button>
                    </div>
                  </div>
                </section>
              </>
            )}
            <section className="inspect-section">
              <div className="inspect-label">
                <span>检查摘要</span>
                <span className="gt-mono">{errorCount}E / {warnCount}W</span>
              </div>
              <div className="check-list">
                {checks.slice(0, 3).map((issue) => (
                  <div className="check-row" key={issue.id}>
                    <span className={`dot ${dotFor(issue)}`} />
                    <div className="check-copy">
                      <strong>{issue.title}</strong>
                      {issue.detail && <span>{issue.detail}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {tab === 'pins' && (
          <>
            {selectedComp && selectedPart ? (
              <section className="inspect-section">
                <div className="inspect-label">
                  <span>引脚表</span>
                  <span className="gt-mono">{selectedPart.pins.length} pins</span>
                </div>
                <table className="pin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>名称</th>
                      <th>网络</th>
                      <th>电平</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPart.pins.map((pin) => {
                      const key = `${selectedComp.id}:${pin.id}`;
                      const netId = netlist.pinNet.get(key);
                      const net = netId ? netlist.nets.find((n) => n.id === netId) : undefined;
                      const level = pinLevels[key] ?? 'z';
                      return (
                        <tr key={pin.id}>
                          <td>{pin.number ?? pin.id}</td>
                          <td>{pin.name}</td>
                          <td>{net?.name ?? '—'}</td>
                          <td>
                            <span className={`dot ${LEVEL_CLASS[String(level)]}`} /> {LEVEL_TEXT[String(level)]}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            ) : (
              <section className="inspect-section">
                <div className="inspect-label">
                  <span>全部网络</span>
                  <span className="gt-mono">{netlist.nets.length}</span>
                </div>
                <div className="param-list">
                  {netlist.nets.map((net) => (
                    <div className="param-row" key={net.id}>
                      <span className="param-key">{net.name}</span>
                      <span className="param-val">
                        {net.pins.length} 引脚 · {LEVEL_TEXT[String(netLevels[net.name] ?? 'z')]}
                      </span>
                    </div>
                  ))}
                  {netlist.nets.length === 0 && <div className="param-row"><span className="param-key">暂无网络</span></div>}
                </div>
              </section>
            )}
          </>
        )}

        {tab === 'checks' && (
          <section className="inspect-section">
            <div className="inspect-label">
              <span>设计检查</span>
              <span className="gt-mono">{checks.length} 项</span>
            </div>
            <div className="check-list">
              {checks.map((issue) => (
                <div className="check-row" key={issue.id}>
                  <span className={`dot ${dotFor(issue)}`} />
                  <div className="check-copy">
                    <strong>{issue.title}</strong>
                    {issue.detail && <span>{issue.detail}</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}

function dotFor(issue: CheckIssue): string {
  if (issue.level === 'error') return 'dot--error';
  if (issue.level === 'warn') return 'dot--warn';
  if (issue.level === 'pass') return 'dot--high';
  return 'dot--low';
}

function ParamEditor({ compId, param, value }: { compId: string; param: ParamDef; value: number | string | undefined }) {
  const setParam = useCircuitStore((s) => s.setParam);
  const [local, setLocal] = useState(String(value ?? ''));

  useEffect(() => {
    setLocal(String(value ?? ''));
  }, [value]);

  if (param.type === 'select') {
    return (
      <select
        className="param-input"
        value={String(value ?? '')}
        onChange={(e) => setParam(compId, param.key, e.target.value)}
      >
        {param.options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  const commit = () => {
    if (param.type === 'number') {
      const num = Number(local);
      if (!Number.isNaN(num)) setParam(compId, param.key, num);
    } else {
      setParam(compId, param.key, local);
    }
  };

  return (
    <span className="param-edit">
      <input
        className="param-input"
        value={local}
        inputMode={param.type === 'number' ? 'decimal' : 'text'}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit();
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
      {param.unit && <em>{param.unit}</em>}
    </span>
  );
}
