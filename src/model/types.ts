export type Domain = 'digital' | 'analog' | 'power' | 'mcs51' | 'stm32';

export type Rotation = 0 | 90 | 180 | 270;

export interface Point {
  x: number;
  y: number;
}

export interface PinRef {
  componentId: string;
  pinId: string;
}

export interface Component {
  id: string;
  type: string;
  x: number;
  y: number;
  rot: Rotation;
  mirror: boolean;
  label: string;
  params: Record<string, number | string>;
  state?: Record<string, unknown>;
}

export interface Wire {
  id: string;
  points: Point[];
  from?: PinRef;
  to?: PinRef;
  netLabel?: string;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface CircuitDoc {
  id: string;
  name: string;
  domain: Domain;
  components: Component[];
  wires: Wire[];
  viewport: Viewport;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectMeta {
  id: string;
  name: string;
  domain: Domain;
  updatedAt: number;
  createdAt: number;
}

export interface DomainMeta {
  label: string;
  short: string;
  description: string;
  accent: string;
}

export const DOMAIN_META: Record<Domain, DomainMeta> = {
  digital: {
    label: '数字电路',
    short: '数电',
    description: '74LS 逻辑、计数器、译码器与逻辑分析仪',
    accent: 'var(--accent)',
  },
  analog: {
    label: '模拟电路',
    short: '模电',
    description: 'RC 网络、共射放大、运放与双通道示波器',
    accent: 'var(--violet)',
  },
  power: {
    label: '电力电子',
    short: '电力电子',
    description: '整流、Buck/Boost 与功率器件波形',
    accent: 'var(--amber)',
  },
  mcs51: {
    label: '51 单片机',
    short: '51',
    description: 'STC89C52RC 最小系统与 Intel HEX 烧录',
    accent: 'var(--green)',
  },
  stm32: {
    label: 'STM32',
    short: 'STM32',
    description: 'STM32F103C8T6 Blue Pill 与固件仿真',
    accent: 'var(--violet)',
  },
};

export const DOMAIN_ORDER: Domain[] = ['digital', 'analog', 'power', 'mcs51', 'stm32'];

export function isDomain(value: string): value is Domain {
  return (DOMAIN_ORDER as string[]).includes(value);
}
