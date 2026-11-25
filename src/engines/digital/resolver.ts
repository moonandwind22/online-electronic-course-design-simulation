export type Level = 0 | 1 | 'Z' | 'X';
export type Strength = 'strong' | 'weak';

export interface Driver {
  comp: string;
  pin: string;
  value: 0 | 1 | 'Z';
  strength: Strength;
}

export function resolveLevel(drivers: Iterable<Driver>): Level {
  let strong0 = false;
  let strong1 = false;
  let weak0 = false;
  let weak1 = false;
  for (const d of drivers) {
    if (d.value === 'Z') continue;
    if (d.strength === 'strong') {
      if (d.value === 1) strong1 = true;
      else strong0 = true;
    } else if (d.value === 1) weak1 = true;
    else weak0 = true;
  }
  if (strong0 && strong1) return 'X';
  if (strong0) return 0;
  if (strong1) return 1;
  if (weak0 && weak1) return 'X';
  if (weak0) return 0;
  if (weak1) return 1;
  return 'Z';
}

/** TTL 输入：悬空按高电平处理 */
export function ttl(v: Level): 0 | 1 {
  return v === 0 ? 0 : 1;
}

/** CMOS 输入：悬空按低电平处理 */
export function cmos(v: Level): 0 | 1 {
  return v === 1 ? 1 : 0;
}

export function levelText(v: Level): string {
  if (v === 'Z') return '高阻';
  if (v === 'X') return '冲突';
  return v === 1 ? '高' : '低';
}
