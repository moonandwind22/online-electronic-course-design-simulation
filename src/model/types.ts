/** 五个仿真域 */
export type Domain = 'digital' | 'analog' | 'power' | 'mcs51' | 'stm32';

export const DOMAIN_META: Record<
  Domain,
  { name: string; short: string; en: string; color: string; desc: string; supply: number }
> = {
  digital: {
    name: '数字电路',
    short: '数电',
    en: 'Digital',
    color: 'var(--cyan)',
    desc: '74LS / CD4000 逻辑器件、数码管与逻辑分析仪',
    supply: 5,
  },
  analog: {
    name: '模拟电路',
    short: '模电',
    en: 'Analog',
    color: 'var(--green)',
    desc: '阻容、三极管、运放与双通道示波器',
    supply: 12,
  },
  power: {
    name: '电力电子',
    short: '电力电子',
    en: 'Power',
    color: 'var(--amber)',
    desc: 'MOSFET / IGBT / 晶闸管与 Buck、Boost 拓扑',
    supply: 12,
  },
  mcs51: {
    name: '51 单片机',
    short: '51',
    en: 'MCS-51',
    color: 'var(--violet)',
    desc: 'STC89C52RC 最小系统、HEX 烧录与串口',
    supply: 5,
  },
  stm32: {
    name: 'STM32',
    short: 'STM32',
    en: 'STM32',
    color: 'var(--blue)',
    desc: 'STM32F103C8T6 Blue Pill、GPIO 与 USART1',
    supply: 3.3,
  },
};

export type Rotation = 0 | 90 | 180 | 270;

export interface Point {
  x: number;
  y: number;
}

export interface PinRef {
  comp: string;
  pin: string;
}

export interface ComponentInstance {
  id: string;
  /** PartDef.type */
  type: string;
  x: number;
  y: number;
  rot: Rotation;
  mirror: boolean;
  label: string;
  params: Record<string, number | string>;
  /** 交互状态：开关闭合、按键按下、电位器位置等 */
  state?: Record<string, number | string | boolean>;
}

export interface Wire {
  id: string;
  from: PinRef;
  to: PinRef;
  /** 额外折点（世界坐标，不含两端），用于模板布线与避让 */
  waypoints?: Point[];
  netLabel?: string;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface CircuitDoc {
  version: 1;
  id: string;
  name: string;
  domain: Domain;
  components: ComponentInstance[];
  wires: Wire[];
  viewport: Viewport;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectIndexEntry {
  id: string;
  name: string;
  domain: Domain;
  updatedAt: number;
}

/** 逻辑电平：0 / 1 / 高阻 / 冲突 */
export type Logic = 0 | 1 | 'z' | 'x';

export type PinDir = 'in' | 'out' | 'io' | 'power' | 'passive';

export interface Net {
  id: string;
  name: string;
  pins: PinRef[];
  /** 网络标签来源：explicit / power / auto */
  named: 'explicit' | 'power' | 'auto';
}

export interface PinConnection {
  netId: string;
  netName: string;
}

export interface NetlistResult {
  nets: Net[];
  pinNet: Map<string, PinConnection>;
  /** 悬空引脚 */
  floating: PinRef[];
  byName: Map<string, Net>;
}

export type Severity = 'error' | 'warn' | 'info';

export interface CheckIssue {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  fix?: string;
  pins?: PinRef[];
}

export interface SimSnapshot {
  running: boolean;
  time: number;
  events: number;
  netValues: Record<string, Logic>;
  pinValues: Record<string, Logic>;
  visuals: Record<string, Record<string, unknown>>;
  issues: CheckIssue[];
  clockHz: number;
  fps: number;
  engineNote?: string;
}

export interface ScopeSample {
  t: number;
  v: number[];
}

export interface ScopeChannel {
  netId: string;
  label: string;
  color: string;
  visible: boolean;
}

export interface SerialLine {
  t: number;
  dir: 'tx' | 'rx' | 'sys';
  text: string;
}

export interface McuState {
  model: 'MCS51' | 'STM32F103C8T6';
  running: boolean;
  firmware: string | null;
  firmwareName: string | null;
  firmwareSize: number;
  firmwareCrc: number;
  pc: number;
  cycles: number;
  registers: Record<string, string | number>;
  sfrs?: Record<string, string>;
  ports?: Record<string, { latch: number; level: number }>;
  flashed: boolean;
  flashProgress: number;
}
