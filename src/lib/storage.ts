import type { CircuitDoc, ProjectMeta } from '../model/types';

const PROJECTS_KEY = 'ecs.projects.v1';
const DOC_PREFIX = 'ecs.doc.';
const LAST_DOC_PREFIX = 'ecs.lastDoc.';
const THEME_KEY = 'ecs.theme';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function listProjects(): ProjectMeta[] {
  return readJson<ProjectMeta[]>(PROJECTS_KEY, []).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveProject(doc: CircuitDoc): void {
  try {
    localStorage.setItem(DOC_PREFIX + doc.id, JSON.stringify(doc));
    const list = readJson<ProjectMeta[]>(PROJECTS_KEY, []).filter((p) => p.id !== doc.id);
    list.push({
      id: doc.id,
      name: doc.name,
      domain: doc.domain,
      updatedAt: doc.updatedAt,
      createdAt: doc.createdAt,
      componentCount: doc.components.length,
      wireCount: doc.wires.length,
    });
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
    localStorage.setItem(LAST_DOC_PREFIX + doc.domain, doc.id);
  } catch (err) {
    console.warn('保存工程失败（可能超出 localStorage 配额）', err);
  }
}

export function loadProject(id: string): CircuitDoc | null {
  return readJson<CircuitDoc | null>(DOC_PREFIX + id, null);
}

export function deleteProject(id: string): void {
  localStorage.removeItem(DOC_PREFIX + id);
  const list = readJson<ProjectMeta[]>(PROJECTS_KEY, []).filter((p) => p.id !== id);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
}

export function lastDocId(domain: string): string | null {
  return localStorage.getItem(LAST_DOC_PREFIX + domain);
}

export function exportDoc(doc: CircuitDoc): void {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitize(doc.name)}.ecs.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function sanitize(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'project';
}

export async function importDocFile(file: File): Promise<CircuitDoc> {
  const text = await file.text();
  const doc = JSON.parse(text) as CircuitDoc;
  if (!doc || !Array.isArray(doc.components) || !Array.isArray(doc.wires) || !doc.domain) {
    throw new Error('不是有效的工程文件');
  }
  return doc;
}

export function getTheme(): 'dark' | 'light' {
  return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
}

export function setTheme(theme: 'dark' | 'light'): void {
  localStorage.setItem(THEME_KEY, theme);
}
