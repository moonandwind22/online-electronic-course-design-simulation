import { useEffect, useMemo, useRef } from 'react';
import { DigitalEngine } from './digital/engine';
import type { AnalogEngine } from './analog/engine';
import type { LogicLevel } from '../model/types';
import { useCircuitStore } from '../store/useCircuitStore';
import { useSimStore } from '../store/useSimStore';

const toWaveValue = (level: LogicLevel): number => (level === 1 ? 1 : level === 0 ? 0 : 0.5);

type EngineKind = 'digital' | 'analog' | null;

export function useSimulation(): void {
  const doc = useCircuitStore((s) => s.doc);
  const running = useSimStore((s) => s.running);
  const speed = useSimStore((s) => s.speed);
  const resetToken = useSimStore((s) => s.resetToken);
  const engineRef = useRef<DigitalEngine | AnalogEngine | null>(null);
  const kindRef = useRef<EngineKind>(null);
  const lastCountRef = useRef<number | null>(null);

  const signature = useMemo(
    () =>
      JSON.stringify({
        domain: doc.domain,
        components: doc.components.map((c) => [c.id, c.type, c.params, c.state]),
        wires: doc.wires.map((w) => [w.id, w.from, w.to, w.netLabel]),
        firmware: doc.firmware?.hex ?? '',
      }),
    [doc],
  );

  useEffect(() => {
    const sim = useSimStore.getState();
    sim.reset();
    lastCountRef.current = null;
    let cancelled = false;

    if (doc.domain === 'analog' || doc.domain === 'power') {
      kindRef.current = 'analog';
      engineRef.current = null;
      // brownout 较大，按需动态加载，保持首屏包体在目标范围内。
      void import('./analog/engine').then(({ AnalogEngine }) => {
        if (cancelled) return;
        engineRef.current = new AnalogEngine(doc);
      });
      return () => {
        cancelled = true;
      };
    }

    if (doc.domain !== 'digital' && doc.domain !== 'mcs51') {
      kindRef.current = null;
      engineRef.current = null;
      return;
    }

    kindRef.current = 'digital';
    const engine = new DigitalEngine(doc);
    engineRef.current = engine;
    const snap = engine.snapshot();
    sim.applyTick({
      time: snap.time,
      events: snap.events,
      nets: snap.nets,
      netLevels: snap.netLevels,
      pinLevels: snap.pinLevels,
      waves: [],
    });
    return undefined;
  }, [signature]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.reset();
    lastCountRef.current = null;
    if (kindRef.current === 'digital') {
      const snap = (engine as DigitalEngine).snapshot();
      useSimStore.getState().applyTick({
        time: snap.time,
        events: snap.events,
        nets: snap.nets,
        netLevels: snap.netLevels,
        pinLevels: snap.pinLevels,
        waves: [],
      });
    }
  }, [resetToken]);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    let lastPush = 0;

    const loop = (now: number) => {
      const dtReal = Math.min(0.1, (now - last) / 1000);
      last = now;
      const engine = engineRef.current;
      if (!engine) {
        raf = requestAnimationFrame(loop);
        return;
      }

      if (kindRef.current === 'analog') {
        const analog = engine as AnalogEngine;
        const total = Math.min(0.08, dtReal * speed);
        const steps = Math.max(1, Math.min(600, Math.ceil(total / 5e-4)));
        const stepDt = total / steps;
        const ch1: number[] = [];
        const ch2: number[] = [];
        for (let i = 0; i < steps; i += 1) {
          analog.tick(stepDt);
          const v = analog.sampleVoltages();
          ch1.push(v.vout);
          ch2.push(v.vin);
        }
        useSimStore.getState().appendScope(ch1, ch2, analog.maxVoltage, ['CH1 VOUT', 'CH2 VIN']);
        useSimStore.getState().advanceTime(analog.elapsed);
        raf = requestAnimationFrame(loop);
        return;
      }

      const digital = engine as DigitalEngine;
      const steps = Math.max(1, Math.ceil((dtReal * speed) / 0.02));
      const stepDt = (dtReal * speed) / steps;
      for (let i = 0; i < steps; i += 1) digital.tick(stepDt);

      if (now - lastPush > 60) {
        lastPush = now;
        const snap = digital.snapshot();
        const signals = digital.signalNets(8);
        const waves = signals.map((name) => ({
          name,
          samples: [toWaveValue(digital.netLevelByName(name))],
        }));
        useSimStore.getState().applyTick({
          time: snap.time,
          events: snap.events,
          nets: snap.nets,
          netLevels: snap.netLevels,
          pinLevels: snap.pinLevels,
          waves,
        });

        const mcu = digital.mcuSnapshot();
        if (mcu) {
          useSimStore.getState().setMcu({
            componentId: mcu.componentId,
            pc: mcu.state.pc,
            a: mcu.state.a,
            b: mcu.state.b,
            psw: mcu.state.psw,
            sp: mcu.state.sp,
            dptr: mcu.state.dptr,
            cycles: mcu.state.cycles,
            latches: mcu.state.latches,
            pins: mcu.state.pins,
            codeSize: mcu.state.codeSize,
            unsupported: mcu.state.unsupported,
          });
        }
        const tx = digital.takeSerial();
        if (tx.length > 0) {
          useSimStore.getState().appendSerial(String.fromCharCode(...tx));
        }

        const counter = doc.components.find((c) => c.type === '74LS161');
        if (counter) {
          const bit = (pin: string) => (snap.pinLevels[`${counter.id}:${pin}`] === 1 ? 1 : 0);
          const value = bit('QA') | (bit('QB') << 1) | (bit('QC') << 2) | (bit('QD') << 3);
          if (value !== lastCountRef.current) {
            lastCountRef.current = value;
            useSimStore.getState().logLine(`${counter.label} 计数值 = ${value}`, 'ok', snap.time);
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, speed, doc]);
}
