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

export interface CircuitDoc {
  id: string;
  name: string;
  domain: Domain;
  description: string;
  components: Component[];
  wires: Wire[];
  viewport: { x: number; y: number; zoom: number };
  createdAt: number;
  updatedAt: number;
  firmware?: {
    name: string;
    hex: string;
    size: number;
    crc32?: number;
  } | null;
}

export interface Net {
  id: string;
  name: string;
  pins: PinRef[];
  isPower: boolean;
  label?: string;
}

export interface NetlistResult {
  nets: Net[];
  pinNet: Map<string, string>;
  unconnected: PinRef[];
}

export type IssueLevel = 'error' | 'warn' | 'info' | 'pass';

export interface CheckIssue {
  id: string;
  level: IssueLevel;
  title: string;
  detail?: string;
  target?: string;
}

export type LogicLevel = 0 | 1 | 'z' | 'x';

export interface SimSnapshot {
  running: boolean;
  time: number;
  events: number;
  netLevels: Record<string, LogicLevel>;
  pinLevels: Record<string, LogicLevel>;
  notes: string[];
}

export interface ProjectMeta {
  id: string;
  name: string;
  domain: Domain;
  updatedAt: number;
  templateId?: string;
}
