import type { CheckIssue, CircuitDoc, LogicLevel, NetlistResult, SimSnapshot } from '../../model/types';
import type { PartDef } from '../../parts/types';
import { domainMeta } from '../../model/domains';
import { pinRefsToText } from '../../lib/netlist';

const LEVEL_TEXT: Record<string, string> = { '0': '0', '1': '1', z: 'Z', x: 'X' };

const pinText = (doc: CircuitDoc, getPart: (t: string) => PartDef | undefined, componentId: string, pinId: string): string => {
  const comp = doc.components.find((c) => c.id === componentId);
  const part = comp ? getPart(comp.type) : undefined;
  const pin = part?.pins.find((p) => p.id === pinId);
  return pin ? `${pin.number ?? pin.name}(${pin.name})` : pinId;
};

const refPin = (doc: CircuitDoc, getPart: (t: string) => PartDef | undefined, componentId: string, pinId: string): string => {
  const comp = doc.components.find((c) => c.id === componentId);
  return `${comp?.label ?? componentId}.${pinText(doc, getPart, componentId, pinId)}`;
};

const describeComponentState = (
  doc: CircuitDoc,
  pinLevels: Record<string, LogicLevel>,
  compId: string,
): string | null => {
  const comp = doc.components.find((c) => c.id === compId);
  if (!comp) return null;
  const lv = (pin: string) => pinLevels[`${compId}:${pin}`];
  if (comp.type === '74LS161') {
    const bit = (pin: string) => (lv(pin) === 1 ? 1 : 0);
    const value = bit('QA') | (bit('QB') << 1) | (bit('QC') << 2) | (bit('QD') << 3);
    return `${comp.label} 计数=${value}`;
  }
  if (comp.type === 'SEVENSEG') {
    const lit = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].filter((s) => lv(s) === 0);
    return `${comp.label} 点亮段=${lit.length > 0 ? lit.join('') : '无'}`;
  }
  if (comp.type === 'LED') {
    return `${comp.label} ${lv('A') === 1 && lv('K') !== 1 ? '点亮' : '熄灭'}`;
  }
  if (comp.type === 'CLOCK') {
    return `${comp.label} OUT=${LEVEL_TEXT[String(lv('OUT'))] ?? 'Z'}`;
  }
  if (comp.type === 'NAND2') {
    return `${comp.label} Y=${LEVEL_TEXT[String(lv('Y'))] ?? 'Z'}`;
  }
  return null;
};

const supplyText = (doc: CircuitDoc): string => {
  if (doc.domain === 'stm32') return '3V3=3.3V VCC=5.0V GND=0V';
  if (doc.domain === 'digital') return 'VCC=5.0V GND=0V';
  return 'VCC=12.0V GND=0V';
};

const sortedComponents = (doc: CircuitDoc) =>
  [...doc.components].sort((a, b) => a.label.localeCompare(b.label));

const sortIssues = (issues: CheckIssue[]) =>
  [...issues].sort((a, b) => {
    const rank = { error: 0, warn: 1, info: 2, pass: 3 };
    return rank[a.level] - rank[b.level] || a.title.localeCompare(b.title);
  });

export interface NetlistOptions {
  includeSnapshot?: boolean;
  includeChecks?: boolean;
}

const withSnapshot = (options?: NetlistOptions) => options?.includeSnapshot !== false;
const withChecks = (options?: NetlistOptions) => options?.includeChecks !== false;

export function buildCompactNetlist(
  doc: CircuitDoc,
  netlist: NetlistResult,
  checks: CheckIssue[],
  snapshot: SimSnapshot,
  getPart: (t: string) => PartDef | undefined,
  options?: NetlistOptions,
): string {
  const lines: string[] = [];
  const meta = domainMeta(doc.domain);
  const status = snapshot.running ? 'RUNNING' : 'PAUSED';
  lines.push('# ============================================================');
  lines.push('# CIRCUIT SNAPSHOT — 电子课设仿真平台 v1');
  lines.push(`# 工程: ${doc.name}`);
  lines.push(`# 仿真域: ${doc.domain} (${meta.short})`);
  lines.push(`# 生成时间: ${new Date().toISOString()}`);
  lines.push(`# 仿真状态: ${status} | t=${snapshot.time.toFixed(3)}s | 事件=${snapshot.events}`);
  lines.push('# ============================================================');
  lines.push('');
  lines.push('[NETLIST_VERSION] 1');
  lines.push(`[PROJECT] ${doc.name}`);
  lines.push(`[DOMAIN] ${doc.domain}`);
  lines.push(`[SUPPLY] ${supplyText(doc)}`);
  lines.push('');
  lines.push('[COMPONENTS]');
  for (const c of sortedComponents(doc)) {
    const part = getPart(c.type);
    if (!part) continue;
    const pins = part.pins.map((p) => `${p.number ?? p.name}~${p.name}`).join(', ');
    const params = Object.entries(c.params)
      .map(([k, v]) => `${k}=${v}`)
      .join(' ');
    lines.push(
      `${c.label.padEnd(5)} | ${c.type.padEnd(9)} | ${part.subtitle.padEnd(10)} | pos=(${Math.round(c.x)},${Math.round(c.y)}) rot=${c.rot}${c.mirror ? ' mirror' : ''}${params ? ` | ${params}` : ''} | pins: ${pins}`,
    );
  }
  lines.push('');
  lines.push('[NETS]');
  for (const n of netlist.nets) {
    const pins = n.pins.map((p) => refPin(doc, getPart, p.componentId, p.pinId)).join(', ');
    lines.push(`NET ${n.name} : ${pins}`);
  }
  lines.push('');
  lines.push('[UNCONNECTED]');
  if (netlist.unconnected.length === 0) {
    lines.push('NONE');
  } else {
    for (const p of netlist.unconnected) {
      lines.push(`${refPin(doc, getPart, p.componentId, p.pinId)} — 悬空`);
    }
  }
  lines.push('');
  lines.push('[MCU]');
  const mcu = doc.components.find((c) => c.type === 'MCU51' || c.type === 'STM32');
  if (mcu) {
    const part = getPart(mcu.type);
    lines.push(`MODEL: ${part?.name ?? mcu.type}`);
    lines.push(`REQUIRED_FIRMWARE: Intel HEX`);
    lines.push(`FIRMWARE: ${doc.firmware ? `${doc.firmware.name} | size=${doc.firmware.size}B` : 'NONE（尚未烧录）'}`);
  } else {
    lines.push('NONE');
  }
  if (withSnapshot(options)) {
    lines.push('');
    lines.push('[SIM_SNAPSHOT]');
    lines.push(`t=${snapshot.time.toFixed(3)}s | 事件=${snapshot.events}`);
    const netSample = netlist.nets
      .filter((n) => !n.isPower)
      .slice(0, 10)
      .map((n) => `${n.name}=${LEVEL_TEXT[String(snapshot.netLevels[n.name] ?? 'z')] ?? 'Z'}`);
    if (netSample.length > 0) lines.push(netSample.join(' | '));
    for (const c of sortedComponents(doc)) {
      const state = describeComponentState(doc, snapshot.pinLevels, c.id);
      if (state) lines.push(state);
    }
  }
  if (withChecks(options)) {
    lines.push('');
    lines.push('[CHECKS]');
    const issues = sortIssues(checks);
    if (issues.length === 0) lines.push('PASS: 未运行检查');
    for (const issue of issues) {
      lines.push(`${issue.level.toUpperCase()}: ${issue.title}${issue.detail ? ` — ${issue.detail}` : ''}`);
    }
  }
  lines.push('');
  lines.push('[AI_PROMPT]');
  lines.push('你是资深电子工程师。请根据以上网表检查：1) 引脚连接与电源是否正确；');
  lines.push('2) 器件控制脚（清零/置数/使能）的接法是否合理；3) 译码/显示链路是否正确；');
  lines.push('4) 是否存在悬空输入、输出冲突或缺少限流电阻。请按“问题—依据—修正建议”输出。');
  return lines.join('\n');
}

export function buildNaturalNetlist(
  doc: CircuitDoc,
  netlist: NetlistResult,
  checks: CheckIssue[],
  snapshot: SimSnapshot,
  getPart: (t: string) => PartDef | undefined,
  options?: NetlistOptions,
): string {
  const parts = sortedComponents(doc)
    .map((c) => {
      const part = getPart(c.type);
      if (!part) return '';
      const body = part.pins
        .map((p) => `引脚 ${p.number ?? p.name}（${p.name}）${refPin(doc, getPart, c.id, p.id)}`)
        .join('；');
      return `${c.label} 是一片 ${part.name}（${part.subtitle}），${body}。`;
    })
    .filter(Boolean);

  const nets = netlist.nets.map((n) => {
    const pins = n.pins.map((p) => refPin(doc, getPart, p.componentId, p.pinId)).join('、');
    return `网络 ${n.name} 连接了 ${pins}。`;
  });

  const state = snapshot.running
    ? `当前仿真正在运行，仿真时间 ${snapshot.time.toFixed(3)} 秒，累计 ${snapshot.events} 次网络变化。`
    : '当前仿真处于暂停状态。';

  const checksText = sortIssues(checks)
    .map((c) => `- [${c.level.toUpperCase()}] ${c.title}${c.detail ? `：${c.detail}` : ''}`)
    .join('\n');

  return [
    `任务：请检查以下电子课设原理图。`,
    '',
    `工程「${doc.name}」属于${domainMeta(doc.domain).label}方向。${doc.description}`,
    '',
    '器件：',
    ...parts.map((p) => `- ${p}`),
    '',
    '连接关系：',
    ...nets.map((n) => `- ${n}`),
    '',
    ...(withSnapshot(options) ? [`仿真快照：${state}`, ''] : []),
    ...(withChecks(options) ? ['检查结果：', checksText || '- 未运行检查', ''] : []),
    '请按“问题—依据—修正建议”的格式输出，优先关注电源、悬空输入、控制脚接法与限流电阻。',
  ].join('\n');
}

export function buildJsonNetlist(
  doc: CircuitDoc,
  netlist: NetlistResult,
  checks: CheckIssue[],
  snapshot: SimSnapshot,
  getPart: (t: string) => PartDef | undefined,
  options?: NetlistOptions,
): string {
  const data = {
    version: 1,
    project: doc.name,
    domain: doc.domain,
    description: doc.description,
    supply: supplyText(doc),
    components: sortedComponents(doc).map((c) => {
      const part = getPart(c.type);
      return {
        ref: c.label,
        type: c.type,
        name: part?.name ?? c.type,
        subtitle: part?.subtitle ?? '',
        position: { x: Math.round(c.x), y: Math.round(c.y) },
        rotation: c.rot,
        mirror: c.mirror,
        params: c.params,
        pins: (part?.pins ?? []).map((p) => ({
          number: p.number ?? p.name,
          name: p.name,
          net: netlist.nets.find((n) =>
            n.pins.some((x) => x.componentId === c.id && x.pinId === p.id),
          )?.name ?? null,
        })),
      };
    }),
    nets: netlist.nets.map((n) => ({
      name: n.name,
      power: n.isPower,
      pins: n.pins.map((p) => {
        const comp = doc.components.find((c) => c.id === p.componentId);
        return `${comp?.label ?? p.componentId}.${pinText(doc, getPart, p.componentId, p.pinId)}`;
      }),
    })),
    unconnected: netlist.unconnected.map((p) => refPin(doc, getPart, p.componentId, p.pinId)),
    mcu: doc.firmware
      ? { firmware: doc.firmware.name, size: doc.firmware.size, hex: doc.firmware.hex.slice(0, 64) }
      : null,
    ...(withSnapshot(options)
      ? {
          snapshot: {
            running: snapshot.running,
            time: Number(snapshot.time.toFixed(4)),
            events: snapshot.events,
            netLevels: snapshot.netLevels,
          },
        }
      : {}),
    ...(withChecks(options)
      ? {
          checks: sortIssues(checks).map((c) => ({ level: c.level, title: c.title, detail: c.detail ?? null })),
        }
      : {}),
    prompt:
      '你是资深电子工程师。请根据以上网表检查引脚连接、电源、控制脚接法、悬空输入与限流电阻，并按“问题—依据—修正建议”输出。',
  };
  return JSON.stringify(data, null, 2);
}

export function buildAiNetlistText(
  format: 'compact' | 'natural' | 'json',
  doc: CircuitDoc,
  netlist: NetlistResult,
  checks: CheckIssue[],
  snapshot: SimSnapshot,
  getPart: (t: string) => PartDef | undefined,
  options?: NetlistOptions,
): string {
  if (format === 'natural') return buildNaturalNetlist(doc, netlist, checks, snapshot, getPart, options);
  if (format === 'json') return buildJsonNetlist(doc, netlist, checks, snapshot, getPart, options);
  return buildCompactNetlist(doc, netlist, checks, snapshot, getPart, options);
}

export function netSummary(netlist: NetlistResult): string {
  return netlist.nets
    .slice(0, 6)
    .map((n) => `${n.name}:${n.pins.length}`)
    .join(' ');
}

export function pinsText(doc: CircuitDoc, getPart: (t: string) => PartDef | undefined, pins: NetlistResult['nets'][number]['pins']): string {
  return pinRefsToText(pins, doc, getPart);
}
