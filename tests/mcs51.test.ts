import { describe, expect, it } from 'vitest';
import { Mcs51 } from '../src/engines/mcs51/cpu';
import { parseIntelHex } from '../src/engines/mcs51/hex';
import { BLINK51_HEX } from '../src/examples/firmware';

function program(entries: Array<[number, number[]]>): Uint8Array {
  const image = new Uint8Array(0x10000);
  for (const [addr, bytes] of entries) image.set(bytes, addr);
  return image;
}

const runSteps = (cpu: Mcs51, steps: number) => {
  for (let i = 0; i < steps; i += 1) cpu.run(4);
};

describe('Intel HEX 解析', () => {
  it('解析 blink51.hex 并校验和', () => {
    const parsed = parseIntelHex(BLINK51_HEX);
    expect(parsed.errors).toEqual([]);
    expect(parsed.size).toBe(48);
    expect(parsed.maxAddress).toBe(0x2f);
    expect(parsed.bytes[0]).toBe(0x75);
    expect(parsed.bytes[1]).toBe(0x90);
  });
});

describe('MCS-51 指令集', () => {
  it('MOV / ADD / MUL / DA', () => {
    const cpu = new Mcs51();
    cpu.loadBytes(
      program([
        [0x0000, [0x75, 0x90, 0x00]], // MOV P1,#0
        [0x0003, [0x74, 0x09]], // MOV A,#9
        [0x0005, [0x24, 0x01]], // ADD A,#1
        [0x0007, [0xd4]], // DA A → 0x10
        [0x0008, [0x75, 0xf0, 0x03]], // MOV B,#3
        [0x000b, [0x74, 0x05]], // MOV A,#5
        [0x000d, [0xa4]], // MUL AB → 15
        [0x000e, [0x80, 0xfe]], // SJMP $
      ]),
    );
    runSteps(cpu, 10);
    const snap = cpu.snapshot();
    expect(snap.a).toBe(15);
    expect(snap.b).toBe(0);
    expect(snap.psw & 0x04).toBe(0);
  });

  it('LCALL / RET 与 DJNZ 循环', () => {
    const cpu = new Mcs51();
    cpu.loadBytes(
      program([
        [0x0000, [0x7f, 0x03]], // MOV R7,#3
        [0x0002, [0x12, 0x00, 0x10]], // LOOP: LCALL 0x0010
        [0x0005, [0xdf, 0xfb]], // DJNZ R7,LOOP
        [0x0007, [0x80, 0xfe]], // SJMP $
        [0x0010, [0x04]], // INC A
        [0x0011, [0x22]], // RET
      ]),
    );
    runSteps(cpu, 40);
    expect(cpu.snapshot().a).toBe(3);
  });

  it('位操作 SETB / CPL / CLR P1.0', () => {
    const cpu = new Mcs51();
    cpu.loadBytes(
      program([
        [0x0000, [0xd2, 0x90]], // SETB P1.0
        [0x0002, [0xb2, 0x90]], // CPL P1.0
        [0x0004, [0xc2, 0x90]], // CLR P1.0
        [0x0006, [0xd2, 0x90]], // SETB P1.0
        [0x0008, [0x80, 0xfe]],
      ]),
    );
    runSteps(cpu, 6);
    expect(cpu.snapshot().latches[1] & 1).toBe(1);
  });

  it('端口读取反映外部引脚电平', () => {
    const cpu = new Mcs51();
    cpu.loadBytes(
      program([
        [0x0000, [0xe5, 0x90]], // MOV A,P1
        [0x0002, [0x80, 0xfe]],
      ]),
    );
    cpu.setPortPins(1, 0xfe);
    runSteps(cpu, 2);
    expect(cpu.snapshot().a).toBe(0xfe);
  });

  it('定时器 0 溢出并进入中断', () => {
    const cpu = new Mcs51();
    cpu.loadBytes(
      program([
        [0x0000, [0x02, 0x00, 0x30]], // LJMP 0x0030
        [0x000b, [0xb2, 0x90, 0x32]], // CPL P1.0 ; RETI
        [0x0030, [0x75, 0x89, 0x01]], // MOV TMOD,#01
        [0x0033, [0x75, 0x8c, 0xff]], // MOV TH0,#FF
        [0x0036, [0x75, 0x8a, 0xf0]], // MOV TL0,#F0
        [0x0039, [0xd2, 0xa9]], // SETB ET0
        [0x003b, [0xd2, 0xaf]], // SETB EA
        [0x003d, [0xd2, 0x8c]], // SETB TR0
        [0x003f, [0x80, 0xfe]], // SJMP $
      ]),
    );
    const seen = new Set<number>();
    for (let i = 0; i < 400; i += 1) {
      cpu.run(2);
      seen.add(cpu.snapshot().latches[1] & 1);
    }
    expect(seen.has(0)).toBe(true);
    expect(seen.has(1)).toBe(true);
  });

  it('UART 写 SBUF 产生发送字节与 TI', () => {
    const cpu = new Mcs51();
    cpu.loadBytes(
      program([
        [0x0000, [0x75, 0x99, 0x41]], // MOV SBUF,#'A'
        [0x0003, [0x80, 0xfe]],
      ]),
    );
    runSteps(cpu, 2);
    expect(cpu.takeTxBytes()).toEqual([0x41]);
    expect(cpu.snapshot().uartTx).toBe(0);
  });
});

describe('blink51 固件端到端', () => {
  it('运行后 P1.0 持续翻转', () => {
    const cpu = new Mcs51(BLINK51_HEX);
    const seen = new Set<number>();
    for (let i = 0; i < 40; i += 1) {
      cpu.run(100_000);
      seen.add(cpu.snapshot().latches[1] & 1);
    }
    expect([...seen].sort()).toEqual([0, 1]);
    expect(cpu.snapshot().codeSize).toBe(48);
  });
});

describe('51 示例与数字引擎联动', () => {
  it('运行固件后 P1.0 与 LED 阳极网络同步翻转', async () => {
    const { DigitalEngine } = await import('../src/engines/digital/engine');
    const { buildMcs51Example } = await import('../src/examples');
    const engine = new DigitalEngine(buildMcs51Example());
    const port = new Set<string>();
    const led = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      engine.tick(0.05);
      const levels = engine.snapshot().pinLevels;
      port.add(String(levels['MCU1:P1.0']));
      led.add(String(levels['LED1:A']));
    }
    console.log('[mcu] P1.0 电平集合', [...port].join(','), 'LED A 电平集合', [...led].join(','));
    expect(port.has('0')).toBe(true);
    expect(port.has('1')).toBe(true);
    expect(led.has('0')).toBe(true);
    expect(led.has('1')).toBe(true);
    const mcu = engine.mcuSnapshot();
    expect(mcu?.state.codeSize).toBe(48);
    expect(mcu?.state.cycles ?? 0).toBeGreaterThan(1_000_000);
  });
});
