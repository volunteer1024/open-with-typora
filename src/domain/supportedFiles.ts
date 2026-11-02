import * as path from 'node:path';

/** Keep in sync with the fixed resourceExtname conditions in package.json. */
export const SUPPORTED_EXTENSIONS: readonly string[] = Object.freeze([
  '.md', '.markdown', '.mdx', '.txt'
]);

export function isSupportedFile(filePath: string): boolean {
  return SUPPORTED_EXTENSIONS.includes(path.extname(filePath).toLowerCase());
}
