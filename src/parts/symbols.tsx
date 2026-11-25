import type { PartDef } from './types';

interface PartSymbolProps {
  part: PartDef;
  params?: Record<string, number | string>;
  compact?: boolean;
  ledOn?: boolean;
  segments?: string;
  switchClosed?: boolean;
}

const BODY_INSET = 16;

function pinStroke(pin: { x: number; y: number; side: string }, width: number, height: number, inset: number): [number, number, number, number] {
  if (pin.side === 'left') return [pin.x, pin.y, inset, pin.y];
  if (pin.side === 'right') return [pin.x, pin.y, width - inset, pin.y];
  if (pin.side === 'top') return [pin.x, pin.y, pin.x, inset];
  return [pin.x, pin.y, pin.x, height - inset];
}

function PassivePins({ part, compact }: { part: PartDef; compact?: boolean }) {
  const { width, height } = part;
  return (
    <>
      {part.pins.map((pin) => {
        const [x1, y1, x2, y2] = pinStroke(pin, width, height, 8);
        return <line key={pin.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--pin)" strokeWidth={1.6} />;
      })}
      {!compact &&
        part.pins.map((pin) => (
          <text
            key={`label-${pin.id}`}
            x={pin.side === 'left' ? 5 : pin.side === 'right' ? width - 5 : pin.x + 4}
            y={pin.side === 'top' ? 10 : pin.side === 'bottom' ? height - 4 : pin.y - 3}
            fontSize={6.5}
            fill="var(--faint)"
            textAnchor={pin.side === 'left' ? 'start' : pin.side === 'right' ? 'end' : 'middle'}
            fontFamily="var(--font-mono)"
          >
            {pin.name}
          </text>
        ))}
    </>
  );
}

function Resistor({ part }: { part: PartDef }) {
  const { width, height } = part;
  const cx = width / 2;
  const top = 14;
  const bottom = height - 14;
  const step = (bottom - top) / 8;
  const zig: string[] = [`M ${cx} ${top}`];
  for (let i = 0; i < 8; i++) {
    const x = i % 2 === 0 ? cx - 7 : cx + 7;
    zig.push(`L ${x} ${top + step * (i + 0.5)}`);
  }
  zig.push(`L ${cx} ${bottom}`);
  return (
    <>
      <path d={zig.join(' ')} fill="none" stroke="var(--ink-2)" strokeWidth={1.8} strokeLinejoin="round" />
      <line x1={cx} y1={0} x2={cx} y2={top} stroke="var(--pin)" strokeWidth={1.6} />
      <line x1={cx} y1={bottom} x2={cx} y2={height} stroke="var(--pin)" strokeWidth={1.6} />
    </>
  );
}

function Capacitor({ part, polarized }: { part: PartDef; polarized?: boolean }) {
  const { width, height } = part;
  const cx = width / 2;
  const mid = height / 2;
  return (
    <>
      <line x1={cx} y1={0} x2={cx} y2={mid - 5} stroke="var(--pin)" strokeWidth={1.6} />
      <line x1={cx} y1={mid + 5} x2={cx} y2={height} stroke="var(--pin)" strokeWidth={1.6} />
      <line x1={cx - 13} y1={mid - 5} x2={cx + 13} y2={mid - 5} stroke="var(--ink-2)" strokeWidth={2.4} />
      <line x1={cx - 13} y1={mid + 5} x2={cx + 13} y2={mid + 5} stroke="var(--ink-2)" strokeWidth={2.4} />
      {polarized && (
        <>
          <path d={`M ${cx + 19} ${mid - 13} q 5 6 0 12`} fill="none" stroke="var(--faint)" strokeWidth={1.1} />
          <text x={cx + 23} y={mid - 10} fontSize={8} fill="var(--faint)">
            +
          </text>
        </>
      )}
    </>
  );
}

function Inductor({ part }: { part: PartDef }) {
  const { width, height } = part;
  const cx = width / 2;
  const top = 20;
  const bottom = height - 20;
  const coils = 4;
  const radius = (bottom - top) / (coils * 2);
  let path = `M ${cx} ${top}`;
  for (let i = 0; i < coils; i++) {
    path += ` A ${radius} ${radius} 0 0 1 ${cx} ${top + radius * (2 * i + 2)}`;
  }
  return (
    <>
      <path d={path} fill="none" stroke="var(--ink-2)" strokeWidth={1.8} />
      <line x1={cx} y1={0} x2={cx} y2={top} stroke="var(--pin)" strokeWidth={1.6} />
      <line x1={cx} y1={bottom} x2={cx} y2={height} stroke="var(--pin)" strokeWidth={1.6} />
    </>
  );
}

function DiodeShape({ part, zener }: { part: PartDef; zener?: boolean }) {
  const { width, height } = part;
  const midY = height / 2;
  const left = 24;
  const right = width - 24;
  return (
    <>
      <line x1={0} y1={midY} x2={left} y2={midY} stroke="var(--pin)" strokeWidth={1.6} />
      <line x1={right} y1={midY} x2={width} y2={midY} stroke="var(--pin)" strokeWidth={1.6} />
      <path d={`M ${left} ${midY - 11} L ${left} ${midY + 11} L ${right} ${midY} Z`} fill="var(--panel-3)" stroke="var(--ink-2)" strokeWidth={1.6} />
      <line x1={right} y1={midY - 11} x2={right} y2={midY + 11} stroke="var(--ink-2)" strokeWidth={2} />
      {zener && (
        <>
          <path d={`M ${right} ${midY - 11} l 7 -5`} stroke="var(--ink-2)" strokeWidth={1.6} fill="none" />
          <path d={`M ${right} ${midY + 11} l -7 5`} stroke="var(--ink-2)" strokeWidth={1.6} fill="none" />
        </>
      )}
    </>
  );
}

function LedShape({ part, on, params }: { part: PartDef; on?: boolean; params?: Record<string, number | string> }) {
  const { width, height } = part;
  const cx = width / 2;
  const mid = height / 2;
  const colorMap: Record<string, string> = {
    red: '#f87171',
    green: '#34d399',
    yellow: '#fbbf24',
    blue: '#60a5fa',
  };
  const color = colorMap[String(params?.color ?? part.params?.find((param) => param.key === 'color')?.defaultValue ?? 'red')] ?? '#f87171';
  return (
    <>
      {on && <circle cx={cx} cy={mid} r={17} fill={color} opacity={0.18} />}
      <line x1={cx} y1={0} x2={cx} y2={mid - 10} stroke="var(--pin)" strokeWidth={1.6} />
      <line x1={cx} y1={mid + 10} x2={cx} y2={height} stroke="var(--pin)" strokeWidth={1.6} />
      <path d={`M ${cx - 10} ${mid - 10} L ${cx + 10} ${mid - 10} L ${cx} ${mid + 6} Z`} fill={on ? color : 'var(--panel-3)'} stroke="var(--ink-2)" strokeWidth={1.5} />
      <line x1={cx - 10} y1={mid + 10} x2={cx + 10} y2={mid + 10} stroke="var(--ink-2)" strokeWidth={2} />
      <path d={`M ${cx + 9} ${mid - 9} l 6 -6 m -3 0 l 3 0 l 0 3`} fill="none" stroke="var(--faint)" strokeWidth={1.1} />
      <path d={`M ${cx + 14} ${mid - 3} l 6 -6 m -3 0 l 3 0 l 0 3`} fill="none" stroke="var(--faint)" strokeWidth={1.1} />
    </>
  );
}

function SourceShape({ part, ac, battery }: { part: PartDef; ac?: boolean; battery?: boolean }) {
  const { width, height } = part;
  const cx = width / 2;
  const mid = height / 2;
  const radius = Math.min(width, height) / 2 - 18;
  return (
    <>
      <line x1={cx} y1={0} x2={cx} y2={mid - radius} stroke="var(--pin)" strokeWidth={1.6} />
      <line x1={cx} y1={mid + radius} x2={cx} y2={height} stroke="var(--pin)" strokeWidth={1.6} />
      {battery ? (
        <>
          <line x1={cx - 16} y1={mid - 8} x2={cx + 16} y2={mid - 8} stroke="var(--ink-2)" strokeWidth={2.2} />
          <line x1={cx - 10} y1={mid + 2} x2={cx + 10} y2={mid + 2} stroke="var(--ink-2)" strokeWidth={2.2} />
          <line x1={cx - 16} y1={mid + 12} x2={cx + 16} y2={mid + 12} stroke="var(--ink-2)" strokeWidth={2.2} />
        </>
      ) : (
        <>
          <circle cx={cx} cy={mid} r={radius} fill="var(--panel-2)" stroke="var(--ink-2)" strokeWidth={1.6} />
          {ac ? (
            <path
              d={`M ${cx - 13} ${mid} q 6 -9 13 0 q 7 9 13 0`}
              fill="none"
              stroke="var(--ink-2)"
              strokeWidth={1.6}
            />
          ) : (
            <>
              <text x={cx} y={mid - 4} textAnchor="middle" fontSize={12} fill="var(--ink-2)">
                +
              </text>
              <text x={cx} y={mid + 13} textAnchor="middle" fontSize={13} fill="var(--ink-2)">
                −
              </text>
            </>
          )}
        </>
      )}
    </>
  );
}

function GroundShape({ part }: { part: PartDef }) {
  const { width } = part;
  const cx = width / 2;
  return (
    <>
      <line x1={cx} y1={0} x2={cx} y2={18} stroke="var(--pin)" strokeWidth={1.6} />
      <line x1={cx - 16} y1={18} x2={cx + 16} y2={18} stroke="var(--ink-2)" strokeWidth={2.2} />
      <line x1={cx - 10} y1={25} x2={cx + 10} y2={25} stroke="var(--ink-2)" strokeWidth={2.2} />
      <line x1={cx - 4} y1={32} x2={cx + 4} y2={32} stroke="var(--ink-2)" strokeWidth={2.2} />
    </>
  );
}

function RailShape({ part }: { part: PartDef }) {
  const { width, height } = part;
  const cx = width / 2;
  return (
    <>
      <line x1={cx} y1={height} x2={cx} y2={height - 16} stroke="var(--pin)" strokeWidth={1.6} />
      <line x1={cx - 16} y1={height - 16} x2={cx + 16} y2={height - 16} stroke="var(--ink-2)" strokeWidth={2.2} />
      <line x1={cx} y1={height - 16} x2={cx} y2={height - 26} stroke="var(--ink-2)" strokeWidth={1.4} />
    </>
  );
}

function SwitchShape({ part, closed, button }: { part: PartDef; closed?: boolean; button?: boolean }) {
  const { width, height } = part;
  const mid = height / 2;
  const left = 18;
  const right = width - 18;
  return (
    <>
      <line x1={0} y1={mid} x2={left} y2={mid} stroke="var(--pin)" strokeWidth={1.6} />
      <line x1={right} y1={mid} x2={width} y2={mid} stroke="var(--pin)" strokeWidth={1.6} />
      <circle cx={left} cy={mid} r={2.4} fill="var(--pin)" />
      <circle cx={right} cy={mid} r={2.4} fill="var(--pin)" />
      {closed ? (
        <line x1={left} y1={mid} x2={right} y2={mid} stroke="var(--accent)" strokeWidth={2} />
      ) : (
        <line x1={left} y1={mid} x2={right - 2} y2={mid - 12} stroke="var(--ink-2)" strokeWidth={2} />
      )}
      {button && (
        <>
          <line x1={width / 2} y1={mid - 22} x2={width / 2} y2={mid - 12} stroke="var(--ink-2)" strokeWidth={1.6} />
          <line x1={width / 2 - 9} y1={mid - 22} x2={width / 2 + 9} y2={mid - 22} stroke="var(--ink-2)" strokeWidth={2} />
        </>
      )}
    </>
  );
}

function TransistorShape({ part, kind }: { part: PartDef; kind: 'npn' | 'pnp' | 'nmos' | 'pmos' | 'igbt' | 'scr' }) {
  const { width, height } = part;
  const cx = width / 2 + 4;
  const cy = height / 2;
  const lead = width / 2 - 8;
  return (
    <>
      <circle cx={cx} cy={cy} r={Math.min(width, height) / 2 - 12} fill="none" stroke="var(--line-strong)" strokeWidth={1.2} />
      <line x1={0} y1={cy} x2={lead} y2={cy} stroke="var(--pin)" strokeWidth={1.6} />
      <line x1={lead} y1={cy - 14} x2={lead} y2={cy + 14} stroke="var(--ink-2)" strokeWidth={2.4} />
      <line x1={lead} y1={cy - 8} x2={cx + 10} y2={cy - 18} stroke="var(--ink-2)" strokeWidth={1.8} />
      <line x1={lead} y1={cy + 8} x2={cx + 10} y2={cy + 18} stroke="var(--ink-2)" strokeWidth={1.8} />
      <line x1={cx + 10} y1={cy - 18} x2={cx + 10} y2={0} stroke="var(--pin)" strokeWidth={1.6} />
      <line x1={cx + 10} y1={cy + 18} x2={cx + 10} y2={height} stroke="var(--pin)" strokeWidth={1.6} />
      {(kind === 'npn' || kind === 'nmos') && (
        <path d={`M ${cx + 10} ${cy + 12} l -7 4 l 7 4 z`} fill="var(--ink-2)" />
      )}
      {(kind === 'pnp' || kind === 'pmos') && (
        <path d={`M ${cx + 3} ${cy + 12} l 7 4 l -7 4 z`} fill="var(--ink-2)" />
      )}
      {kind === 'igbt' && <line x1={lead} y1={cy + 14} x2={cx + 14} y2={cy + 22} stroke="var(--ink-2)" strokeWidth={1.2} />}
      {kind === 'scr' && <path d={`M ${lead + 4} ${cy + 10} l 8 5 l -8 5`} fill="none" stroke="var(--ink-2)" strokeWidth={1.2} />}
    </>
  );
}

function OpampShape({ part }: { part: PartDef }) {
  const { width, height } = part;
  return (
    <>
      <line x1={0} y1={30} x2={24} y2={30} stroke="var(--pin)" strokeWidth={1.6} />
      <line x1={0} y1={66} x2={24} y2={66} stroke="var(--pin)" strokeWidth={1.6} />
      <line x1={width - 24} y1={48} x2={width} y2={48} stroke="var(--pin)" strokeWidth={1.6} />
      <line x1={48} y1={0} x2={48} y2={16} stroke="var(--pin)" strokeWidth={1.6} />
      <line x1={48} y1={height} x2={48} y2={height - 16} stroke="var(--pin)" strokeWidth={1.6} />
      <path d={`M 24 16 L 24 ${height - 16} L ${width - 24} 48 Z`} fill="var(--panel-2)" stroke="var(--ink-2)" strokeWidth={1.6} />
      <text x={32} y={36} fontSize={9} fill="var(--muted)">
        +
      </text>
      <text x={32} y={72} fontSize={9} fill="var(--muted)">
        −
      </text>
    </>
  );
}

function SevenSegShape({ part, segments, params }: { part: PartDef; segments?: string; params?: Record<string, number | string> }) {
  const lit = new Set((segments ?? '').split(''));
  const colorMap: Record<string, string> = { red: '#f87171', green: '#34d399', amber: '#fbbf24' };
  const color = colorMap[String(params?.color ?? part.params?.find((param) => param.key === 'color')?.defaultValue ?? 'red')] ?? '#f87171';
  const commonCathode = String(params?.common ?? part.params?.find((param) => param.key === 'common')?.defaultValue ?? 'cathode') === 'cathode';
  const isLit = (segment: string) => {
    if (!segments) return false;
    if (commonCathode) return lit.has(segment);
    return !lit.has(segment);
  };
  const segmentRects: Array<{ id: string; x: number; y: number; w: number; h: number }> = [
    { id: 'a', x: 30, y: 18, w: 36, h: 8 },
    { id: 'b', x: 68, y: 26, w: 8, h: 38 },
    { id: 'c', x: 68, y: 70, w: 8, h: 38 },
    { id: 'd', x: 30, y: 110, w: 36, h: 8 },
    { id: 'e', x: 20, y: 70, w: 8, h: 38 },
    { id: 'f', x: 20, y: 26, w: 8, h: 38 },
    { id: 'g', x: 30, y: 64, w: 36, h: 8 },
    { id: 'dp', x: 72, y: 120, w: 8, h: 8 },
  ];
  return (
    <>
      <rect x={16} y={8} width={64} height={124} rx={8} fill="var(--panel-3)" stroke="var(--line-strong)" strokeWidth={1.4} />
      {segmentRects.map((segment) => (
        <rect
          key={segment.id}
          x={segment.x}
          y={segment.y}
          width={segment.w}
          height={segment.h}
          rx={3}
          fill={isLit(segment.id) ? color : 'var(--line-strong)'}
          opacity={isLit(segment.id) ? 0.95 : 0.35}
        />
      ))}
    </>
  );
}

function ClockShape({ part }: { part: PartDef }) {
  const { width, height } = part;
  return (
    <>
      <rect x={10} y={12} width={width - 20} height={height - 24} rx={8} fill="var(--panel-3)" stroke="var(--line-strong)" strokeWidth={1.3} />
      <path d={`M 22 ${height / 2 + 6} h 8 v -12 h 12 v 12 h 12 v -12 h 12 v 12 h 10`} fill="none" stroke="var(--accent)" strokeWidth={1.6} />
      <text x={width - 12} y={height - 6} fontSize={6.5} textAnchor="end" fill="var(--faint)" fontFamily="var(--font-mono)">
        CLOCK
      </text>
    </>
  );
}

function BoardShape({ part }: { part: PartDef }) {
  const { width, height } = part;
  return (
    <>
      <rect x={10} y={10} width={width - 20} height={height - 20} rx={12} fill="var(--panel-2)" stroke="var(--line-strong)" strokeWidth={1.3} />
      <rect x={width / 2 - 32} y={height / 2 - 28} width={64} height={56} rx={4} fill="var(--panel-3)" stroke="var(--line-strong)" strokeWidth={1.2} />
      <text x={width / 2} y={height / 2 - 4} textAnchor="middle" fontSize={7} fill="var(--muted)" fontFamily="var(--font-mono)">
        {part.model}
      </text>
      <text x={width / 2} y={height / 2 + 12} textAnchor="middle" fontSize={6.5} fill="var(--faint)">
        最小系统板
      </text>
      <circle cx={24} cy={24} r={3} fill="var(--line-strong)" />
      <circle cx={width - 24} cy={height - 24} r={3} fill="var(--line-strong)" />
    </>
  );
}

function LampShape({ part, on }: { part: PartDef; on?: boolean }) {
  const { width, height } = part;
  const cx = width / 2;
  const mid = height / 2;
  return (
    <>
      <circle cx={cx} cy={mid} r={16} fill={on ? 'var(--amber)' : 'var(--panel-3)'} opacity={on ? 0.25 : 1} stroke="var(--ink-2)" strokeWidth={1.5} />
      <path d={`M ${cx - 8} ${mid - 8} L ${cx} ${mid - 2} L ${cx + 8} ${mid - 8} M ${cx - 6} ${mid + 2} h 12 M ${cx - 4} ${mid + 7} h 8`} stroke={on ? 'var(--amber)' : 'var(--ink-2)'} strokeWidth={1.4} fill="none" />
      <line x1={cx} y1={0} x2={cx} y2={mid - 16} stroke="var(--pin)" strokeWidth={1.6} />
      <line x1={cx} y1={mid + 16} x2={cx} y2={height} stroke="var(--pin)" strokeWidth={1.6} />
    </>
  );
}

function BuzzerShape({ part }: { part: PartDef }) {
  const { width, height } = part;
  const cx = width / 2;
  const mid = height / 2;
  return (
    <>
      <path d={`M ${cx - 14} ${mid - 10} L ${cx + 6} ${mid - 16} L ${cx + 6} ${mid + 16} L ${cx - 14} ${mid + 10} Z`} fill="var(--panel-3)" stroke="var(--ink-2)" strokeWidth={1.4} />
      <path d={`M ${cx + 12} ${mid - 8} q 6 8 0 16 M ${cx + 18} ${mid - 14} q 10 14 0 28`} fill="none" stroke="var(--faint)" strokeWidth={1.2} />
    </>
  );
}

function GenericShape({ part }: { part: PartDef }) {
  const { width, height } = part;
  return <rect x={8} y={8} width={width - 16} height={height - 16} rx={6} fill="var(--panel-3)" stroke="var(--line-strong)" strokeWidth={1.2} />;
}

export function PartSymbol({ part, params, compact, ledOn, segments, switchClosed }: PartSymbolProps) {
  if (part.symbol === 'chip' || part.symbol === 'board') {
    return (
      <g>
        {part.symbol === 'board' ? <BoardShape part={part} /> : null}
        <rect
          x={BODY_INSET}
          y={part.symbol === 'chip' ? 8 : 0}
          width={part.width - BODY_INSET * 2}
          height={part.symbol === 'chip' ? part.height - 16 : 0}
          rx={6}
          fill={part.symbol === 'chip' ? 'var(--panel-3)' : 'transparent'}
          stroke={part.symbol === 'chip' ? 'var(--line-strong)' : 'none'}
          strokeWidth={1.25}
          display={part.symbol === 'chip' ? 'inline' : 'none'}
        />
        {part.symbol === 'chip' && (
          <>
            <path
              d={`M ${part.width / 2 - 7} 8 a 7 7 0 0 0 14 0`}
              fill="var(--canvas)"
              stroke="var(--line-strong)"
              strokeWidth={1.1}
            />
            <circle cx={BODY_INSET + 9} cy={18} r={2} fill="var(--line-strong)" />
          </>
        )}
        {part.pins.map((pin) => {
          const [x1, y1, x2, y2] = pinStroke(pin, part.width, part.height, BODY_INSET);
          return (
            <g key={pin.id}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--pin)" strokeWidth={1.5} />
              {!compact && (
                <>
                  <text
                    x={pin.side === 'left' ? BODY_INSET + 4 : pin.side === 'right' ? part.width - BODY_INSET - 4 : pin.x}
                    y={pin.side === 'top' ? BODY_INSET + 9 : pin.side === 'bottom' ? part.height - BODY_INSET - 3 : pin.y + 2.5}
                    fontSize={part.symbol === 'board' ? 6.2 : 7}
                    fill="var(--muted)"
                    textAnchor={pin.side === 'left' ? 'start' : pin.side === 'right' ? 'end' : 'middle'}
                    fontFamily="var(--font-mono)"
                  >
                    {pin.name}
                  </text>
                  {pin.number && (
                    <text
                      x={pin.side === 'left' ? BODY_INSET - 4 : pin.side === 'right' ? part.width - BODY_INSET + 4 : pin.x + 5}
                      y={pin.side === 'top' ? BODY_INSET + 4 : pin.side === 'bottom' ? part.height - BODY_INSET + 8 : pin.y - 2}
                      fontSize={6}
                      fill="var(--faint)"
                      textAnchor={pin.side === 'left' ? 'end' : pin.side === 'right' ? 'start' : 'middle'}
                      fontFamily="var(--font-mono)"
                    >
                      {pin.number}
                    </text>
                  )}
                </>
              )}
            </g>
          );
        })}
      </g>
    );
  }

  return (
    <g>
      {part.symbol === 'resistor' && <Resistor part={part} />}
      {part.symbol === 'potentiometer' && (
        <>
          <Resistor part={part} />
          <path d={`M ${part.width} 40 l -14 -8 v 16 z`} fill="var(--ink-2)" />
        </>
      )}
      {part.symbol === 'capacitor' && <Capacitor part={part} />}
      {part.symbol === 'inductor' && <Inductor part={part} />}
      {part.symbol === 'diode' && <DiodeShape part={part} />}
      {part.symbol === 'zener' && <DiodeShape part={part} zener />}
      {part.symbol === 'led' && <LedShape part={part} on={ledOn} params={params} />}
      {part.symbol === 'source-dc' && <SourceShape part={part} />}
      {part.symbol === 'source-ac' && <SourceShape part={part} ac />}
      {part.symbol === 'battery' && <SourceShape part={part} battery />}
      {part.symbol === 'ground' && <GroundShape part={part} />}
      {part.symbol === 'rail' && <RailShape part={part} />}
      {part.symbol === 'switch' && <SwitchShape part={part} closed={switchClosed} />}
      {part.symbol === 'button' && <SwitchShape part={part} closed={switchClosed} button />}
      {part.symbol === 'npn' && <TransistorShape part={part} kind="npn" />}
      {part.symbol === 'pnp' && <TransistorShape part={part} kind="pnp" />}
      {part.symbol === 'nmos' && <TransistorShape part={part} kind="nmos" />}
      {part.symbol === 'pmos' && <TransistorShape part={part} kind="pmos" />}
      {part.symbol === 'igbt' && <TransistorShape part={part} kind="igbt" />}
      {part.symbol === 'scr' && <TransistorShape part={part} kind="scr" />}
      {part.symbol === 'opamp' && <OpampShape part={part} />}
      {part.symbol === 'seven-seg' && <SevenSegShape part={part} segments={segments} params={params} />}
      {part.symbol === 'clock' && <ClockShape part={part} />}
      {part.symbol === 'lamp' && <LampShape part={part} on={ledOn} />}
      {part.symbol === 'buzzer' && <BuzzerShape part={part} />}
      {part.symbol === 'generic' && <GenericShape part={part} />}
      {part.symbol !== 'capacitor' && part.symbol !== 'resistor' && part.symbol !== 'potentiometer' && part.symbol !== 'inductor' && (
        <PassivePins part={part} compact={compact} />
      )}
    </g>
  );
}
