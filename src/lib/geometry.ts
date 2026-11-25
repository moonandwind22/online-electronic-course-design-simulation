import type { Component, Point, Rot } from '../model/types';
import type { PartDef, PinDef } from '../parts/types';

export const GRID = 10;

export function snap(v: number, grid = GRID): number {
  return Math.round(v / grid) * grid;
}

export function snapPoint(p: Point, grid = GRID): Point {
  return { x: snap(p.x, grid), y: snap(p.y, grid) };
}

const ROT_SIN: Record<Rot, number> = { 0: 0, 90: 1, 180: 0, 270: -1 };
const ROT_COS: Record<Rot, number> = { 0: 1, 90: 0, 180: -1, 270: 0 };

/** 将器件局部坐标（未旋转、未镜像）转换到画布坐标。 */
export function localToWorld(comp: Component, part: PartDef, local: Point): Point {
  const cx = part.width / 2;
  const cy = part.height / 2;
  let px = local.x;
  if (comp.mirror) px = part.width - px;
  const dx = px - cx;
  const dy = local.y - cy;
  const cos = ROT_COS[comp.rot];
  const sin = ROT_SIN[comp.rot];
  return {
    x: round2(comp.x + cx + dx * cos - dy * sin),
    y: round2(comp.y + cy + dx * sin + dy * cos),
  };
}

export function pinWorldPos(comp: Component, part: PartDef, pinId: string): Point | null {
  const pin = part.pins.find((p) => p.id === pinId);
  if (!pin) return null;
  return localToWorld(comp, part, { x: pin.x, y: pin.y });
}

export type Dir = 'left' | 'right' | 'up' | 'down';

const DIR_VEC: Record<Dir, Point> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};

export function rotateDir(dir: Dir, rot: Rot, mirror: boolean): Dir {
  let d = DIR_VEC[dir];
  if (mirror) d = { x: -d.x, y: d.y };
  const cos = ROT_COS[rot];
  const sin = ROT_SIN[rot];
  const rx = d.x * cos - d.y * sin;
  const ry = d.x * sin + d.y * cos;
  if (rx < 0) return 'left';
  if (rx > 0) return 'right';
  return ry < 0 ? 'up' : 'down';
}

export function pinWorldDir(comp: Component, part: PartDef, pinId: string): Dir {
  const pin = part.pins.find((p) => p.id === pinId);
  if (!pin) return 'left';
  return rotateDir(pin.dir, comp.rot, comp.mirror);
}

/** 器件旋转后的包围盒（画布坐标）。 */
export function compBounds(comp: Component, part: PartDef): { x: number; y: number; w: number; h: number } {
  const pts = [
    localToWorld(comp, part, { x: 0, y: 0 }),
    localToWorld(comp, part, { x: part.width, y: 0 }),
    localToWorld(comp, part, { x: 0, y: part.height }),
    localToWorld(comp, part, { x: part.width, y: part.height }),
  ];
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY };
}

/** 生成两引脚之间的正交折线。 */
export function routeWire(a: Point, aDir: Dir, b: Point, bDir: Dir): Point[] {
  const horizontallyFacing = (aDir === 'right' && bDir === 'left') || (aDir === 'left' && bDir === 'right');
  const verticallyFacing = (aDir === 'down' && bDir === 'up') || (aDir === 'up' && bDir === 'down');
  const stub = 16;
  const a2 = { x: a.x + DIR_VEC[aDir].x * stub, y: a.y + DIR_VEC[aDir].y * stub };
  const b2 = { x: b.x + DIR_VEC[bDir].x * stub, y: b.y + DIR_VEC[bDir].y * stub };

  if (horizontallyFacing) {
    const midX = snap((a2.x + b2.x) / 2);
    return compact([a, a2, { x: midX, y: a2.y }, { x: midX, y: b2.y }, b2, b]);
  }
  if (verticallyFacing) {
    const midY = snap((a2.y + b2.y) / 2);
    return compact([a, a2, { x: a2.x, y: midY }, { x: b2.x, y: midY }, b2, b]);
  }
  // L 形：先沿 a 的出线方向，再折向 b
  if (aDir === 'left' || aDir === 'right') {
    return compact([a, a2, { x: b2.x, y: a2.y }, b2, b]);
  }
  return compact([a, a2, { x: a2.x, y: b2.y }, b2, b]);
}

function compact(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    const prev = out[out.length - 1];
    if (prev && prev.x === p.x && prev.y === p.y) continue;
    out.push({ x: round2(p.x), y: round2(p.y) });
  }
  // 去除共线中间点
  const cleaned: Point[] = [];
  for (let i = 0; i < out.length; i++) {
    if (i > 0 && i < out.length - 1) {
      const a = out[i - 1];
      const b = out[i];
      const c = out[i + 1];
      if ((a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y)) continue;
    }
    cleaned.push(out[i]);
  }
  return cleaned;
}

export function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const x = a.x + t * dx;
  const y = a.y + t * dy;
  return Math.hypot(p.x - x, p.y - y);
}

export function wireHitTest(points: Point[], p: Point, tolerance = 6): boolean {
  for (let i = 0; i < points.length - 1; i++) {
    if (distToSegment(p, points[i], points[i + 1]) <= tolerance) return true;
  }
  return false;
}

export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export function pinKey(comp: string, pin: string): string {
  return `${comp}|${pin}`;
}

export function parsePinKey(key: string): { comp: string; pin: string } {
  const idx = key.indexOf('|');
  return { comp: key.slice(0, idx), pin: key.slice(idx + 1) };
}

export function pinLabel(part: PartDef, pin: PinDef): string {
  return pin.num === pin.name ? pin.name : `${pin.name}(${pin.num})`;
}
