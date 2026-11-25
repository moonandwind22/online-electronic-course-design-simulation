import { describe, expect, it } from 'vitest';
import { buildDigitalExample } from '../src/examples';
import { buildNetlist } from '../src/lib/netlist';
import { getPart } from '../src/parts/registry';
import { runChecks } from '../src/lib/checks';
import {
  buildAiNetlistText,
  buildCompactNetlist,
  buildJsonNetlist,
  buildNaturalNetlist,
} from '../src/features/ai/formats';
import type { SimSnapshot } from '../src/model/types';

const doc = buildDigitalExample();
const netlist = buildNetlist(doc, getPart);
const checks = runChecks(doc, netlist, getPart);
const snapshot: SimSnapshot = {
  running: true,
  time: 1.234,
  events: 18,
  netLevels: { CLK: 1, BCD_A: 0 },
  pinLevels: {
    'U1:QA': 1,
    'U1:QB': 1,
    'U1:QC': 0,
    'U1:QD': 0,
    'U2:a': 0,
    'U2:b': 1,
    'U2:c': 1,
    'U2:d': 0,
    'U2:e': 0,
    'U2:f': 0,
    'U2:g': 1,
  },
  notes: [],
};

describe('AI 网表导出', () => {
  it('紧凑文本包含器件、引脚号、网络与检查段', () => {
    const text = buildCompactNetlist(doc, netlist, checks, snapshot, getPart);
    expect(text).toContain('[COMPONENTS]');
    expect(text).toContain('74LS161');
    expect(text).toContain('U1');
    expect(text).toContain('QA');
    expect(text).toContain('NET VCC');
    expect(text).toContain('[CHECKS]');
    expect(text).toContain('AI_PROMPT');
    expect(text).toContain('U1 计数=3');
  });

  it('自然语言格式可读并包含器件说明', () => {
    const text = buildNaturalNetlist(doc, netlist, checks, snapshot, getPart);
    expect(text).toContain('74LS161');
    expect(text).toContain('连接关系');
    expect(text).toContain('网络');
  });

  it('JSON 格式可解析，字段完整，可裁剪快照与检查', () => {
    const text = buildJsonNetlist(doc, netlist, checks, snapshot, getPart);
    const data = JSON.parse(text);
    expect(data.version).toBe(1);
    expect(data.project).toBe(doc.name);
    expect(data.components).toHaveLength(doc.components.length);
    expect(data.nets.length).toBe(netlist.nets.length);
    expect(data.snapshot.time).toBeCloseTo(1.234);
    expect(Array.isArray(data.checks)).toBe(true);

    const stripped = JSON.parse(
      buildAiNetlistText('json', doc, netlist, checks, snapshot, getPart, {
        includeSnapshot: false,
        includeChecks: false,
      }),
    );
    expect(stripped.snapshot).toBeUndefined();
    expect(stripped.checks).toBeUndefined();
  });

  it('三种格式均由 buildAiNetlistText 统一分派', () => {
    for (const format of ['compact', 'natural', 'json'] as const) {
      const text = buildAiNetlistText(format, doc, netlist, checks, snapshot, getPart);
      expect(text.length).toBeGreaterThan(200);
    }
  });
});
