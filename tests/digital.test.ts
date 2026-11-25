import { describe, expect, it } from 'vitest';
import { buildDigitalExample } from '../src/examples';
import { buildNetlist } from '../src/lib/netlist';
import { getPart } from '../src/parts/registry';
import { DigitalEngine } from '../src/engines/digital/engine';

const runSeconds = (engine: DigitalEngine, seconds: number) => {
  const step = 0.01;
  for (let t = 0; t < seconds; t += step) engine.tick(step);
};

describe('digital 74LS161 示例', () => {
  it('网表包含电源与 16 段导线，且无 42 个孤立网络', () => {
    const doc = buildDigitalExample();
    const netlist = buildNetlist(doc, getPart);
    const names = netlist.nets.map((n) => n.name);
    expect(doc.wires.length).toBeGreaterThan(14);
    expect(names).toContain('VCC');
    expect(names).toContain('GND');
    expect(names).toContain('CLK');
    expect(netlist.nets.length).toBeLessThan(20);
    expect(netlist.unconnected.some((p) => p.componentId === 'U1' && p.pinId === 'LOAD')).toBe(true);
  });

  it('1 Hz 时钟驱动下按 0–9 循环', () => {
    const doc = buildDigitalExample();
    const engine = new DigitalEngine(doc);
    const readCount = (pinLevels: Record<string, unknown>) => {
      const bit = (pin: string) => (pinLevels[`U1:${pin}`] === 1 ? 1 : 0);
      return bit('QA') | (bit('QB') << 1) | (bit('QC') << 2) | (bit('QD') << 3);
    };

    // 时钟从 0 开始，第一个上升沿在 0.5s
    runSeconds(engine, 0.6);
    let snap = engine.snapshot();
    expect(readCount(snap.pinLevels)).toBe(1);

    // 74LS47 对 BCD=1 输出：b、c 低电平，a 段关闭为高
    expect(snap.pinLevels['U2:b']).toBe(0);
    expect(snap.pinLevels['U2:c']).toBe(0);
    expect(snap.pinLevels['U2:a']).toBe(1);

    // 下一个上升沿在 1.5s；到 8.9s 共 9 个上升沿
    runSeconds(engine, 8.3);
    snap = engine.snapshot();
    expect(readCount(snap.pinLevels)).toBe(9);

    // 第 10 个上升沿（9.5s）由 NAND 反馈异步清零，回到 0
    runSeconds(engine, 0.7);
    snap = engine.snapshot();
    expect(readCount(snap.pinLevels)).toBe(0);
  });
});
