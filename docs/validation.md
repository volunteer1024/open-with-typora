# Verification scope

Automated assertions are in `test/*.test.cjs` and run with `npm run check` after TypeScript compilation.

They cover manifest ID/engine/menus, four file extensions including uppercase, exclusion of `.ts`, Git A over active editor B, first-resource-only, wrapper URI inputs, error handling, platform argument construction, file existence, configuration validation, and activation wiring.

**Build environment note (ChatGPT container, 2026-11-03):** the container has Node.js and TypeScript, but no Cursor/VS Code CLI and no network access to npm. Offline compilation uses a temporary minimal VS Code type declaration, not the official `@types/vscode` package. `@types/vscode` and official `@vscode/vsce` remain declared in devDependencies; the GitHub Actions workflow is intended to use the real dependencies.

**Not yet proven:** official `npm run package` build in this offline container, Cursor installation, actual native Typora launch on macOS/Windows/Linux, and actual rendering/ordering of all four menus. Source/manifest tests are not equivalent to UI verification. Check the GitHub Actions result separately after the push.
