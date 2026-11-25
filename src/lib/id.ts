let counter = 0;

export function createId(prefix = 'id'): string {
  counter = (counter + 1) % 0xffffff;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${rand}`;
}

export function shortId(): string {
  return Math.random().toString(36).slice(2, 8);
}
