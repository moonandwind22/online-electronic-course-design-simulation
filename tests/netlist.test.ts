import { describe, expect, it } from 'vitest';
import { buildDigitalExample } from '../src/examples';
import { buildNetlist, findNet } from '../src/lib/netlist';
import { getPart } from '../src/parts/registry';
import { runChecks } from '../src/lib/checks';

describe('netlist 提取', () => {
  const doc = buildDigitalExample();
  const netlist = buildNetlist(doc, getPart);

  it('电源、时钟与标注网络命名正确', () => {
    const names = netlist.nets.map((n) => n.name);
    expect(names).toContain('VCC');
    expect(names).toContain('GND');
    expect(names).toContain('CLK');
    expect(names).toContain('CLR');
    expect(netlist.nets.every((n) => n.pins.length >= 2)).toBe(true);
  });

  it('引脚到网络的映射支持扇出', () => {
    const qb = findNet(netlist, 'U1', 'QB');
    expect(qb?.name).toBe('BCD_B');
    const refs = qb?.pins.map((p) => `${p.componentId}.${p.pinId}`) ?? [];
    expect(refs).toContain('U2.B');
    expect(refs).toContain('Q1.A');

    const clk = findNet(netlist, 'U1', 'CLK');
    expect(clk?.name).toBe('CLK');
    expect(clk?.pins.map((p) => `${p.componentId}.${p.pinId}`)).toEqual(['CLK1.OUT', 'U1.CLK']);
  });

  it('隐藏电源脚自动进入 VCC/GND', () => {
    const vcc = netlist.nets.find((n) => n.name === 'VCC');
    const gnd = netlist.nets.find((n) => n.name === 'GND');
    expect(vcc?.isPower).toBe(true);
    expect(vcc?.pins.some((p) => p.componentId === 'U1' && p.pinId === 'VCC')).toBe(true);
    expect(gnd?.pins.some((p) => p.componentId === 'U2' && p.pinId === 'GND')).toBe(true);
  });

  it('未连接引脚不产生孤立网络，并被检查器捕获', () => {
    expect(netlist.unconnected.some((p) => p.componentId === 'U1' && p.pinId === 'LOAD')).toBe(true);
    expect(netlist.pinNet.has('U1:LOAD')).toBe(false);
    const checks = runChecks(doc, netlist, getPart);
    expect(checks.some((c) => c.level === 'warn' && c.title.includes('悬空'))).toBe(true);
    expect(checks.some((c) => c.level === 'pass')).toBe(true);
  });
});
