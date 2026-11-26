import type { CircuitDoc, CheckIssue, NetlistResult } from '../model/types';
import type { PartDef } from '../parts/types';
import { parseIntelHex } from '../engines/mcs51/hex';

const pinName = (doc: CircuitDoc, getPart: (t: string) => PartDef | undefined, componentId: string, pinId: string): string => {
  const comp = doc.components.find((c) => c.id === componentId);
  const part = comp ? getPart(comp.type) : undefined;
  return part?.pins.find((p) => p.id === pinId)?.name.toUpperCase() ?? '';
};

const labelOf = (doc: CircuitDoc, componentId: string): string =>
  doc.components.find((c) => c.id === componentId)?.label ?? componentId;

export function runChecks(
  doc: CircuitDoc,
  netlist: NetlistResult,
  getPart: (t: string) => PartDef | undefined,
): CheckIssue[] {
  const issues: CheckIssue[] = [];
  let seq = 0;
  const push = (level: CheckIssue['level'], title: string, detail?: string, target?: string) => {
    seq += 1;
    issues.push({ id: `chk_${seq}`, level, title, detail, target });
  };

  const gndNet = netlist.nets.find((n) => n.isPower && n.name.startsWith('GND'));
  const vccNet = netlist.nets.find((n) => n.isPower && n.name.startsWith('VCC'));

  if (!gndNet) {
    push('error', '缺少参考地', '电路中没有任何 GND 网络，模拟/数字电平都缺少参考。', 'GND');
  }
  if (!vccNet && (doc.domain === 'digital' || doc.domain === 'mcs51' || doc.domain === 'stm32')) {
    push('warn', '未连接 VCC 电源', 'VCC 未出现：数字器件将使用默认高电平输入模型，建议接 5V。', 'VCC');
  }

  for (const net of netlist.nets) {
    let hasVcc = false;
    let hasGnd = false;
    for (const p of net.pins) {
      const name = pinName(doc, getPart, p.componentId, p.pinId);
      if (name === 'VCC' || name === 'VDD' || name === '5V') hasVcc = true;
      if (name === 'GND' || name === 'VSS') hasGnd = true;
    }
    if (hasVcc && hasGnd) {
      push('error', `VCC 与 GND 短路`, `网络 ${net.name} 同时连接了电源与地，仿真前必须断开。`, net.name);
    }
  }

  if (netlist.unconnected.length > 0) {
    const inputs = netlist.unconnected.filter((p) => {
      const comp = doc.components.find((c) => c.id === p.componentId);
      const part = comp ? getPart(comp.type) : undefined;
      const pin = part?.pins.find((x) => x.id === p.pinId);
      return pin?.kind === 'input' && part?.type.startsWith('74');
    });
    if (inputs.length > 0) {
      const list = inputs
        .slice(0, 4)
        .map((p) => `${labelOf(doc, p.componentId)}.${p.pinId}`)
        .join('、');
      push('warn', '74LS 输入悬空', `${list}${inputs.length > 4 ? ' 等' : ''} 未连接，TTL 悬空按高电平处理。`);
    }
    const others = netlist.unconnected.filter((p) => !inputs.includes(p));
    if (others.length > 0) {
      push(
        'info',
        `未连接引脚 ${others.length} 个`,
        others
          .slice(0, 5)
          .map((p) => `${labelOf(doc, p.componentId)}.${p.pinId}`)
          .join('、'),
      );
    }
  } else {
    push('pass', '全部引脚已连接', '当前原理图没有悬空引脚。');
  }

  // 输出冲突
  for (const net of netlist.nets) {
    const outputs = net.pins.filter((p) => {
      const comp = doc.components.find((c) => c.id === p.componentId);
      const part = comp ? getPart(comp.type) : undefined;
      return part?.pins.find((x) => x.id === p.pinId)?.kind === 'output';
    });
    if (outputs.length > 1) {
      push('warn', `网络 ${net.name} 存在多个输出`, '多个输出直接并接会产生驱动冲突，请检查三态/开集连接。', net.name);
    }
  }

  // LED 限流
  for (const comp of doc.components) {
    if (comp.type !== 'LED') continue;
    const anodeNet = netlist.pinNet.get(`${comp.id}:A`);
    if (!anodeNet) continue;
    const net = netlist.nets.find((n) => n.id === anodeNet);
    if (!net) continue;
    const hasResistor = net.pins.some((p) => doc.components.find((c) => c.id === p.componentId)?.type === 'RESISTOR');
    if (!hasResistor) push('warn', `${comp.label} 缺少限流电阻`, 'LED 直接接电源可能过流，建议串联 220Ω–1kΩ 电阻。', comp.id);
  }

  const mcu = doc.components.find((c) => c.type === 'MCU51' || c.type === 'STM32');
  if (mcu) {
    if (!doc.firmware) {
      push('warn', `${mcu.label} 未烧录固件`, '在底坞“固件”面板载入 Intel HEX 后运行。', mcu.id);
    } else if (mcu.type === 'MCU51') {
      const parsed = parseIntelHex(doc.firmware.hex);
      if (parsed.errors.length > 0) {
        push('error', '固件 HEX 校验失败', parsed.errors.slice(0, 2).join('；'), mcu.id);
      } else {
        push(
          'pass',
          `固件已载入 · ${parsed.size} B`,
          `${doc.firmware.name} 覆盖 0x${parsed.minAddress.toString(16).toUpperCase()}–0x${parsed.maxAddress.toString(16).toUpperCase()}。`,
          mcu.id,
        );
      }
    } else {
      push('info', `STM32 固件已载入`, `${doc.firmware.name} · ${doc.firmware.size} B（WASM 内核将在 Phase 7 接入）`, mcu.id);
    }
  }

  if (doc.wires.length === 0) {
    push('info', '画布还是空的', '从左侧拖入器件，点击引脚开始连线。');
  } else if (!issues.some((i) => i.level === 'error')) {
    push('pass', '电源与地检查通过', '未发现电源短路，网络命名稳定，可导出 AI 网表。');
  }

  return issues;
}
