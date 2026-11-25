import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Component, LogicLevel } from '../../model/types';
import type { PartDef } from '../../parts/types';

interface PartViewProps {
  comp: Component;
  part: PartDef;
  selected: boolean;
  pinLevels: Record<string, LogicLevel>;
  onPartPointerDown: (event: ReactPointerEvent, comp: Component) => void;
  onPinPointerDown: (event: ReactPointerEvent, comp: Component, pinId: string) => void;
}

const LEVEL_CLASS: Record<string, string> = {
  '0': 'low',
  '1': 'high',
  z: 'float',
  x: 'conflict',
};

const isLabeled = (part: PartDef) => part.symbol === 'chip' || part.symbol === 'board' || part.symbol === 'sevenseg';

function stubLength(part: PartDef, dir: string): number {
  if (part.symbol === 'chip') return dir === 'left' || dir === 'right' ? 25 : 12;
  if (part.symbol === 'board') return dir === 'left' || dir === 'right' ? 14 : 12;
  if (part.symbol === 'sevenseg') return dir === 'left' ? 24 : 12;
  return 12;
}

export function PartView({ comp, part, selected, pinLevels, onPartPointerDown, onPinPointerDown }: PartViewProps) {
  const cx = part.width / 2;
  const cy = part.height / 2;
  let transform = `translate(${comp.x} ${comp.y})`;
  if (comp.rot) transform += ` rotate(${comp.rot} ${cx} ${cy})`;
  if (comp.mirror) transform += ` translate(${part.width} 0) scale(-1 1)`;

  const body = renderBody(comp, part, pinLevels);

  return (
    <g
      transform={transform}
      className={`schematic-part schematic-part--${part.symbol}`}
      data-component={comp.id}
      onPointerDown={(e) => onPartPointerDown(e, comp)}
    >
      {selected && (
        <rect
          x={-6}
          y={-16}
          width={part.width + 12}
          height={part.height + 22}
          rx={10}
          className="part-selected"
        />
      )}
      {body}
      <text className="part-label" x={0} y={-9}>
        {comp.label}
      </text>
      {part.pins.map((pin) => {
        const level = pinLevels[`${comp.id}:${pin.id}`] ?? 'z';
        const levelClass = LEVEL_CLASS[String(level)] ?? 'float';
        const len = stubLength(part, pin.dir);
        let x2 = pin.x;
        let y2 = pin.y;
        if (pin.dir === 'left') x2 = pin.x + len;
        if (pin.dir === 'right') x2 = pin.x - len;
        if (pin.dir === 'up') y2 = pin.y + len;
        if (pin.dir === 'down') y2 = pin.y - len;
        const label = isLabeled(part);
        return (
          <g key={pin.id} className="pin">
            <line x1={pin.x} y1={pin.y} x2={x2} y2={y2} className={`pin-line pin-line--${levelClass}`} />
            <circle
              cx={pin.x}
              cy={pin.y}
              r={3.6}
              className={`pin-dot pin-dot--${levelClass}`}
              onPointerDown={(e) => {
                e.stopPropagation();
                onPinPointerDown(e, comp, pin.id);
              }}
            >
              <title>{`${comp.label}.${pin.number ?? pin.id} · ${pin.name} → ${String(level).toUpperCase()}`}</title>
            </circle>
            {label && pin.number && (
              <text
                className="pin-number"
                x={pin.dir === 'left' ? pin.x + 9 : pin.x - 9}
                y={pin.y - 5}
                textAnchor={pin.dir === 'left' ? 'start' : 'end'}
              >
                {pin.number}
              </text>
            )}
            {label && part.symbol !== 'sevenseg' && (
              <text
                className="pin-name"
                x={pin.dir === 'left' ? pin.x + 20 : pin.x - 20}
                y={pin.y + 2.6}
                textAnchor={pin.dir === 'left' ? 'start' : 'end'}
              >
                {pin.name}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

function renderBody(comp: Component, part: PartDef, pinLevels: Record<string, LogicLevel>) {
  const lv = (pin: string) => pinLevels[`${comp.id}:${pin}`];
  const litColor = 'var(--golden-chart-5)';

  switch (part.symbol) {
    case 'chip':
      return (
        <>
          <rect x={25} y={10} width={part.width - 50} height={part.height - 20} rx={9} className="chip-body" />
          <path d={`M${part.width / 2 - 7} 10 a7 7 0 0 0 14 0`} className="chip-notch" />
          <text className="chip-type" x={part.width / 2} y={24} textAnchor="middle">
            {part.name}
          </text>
        </>
      );
    case 'board':
      return (
        <>
          <rect x={14} y={10} width={part.width - 28} height={part.height - 20} rx={14} className="board-body" />
          <rect x={14} y={10} width={part.width - 28} height={36} rx={14} className="board-head" />
          <text className="board-title" x={part.width / 2} y={34} textAnchor="middle">
            {part.name}
          </text>
          <text className="board-sub" x={part.width / 2} y={62} textAnchor="middle">
            {part.subtitle}
          </text>
          {comp.type === 'MCU51' && (
            <g className="board-leds">
              {Array.from({ length: 8 }).map((_, i) => (
                <circle key={i} cx={part.width / 2 - 42 + i * 12} cy={part.height - 24} r={3.2} className="board-led" />
              ))}
            </g>
          )}
          {comp.type === 'STM32' && (
            <g className="board-leds">
              <circle cx={part.width - 34} cy={54} r={3.6} className={lv('PC13') === 1 ? 'board-led is-on' : 'board-led'} />
              <text className="board-led-label" x={part.width - 46} y={57} textAnchor="end">
                PC13
              </text>
            </g>
          )}
        </>
      );
    case 'sevenseg': {
      const cathode = comp.params.common === 'cathode';
      const on = (seg: string) => {
        const level = lv(seg);
        return cathode ? level === 1 : level === 0;
      };
      const segs: Record<string, string> = {
        a: 'M42 30 L46 26 L74 26 L78 30 L74 34 L46 34 Z',
        b: 'M86 34 L90 38 L90 90 L86 94 L82 90 L82 38 Z',
        c: 'M86 102 L90 106 L90 158 L86 162 L82 158 L82 106 Z',
        d: 'M42 166 L46 162 L74 162 L78 166 L74 170 L46 170 Z',
        e: 'M34 102 L38 106 L38 158 L34 162 L30 158 L30 106 Z',
        f: 'M34 34 L38 38 L38 90 L34 94 L30 90 L30 38 Z',
        g: 'M42 98 L46 94 L74 94 L78 98 L74 102 L46 102 Z',
        dp: '',
      };
      return (
        <>
          <rect x={22} y={12} width={76} height={part.height - 24} rx={10} className="sevenseg-body" />
          {Object.entries(segs).map(([key, path]) =>
            key === 'dp' ? (
              <circle key={key} cx={88} cy={176} r={3.6} fill={on('dp') ? litColor : 'var(--golden-border)'} />
            ) : (
              <path key={key} d={path} fill={on(key) ? litColor : 'var(--golden-border)'} className="sevenseg-seg" />
            ),
          )}
          <text className="sevenseg-type" x={60} y={part.height - 8} textAnchor="middle">
            {comp.params.common === 'cathode' ? 'CC' : 'CA'}
          </text>
        </>
      );
    }
    case 'nand':
      return (
        <>
          <path
            d="M10 8 L38 8 Q64 8 64 28 Q64 48 38 48 L10 48 Z"
            className="gate-body"
          />
          <circle cx={68} cy={28} r={4.5} className="gate-bubble" />
          <text className="gate-label" x={30} y={31}>
            &amp;
          </text>
        </>
      );
    case 'resistor':
      return (
        <>
          <path
            d="M0 14 H18 L22 6 L30 22 L38 6 L46 22 L54 6 L62 22 L66 14 H84"
            className="passive-lead"
          />
          <text className="part-value" x={42} y={36} textAnchor="middle">
            {formatValue(comp.params.resistance, 'Ω')}
          </text>
        </>
      );
    case 'capacitor':
      return (
        <>
          <path d="M0 20 H32 M52 20 H84" className="passive-lead" />
          <path d="M32 6 V34 M52 6 V34" className="passive-body" />
          <text className="part-value" x={42} y={46} textAnchor="middle">
            {formatValue(comp.params.capacitance, 'µF')}
          </text>
        </>
      );
    case 'inductor':
      return (
        <>
          <path d="M0 14 H18" className="passive-lead" />
          <path
            d="M18 14 A6 8 0 0 1 30 14 A6 8 0 0 1 42 14 A6 8 0 0 1 54 14 A6 8 0 0 1 66 14"
            className="passive-body"
          />
          <path d="M66 14 H84" className="passive-lead" />
          <text className="part-value" x={42} y={36} textAnchor="middle">
            {formatValue(comp.params.inductance, 'µH')}
          </text>
        </>
      );
    case 'diode':
    case 'led': {
      const lit =
        comp.type === 'LED' &&
        lv('A') === 1 &&
        (lv('K') === 0 || lv('K') === 'z' || lv('K') === undefined);
      const color =
        comp.params.color === 'green'
          ? '#3f8f5f'
          : comp.params.color === 'amber'
            ? '#d99a2b'
            : comp.params.color === 'blue'
              ? '#4a6fd1'
              : '#d9503f';
      return (
        <>
          <path d={comp.type === 'LED' ? 'M0 20 H24 M58 20 H80' : 'M0 20 H22 M62 20 H84'} className="passive-lead" />
          <path d="M24 6 L56 20 L24 34 Z" fill={lit ? color : 'none'} className="passive-body" />
          <path d="M56 6 V34" className="passive-body" />
          {comp.type === 'LED' && (
            <g className="led-arrows" fill={lit ? color : 'var(--golden-muted-foreground)'}>
              <path d="M60 8 L68 2 M64 10 L72 4" stroke="currentColor" strokeWidth={1.4} fill="none" />
              <path d="M68 2 l-3 1 l1 3 z" />
              <path d="M72 4 l-3 1 l1 3 z" />
            </g>
          )}
        </>
      );
    }
    case 'source':
      return (
        <>
          <path d="M0 26 H22 M62 26 H84" className="passive-lead" />
          <circle cx={42} cy={26} r={20} className="source-body" />
          <text className="source-sign" x={52} y={20} textAnchor="middle">
            +
          </text>
          <text className="source-sign" x={32} y={34} textAnchor="middle">
            −
          </text>
          <text className="part-value" x={42} y={56} textAnchor="middle">
            {formatValue(comp.params.voltage, 'V')}
          </text>
        </>
      );
    case 'switch':
      return (
        <>
          <path d="M0 20 H22 M58 20 H84" className="passive-lead" />
          <circle cx={22} cy={20} r={3} className="passive-joint" />
          <circle cx={58} cy={20} r={3} className="passive-joint" />
          <path d="M22 20 L52 6" className="passive-body" />
          <text className="part-value" x={42} y={38} textAnchor="middle">
            {comp.state?.closed ? '闭合' : '断开'}
          </text>
        </>
      );
    case 'clock':
      return (
        <>
          <rect x={12} y={10} width={60} height={44} rx={8} className="clock-body" />
          <path d="M22 38 H30 V20 H42 V38 H54 V20 H62" className="clock-wave" />
          <text className="part-value" x={50} y={62} textAnchor="middle">
            {formatValue(comp.params.freq, 'Hz')}
          </text>
        </>
      );
    case 'power-vcc':
      return (
        <>
          <path d="M22 40 V18" className="power-lead" />
          <path d="M10 18 H34" className="power-bar" />
          <path d="M16 10 H28" className="power-bar" />
          <text className="power-text" x={22} y={4} textAnchor="middle">
            VCC
          </text>
        </>
      );
    case 'power-gnd':
      return (
        <>
          <path d="M22 0 V22" className="power-lead" />
          <path d="M8 22 H36" className="power-bar" />
          <path d="M13 29 H31" className="power-bar" />
          <path d="M18 36 H26" className="power-bar" />
        </>
      );
    default:
      return <rect x={0} y={0} width={part.width} height={part.height} rx={6} className="chip-body" />;
  }
}

function formatValue(value: number | string | undefined, unit: string): string {
  if (value === undefined || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  if (Math.abs(num) >= 1000) return `${num}`;
  return `${num}${unit}`;
}
