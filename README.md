# Open With External — Open with Typora

A small **local** VS Code / Cursor extension for opening the selected Markdown or text file in Typora.

- Extension ID: `local.open-with-external` (version `0.1.0`)
- VS Code engine: `^1.85.0`
- Supported extensions (case-insensitive): `.md`, `.markdown`, `.mdx`, `.txt`
- Only local `file:` URIs. No remote documents or staged/HEAD snapshots.
- Runtime dependencies: none. Built with TypeScript + VS Code Extension API.

## Context menus

| Right-click location | VS Code menu contribution |
| --- | --- |
| Explorer file | `explorer/context` |
| Editor content | `editor/context` |
| Editor tab/title | `editor/title/context` |
| Git Changes / Staged Changes file | `scm/resourceState/context` |

All four contributions use `navigation@-100` (high priority *request*, not a guarantee of first position). Menu conditions enforce local files and the four fixed extensions; Git also requires `scmProvider == git`. The Explorer entry excludes folders.

**Search results context menu is not supported.** Current public Cursor / VS Code extension APIs do not provide a reliable Search-results right-click contribution point. An experimental `search/context` declaration might not work: declaring it must not be treated as implemented functionality, and this project does not modify editor internals.

## Install

Download or build a `.vsix`, then in Cursor / VS Code open **Extensions → … → Install from VSIX…**. If necessary, execute **Developer: Reload Window**.

Alternatively:

```bash
cursor --install-extension ./open-with-external-0.1.0.vsix
# or
code --install-extension ./open-with-external-0.1.0.vsix
```

## Settings

By default, macOS uses `/Applications/Typora.app`. Set the path explicitly if Typora is installed elsewhere:

```json
{
  "openWithExternal.typoraPath": "/Applications/Typora.app"
}
```

| Platform | Empty-setting default | Launch behavior |
| --- | --- | --- |
| macOS | `/Applications/Typora.app` | `execFile('open', ['-a', app, file])` |
| Windows | `Typora.exe` from PATH | `cmd.exe /c start` with quoted paths |
| Linux | `typora` from PATH | `execFile(app, [file])` |

If Windows/Linux Typora is not on PATH, configure an absolute executable path. The extension validates configuration on activation and changes, reports problems, and writes launch activity to **Output → Open With External**.

## File selection behavior

The **right-click target wins** over the active editor. In particular, right-clicking Git file **A** while file **B** is open still targets **A**. Only one file is launched per invocation, even in multi-selection. The command-palette invocation falls back to the active editor *only when no menu target was supplied*.

Typora opens the **current on-disk file**. Unsaved editor changes are not saved automatically. From **Staged Changes**, the extension opens the working-tree file, not the Git index or HEAD version. If the working-tree file has been deleted, an error is shown. Untitled files prompt you to save first; non-local URI schemes are rejected.

## Development

```bash
npm install
npm run compile
npm run check          # compile + Node tests
npm run package        # official @vscode/vsce → open-with-external-0.1.0.vsix
```

Press `F5` in VS Code / Cursor to launch an Extension Development Host. Source maps are omitted from VSIX. Run manual UI checks for each of the four menus, Windows/Linux native startup, and actual Typora behavior before treating this as fully platform-verified.

## Architecture

```
src/
  extension.ts                    # extension activation + dependency wiring
  commands/openWithTypora.ts      # command orchestration, user errors
  config/typoraConfig.ts          # path defaults and validation
  domain/supportedFiles.ts        # fixed supported extensions
  domain/uriResolver.ts           # resolve editor/Explorer/Git targets
  platform/openInTypora.ts        # disk checks and OS process launch
  infrastructure/outputLogger.ts # Output Channel adapter

test/
  manifest.test.cjs               # menus and supported formats
  uriResolver.test.cjs            # SCM selection priority, wrappers
  platform.test.cjs               # spawn arguments and disk checks
  command.test.cjs                # command behavior/error paths
  activation.test.cjs             # VS Code registration/config changes
```

See [architecture details](docs/architecture.md) and [verification scope](docs/validation.md). This project intentionally supports **Typora only**: there is no multi-application registry, QuickPick, or configurable extension-rule engine. To support additional file types you must change both the code and the menu `when` conditions.

## License

MIT — see [LICENSE](LICENSE).
