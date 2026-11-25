import type { CircuitDoc, Domain, ProjectMeta } from '../model/types';
import { isDomain } from '../model/types';

const INDEX_KEY = 'ecs.projects.v1';
const DOC_PREFIX = 'ecs.doc.';
const LAST_KEY = 'ecs.lastDoc.';

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('无法写入 localStorage', error);
  }
}

export function listProjects(): ProjectMeta[] {
  const index = readJson<ProjectMeta[]>(INDEX_KEY, []);
  return index
    .filter((entry) => entry && typeof entry.id === 'string' && isDomain(entry.domain))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveDoc(doc: CircuitDoc): void {
  writeJson(`${DOC_PREFIX}${doc.id}`, doc);
  const index = listProjects().filter((entry) => entry.id !== doc.id);
  index.unshift({
    id: doc.id,
    name: doc.name,
    domain: doc.domain,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
  writeJson(INDEX_KEY, index.slice(0, 60));
  setLastDoc(doc.domain, doc.id);
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingDoc: CircuitDoc | null = null;

export function scheduleDocSave(doc: CircuitDoc): void {
  pendingDoc = doc;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (pendingDoc) saveDoc(pendingDoc);
    pendingDoc = null;
    saveTimer = null;
  }, 800);
}

export function flushDocSave(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (pendingDoc) {
    saveDoc(pendingDoc);
    pendingDoc = null;
  }
}

export function loadDoc(id: string): CircuitDoc | null {
  const doc = readJson<CircuitDoc | null>(`${DOC_PREFIX}${id}`, null);
  if (!doc || typeof doc.id !== 'string' || !Array.isArray(doc.components) || !Array.isArray(doc.wires)) {
    return null;
  }
  if (!isDomain(doc.domain)) return null;
  return {
    ...doc,
    viewport: doc.viewport ?? { x: 0, y: 0, zoom: 1 },
  };
}

export function deleteDoc(id: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(`${DOC_PREFIX}${id}`);
  writeJson(
    INDEX_KEY,
    listProjects().filter((entry) => entry.id !== id),
  );
}

export function setLastDoc(domain: Domain, id: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(`${LAST_KEY}${domain}`, id);
  } catch {
    /* ignore */
  }
}

export function getLastDoc(domain: Domain): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(`${LAST_KEY}${domain}`);
}

export function exportDocText(doc: CircuitDoc): string {
  return JSON.stringify({ format: 'ecs-circuit', version: 1, doc }, null, 2);
}

export function parseDocText(text: string): CircuitDoc | null {
  try {
    const parsed = JSON.parse(text) as { format?: string; doc?: CircuitDoc } | CircuitDoc;
    const doc = 'doc' in parsed && parsed.doc ? parsed.doc : (parsed as CircuitDoc);
    if (!doc || typeof doc !== 'object') return null;
    if (typeof doc.id !== 'string' || typeof doc.name !== 'string' || !isDomain(doc.domain)) return null;
    if (!Array.isArray(doc.components) || !Array.isArray(doc.wires)) return null;
    return { ...doc, viewport: doc.viewport ?? { x: 0, y: 0, zoom: 1 } };
  } catch {
    return null;
  }
}

export function downloadText(filename: string, text: string, mime = 'application/json'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
