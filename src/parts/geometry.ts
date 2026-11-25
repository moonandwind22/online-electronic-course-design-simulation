import type { Component, Point } from '../model/types';
import type { PartDef, PinDef } from './types';
import { getPart } from './registry';
import { rotatePoint } from '../lib/geometry';

export function getPinLocal(part: PartDef, pinId: string): PinDef | undefined {
  return part.pins.find((pin) => pin.id === pinId);
}

export function getPinPosition(component: Component, part: PartDef, pinId: string): Point | undefined {
  const pin = getPinLocal(part, pinId);
  if (!pin) return undefined;
  const center = { x: part.width / 2, y: part.height / 2 };
  const local = component.mirror ? { x: part.width - pin.x, y: pin.y } : { x: pin.x, y: pin.y };
  const rotated = rotatePoint(local, center, component.rot);
  return { x: component.x + rotated.x, y: component.y + rotated.y };
}

export interface PinPosition {
  pin: PinDef;
  position: Point;
}

export function getComponentPinPositions(component: Component, part: PartDef): PinPosition[] {
  return part.pins
    .map((pin) => {
      const position = getPinPosition(component, part, pin.id);
      return position ? { pin, position } : undefined;
    })
    .filter((entry): entry is PinPosition => Boolean(entry));
}

export function getComponentBounds(component: Component, part: PartDef): { x: number; y: number; width: number; height: number } {
  const points = getComponentPinPositions(component, part).map((entry) => entry.position);
  points.push(
    { x: component.x, y: component.y },
    { x: component.x + part.width, y: component.y + part.height },
  );
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
}

export function findPinAtPoint(components: Component[], point: Point, tolerance = 8): { component: Component; pin: PinDef; part: PartDef; position: Point } | undefined {
  for (const component of components) {
    const part = getPart(component.type);
    if (!part) continue;
    for (const pin of part.pins) {
      const position = getPinPosition(component, part, pin.id);
      if (!position) continue;
      if (Math.hypot(position.x - point.x, position.y - point.y) <= tolerance) {
        return { component, pin, part, position };
      }
    }
  }
  return undefined;
}
