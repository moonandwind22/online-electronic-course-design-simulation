import { describe, expect, it } from 'vitest';
import { buildAnalogExample } from '../src/examples';
import { buildNetlist } from '../src/lib/netlist';
import { useCircuitStore } from '../src/store/useCircuitStore';
import { nearestPointOnPolyline, pinWorld } from '../src/lib/geometry';
import { getPart } from '../src/parts/registry';
import {
  doglegWirePoints,
  forceWireEndpoints,
  isSegmentMovable,
  moveWireSegment,
  reanchorWires,
  syncJoinedWires,
  translateWireSegment,
} from '../src/lib/wires';

const round = (p: { x: number; y: number }) => ({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 });

describe('导线交互与网表', () => {
  it('接到另一根导线上会合并两个网络', () => {
    const doc = buildAnalogExample();
    const target = doc.wires.find((w) => w.from?.componentId === 'V1' && w.from.pinId === 'pos');
    expect(target).toBeTruthy();
    const r1 = doc.components.find((c) => c.id === 'R1');
    expect(r1).toBeTruthy();
    const part = getPart(r1!.type);
    expect(part).toBeTruthy();
    const fromWorld = pinWorld(r1!, part!, '2');
    expect(fromWorld).toBeTruthy();
    const mid = target!.points[Math.max(0, Math.floor((target!.points.length - 1) / 2))];
    const junction = { x: mid.x + 4, y: mid.y };
    doc.wires.push({
      id: 'w_join',
      points: [fromWorld!, { x: fromWorld!.x + 20, y: fromWorld!.y }, { x: fromWorld!.x + 20, y: junction.y }, junction],
      from: { componentId: 'R1', pinId: '2' },
      join: { wireId: target!.id },
    });
    const netlist = buildNetlist(doc, getPart);
    expect(netlist.wireNet.get(target!.id)).toBeTruthy();
    expect(netlist.wireNet.get('w_join')).toBe(netlist.wireNet.get(target!.id));
    expect(netlist.pinNet.get('R1:1')).toBe(netlist.pinNet.get('R1:2'));
  });

  it('移动器件后导线端点跟着引脚走，另一端不变', () => {
    const doc = buildAnalogExample();
    const movedComponents = doc.components.map((c) =>
      c.id === 'V1' ? { ...c, x: c.x + 40, y: c.y + 20 } : c,
    );
    const original = doc.wires.find((w) => w.from?.componentId === 'V1' && w.from.pinId === 'pos');
    expect(original).toBeTruthy();
    const moved = reanchorWires(doc.wires, movedComponents, new Set(['V1']));
    const next = moved.find((w) => w.id === original!.id);
    expect(next).toBeTruthy();
    const v1 = movedComponents.find((c) => c.id === 'V1')!;
    const part = getPart(v1.type)!;
    const pin = pinWorld(v1, part, 'pos')!;
    expect(round(next!.points[0])).toEqual(round(pin));
    expect(round(next!.points[next!.points.length - 1])).toEqual(round(original!.points[original!.points.length - 1]));
  });

  it('store 接线到导线：生成 T 型接点并合并网表', () => {
    const doc = buildAnalogExample();
    useCircuitStore.getState().setDoc(doc);
    const target = doc.wires.find((w) => w.from?.componentId === 'V1' && w.from.pinId === 'pos')!;
    const r1 = doc.components.find((c) => c.id === 'R1')!;
    const part = getPart(r1.type)!;
    const from = pinWorld(r1, part, '2')!;
    const mid = target.points[Math.floor((target.points.length - 1) / 2)];
    useCircuitStore.getState().addWireToWire(
      { componentId: 'R1', pinId: '2' },
      target.id,
      [from, { x: from.x + 16, y: from.y }, { x: from.x + 16, y: mid.y }, mid],
    );
    const next = useCircuitStore.getState().doc;
    const added = next.wires.find((w) => w.join?.wireId === target.id);
    expect(added).toBeTruthy();
    const netlist = buildNetlist(next, getPart);
    expect(netlist.pinNet.get('R1:1')).toBe(netlist.pinNet.get('R1:2'));
    const last = added!.points[added!.points.length - 1];
    const hit = nearestPointOnPolyline(target.points, last);
    expect(hit?.distance ?? Infinity).toBeLessThan(0.5);
  });

  it('store 调整导线走线后两端仍严格连接引脚', () => {
    const doc = buildAnalogExample();
    useCircuitStore.getState().setDoc(doc);
    const wire = doc.wires.find((w) => w.points.length === 4 && w.from && w.to)!;
    const dragged = translateWireSegment(wire.points, 1, 26, 0);
    useCircuitStore.getState().updateWirePoints(wire.id, dragged);
    const next = useCircuitStore.getState().doc.wires.find((w) => w.id === wire.id)!;
    expect(round(next.points[0])).toEqual(round(wire.points[0]));
    expect(round(next.points[next.points.length - 1])).toEqual(round(wire.points[wire.points.length - 1]));
    expect(next.points[1].x).toBe(wire.points[1].x + 26);
  });

  it('store 移动器件会带着导线端点一起走', () => {
    const doc = buildAnalogExample();
    useCircuitStore.getState().setDoc(doc);
    const wire = doc.wires.find((w) => w.from?.componentId === 'V1')!;
    const before = wire.points[0];
    useCircuitStore.getState().moveComponents(['V1'], 30, 10);
    const moved = useCircuitStore.getState().doc.wires.find((w) => w.id === wire.id)!;
    expect(moved.points[0].x).toBeCloseTo(before.x + 30, 5);
    expect(moved.points[0].y).toBeCloseTo(before.y + 10, 5);
    const v1 = useCircuitStore.getState().doc.components.find((c) => c.id === 'V1')!;
    const pin = pinWorld(v1, getPart(v1.type)!, 'pos')!;
    expect(round(moved.points[0])).toEqual(round(pin));
  });

  it('目标导线移动后 T 型接点重新贴合到导线上', () => {
    const target = { id: 't', points: [{ x: 0, y: 0 }, { x: 100, y: 0 }] };
    const joined = { id: 'j', points: [{ x: 50, y: 50 }, { x: 50, y: 0 }], join: { wireId: 't' } };
    const movedTarget = { ...target, points: [{ x: 0, y: 20 }, { x: 100, y: 20 }] };
    const out = syncJoinedWires([movedTarget, joined]);
    const next = out.find((w) => w.id === 'j')!;
    expect(next.points[next.points.length - 1]).toEqual({ x: 50, y: 20 });
  });

  it('直线导线被拖动时生成正交折线且端点不变', () => {
    const a = { x: 100, y: 200 };
    const b = { x: 300, y: 200 };
    const points = doglegWirePoints(a, b, 0, 40);
    expect(points.length).toBe(6);
    expect(round(points[0])).toEqual(a);
    expect(round(points[points.length - 1])).toEqual(b);
    expect(points.some((p) => p.y === 240)).toBe(true);
  });

  it('贴着引脚的横向段也能上下移动，两端引脚坐标不变', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 200, y: 50 },
    ];
    const movedStart = moveWireSegment(points, 0, 0, 24, true, true);
    expect(movedStart[0]).toEqual(points[0]);
    expect(movedStart[movedStart.length - 1]).toEqual(points[points.length - 1]);
    expect(movedStart[1]).toEqual({ x: 0, y: 24 });
    expect(movedStart[2]).toEqual({ x: 100, y: 24 });
    expect(movedStart.length).toBe(5);

    const movedEnd = moveWireSegment(points, 2, 0, -16, true, true);
    expect(movedEnd[0]).toEqual(points[0]);
    expect(movedEnd[movedEnd.length - 1]).toEqual(points[points.length - 1]);
    expect(movedEnd[movedEnd.length - 2]).toEqual({ x: 200, y: 34 });
    expect(movedEnd.length).toBe(5);
  });

  it('拖动导线中段只平移该线段，引脚端点保持不动', () => {
    const doc = buildAnalogExample();
    const wire = doc.wires.find((w) => w.points.length === 4);
    expect(wire).toBeTruthy();
    expect(isSegmentMovable(wire!, 1)).toBe(true);
    expect(isSegmentMovable(wire!, 0)).toBe(true);

    const next = translateWireSegment(wire!.points, 1, 20, 0);
    expect(round(next[0])).toEqual(round(wire!.points[0]));
    expect(round(next[next.length - 1])).toEqual(round(wire!.points[wire!.points.length - 1]));
    expect(next[1].x).toBe(wire!.points[1].x + 20);
    expect(next[2].x).toBe(wire!.points[2].x + 20);

    const forced = forceWireEndpoints([{ ...wire!, points: next }], doc.components)[0];
    expect(round(forced.points[0])).toEqual(round(wire!.points[0]));
    expect(round(forced.points[forced.points.length - 1])).toEqual(round(wire!.points[wire!.points.length - 1]));
  });
});
