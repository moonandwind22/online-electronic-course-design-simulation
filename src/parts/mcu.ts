import type { PartDef, PinDef } from './types';

function boardPins(
  width: number,
  left: { id: string; name: string; dir?: PinDef['dir'] }[],
  right: { id: string; name: string; dir?: PinDef['dir'] }[],
  top = 16,
): PinDef[] {
  const pins: PinDef[] = [];
  left.forEach((p, i) => {
    pins.push({ id: p.id, name: p.name, x: -14, y: top + i * 10, side: 'left', dir: p.dir ?? 'io' });
  });
  right.forEach((p, i) => {
    pins.push({ id: p.id, name: p.name, x: width + 14, y: top + i * 10, side: 'right', dir: p.dir ?? 'io' });
  });
  return pins;
}

const mcu51Left = [
  ...Array.from({ length: 8 }, (_, i) => ({ id: `P1.${i}`, name: `P1.${i}` })),
  { id: 'P3.0', name: 'P3.0/RXD' },
  { id: 'P3.1', name: 'P3.1/TXD' },
  { id: 'P3.2', name: 'P3.2/INT0' },
  { id: 'P3.3', name: 'P3.3/INT1' },
  { id: 'P3.4', name: 'P3.4/T0' },
  { id: 'P3.5', name: 'P3.5/T1' },
  { id: 'P3.6', name: 'P3.6/WR' },
  { id: 'P3.7', name: 'P3.7/RD' },
];

const mcu51Right = [
  ...Array.from({ length: 8 }, (_, i) => ({ id: `P0.${i}`, name: `P0.${i}` })),
  ...Array.from({ length: 8 }, (_, i) => ({ id: `P2.${i}`, name: `P2.${i}` })),
  { id: 'RST', name: 'RST', dir: 'in' as const },
  { id: 'VCC', name: 'VCC', dir: 'power' as const },
  { id: 'GND', name: 'GND', dir: 'power' as const },
];

const mcu51: PartDef = {
  type: 'MCU51',
  name: '51 最小系统板',
  subtitle: 'STC89C52RC',
  category: 'mcu',
  domains: ['mcs51'],
  description: 'STC89C52RC 最小系统：12 MHz 时钟、P0 开漏、P1–P3 准双向口、串口与定时器。',
  width: 156,
  height: (Math.max(mcu51Left.length, mcu51Right.length) - 1) * 10 + 32,
  refPrefix: 'MCU',
  pins: boardPins(156, mcu51Left, mcu51Right),
  symbol: { kind: 'board', variant: 'mcu51' },
  keywords: ['51', 'STC89C52', '单片机', 'MCS-51'],
};

const stm32Left = [
  ...Array.from({ length: 8 }, (_, i) => ({ id: `PA${i}`, name: `PA${i}` })),
  { id: 'PA9', name: 'PA9/TX1' },
  { id: 'PA10', name: 'PA10/RX1' },
  ...Array.from({ length: 5 }, (_, i) => ({ id: `PB${i}`, name: `PB${i}` })),
  { id: '3V3', name: '3V3', dir: 'power' as const },
  { id: 'GND', name: 'GND', dir: 'power' as const },
];

const stm32Right = [
  ...Array.from({ length: 11 }, (_, i) => ({ id: `PB${i + 5}`, name: `PB${i + 5}` })),
  { id: 'PC13', name: 'PC13/LED' },
  { id: 'PC14', name: 'PC14' },
  { id: 'PC15', name: 'PC15' },
  { id: 'NRST', name: 'NRST', dir: 'in' as const },
];

const stm32: PartDef = {
  type: 'STM32_BOARD',
  name: 'STM32 Blue Pill',
  subtitle: 'STM32F103C8T6',
  category: 'mcu',
  domains: ['stm32'],
  description: 'STM32F103C8T6 最小系统板：Cortex-M3 @72 MHz、64 KB Flash、20 KB RAM、PC13 板载 LED、USART1。',
  width: 170,
  height: (Math.max(stm32Left.length, stm32Right.length) - 1) * 10 + 32,
  refPrefix: 'MCU',
  pins: boardPins(170, stm32Left, stm32Right),
  symbol: { kind: 'board', variant: 'stm32' },
  keywords: ['STM32', 'STM32F103', 'Blue Pill', 'ARM'],
};

export const MCU_PARTS: PartDef[] = [mcu51, stm32];
