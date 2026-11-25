import type { CircuitDoc, Domain, ProjectIndexEntry } from '../model/types';

const INDEX_KEY = 'ecs.projects.v1';
const DOC_PREFIX = 'ecs.doc.';
const LAST_PREFIX = 'ecs.lastDoc.';
const THEME_KEY = 'ecs.theme.v1';

function store(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

function read<T>(key: string, fallback: T): T {
  const s = store();
  if (!s) return fallback;
  try {
    const raw = s.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  const s = store();
  if (!s) return;
  try {
    s.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('[storage] 写入失败', key, err);
  }
}

export function listProjects(): ProjectIndexEntry[] {
  return read<ProjectIndexEntry[]>(INDEX_KEY, []).sort((a, b) => b.updatedAt - a.updatedAt);
}

function updateIndex(doc: CircuitDoc): void {
  const list = listProjects().filter((p) => p.id !== doc.id);
  list.unshift({ id: doc.id, name: doc.name, domain: doc.domain, updatedAt: doc.updatedAt });
  write(INDEX_KEY, list.slice(0, 40));
}

export function saveDoc(doc: CircuitDoc, touchIndex = true): void {
  write(DOC_PREFIX + doc.id, doc);
  if (touchIndex) updateIndex(doc);
}

export function loadDoc(id: string): CircuitDoc | null {
  const doc = read<CircuitDoc | null>(DOC_PREFIX + id, null);
  if (!doc || !doc.components) return null;
  return doc;
}

export function deleteDoc(id: string): void {
  const s = store();
  if (!s) return;
  s.removeItem(DOC_PREFIX + id);
  write(INDEX_KEY, listProjects().filter((p) => p.id !== id));
}

export function setLastDoc(domain: Domain, id: string): void {
  write(LAST_PREFIX + domain, id);
}

export function getLastDoc(domain: Domain): string | null {
  return read<string | null>(LAST_PREFIX + domain, null);
}

export function loadTheme(): 'dark' | 'light' {
  return read<'dark' | 'light'>(THEME_KEY, 'dark');
}

export function saveTheme(theme: 'dark' | 'light'): void {
  write(THEME_KEY, theme);
}

export function exportDocFile(doc: CircuitDoc): void {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.name || 'circuit'}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function parseImportedDoc(text: string): CircuitDoc {
  const data = JSON.parse(text) as Partial<CircuitDoc>;
  if (!data.components || !Array.isArray(data.components) || !data.wires || !Array.isArray(data.wires)) {
    throw new Error('文件不是有效的工程 JSON');
  }
  if (!data.domain) throw new Error('工程缺少仿真域字段');
  return data as CircuitDoc;
}
