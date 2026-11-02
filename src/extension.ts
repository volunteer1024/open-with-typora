import * as vscode from 'vscode';
import { createOpenWithTyporaCommand } from './commands/openWithTypora';
import { resolveTyporaPath, TYPORA_PATH_SETTING, validateTyporaPath } from './config/typoraConfig';
import { OutputLogger } from './infrastructure/outputLogger';
import { openInTypora } from './platform/openInTypora';

const COMMAND_ID = 'openWithExternal.openWithTypora';

/** Composition root: host subscriptions and dependency wiring only. */
export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel('Open With External');
  const logger = new OutputLogger(output);
  context.subscriptions.push(output);

  const currentSetting = (): unknown =>
    vscode.workspace.getConfiguration('openWithExternal').get<unknown>('typoraPath', '');

  const verifyConfiguration = (): void => {
    const selected = currentSetting();
    const problems = validateTyporaPath(selected, process.platform);
    if (problems.length === 0) {
      logger.config(`Typora path: ${resolveTyporaPath(selected, process.platform)}`);
      return;
    }
    problems.forEach(problem => logger.config(problem));
    void vscode.window.showWarningMessage(
      'Open With External: Typora configuration needs attention. See Output → Open With External.',
      'Show Output'
    ).then((choice: string | undefined) => {
      if (choice === 'Show Output') { logger.show(); }
    });
  };

  verifyConfiguration();
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration(TYPORA_PATH_SETTING)) { verifyConfiguration(); }
    })
  );

  const command = createOpenWithTyporaCommand({
    activeEditorUri: () => vscode.window.activeTextEditor?.document.uri,
    typoraPath: () => resolveTyporaPath(currentSetting(), process.platform),
    launch: openInTypora,
    logger,
    error: (message, action) => action
      ? Promise.resolve(vscode.window.showErrorMessage(message, action))
      : Promise.resolve(vscode.window.showErrorMessage(message)),
    warning: message => Promise.resolve(vscode.window.showWarningMessage(message))
  });

  context.subscriptions.push(vscode.commands.registerCommand(COMMAND_ID, command));
}

export function deactivate(): void { /* ExtensionContext disposes subscriptions. */ }
