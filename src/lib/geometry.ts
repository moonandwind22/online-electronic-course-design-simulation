import type { Point, Rotation } from '../model/types';

export const GRID = 20;

export function snap(value: number, grid = GRID): number {
  return Math.round(value / grid) * grid;
}

export function snapPoint(point: Point, grid = GRID): Point {
  return { x: snap(point.x, grid), y: snap(point.y, grid) };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function rotatePoint(point: Point, center: Point, rot: Rotation): Point {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  switch (rot) {
    case 90:
      return { x: center.x - dy, y: center.y + dx };
    case 180:
      return { x: center.x - dx, y: center.y - dy };
    case 270:
      return { x: center.x + dy, y: center.y - dx };
    default:
      return { x: point.x, y: point.y };
  }
}

export function pointOnSegment(point: Point, a: Point, b: Point, tolerance = 3): boolean {
  const minX = Math.min(a.x, b.x) - tolerance;
  const maxX = Math.max(a.x, b.x) + tolerance;
  const minY = Math.min(a.y, b.y) - tolerance;
  const maxY = Math.max(a.y, b.y) + tolerance;
  if (point.x < minX || point.x > maxX || point.y < minY || point.y > maxY) return false;

  const cross = (point.x - a.x) * (b.y - a.y) - (point.y - a.y) * (b.x - a.x);
  const length = distance(a, b);
  if (length === 0) return distance(point, a) <= tolerance;
  return Math.abs(cross) / length <= tolerance;
}

export function orthoPath(from: Point, to: Point): Point[] {
  if (Math.abs(from.x - to.x) < 0.5 || Math.abs(from.y - to.y) < 0.5) {
    return [from, to];
  }
  const midX = to.x;
  return [from, { x: midX, y: from.y }, to];
}

export function tidyPath(points: Point[]): Point[] {
  const result: Point[] = [];
  for (const point of points) {
    const last = result[result.length - 1];
    if (!last || Math.abs(last.x - point.x) > 0.01 || Math.abs(last.y - point.y) > 0.01) {
      result.push(point);
    }
  }
  for (let i = result.length - 2; i > 0; i--) {
    const prev = result[i - 1];
    const current = result[i];
    const next = result[i + 1];
    const collinear =
      (Math.abs(prev.x - current.x) < 0.01 && Math.abs(current.x - next.x) < 0.01) ||
      (Math.abs(prev.y - current.y) < 0.01 && Math.abs(current.y - next.y) < 0.01);
    if (collinear) result.splice(i, 1);
  }
  return result;
}

export function pathLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distance(points[i - 1], points[i]);
  return total;
}

export function formatValue(value: number | string): string {
  if (typeof value === 'string') return value;
  if (!Number.isFinite(value)) return String(value);
  const abs = Math.abs(value);
  if (abs === 0) return '0';
  const units: Array<[number, string]> = [
    [1e9, 'G'],
    [1e6, 'M'],
    [1e3, 'k'],
    [1, ''],
    [1e-3, 'm'],
    [1e-6, 'µ'],
    [1e-9, 'n'],
    [1e-12, 'p'],
  ];
  for (const [scale, suffix] of units) {
    if (abs >= scale) {
      const scaled = value / scale;
      const rounded = Math.abs(scaled) >= 100 ? scaled.toFixed(0) : scaled.toFixed(2);
      return `${Number(rounded)}${suffix}`;
    }
  }
  return value.toExponential(2);
}
