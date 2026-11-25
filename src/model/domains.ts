import type { Domain } from '../model/types';

export interface DomainMeta {
  id: Domain;
  label: string;
  short: string;
  description: string;
  engine: string;
  accent: string;
}

export const DOMAINS: DomainMeta[] = [
  {
    id: 'digital',
    label: '数字电路',
    short: '数电',
    description: '74LS / CD4000 逻辑器件，事件驱动仿真与逻辑分析仪。',
    engine: '数字引擎 · 事件驱动',
    accent: 'var(--golden-chart-2)',
  },
  {
    id: 'analog',
    label: '模拟电路',
    short: '模电',
    description: 'MNA 求解器、工作点分析与双通道示波器。',
    engine: 'brownout · MNA',
    accent: 'var(--golden-chart-4)',
  },
  {
    id: 'power',
    label: '电力电子',
    short: '电力电子',
    description: 'Buck / Boost / 整流拓扑，功率器件与纹波测量。',
    engine: 'brownout · 功率',
    accent: 'var(--golden-chart-5)',
  },
  {
    id: 'mcs51',
    label: '51 单片机',
    short: '51',
    description: 'MCS-51 内核、Intel HEX 烧录、SFR 与串口终端。',
    engine: 'MCS-51 · 自研内核',
    accent: 'var(--golden-chart-3)',
  },
  {
    id: 'stm32',
    label: 'STM32',
    short: 'STM32',
    description: 'STM32F103C8T6 Blue Pill、WASM 全系统仿真。',
    engine: 'stm32f1-emu · WASM',
    accent: 'var(--golden-chart-1)',
  },
];

export const domainMeta = (domain: Domain): DomainMeta =>
  DOMAINS.find((d) => d.id === domain) ?? DOMAINS[0];
