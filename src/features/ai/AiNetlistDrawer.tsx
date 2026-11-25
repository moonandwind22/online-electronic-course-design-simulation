import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Download, X, Sparkles } from 'lucide-react';
import type { CheckIssue, NetlistResult } from '../../model/types';
import { useCircuitStore } from '../../store/useCircuitStore';
import { useSimStore } from '../../store/useSimStore';
import { useUiStore } from '../../store/useUiStore';
import { getPart } from '../../parts/registry';
import { buildAiNetlistText } from './formats';

interface Props {
  netlist: NetlistResult;
  checks: CheckIssue[];
}

type Format = 'compact' | 'natural' | 'json';

export function AiNetlistDrawer(props: Props) {
  const open = useUiStore((s) => s.aiOpen);
  if (!open) return null;
  return <AiNetlistDrawerContent {...props} />;
}

function AiNetlistDrawerContent({ netlist, checks }: Props) {
  const doc = useCircuitStore((s) => s.doc);
  const setAiOpen = useUiStore((s) => s.setAiOpen);
  const showToast = useUiStore((s) => s.showToast);
  const running = useSimStore((s) => s.running);
  const time = useSimStore((s) => s.time);
  const events = useSimStore((s) => s.events);
  const netLevels = useSimStore((s) => s.netLevels);
  const pinLevels = useSimStore((s) => s.pinLevels);
  const [format, setFormat] = useState<Format>('compact');
  const [includeSnapshot, setIncludeSnapshot] = useState(true);
  const [includeChecks, setIncludeChecks] = useState(true);
  const closeRef = useRef<HTMLButtonElement>(null);

  const text = useMemo(
    () =>
      buildAiNetlistText(
        format,
        doc,
        netlist,
        checks,
        { running, time, events, netLevels, pinLevels, notes: [] },
        getPart,
        { includeSnapshot, includeChecks },
      ),
    [format, doc, netlist, checks, running, time, events, netLevels, pinLevels, includeSnapshot, includeChecks],
  );

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAiOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setAiOpen]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('AI 网表已复制到剪贴板', 'ok');
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand('copy');
        showToast('AI 网表已复制到剪贴板', 'ok');
      } catch {
        showToast('复制失败，请手动全选复制', 'warn');
      }
      document.body.removeChild(area);
    }
  };

  const download = () => {
    const ext = format === 'json' ? 'json' : 'txt';
    const blob = new Blob([text], { type: format === 'json' ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.name.replace(/\s+/g, '_')}_${doc.domain}_netlist.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`已下载 .${ext} 网表`, 'ok');
  };

  return (
    <>
      <div className="ai-scrim" onClick={() => setAiOpen(false)} />
      <aside className="ai-drawer" role="dialog" aria-label="AI 网表">
        <header className="ai-head">
          <div>
            <h2 className="ai-title">AI 网表</h2>
            <div className="ai-sub">
              {doc.name} · {doc.domain} · 器件 {doc.components.length} · 网络 {netlist.nets.length}
            </div>
          </div>
          <button ref={closeRef} className="icon-btn" onClick={() => setAiOpen(false)} aria-label="关闭">
            <X className="icon" />
          </button>
        </header>
        <div className="ai-body">
          <div className="ai-controls">
            <div className="seg">
              <button className={`seg-item ${format === 'compact' ? 'is-active' : ''}`} onClick={() => setFormat('compact')}>
                紧凑文本
              </button>
              <button className={`seg-item ${format === 'natural' ? 'is-active' : ''}`} onClick={() => setFormat('natural')}>
                自然语言
              </button>
              <button className={`seg-item ${format === 'json' ? 'is-active' : ''}`} onClick={() => setFormat('json')}>
                JSON
              </button>
            </div>
            <button className={`toggle ${includeSnapshot ? 'is-on' : ''}`} onClick={() => setIncludeSnapshot((v) => !v)}>
              <span className="toggle-track" /> 包含仿真快照
            </button>
            <button className={`toggle ${includeChecks ? 'is-on' : ''}`} onClick={() => setIncludeChecks((v) => !v)}>
              <span className="toggle-track" /> 包含检查结果
            </button>
            <div className="ai-actions">
              <button className="btn btn--ghost btn--sm" onClick={download}>
                <Download className="icon" /> 下载
              </button>
              <button className="btn btn--primary btn--sm" onClick={copy}>
                <Copy className="icon" /> 复制
              </button>
            </div>
          </div>
          <pre className="ai-preview">{text}</pre>
        </div>
        <footer className="ai-foot">
          <Sparkles className="icon" />
          本地确定性生成，不调用任何 AI API；可直接粘贴给任意模型排查。
        </footer>
      </aside>
    </>
  );
}
