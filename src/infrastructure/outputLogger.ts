import type * as vscode from 'vscode';

export interface Logger {
  info(message: string): void;
  error(message: string): void;
  config(message: string): void;
  show(): void;
}

/** Keep UI output formatting and disclosure of failures out of domain logic. */
export class OutputLogger implements Logger {
  constructor(private readonly output: vscode.OutputChannel) {}

  info(message: string): void { this.output.appendLine(`[OPEN] ${message}`); }
  error(message: string): void { this.output.appendLine(`[ERROR] ${message}`); }
  config(message: string): void { this.output.appendLine(`[CONFIG] ${message}`); }
  show(): void { this.output.show(true); }
}
