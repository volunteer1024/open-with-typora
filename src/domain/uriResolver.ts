import * as path from 'node:path';
import * as vscode from 'vscode';

export type Resolution =
  | { kind: 'resolved'; uri: vscode.Uri; origin: 'menu' | 'active-editor' }
  | { kind: 'invalid-argument' }
  | { kind: 'no-target' };

/**
 * Menu target is authoritative. A malformed explicit target must never fall
 * back to the unrelated active editor (most importantly for Git A vs editor B).
 * Only the first menu target is opened, even for multi-selection commands.
 */
export function resolveFileUri(
  args: readonly unknown[],
  activeEditorUri: vscode.Uri | undefined
): Resolution {
  const first = args.find(arg => arg !== undefined && arg !== null);
  if (first !== undefined) {
    const uri = extractUri(first, new Set<unknown>(), 0);
    return uri ? { kind: 'resolved', uri, origin: 'menu' } : { kind: 'invalid-argument' };
  }
  return activeEditorUri
    ? { kind: 'resolved', uri: activeEditorUri, origin: 'active-editor' }
    : { kind: 'no-target' };
}

function extractUri(value: unknown, visited: Set<unknown>, depth: number): vscode.Uri | undefined {
  if (value === null || value === undefined || depth > 10) { return undefined; }
  if (value instanceof vscode.Uri) { return value; }

  if (typeof value === 'string') {
    if (path.posix.isAbsolute(value) || path.win32.isAbsolute(value)) {
      return vscode.Uri.file(value);
    }
    if (/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(value)) {
      try { return vscode.Uri.parse(value); } catch { return undefined; }
    }
    return undefined;
  }
  if (typeof value !== 'object' || visited.has(value)) { return undefined; }
  visited.add(value);

  if (Array.isArray(value)) {
    for (const element of value) {
      const result = extractUri(element, visited, depth + 1);
      if (result) { return result; }
    }
    return undefined;
  }

  const object = value as Record<string, unknown>;
  if (typeof object.scheme === 'string' && typeof object.path === 'string') {
    try {
      return vscode.Uri.from({
        scheme: object.scheme,
        path: object.path,
        authority: typeof object.authority === 'string' ? object.authority : undefined,
        query: typeof object.query === 'string' ? object.query : undefined,
        fragment: typeof object.fragment === 'string' ? object.fragment : undefined
      });
    } catch { /* Try supported wrappers. */ }
  }

  // SCM SourceControlResourceState uses resourceUri; it must win over other keys.
  for (const key of ['resourceUri', 'uri', 'resource']) {
    if (key in object) {
      const result = extractUri(object[key], visited, depth + 1);
      if (result) { return result; }
    }
  }
  if (object.location && typeof object.location === 'object' && 'uri' in object.location) {
    const result = extractUri((object.location as { uri?: unknown }).uri, visited, depth + 1);
    if (result) { return result; }
  }
  for (const key of ['fsPath', 'path', 'element']) {
    if (key in object) {
      const result = extractUri(object[key], visited, depth + 1);
      if (result) { return result; }
    }
  }
  return undefined;
}
