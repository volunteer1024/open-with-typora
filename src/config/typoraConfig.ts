import * as fs from 'node:fs';
import * as path from 'node:path';

export const TYPORA_PATH_SETTING = 'openWithExternal.typoraPath';

export function defaultTyporaPath(platform: NodeJS.Platform): string {
  switch (platform) {
    case 'darwin': return '/Applications/Typora.app';
    case 'win32': return 'Typora.exe';
    default: return 'typora';
  }
}

/** An empty setting selects the platform default, rather than disabling Typora. */
export function resolveTyporaPath(value: unknown, platform: NodeJS.Platform): string {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : defaultTyporaPath(platform);
}

export function validateTyporaPath(
  value: unknown,
  platform: NodeJS.Platform,
  exists: (filePath: string) => boolean = fs.existsSync
): string[] {
  if (typeof value !== 'string') {
    return [`${TYPORA_PATH_SETTING} must be a string.`];
  }
  const selected = resolveTyporaPath(value, platform);
  const paths = platform === 'win32' ? path.win32 : path.posix;
  if (paths.isAbsolute(selected) && !exists(selected)) {
    return [`Typora application was not found: ${selected}. Configure ${TYPORA_PATH_SETTING}.`];
  }
  if (!paths.isAbsolute(selected) && /[\\/]/.test(selected)) {
    return [`${TYPORA_PATH_SETTING} is relative (${selected}); use an absolute path or an executable name on PATH.`];
  }
  return [];
}
