/** 仿真域：本期交付数字电路与 51 单片机，其余域后续接入。 */
export type Domain = 'digital' | 'mcs51';

export type Rot = 0 | 90 | 180 | 270;

export interface Point {
  x: number;
  y: number;
}

export interface PinRef {
  comp: string;
  pin: string;
}

export interface FirmwareSlot {
  name: string;
  hexText: string;
  size: number;
  crc32: string;
  entry: number;
  loadedAt: number;
  valid: boolean;
  error?: string;
}

export interface Component {
  id: string;
  type: string;
  x: number;
  y: number;
  rot: Rot;
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
  firmware?: FirmwareSlot;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectMeta {
  id: string;
  name: string;
  domain: Domain;
  updatedAt: number;
  createdAt: number;
  componentCount: number;
  wireCount: number;
}

export const DOMAIN_LABEL: Record<Domain, string> = {
  digital: '数字电路',
  mcs51: '51 单片机',
};
