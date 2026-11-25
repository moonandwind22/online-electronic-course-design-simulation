import type { CircuitDoc, Component, Domain, Point, Rotation, Wire } from '../model/types';
import { pinWorld, orthoRoute } from '../lib/geometry';
import { getPart } from '../parts/registry';

export interface LinkSpec {
  from: [string, string];
  to: [string, string];
  lane?: number;
  netLabel?: string;
  points?: Point[];
}

export function comp(
  id: string,
  type: string,
  x: number,
  y: number,
  label: string,
  params: Record<string, number | string> = {},
  extra: Partial<Component> = {},
): Component {
  return { id, type, x, y, label, rot: 0, mirror: false, params, ...extra };
}

export function createDoc(
  id: string,
  domain: Domain,
  name: string,
  description: string,
  components: Component[],
  links: LinkSpec[],
  viewport: { x: number; y: number; zoom: number } = { x: 40, y: 40, zoom: 0.85 },
): CircuitDoc {
  const byId = new Map(components.map((c) => [c.id, c]));
  const wires: Wire[] = [];
  links.forEach((link, index) => {
    const fromComp = byId.get(link.from[0]);
    const toComp = byId.get(link.to[0]);
    if (!fromComp || !toComp) return;
    const fromPart = getPart(fromComp.type);
    const toPart = getPart(toComp.type);
    if (!fromPart || !toPart) return;
    const a = pinWorld(fromComp, fromPart, link.from[1]);
    const b = pinWorld(toComp, toPart, link.to[1]);
    if (!a || !b) return;
    const points = link.points ?? orthoRoute(a, b, link.lane);
    wires.push({
      id: `w_${id}_${index}`,
      points,
      from: { componentId: link.from[0], pinId: link.from[1] },
      to: { componentId: link.to[0], pinId: link.to[1] },
      netLabel: link.netLabel,
    });
  });

  const now = Date.now();
  return {
    id,
    name,
    domain,
    description,
    components,
    wires,
    viewport,
    createdAt: now,
    updatedAt: now,
    firmware: null,
  };
}

export const rotation = (rot: Rotation): Partial<Component> => ({ rot });
