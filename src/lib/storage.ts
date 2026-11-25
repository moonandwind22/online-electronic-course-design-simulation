import type { CircuitDoc, Domain, ProjectMeta } from '../model/types';

const INDEX_KEY = 'ecs.projects.v2';
const LAST_PREFIX = 'ecs.v2.lastDoc.';
const DOC_PREFIX = 'ecs.v2.doc.';
const SAVE_DELAY = 800;

function available(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

export function loadIndex(): ProjectMeta[] {
  if (!available()) return [];
  try {
    const raw = window.localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ProjectMeta[]) : [];
  } catch {
    return [];
  }
}

function saveIndex(list: ProjectMeta[]): void {
  if (!available()) return;
  window.localStorage.setItem(INDEX_KEY, JSON.stringify(list));
}

export function saveDocNow(doc: CircuitDoc): void {
  if (!available()) return;
  window.localStorage.setItem(DOC_PREFIX + doc.id, JSON.stringify(doc));
  window.localStorage.setItem(LAST_PREFIX + doc.domain, doc.id);
  const list = loadIndex();
  const meta: ProjectMeta = {
    id: doc.id,
    name: doc.name,
    domain: doc.domain,
    updatedAt: doc.updatedAt,
  };
  const idx = list.findIndex((p) => p.id === doc.id);
  if (idx >= 0) list[idx] = meta;
  else list.unshift(meta);
  saveIndex(list.sort((a, b) => b.updatedAt - a.updatedAt));
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

export function scheduleSave(doc: CircuitDoc): void {
  if (!available()) return;
  const prev = timers.get(doc.id);
  if (prev) clearTimeout(prev);
  timers.set(
    doc.id,
    setTimeout(() => {
      saveDocNow(doc);
      timers.delete(doc.id);
    }, SAVE_DELAY),
  );
}

export function loadDocById(id: string): CircuitDoc | null {
  if (!available()) return null;
  try {
    const raw = window.localStorage.getItem(DOC_PREFIX + id);
    if (!raw) return null;
    const doc = JSON.parse(raw) as CircuitDoc;
    if (!doc || !Array.isArray(doc.components) || !Array.isArray(doc.wires)) return null;
    return doc;
  } catch {
    return null;
  }
}

export function loadLastDoc(domain: Domain): CircuitDoc | null {
  if (!available()) return null;
  const id = window.localStorage.getItem(LAST_PREFIX + domain);
  return id ? loadDocById(id) : null;
}

export function deleteDoc(id: string): void {
  if (!available()) return;
  window.localStorage.removeItem(DOC_PREFIX + id);
  const list = loadIndex().filter((p) => p.id !== id);
  saveIndex(list);
  for (const domain of ['digital', 'analog', 'power', 'mcs51', 'stm32'] as Domain[]) {
    if (window.localStorage.getItem(LAST_PREFIX + domain) === id) {
      window.localStorage.removeItem(LAST_PREFIX + domain);
    }
  }
}

export function exportDocJson(doc: CircuitDoc): string {
  return JSON.stringify(doc, null, 2);
}

export function importDocJson(text: string): CircuitDoc | null {
  try {
    const doc = JSON.parse(text) as CircuitDoc;
    if (!doc || !Array.isArray(doc.components) || !Array.isArray(doc.wires)) return null;
    return doc;
  } catch {
    return null;
  }
}
