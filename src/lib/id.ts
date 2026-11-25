let counter = 0;

/** 生成稳定的短 id（会话内唯一） */
export function uid(prefix = 'id'): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}

export function makeDocId(): string {
  return uid('doc');
}
