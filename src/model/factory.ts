import type { Component, CircuitDoc, Domain, Point, Rotation } from '../model/types';
import { createId } from '../lib/id';

export function createComponent(
  type: string,
  x: number,
  y: number,
  label: string,
  params: Record<string, number | string> = {},
): Component {
  return {
    id: createId('cmp'),
    type,
    x,
    y,
    rot: 0,
    mirror: false,
    label,
    params,
  };
}

export function createDoc(domain: Domain, name: string): CircuitDoc {
  const now = Date.now();
  return {
    id: createId('doc'),
    name,
    domain,
    components: [],
    wires: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    createdAt: now,
    updatedAt: now,
  };
}

export function nextLabel(existing: Component[], prefix: string): string {
  const pattern = new RegExp(`^${prefix}(\\d+)$`);
  let max = 0;
  for (const component of existing) {
    const match = pattern.exec(component.label);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}${max + 1}`;
}

export function cloneDoc(doc: CircuitDoc): CircuitDoc {
  return structuredClone(doc);
}

export function rotateAround(point: Point, center: Point, rot: Rotation): Point {
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
      return { ...point };
  }
}

export function nextRotation(rot: Rotation, delta: 90 | 270 = 90): Rotation {
  return ((rot + delta) % 360) as Rotation;
}
