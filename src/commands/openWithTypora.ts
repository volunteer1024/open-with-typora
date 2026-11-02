import type * as vscode from 'vscode';
import { isSupportedFile } from '../domain/supportedFiles';
import { resolveFileUri } from '../domain/uriResolver';
import type { Logger } from '../infrastructure/outputLogger';
import { FileNotFoundError, NotARegularFileError } from '../platform/openInTypora';

export interface OpenWithTyporaDependencies {
  activeEditorUri(): vscode.Uri | undefined;
  typoraPath(): string;
  launch(uri: vscode.Uri, application: string): Promise<void>;
  error(message: string, action?: string): Promise<string | undefined>;
  warning(message: string): Promise<unknown>;
  logger: Logger;
}

/** The only command: resolve -> validate -> launch -> report. */
export function createOpenWithTyporaCommand(deps: OpenWithTyporaDependencies) {
  return async (...menuArguments: unknown[]): Promise<void> => {
    const selection = resolveFileUri(menuArguments, deps.activeEditorUri());
    if (selection.kind !== 'resolved') {
      const message = selection.kind === 'invalid-argument'
        ? 'Open with Typora: Cannot resolve the selected file. No other editor was opened instead.'
        : 'Open with Typora: No file was selected and no editor is active.';
      deps.logger.error(message);
      await deps.error(message);
      return;
    }

    const { uri, origin } = selection;
    if (uri.scheme === 'untitled') {
      await deps.warning('Open with Typora: Save this untitled file first.');
      return;
    }
    if (uri.scheme !== 'file') {
      const message = `Open with Typora: Unsupported URI scheme "${uri.scheme}". Only local files are supported.`;
      deps.logger.error(message);
      await deps.error(message);
      return;
    }
    if (!isSupportedFile(uri.fsPath)) {
      const message = 'Open with Typora: Only .md, .markdown, .mdx and .txt files are supported.';
      deps.logger.error(`${message} (${uri.fsPath})`);
      await deps.warning(message);
      return;
    }

    const application = deps.typoraPath();
    try {
      await deps.launch(uri, application);
      deps.logger.info(`Typora (${application}) ← ${uri.fsPath} [${origin}]`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      deps.logger.error(`Typora (${application}) ← ${uri.fsPath}: ${detail}`);
      const message = error instanceof FileNotFoundError
        ? `Open with Typora: File no longer exists: ${uri.fsPath}`
        : error instanceof NotARegularFileError
          ? `Open with Typora: Not a regular file: ${uri.fsPath}`
          : `Open with Typora: Failed to launch Typora. ${detail}`;
      const action = await deps.error(message, 'Show Output');
      if (action === 'Show Output') { deps.logger.show(); }
    }
  };
}
