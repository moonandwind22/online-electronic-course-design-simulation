import type { Component, Point, Rotation } from '../model/types';
import type { PartDef, PinDir } from '../parts/types';

export interface PinWorld {
  x: number;
  y: number;
  dir: PinDir;
}

const OPPOSITE: Record<PinDir, PinDir> = { left: 'right', right: 'left', up: 'down', down: 'up' };

function rotateDirection(dir: PinDir, rot: Rotation): PinDir {
  const order: PinDir[] = ['right', 'down', 'left', 'up'];
  const steps = rot / 90;
  return order[(order.indexOf(dir) + steps) % 4];
}

function rotatePoint(p: Point, center: Point, rot: Rotation): Point {
  const rad = (rot * Math.PI) / 180;
  const cos = Math.round(Math.cos(rad));
  const sin = Math.round(Math.sin(rad));
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

export function pinWorld(comp: Component, part: PartDef, pinId: string): PinWorld | null {
  const pin = part.pins.find((p) => p.id === pinId);
  if (!pin) return null;
  const center = { x: part.width / 2, y: part.height / 2 };
  let x = pin.x;
  let y = pin.y;
  let dir = pin.dir;
  if (comp.mirror) {
    x = part.width - x;
    dir = OPPOSITE[dir];
  }
  const point = rotatePoint({ x, y }, center, comp.rot);
  const dirVec = rotateDirection(dir, comp.rot);
  return { x: comp.x + point.x, y: comp.y + point.y, dir: dirVec };
}

export function pinWorldAll(comp: Component, part: PartDef): Map<string, PinWorld> {
  const map = new Map<string, PinWorld>();
  for (const p of part.pins) {
    const w = pinWorld(comp, part, p.id);
    if (w) map.set(p.id, w);
  }
  return map;
}

export function boundsOf(comp: Component, part: PartDef): { x: number; y: number; width: number; height: number } {
  const rotated = comp.rot === 90 || comp.rot === 270;
  const w = rotated ? part.height : part.width;
  const h = rotated ? part.width : part.height;
  const cx = comp.x + part.width / 2;
  const cy = comp.y + part.height / 2;
  return { x: cx - w / 2, y: cy - h / 2, width: w, height: h };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function snap(value: number, grid = 10): number {
  return Math.round(value / grid) * grid;
}

/** 正交三点/四点折线：优先在水平中点拐弯。 */
export function orthoRoute(from: Point, to: Point, lane?: number): Point[] {
  const alignedX = Math.abs(from.x - to.x) < 0.5;
  const alignedY = Math.abs(from.y - to.y) < 0.5;
  if (alignedX || alignedY) return [from, to];
  const midX = lane ?? (from.x + to.x) / 2;
  return [from, { x: midX, y: from.y }, { x: midX, y: to.y }, to];
}

export function pointsToPath(points: Point[]): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${round(p.x)} ${round(p.y)}`).join(' ');
}

const round = (v: number) => Math.round(v * 100) / 100;

export function pointInRect(p: Point, rect: { x: number; y: number; width: number; height: number }): boolean {
  return p.x >= rect.x && p.x <= rect.x + rect.width && p.y >= rect.y && p.y <= rect.y + rect.height;
}

export function rectsIntersect(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export interface NearestPoint {
  point: Point;
  segmentIndex: number;
  distance: number;
  t: number;
}

export function nearestPointOnSegment(a: Point, b: Point, p: Point): NearestPoint {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  const point = { x: a.x + dx * t, y: a.y + dy * t };
  return { point, segmentIndex: 0, distance: distance(point, p), t };
}

/** 找到折线上距离目标点最近的位置（用于导线—导线 T 型接点）。 */
export function nearestPointOnPolyline(points: Point[], p: Point): NearestPoint | null {
  if (points.length === 0) return null;
  if (points.length === 1) return { point: { ...points[0] }, segmentIndex: 0, distance: distance(points[0], p), t: 0 };
  let best: NearestPoint | null = null;
  for (let i = 0; i < points.length - 1; i += 1) {
    const hit = nearestPointOnSegment(points[i], points[i + 1], p);
    if (!best || hit.distance < best.distance) best = { ...hit, segmentIndex: i };
  }
  return best;
}

export function segmentMidpoint(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];
  const i = Math.floor((points.length - 1) / 2);
  const a = points[i];
  const b = points[i + 1] ?? a;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function fitView(
  parts: Array<{ x: number; y: number; width: number; height: number }>,
  viewportSize: { width: number; height: number },
): { x: number; y: number; zoom: number } {
  if (parts.length === 0) return { x: 40, y: 40, zoom: 1 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of parts) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  const pad = 72;
  const zoom = Math.min(
    (viewportSize.width - pad * 2) / Math.max(1, maxX - minX),
    (viewportSize.height - pad * 2) / Math.max(1, maxY - minY),
    1.6,
  );
  return {
    x: viewportSize.width / 2 - ((minX + maxX) / 2) * zoom,
    y: viewportSize.height / 2 - ((minY + maxY) / 2) * zoom,
    zoom: Math.max(0.3, zoom),
  };
}
