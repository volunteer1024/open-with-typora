# Architecture

The extension keeps the VS Code host API, command flow, target selection, and OS launch in separate modules.

```text
VS Code / Cursor menus
    │
    ▼
extension.ts (activation, subscriptions, config events)
    │
    ▼
commands/openWithTypora.ts (selection → validations → open/error feedback)
    ├── domain/uriResolver.ts (SCM resourceUri first; editor fallback only if no args)
    ├── domain/supportedFiles.ts (.md/.markdown/.mdx/.txt)
    ├── config/typoraConfig.ts (platform defaults, invalid settings)
    ├── platform/openInTypora.ts (stat, spawn, OS argv)
    └── infrastructure/outputLogger.ts (named Output Channel)
```

**Selection contract:** a menu-supplied value is authoritative. For multi-selection, consume the first resource only. A malformed explicit target is an error, never a cue to use the active editor. Git `resourceUri` always takes precedence over any unrelated editor.

**Launch contract:** only `file` URIs are passed to the launcher. `stat` checks the current working-tree file; the extension never saves buffers or reads staged snapshots. macOS and Linux use `execFile` argv; Windows uses `cmd.exe` for `start` with safe quoting.

**Display contract:** the four `package.json` menu `when` expressions are deliberately fixed. Adding another file extension requires changing those expressions and `supportedFiles.ts` together. Search-result menu support is deliberately excluded because the host does not guarantee such a public hook.

**Dependency direction:** the command accepts injected dependencies for notifications, logging and launching, which keeps it testable without a running editor. Only the thin activation root refers directly to VS Code global window/workspace/commands APIs.
