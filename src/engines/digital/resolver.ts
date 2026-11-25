import type { LogicLevel } from '../../model/types';

export type Strength = 'strong' | 'weak';

export interface Driver {
  level: LogicLevel;
  strength: Strength;
}

/**
 * 多驱动网络仲裁：
 * - 强驱动 0/1 冲突 → X
 * - 开集/三态释放（Z）不参与
 * - 弱上拉/下拉只在没有强驱动时生效
 */
export function resolveDrivers(drivers: Driver[]): LogicLevel {
  let strong0 = false;
  let strong1 = false;
  let strongX = false;
  let weak0 = false;
  let weak1 = false;
  let weakX = false;

  for (const driver of drivers) {
    if (driver.level === 'z') continue;
    if (driver.strength === 'strong') {
      if (driver.level === 0) strong0 = true;
      else if (driver.level === 1) strong1 = true;
      else strongX = true;
    } else {
      if (driver.level === 0) weak0 = true;
      else if (driver.level === 1) weak1 = true;
      else weakX = true;
    }
  }

  if (strongX || (strong0 && strong1)) return 'x';
  if (strong0) return 0;
  if (strong1) return 1;
  if (weakX || (weak0 && weak1)) return 'x';
  if (weak0) return 0;
  if (weak1) return 1;
  return 'z';
}
