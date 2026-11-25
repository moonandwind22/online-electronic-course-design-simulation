import { useMemo } from 'react';
import { Search } from 'lucide-react';
import { useCircuitStore } from '../../store/useCircuitStore';
import { useUiStore } from '../../store/useUiStore';
import { CATEGORY_ORDER, partsForDomain } from '../../parts/registry';
import type { PartDef, PartSymbol } from '../../parts/types';

export function PalettePanel() {
  const doc = useCircuitStore((s) => s.doc);
  const addComponent = useCircuitStore((s) => s.addComponent);
  const query = useUiStore((s) => s.paletteQuery);
  const setQuery = useUiStore((s) => s.setPaletteQuery);
  const category = useUiStore((s) => s.paletteCategory);
  const setCategory = useUiStore((s) => s.setPaletteCategory);
  const canvasSize = useUiStore((s) => s.canvasSize);
  const showToast = useUiStore((s) => s.showToast);

  const parts = useMemo(() => partsForDomain(doc.domain), [doc.domain]);
  const categories = useMemo(() => {
    const present = new Set(parts.map((p) => p.category));
    return ['全部', ...CATEGORY_ORDER.filter((c) => present.has(c))];
  }, [parts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return parts.filter((p) => {
      if (category !== '全部' && p.category !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q) ||
        (p.tags ?? []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [parts, category, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, PartDef[]>();
    for (const part of filtered) {
      const list = map.get(part.category) ?? [];
      list.push(part);
      map.set(part.category, list);
    }
    return [...map.entries()].sort(
      (a, b) => CATEGORY_ORDER.indexOf(a[0]) - CATEGORY_ORDER.indexOf(b[0]),
    );
  }, [filtered]);

  const place = (part: PartDef) => {
    const vp = doc.viewport;
    const cx = (canvasSize.width / 2 - vp.x) / vp.zoom;
    const cy = (canvasSize.height / 2 - vp.y) / vp.zoom;
    const x = Math.round((cx - part.width / 2) / 10) * 10;
    const y = Math.round((cy - part.height / 2) / 10) * 10;
    const id = addComponent(part.type, x, y);
    if (id) showToast(`已放置 ${part.name}`, 'ok');
  };

  return (
    <aside className="app-palette">
      <div className="palette-head">
        <div className="palette-title-row">
          <span className="palette-title">器件库</span>
          <span className="palette-count">{filtered.length} / {parts.length}</span>
        </div>
        <label className="palette-search">
          <Search className="icon" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索器件、型号或功能"
            aria-label="搜索器件"
          />
        </label>
        <div className="filter-row">
          {categories.map((c) => (
            <button
              key={c}
              className={`chip ${category === c ? 'chip--active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="palette-scroll">
        {grouped.map(([groupName, list]) => (
          <div className="part-group" key={groupName}>
            <div className="part-group-title">
              <span>{groupName}</span>
              <span>{String(list.length).padStart(2, '0')}</span>
            </div>
            <div className="part-grid">
              {list.map((part) => (
                <button key={part.type} className="part-card" onClick={() => place(part)} title={part.description}>
                  <span className="part-symbol">
                    <PartThumb symbol={part.symbol} />
                  </span>
                  <span className="part-name">{part.name}</span>
                  <span className="part-meta">{part.subtitle}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {grouped.length === 0 && (
          <div className="palette-empty">没有匹配的器件，试试“74LS”“电阻”或“LED”。</div>
        )}
      </div>
      <div className="palette-foot">
        <span>点击器件放入画布</span>
        <span className="gt-mono">{doc.components.length}</span>
      </div>
    </aside>
  );
}

function PartThumb({ symbol }: { symbol: PartSymbol }) {
  switch (symbol) {
    case 'chip':
      return (
        <svg viewBox="0 0 44 28" aria-hidden="true">
          <rect x="12" y="4" width="20" height="20" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 8h4M8 14h4M8 20h4M32 8h4M32 14h4M32 20h4" stroke="currentColor" strokeWidth="1.2" />
          <path d="M18 4a4 4 0 0 0 8 0" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
    case 'board':
      return (
        <svg viewBox="0 0 44 28" aria-hidden="true">
          <rect x="5" y="3" width="34" height="22" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M5 10h34M10 3v3M15 3v3M29 3v3M34 3v3M10 22v3M15 22v3M29 22v3M34 22v3" stroke="currentColor" strokeWidth="1.1" />
          <rect x="14" y="13" width="10" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.1" />
        </svg>
      );
    case 'sevenseg':
      return (
        <svg viewBox="0 0 44 28" aria-hidden="true">
          <rect x="15" y="3" width="14" height="22" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <path d="M18 7h8M18 13h8M18 19h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'resistor':
      return (
        <svg viewBox="0 0 44 28" aria-hidden="true">
          <path d="M3 14h7l3-6 5 12 5-12 5 12 3-6h8" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
    case 'capacitor':
      return (
        <svg viewBox="0 0 44 28" aria-hidden="true">
          <path d="M3 14h14M27 14h14M18 6v16M26 6v16" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
    case 'inductor':
      return (
        <svg viewBox="0 0 44 28" aria-hidden="true">
          <path d="M3 16h4a4 5 0 0 1 8 0a4 5 0 0 1 8 0a4 5 0 0 1 8 0h7" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
    case 'diode':
      return (
        <svg viewBox="0 0 44 28" aria-hidden="true">
          <path d="M3 14h12M29 14h12M15 6l14 8-14 8zM29 6v16" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
    case 'led':
      return (
        <svg viewBox="0 0 44 28" aria-hidden="true">
          <path d="M3 16h10M27 16h10M13 8l14 8-14 8zM27 8v16M31 8l5-4M34 11l5-4" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
    case 'source':
      return (
        <svg viewBox="0 0 44 28" aria-hidden="true">
          <path d="M3 14h8M33 14h8" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="22" cy="14" r="9" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M22 9v10M18 14h8" stroke="currentColor" strokeWidth="1.1" />
        </svg>
      );
    case 'switch':
      return (
        <svg viewBox="0 0 44 28" aria-hidden="true">
          <path d="M3 18h10M31 18h10" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="13" cy="18" r="2" fill="currentColor" />
          <circle cx="31" cy="18" r="2" fill="currentColor" />
          <path d="M13 18l15-9" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
    case 'clock':
      return (
        <svg viewBox="0 0 44 28" aria-hidden="true">
          <rect x="5" y="4" width="34" height="20" rx="3" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <path d="M10 19h5V9h7v10h7V9h5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
    case 'nand':
      return (
        <svg viewBox="0 0 44 28" aria-hidden="true">
          <path d="M8 5h12a9 9 0 0 1 0 18H8z" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="31.5" cy="14" r="3" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <path d="M3 9h5M3 19h5M34.5 14h6" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
    case 'power-vcc':
      return (
        <svg viewBox="0 0 44 28" aria-hidden="true">
          <path d="M22 25V12M12 12h20M16 6h12" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case 'power-gnd':
      return (
        <svg viewBox="0 0 44 28" aria-hidden="true">
          <path d="M22 3v8M10 11h24M14 17h16M18 23h8" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    default:
      return null;
  }
}
