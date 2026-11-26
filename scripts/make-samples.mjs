// 生成示例 Intel HEX 固件（手写机器码 + 校验和）。
// 用法：node scripts/make-samples.mjs
// 输出：public/firmware/*.hex

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'public/firmware');
mkdirSync(outDir, { recursive: true });

// ---------- Intel HEX ----------

function checksum(bytes) {
  let sum = 0;
  for (const b of bytes) sum = (sum + b) & 0xff;
  return (0x100 - sum) & 0xff;
}

function record(type, addr, data) {
  const bytes = [data.length, (addr >> 8) & 0xff, addr & 0xff, type, ...data];
  const cs = checksum(bytes);
  return ':' + [...bytes, cs].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function toIntelHex(baseAddress, bytes, bytesPerRecord = 16) {
  const lines = [];
  lines.push(record(0x04, 0, [(baseAddress >>> 24) & 0xff, (baseAddress >>> 16) & 0xff, 0, 0]));
  for (let offset = 0; offset < bytes.length; offset += bytesPerRecord) {
    const chunk = bytes.slice(offset, offset + bytesPerRecord);
    lines.push(record(0x00, (baseAddress + offset) & 0xffff, [...chunk]));
  }
  lines.push(':00000001FF');
  return lines.join('\n') + '\n';
}

// ---------- Tiny Thumb assembler helpers ----------

const u16 = (v) => [v & 0xff, (v >> 8) & 0xff];
const u32 = (v) => [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];

/** 生成 STM32F103 PC13 闪烁固件（Thumb/Cortex-M3 机器码）。 */
function buildBlinkStm32() {
  const FLASH = 0x08000000;
  const RCC_APB2ENR = 0x40021018;
  const GPIOC_CRH = 0x40011004;
  const GPIOC_ODR = 0x4001100c;
  const CRH_VALUE = 0x00200000; // PC13: MODE=10 (输出 2MHz), CNF=00 (推挽)
  const ODR_MASK = 0x00002000; // PC13
  const DELAY = 0x000c3500; // ~800k 次循环
  const RESET = 0x08;
  const SP = 0x20005000;

  const code = []; // 从 RESET 开始的字节
  const labels = new Map();
  const literals = [];
  const pos = () => FLASH + RESET + code.length;

  const emit16 = (v) => code.push(...u16(v));
  const label = (name) => labels.set(name, pos());
  // LDR (literal): 0100 1 Rt imm8，字面量池在代码末尾，回填阶段计算偏移。
  const ldrPatches = [];
  const ldr = (rt, value) => {
    if (!literals.includes(value)) literals.push(value);
    ldrPatches.push({ at: code.length, rt, value });
    code.push(0, 0);
  };
  const movs = (rd, imm8) => emit16(0x2000 | (rd << 8) | imm8);
  const str = (rt, rn) => emit16(0x6000 | (rn << 3) | rt);
  const eors = (rd, rm) => emit16(0x4040 | (rm << 3) | rd);
  const lsls = (rd, rm, imm5) => emit16((imm5 << 6) | (rm << 3) | rd);
  const subsImm = (rd, imm8) => emit16(0x3800 | (rd << 8) | imm8);
  const bneBack = () => emit16(0xd1fd);
  const bLabel = (name) => {
    // 占位，稍后回填
    code.push(0xe0, 0x00);
    return { at: code.length - 2, name };
  };

  // reset handler
  label('reset');
  ldr(0, RCC_APB2ENR);
  movs(1, 0x10); // IOPCEN
  str(1, 0);
  ldr(0, GPIOC_CRH);
  ldr(1, CRH_VALUE);
  str(1, 0);
  ldr(0, GPIOC_ODR);
  ldr(1, ODR_MASK);
  movs(2, 1);
  lsls(2, 2, 13); // R2 = 0x2000
  label('loop');
  str(1, 0);
  eors(1, 2);
  ldr(3, DELAY);
  label('dloop');
  subsImm(3, 1);
  bneBack();
  const back = bLabel('loop');

  // 对齐到 4 字节后放字面量池
  while ((FLASH + RESET + code.length) % 4 !== 0) code.push(0);
  // literalOffsets 记录相对代码起始（RESET）的偏移，因此基准取 FLASH + RESET。
  const literalBase = FLASH + RESET;
  const literalOffsets = new Map();
  literals.forEach((value, i) => {
    literalOffsets.set(value, code.length);
    code.push(...u32(value));
  });

  // 回填 LDR 字面量
  for (const patch of ldrPatches) {
    const addr = FLASH + RESET + patch.at;
    const pc = (addr + 4) & ~3;
    const target = literalBase + literalOffsets.get(patch.value);
    const imm8 = (target - pc) / 4;
    if (!Number.isInteger(imm8) || imm8 < 0 || imm8 > 255) {
      throw new Error(`LDR 字面量超出范围: ${patch.value.toString(16)}`);
    }
    const word = 0x4800 | (patch.rt << 8) | imm8;
    code[patch.at] = word & 0xff;
    code[patch.at + 1] = word >> 8;
  }

  // 回填 B
  {
    const addr = FLASH + RESET + back.at;
    const target = labels.get(back.name);
    const delta = target - (addr + 4);
    const imm11 = delta / 2;
    if (!Number.isInteger(imm11) || imm11 < -2048 || imm11 > 2047) {
      throw new Error('B 跳转超出范围');
    }
    const word = 0xe000 | (imm11 & 0x7ff);
    code[back.at] = word & 0xff;
    code[back.at + 1] = word >> 8;
  }

  // 向量表 + 代码
  const image = [...u32(SP), ...u32(FLASH + RESET + 1), ...code];
  return toIntelHex(FLASH, image);
}

// ---------- 51 单片机示例固件 ----------

/** STC89C52RC：P1 口流水灯（P1.0 先亮，约 0.2s 移位）。 */
function buildBlink51() {
  // 0000: 75 90 FE      MOV P1,#0FEH   （P1.0 初始为低）
  // 0003: B2 90         LOOP: CPL P1.0
  // 0005: 12 00 10      LCALL DELAY
  // 0008: 80 F9         SJMP LOOP
  // 0010: 7F 04         DELAY: MOV R7,#4
  // 0012: 7E FF         D1: MOV R6,#255
  // 0014: 7D FF         D2: MOV R5,#255
  // 0016: DD FE         D3: DJNZ R5,D3
  // 0018: DE FA         DJNZ R6,D2
  // 001A: DF F6         DJNZ R7,D1
  // 001C: 22            RET
  const bytes = new Uint8Array(0x30);
  const put = (addr, ...b) => bytes.set(b, addr);
  put(0x0000, 0x75, 0x90, 0xfe); // MOV P1,#0FEH
  put(0x0003, 0xb2, 0x90); // LOOP: CPL P1.0
  put(0x0005, 0x12, 0x00, 0x10); // LCALL DELAY
  put(0x0008, 0x80, 0xf9); // SJMP LOOP（下一条 PC=0x000A，目标 0x0003）
  // DELAY 子程序：约 0.8s @12MHz（三层嵌套）
  put(0x0010, 0x7f, 0x04); // MOV R7,#4
  put(0x0012, 0x7e, 0xff); // D1: MOV R6,#255
  put(0x0014, 0x7d, 0xff); // D2: MOV R5,#255
  put(0x0016, 0xdd, 0xfe); // D3: DJNZ R5,D3
  put(0x0018, 0xde, 0xfa); // DJNZ R6,D2
  put(0x001a, 0xdf, 0xf6); // DJNZ R7,D1
  put(0x001c, 0x22); // RET
  return toIntelHex(0x0000, [...bytes]);
}

const blinkStm32 = buildBlinkStm32();
const blink51 = buildBlink51();
writeFileSync(resolve(outDir, 'blink_stm32.hex'), blinkStm32);
writeFileSync(resolve(outDir, 'blink51.hex'), blink51);

// 同步生成供示例工程内嵌的固件常量（避免运行时 fetch public 资源）。
const dataSize = (hex) =>
  hex
    .split(/\r?\n/)
    .filter((line) => line.startsWith(':') && line.length >= 11 && line.slice(7, 9) === '00')
    .reduce((sum, line) => sum + parseInt(line.slice(1, 3), 16), 0);
const firmwareTs = `// 由 scripts/make-samples.mjs 自动生成，请勿手工编辑。
export const BLINK51_HEX = ${JSON.stringify(blink51)};
export const BLINK51_SIZE = ${dataSize(blink51)};
export const BLINK_STM32_HEX = ${JSON.stringify(blinkStm32)};
export const BLINK_STM32_SIZE = ${dataSize(blinkStm32)};
`;
writeFileSync(resolve(root, 'src/examples/firmware.ts'), firmwareTs);
console.log('已生成 public/firmware/*.hex 与 src/examples/firmware.ts');
