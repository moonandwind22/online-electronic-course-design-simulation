import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SimEngine } from 'brownout';
import { STM32F1 } from 'stm32f1-emu';

describe('Spike A · brownout RC 阶跃', () => {
  it('1τ 时电容电压约为 3.16V', () => {
    const engine = new SimEngine();
    engine.setIntegrationMethod('trap');
    engine.load({
      components: [
        { id: 'v1', kind: 'voltage_source', pins: [{ id: 'pos' }, { id: 'neg' }], params: { voltage: 5 } },
        { id: 'r1', kind: 'resistor', pins: [{ id: 'a' }, { id: 'b' }], params: { resistance: 1000 } },
        { id: 'c1', kind: 'capacitor', pins: [{ id: 'a' }, { id: 'b' }], params: { capacitance: 1e-6 } },
      ],
      wires: [
        { from_component: 'v1', from_pin: 'pos', to_component: 'r1', to_pin: 'a' },
        { from_component: 'r1', from_pin: 'b', to_component: 'c1', to_pin: 'a' },
        { from_component: 'c1', from_pin: 'b', to_component: 'v1', to_pin: 'neg' },
      ],
    });
    const out = engine.getNetIdForPin('c1', 'a');
    expect(out).toBeTruthy();
    for (let t = 0; t < 1e-3; t += 1e-5) engine.step(1e-5);
    const v = engine.netV[out as string];
    console.log(`[spike A] t=1ms, v(out)=${v.toFixed(4)}V (期望 3.1606V)`);
    expect(v).toBeGreaterThan(3.1);
    expect(v).toBeLessThan(3.23);
  });
});

describe('Spike B · stm32f1-emu blink 固件', () => {
  it('加载 HEX 后 PC13 输出翻转', async () => {
    const hex = readFileSync(resolve(process.cwd(), 'public/firmware/blink_stm32.hex'), 'utf8');
    const mcu = await STM32F1.fromHex(hex, { chip: 'stm32f103c8' });
    const pin = mcu.gpio.pin('C', 13);
    let toggles = 0;
    const levels: number[] = [];
    pin.on('change', (high) => {
      toggles++;
      levels.push(high ? 1 : 0);
    });
    const result = await mcu.execute(2_000_000);
    console.log(
      `[spike B] inst=${result.instCount}, PC13 翻转=${toggles}, 电平序列=${levels.slice(0, 8).join(',')}, 当前引脚=${pin.read()}`,
    );
    expect(result.instCount).toBeGreaterThan(0);
    expect(toggles).toBeGreaterThan(0);
    mcu.close();
  }, 60000);
});
