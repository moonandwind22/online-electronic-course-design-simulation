import type { ComponentInstance, Point, Rotation } from '../model/types';
import type { PartDef, PinDef } from '../parts/types';

export const GRID = 10;

export function snap(v: number, grid = GRID): number {
  return Math.round(v / grid) * grid;
}

export function rotatePoint(p: Point, w: number, h: number, rot: Rotation): Point {
  const cx = w / 2;
  const cy = h / 2;
  const dx = p.x - cx;
  const dy = p.y - cy;
  switch (rot) {
    case 90:
      return { x: cx - dy, y: cy + dx };
    case 180:
      return { x: cx - dx, y: cy - dy };
    case 270:
      return { x: cx + dy, y: cy - dx };
    default:
      return p;
  }
}

/** 引脚在世界坐标中的位置（含元件旋转/镜像） */
export function pinPosition(comp: ComponentInstance, part: PartDef, pin: PinDef): Point {
  let px = pin.x;
  let py = pin.y;
  if (comp.mirror) px = part.width - px;
  const r = rotatePoint({ x: px, y: py }, part.width, part.height, comp.rot);
  return { x: comp.x + r.x, y: comp.y + r.y };
}

export function pinWorldPosition(comp: ComponentInstance, part: PartDef, pinId: string): Point | null {
  const pin = part.pins.find((p) => p.id === pinId);
  if (!pin) return null;
  return pinPosition(comp, part, pin);
}

export function compBounds(comp: ComponentInstance, part: PartDef) {
  const pts: Point[] = [
    { x: 0, y: 0 },
    { x: part.width, y: 0 },
    { x: 0, y: part.height },
    { x: part.width, y: part.height },
  ];
  const transformed = pts.map((p) => {
    const px = comp.mirror ? part.width - p.x : p.x;
    const r = rotatePoint({ x: px, y: p.y }, part.width, part.height, comp.rot);
    return { x: comp.x + r.x, y: comp.y + r.y };
  });
  const xs = transformed.map((p) => p.x);
  const ys = transformed.map((p) => p.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  };
}

export function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function isOrthogonal(points: Point[]): boolean {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (Math.abs(a.x - b.x) > 0.5 && Math.abs(a.y - b.y) > 0.5) return false;
  }
  return true;
}

/** 生成正交折线：优先横-竖-横，必要时竖-横-竖 */
export function routeOrthogonal(a: Point, b: Point, waypoints: Point[] = []): Point[] {
  if (waypoints.length > 0) {
    return [a, ...waypoints, b];
  }
  if (Math.abs(a.x - b.x) < 0.5 || Math.abs(a.y - b.y) < 0.5) return [a, b];
  const midX = (a.x + b.x) / 2;
  return [
    a,
    { x: midX, y: a.y },
    { x: midX, y: b.y },
    b,
  ];
}

export function pointOnSegment(p: Point, a: Point, b: Point, tolerance = 2.5): boolean {
  const minX = Math.min(a.x, b.x) - tolerance;
  const maxX = Math.max(a.x, b.x) + tolerance;
  const minY = Math.min(a.y, b.y) - tolerance;
  const maxY = Math.max(a.y, b.y) + tolerance;
  if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) return false;
  if (Math.abs(a.x - b.x) < 0.5) return Math.abs(p.x - a.x) <= tolerance;
  if (Math.abs(a.y - b.y) < 0.5) return Math.abs(p.y - a.y) <= tolerance;
  const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  return Math.abs(cross) <= tolerance * dist(a, b) * 0.02;
}

export function polylineLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) len += dist(points[i - 1], points[i]);
  return len;
}
