import { execFile, type ExecFileOptions } from 'node:child_process';
import * as fs from 'node:fs/promises';
import { promisify } from 'node:util';
import type * as vscode from 'vscode';

const execFileAsync = promisify(execFile);

export class FileNotFoundError extends Error {}
export class NotARegularFileError extends Error {}
export class UnsupportedUriError extends Error {}

export interface LaunchCommand {
  executable: string;
  args: string[];
  options: ExecFileOptions;
}

/** cmd.exe built-in `start` needs a blank window title before two quoted args. */
function quoteForCmd(value: string): string {
  if (/["\r\n]/.test(value)) {
    throw new Error('Windows application or file path contains invalid quoting characters.');
  }
  // Disable delayed expansion below; percent expansion still needs escaping.
  return `"${value.replace(/%/g, '%%')}"`;
}

export function buildLaunchCommand(
  application: string,
  filePath: string,
  platform: NodeJS.Platform
): LaunchCommand {
  if (platform === 'darwin') {
    return {
      executable: 'open',
      args: ['-a', application, filePath],
      options: { windowsHide: true }
    };
  }
  if (platform === 'win32') {
    return {
      executable: 'cmd.exe',
      args: ['/d', '/v:off', '/s', '/c', `start "" ${quoteForCmd(application)} ${quoteForCmd(filePath)}`],
      options: { windowsHide: true, windowsVerbatimArguments: true }
    };
  }
  return {
    executable: application,
    args: [filePath],
    options: { windowsHide: true }
  };
}

export async function assertRegularFile(filePath: string): Promise<void> {
  let stat: Awaited<ReturnType<typeof fs.stat>>;
  try {
    stat = await fs.stat(filePath);
  } catch (error) {
    if (['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '')) {
      throw new FileNotFoundError(`File not found: ${filePath}`);
    }
    throw error;
  }
  if (!stat.isFile()) {
    throw new NotARegularFileError(`Not a regular file: ${filePath}`);
  }
}

export type CommandRunner = (command: LaunchCommand) => Promise<void>;
const execute: CommandRunner = async command => {
  await execFileAsync(command.executable, command.args, command.options);
};

/** Always opens the current working-tree disk file; never saves an editor buffer. */
export async function openInTypora(
  uri: vscode.Uri,
  application: string,
  platform: NodeJS.Platform = process.platform,
  runner: CommandRunner = execute
): Promise<void> {
  if (uri.scheme !== 'file') {
    throw new UnsupportedUriError(`Unsupported URI scheme: ${uri.scheme}`);
  }
  await assertRegularFile(uri.fsPath);
  await runner(buildLaunchCommand(application, uri.fsPath, platform));
}
