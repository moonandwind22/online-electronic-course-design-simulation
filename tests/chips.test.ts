import { describe, expect, it } from 'vitest';
import { DigitalEngine } from '../src/engines/digital/engine';
import { createDoc } from '../src/examples/helpers';
import { comp } from '../src/examples/helpers';
import type { CircuitDoc, Component } from '../src/model/types';
import type { LinkSpec } from '../src/examples/helpers';

let seq = 0;
const build = (components: Component[], links: LinkSpec[]): CircuitDoc =>
  createDoc(`t_${++seq}`, 'digital', `test_${seq}`, '', components, links);

const sw = (id: string, closed: boolean, x = 100, y = 100): Component =>
  comp(id, 'LOGIC_SWITCH', x, y, id, {}, { state: { closed } });

const vcc = (id = 'VCC1'): Component => comp(id, 'VCC', 0, 0, id);
const gnd = (id = 'GND1'): Component => comp(id, 'GND', 0, 0, id);

const chip = (id: string, type: string): Component => comp(id, type, 300, 100, id);

describe('74LS 门与缓冲器', () => {
  it('74LS00 真值表与运行时开关切换', () => {
    const a = sw('SWA', true);
    const b = sw('SWB', true);
    const u = chip('U1', '74LS00');
    const doc = build([a, b, u], [
      { from: ['SWA', 'OUT'], to: ['U1', '1A'] },
      { from: ['SWB', 'OUT'], to: ['U1', '1B'] },
    ]);
    const engine = new DigitalEngine(doc);
    expect(engine.snapshot().pinLevels['U1:1Y']).toBe(0);
    engine.setControls([{ ...a, state: { closed: false } }]);
    expect(engine.snapshot().pinLevels['U1:1Y']).toBe(1);
    expect(engine.snapshot().pinLevels['U1:2Y']).toBe(1);
  });

  it('74LS04 反相器与 74LS125 三态缓冲', () => {
    const a = sw('SWA', true);
    const oe = sw('SWOE', true);
    const u1 = chip('U1', '74LS04');
    const u2 = chip('U2', '74LS125');
    const doc = build([a, oe, u1, u2], [
      { from: ['SWA', 'OUT'], to: ['U1', '1A'] },
      { from: ['U1', '1Y'], to: ['U2', '1A'] },
      { from: ['SWOE', 'OUT'], to: ['U2', '1OE'] },
    ]);
    const engine = new DigitalEngine(doc);
    expect(engine.snapshot().pinLevels['U1:1Y']).toBe(0);
    expect(engine.snapshot().pinLevels['U2:1Y']).toBe('z');
    engine.setControls([{ ...oe, state: { closed: false } }]);
    expect(engine.snapshot().pinLevels['U2:1Y']).toBe(0);
  });
});

describe('触发器与锁存器', () => {
  it('74LS74 构成二分频（Q̄ 反馈到 D）', () => {
    const clk = comp('CLK1', 'CLOCK', 100, 100, 'CLK1', { freq: 10 });
    const u = chip('U1', '74LS74');
    const doc = build([clk, u], [
      { from: ['CLK1', 'OUT'], to: ['U1', '1CLK'] },
      { from: ['U1', '1QN'], to: ['U1', '1D'] },
    ]);
    const engine = new DigitalEngine(doc);
    engine.tick(0.06);
    expect(engine.snapshot().pinLevels['U1:1Q']).toBe(1);
    engine.tick(0.05);
    expect(engine.snapshot().pinLevels['U1:1Q']).toBe(1);
    engine.tick(0.05);
    expect(engine.snapshot().pinLevels['U1:1Q']).toBe(0);
  });

  it('74LS373 透明锁存与保持', () => {
    const d = sw('SWD', false);
    const le = sw('SWLE', true);
    const g = gnd();
    const u = chip('U1', '74LS373');
    const doc = build([d, le, g, u], [
      { from: ['SWD', 'OUT'], to: ['U1', '1D'] },
      { from: ['SWLE', 'OUT'], to: ['U1', 'LE'] },
      { from: ['GND1', '1'], to: ['U1', 'OE'] },
    ]);
    const engine = new DigitalEngine(doc);
    expect(engine.snapshot().pinLevels['U1:1Q']).toBe(0);
    engine.setControls([{ ...d, state: { closed: true } }]);
    expect(engine.snapshot().pinLevels['U1:1Q']).toBe(1);
    engine.setControls([{ ...le, state: { closed: false } }]);
    engine.setControls([{ ...d, state: { closed: false } }]);
    expect(engine.snapshot().pinLevels['U1:1Q']).toBe(1);
    engine.setControls([{ ...le, state: { closed: true } }]);
    expect(engine.snapshot().pinLevels['U1:1Q']).toBe(0);
  });

  it('74LS175 四 D 触发器共用时钟与清零', () => {
    const clk = comp('CLK1', 'CLOCK', 100, 100, 'CLK1', { freq: 10 });
    const d0 = sw('SWD0', true);
    const u = chip('U1', '74LS175');
    const doc = build([clk, d0, u], [
      { from: ['CLK1', 'OUT'], to: ['U1', 'CP'] },
      { from: ['SWD0', 'OUT'], to: ['U1', 'D0'] },
    ]);
    const engine = new DigitalEngine(doc);
    engine.tick(0.06);
    expect(engine.snapshot().pinLevels['U1:Q0']).toBe(1);
    expect(engine.snapshot().pinLevels['U1:Q1']).toBe(0);
  });
});

describe('计数器与移位寄存器', () => {
  it('74LS163 同步清零零位与计数', () => {
    const clk = comp('CLK1', 'CLOCK', 100, 100, 'CLK1', { freq: 10 });
    const clr = sw('SWCLR', false);
    const u = chip('U1', '74LS163');
    const doc = build([clk, clr, u], [
      { from: ['CLK1', 'OUT'], to: ['U1', 'CLK'] },
      { from: ['SWCLR', 'OUT'], to: ['U1', 'CLR'] },
    ]);
    const engine = new DigitalEngine(doc);
    engine.tick(0.16);
    expect(engine.snapshot().pinLevels['U1:QA']).toBe(0);
    expect(engine.snapshot().pinLevels['U1:QB']).toBe(1);
    engine.setControls([{ ...clr, state: { closed: false } }]);
    engine.tick(0.1);
    expect(engine.snapshot().pinLevels['U1:QA']).toBe(0);
    expect(engine.snapshot().pinLevels['U1:QB']).toBe(0);
  });

  it('74LS393 下降沿计数', () => {
    const clk = comp('CLK1', 'CLOCK', 100, 100, 'CLK1', { freq: 10 });
    const g = gnd();
    const u = chip('U1', '74LS393');
    const doc = build([clk, g, u], [
      { from: ['CLK1', 'OUT'], to: ['U1', '1CLK'] },
      { from: ['GND1', '1'], to: ['U1', '1CLR'] },
    ]);
    const engine = new DigitalEngine(doc);
    engine.tick(0.21);
    expect(engine.snapshot().pinLevels['U1:1QA']).toBe(0);
    expect(engine.snapshot().pinLevels['U1:1QB']).toBe(1);
  });

  it('74HC595 串入并出 + 输出锁存', () => {
    const clk = comp('CLK1', 'CLOCK', 100, 100, 'CLK1', { freq: 10 });
    const v = vcc();
    const g = gnd();
    const u = chip('U1', '74HC595');
    const doc = build([clk, v, g, u], [
      { from: ['CLK1', 'OUT'], to: ['U1', 'SRCLK'] },
      { from: ['CLK1', 'OUT'], to: ['U1', 'RCLK'] },
      { from: ['VCC1', '1'], to: ['U1', 'SER'] },
      { from: ['VCC1', '1'], to: ['U1', 'SRCLR'] },
      { from: ['GND1', '1'], to: ['U1', 'OE'] },
    ]);
    const engine = new DigitalEngine(doc);
    engine.tick(0.16);
    const pins = engine.snapshot().pinLevels;
    expect(pins['U1:QA']).toBe(1);
    expect(pins['U1:QB']).toBe(1);
    expect(pins['U1:QC']).toBe(0);
  });
});

describe('译码、选择与运算', () => {
  it('74LS138 高有效使能与低有效输出', () => {
    const a = sw('SWA', true);
    const b = sw('SWB', false);
    const c = sw('SWC', false);
    const v = vcc();
    const g = gnd();
    const u = chip('U1', '74LS138');
    const doc = build([a, b, c, v, g, u], [
      { from: ['SWA', 'OUT'], to: ['U1', 'A'] },
      { from: ['SWB', 'OUT'], to: ['U1', 'B'] },
      { from: ['SWC', 'OUT'], to: ['U1', 'C'] },
      { from: ['VCC1', '1'], to: ['U1', 'G1'] },
      { from: ['GND1', '1'], to: ['U1', 'G2A'] },
      { from: ['GND1', '1'], to: ['U1', 'G2B'] },
    ]);
    const pins = new DigitalEngine(doc).snapshot().pinLevels;
    expect(pins['U1:Y1']).toBe(0);
    expect(pins['U1:Y0']).toBe(1);
    expect(pins['U1:Y2']).toBe(1);
  });

  it('74LS283 四位加法器', () => {
    const v = vcc();
    const g = gnd();
    const u = chip('U1', '74LS283');
    const links: LinkSpec[] = [
      { from: ['VCC1', '1'], to: ['U1', 'A1'] },
      { from: ['VCC1', '1'], to: ['U1', 'A2'] },
      { from: ['VCC1', '1'], to: ['U1', 'B1'] },
      { from: ['GND1', '1'], to: ['U1', 'A3'] },
      { from: ['GND1', '1'], to: ['U1', 'A4'] },
      { from: ['GND1', '1'], to: ['U1', 'B2'] },
      { from: ['GND1', '1'], to: ['U1', 'B3'] },
      { from: ['GND1', '1'], to: ['U1', 'B4'] },
      { from: ['GND1', '1'], to: ['U1', 'C0'] },
    ];
    const pins = new DigitalEngine(build([v, g, u], links)).snapshot().pinLevels;
    // 3 + 1 = 4
    expect(pins['U1:S0']).toBe(0);
    expect(pins['U1:S1']).toBe(0);
    expect(pins['U1:S2']).toBe(1);
    expect(pins['U1:S3']).toBe(0);
    expect(pins['U1:C4']).toBe(0);
  });

  it('74LS85 四位比较器', () => {
    const v = vcc();
    const g = gnd();
    const u = chip('U1', '74LS85');
    const links: LinkSpec[] = [
      { from: ['VCC1', '1'], to: ['U1', 'A0'] },
      { from: ['VCC1', '1'], to: ['U1', 'A2'] },
      { from: ['VCC1', '1'], to: ['U1', 'B0'] },
      { from: ['VCC1', '1'], to: ['U1', 'B1'] },
      { from: ['VCC1', '1'], to: ['U1', 'IEQ'] },
      { from: ['GND1', '1'], to: ['U1', 'A1'] },
      { from: ['GND1', '1'], to: ['U1', 'A3'] },
      { from: ['GND1', '1'], to: ['U1', 'B2'] },
      { from: ['GND1', '1'], to: ['U1', 'B3'] },
      { from: ['GND1', '1'], to: ['U1', 'IGT'] },
      { from: ['GND1', '1'], to: ['U1', 'ILT'] },
    ];
    const pins = new DigitalEngine(build([v, g, u], links)).snapshot().pinLevels;
    // A=5, B=3
    expect(pins['U1:OGT']).toBe(1);
    expect(pins['U1:OEQ']).toBe(0);
    expect(pins['U1:OLT']).toBe(0);
  });

  it('CD4017 十进制分配输出', () => {
    const clk = comp('CLK1', 'CLOCK', 100, 100, 'CLK1', { freq: 10 });
    const g = gnd();
    const u = chip('U1', 'CD4017');
    const doc = build([clk, g, u], [
      { from: ['CLK1', 'OUT'], to: ['U1', 'CLK'] },
      { from: ['GND1', '1'], to: ['U1', 'CLK_EN'] },
      { from: ['GND1', '1'], to: ['U1', 'RST'] },
    ]);
    const engine = new DigitalEngine(doc);
    engine.tick(0.06);
    let pins = engine.snapshot().pinLevels;
    expect(pins['U1:Q1']).toBe(1);
    expect(pins['U1:Q0']).toBe(0);
    engine.tick(0.1);
    pins = engine.snapshot().pinLevels;
    expect(pins['U1:Q2']).toBe(1);
  });
});
