import type { Component, PinRef, Point, Wire } from '../model/types';
import { getPart } from '../parts/registry';
import { nearestPointOnPolyline, pinWorld } from './geometry';

type Orientation = 'h' | 'v' | null;

function orientationOf(a: Point, b: Point): Orientation {
  if (Math.abs(a.y - b.y) < 0.5) return 'h';
  if (Math.abs(a.x - b.x) < 0.5) return 'v';
  return null;
}

function pinPoint(components: Component[], ref: PinRef): Point | null {
  const comp = components.find((c) => c.id === ref.componentId);
  if (!comp) return null;
  const part = getPart(comp.type);
  if (!part) return null;
  const world = pinWorld(comp, part, ref.pinId);
  return world ? { x: world.x, y: world.y } : null;
}

/** 器件移动/旋转后，把连在它引脚上的导线端点重新贴回引脚，并保持正交走线。 */
export function reanchorWires(wires: Wire[], components: Component[], movedIds: Set<string>): Wire[] {
  if (movedIds.size === 0) return wires;
  return wires.map((wire) => {
    if (wire.points.length < 2) return wire;
    if (!(wire.from && movedIds.has(wire.from.componentId)) && !(wire.to && movedIds.has(wire.to.componentId))) {
      return wire;
    }
    const points = wire.points.map((p) => ({ ...p }));
    const last = points.length - 1;
    const startOrientation = orientationOf(wire.points[0], wire.points[1]);
    const endOrientation = orientationOf(wire.points[last], wire.points[last - 1]);
    let changed = false;

    if (wire.from && movedIds.has(wire.from.componentId)) {
      const target = pinPoint(components, wire.from);
      if (target) {
        points[0] = target;
        if (startOrientation === 'h') points[1].y = target.y;
        else if (startOrientation === 'v') points[1].x = target.x;
        changed = true;
      }
    }

    if (wire.to && movedIds.has(wire.to.componentId)) {
      const target = pinPoint(components, wire.to);
      if (target) {
        points[last] = target;
        if (endOrientation === 'h') points[last - 1].y = target.y;
        else if (endOrientation === 'v') points[last - 1].x = target.x;
        changed = true;
      }
    }

    if (changed && points.length === 2) {
      const [a, b] = points;
      if (Math.abs(a.x - b.x) > 0.5 && Math.abs(a.y - b.y) > 0.5) {
        const midX = (a.x + b.x) / 2;
        return {
          ...wire,
          points: [a, { x: midX, y: a.y }, { x: midX, y: b.y }, b],
        };
      }
    }
    return changed ? { ...wire, points } : wire;
  });
}

/** 引脚端点始终吸附到引脚世界坐标（导线自身拖动时也保持引脚连接）。 */
export function forceWireEndpoints(wires: Wire[], components: Component[]): Wire[] {
  return wires.map((wire) => {
    if (wire.points.length < 2) return wire;
    if (!wire.from && !wire.to && !wire.join) return wire;
    const points = wire.points.map((p) => ({ ...p }));
    let changed = false;
    if (wire.from) {
      const target = pinPoint(components, wire.from);
      if (target && (points[0].x !== target.x || points[0].y !== target.y)) {
        points[0] = target;
        changed = true;
      }
    }
    if (wire.to) {
      const target = pinPoint(components, wire.to);
      const last = points.length - 1;
      if (target && (points[last].x !== target.x || points[last].y !== target.y)) {
        points[last] = target;
        changed = true;
      }
    }
    return changed ? { ...wire, points } : wire;
  });
}

const snapPoint = (p: Point): Point => ({
  x: Math.round(p.x * 10) / 10,
  y: Math.round(p.y * 10) / 10,
});

/** 让所有 T 型接线的末端贴到目标导线上。 */
export function syncJoinedWires(wires: Wire[]): Wire[] {
  const byId = new Map(wires.map((w) => [w.id, w]));
  let changed = false;
  const next = wires.map((wire) => {
    if (!wire.join || wire.points.length === 0) return wire;
    const target = byId.get(wire.join.wireId);
    if (!target || target.points.length === 0) return wire;
    const last = wire.points[wire.points.length - 1];
    const hit = nearestPointOnPolyline(target.points, last);
    if (!hit) return wire;
    const point = snapPoint(hit.point);
    if (point.x === last.x && point.y === last.y) return wire;
    const points = wire.points.slice();
    points[points.length - 1] = point;
    changed = true;
    return { ...wire, points };
  });
  return changed ? next : wires;
}

/** 拖动导线中段：只做垂直平移，相邻折点跟随，端点保持不动。 */
export function translateWireSegment(points: Point[], index: number, dx: number, dy: number): Point[] {
  const a = points[index];
  const b = points[index + 1];
  if (!a || !b) return points;
  const orientation = orientationOf(a, b);
  const next = points.map((p) => ({ ...p }));
  if (orientation === 'h') {
    next[index].y += dy;
    next[index + 1].y += dy;
  } else if (orientation === 'v') {
    next[index].x += dx;
    next[index + 1].x += dx;
  }
  return next;
}

/** 把两点直线拉成 6 点“狗腿”折线，两个引脚端点保持不变。 */
export function doglegWirePoints(a: Point, b: Point, dx: number, dy: number): Point[] {
  const horizontal = Math.abs(a.y - b.y) < 0.5;
  const vertical = Math.abs(a.x - b.x) < 0.5;
  if (horizontal) {
    const nextY = a.y + dy;
    const length = Math.abs(b.x - a.x);
    const offset = Math.max(6, Math.min(24, length / 4));
    const direction = b.x >= a.x ? 1 : -1;
    return [
      { ...a },
      { x: a.x + offset * direction, y: a.y },
      { x: a.x + offset * direction, y: nextY },
      { x: b.x - offset * direction, y: nextY },
      { x: b.x - offset * direction, y: b.y },
      { ...b },
    ];
  }
  if (vertical) {
    const nextX = a.x + dx;
    const length = Math.abs(b.y - a.y);
    const offset = Math.max(6, Math.min(24, length / 4));
    const direction = b.y >= a.y ? 1 : -1;
    return [
      { ...a },
      { x: a.x, y: a.y + offset * direction },
      { x: nextX, y: a.y + offset * direction },
      { x: nextX, y: b.y - offset * direction },
      { x: b.x, y: b.y - offset * direction },
      { ...b },
    ];
  }
  return [a, b];
}

export function isSegmentMovable(wire: Wire, index: number): boolean {
  const last = wire.points.length - 1;
  if (last < 1 || index < 0 || index >= last) return false;
  if (index === 0 && wire.from) return false;
  if (index === last - 1 && (wire.to || wire.join)) return false;
  return true;
}

/** 合并重复点与共线点，避免拖动后产生零长度线段。 */
export function normalizeWirePoints(points: Point[]): Point[] {
  const deduped: Point[] = [];
  for (const point of points) {
    const prev = deduped[deduped.length - 1];
    if (!prev || Math.abs(prev.x - point.x) > 0.01 || Math.abs(prev.y - point.y) > 0.01) {
      deduped.push({ ...point });
    }
  }
  if (deduped.length <= 2) return deduped;
  const result = [...deduped];
  for (let i = result.length - 2; i >= 1; i -= 1) {
    const a = result[i - 1];
    const b = result[i];
    const c = result[i + 1];
    const collinearX = Math.abs(a.x - b.x) < 0.01 && Math.abs(b.x - c.x) < 0.01;
    const collinearY = Math.abs(a.y - b.y) < 0.01 && Math.abs(b.y - c.y) < 0.01;
    if (collinearX || collinearY) result.splice(i, 1);
  }
  return result;
}
