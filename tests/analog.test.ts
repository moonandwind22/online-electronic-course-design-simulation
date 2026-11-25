import { describe, expect, it } from 'vitest';
import { buildAnalogExample } from '../src/examples';
import { AnalogEngine, buildAnalogCircuit } from '../src/engines/analog/engine';

describe('brownout 模拟引擎 RC 阶跃', () => {
  it('映射器件与 VOUT 测量网络', () => {
    const build = buildAnalogCircuit(buildAnalogExample());
    expect(build.circuit.components.length).toBeGreaterThanOrEqual(3);
    expect(build.circuit.wires.length).toBeGreaterThanOrEqual(3);
    expect(build.measurement?.netName).toBe('VOUT');
  });

  it('1τ ≈ 6.32V，10τ 接近 12V', () => {
    const engine = new AnalogEngine(buildAnalogExample());
    engine.tick(0.01);
    const tau = engine.sampleVoltages();
    console.log(`[analog] t=10ms vout=${tau.vout.toFixed(3)}V（理论 7.586V）`);
    expect(tau.vout).toBeGreaterThan(6.9);
    expect(tau.vout).toBeLessThan(8.1);

    engine.tick(0.09);
    const settled = engine.sampleVoltages();
    console.log(`[analog] t=100ms vout=${settled.vout.toFixed(3)}V（理论 11.999V）`);
    expect(settled.vout).toBeGreaterThan(11.5);
    expect(settled.vout).toBeLessThan(12.2);
  });
});
