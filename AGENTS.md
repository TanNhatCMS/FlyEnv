# FlyEnv - AI Agent Development Guide

## Project Overview

**FlyEnv** is an Electron 39.8.7 + Vue 3 desktop app for managing local development environments (Apache, PHP, Node.js, Python, databases, etc.) natively on Windows, macOS, and Linux. No Docker required.

- **Version**: 4.15.4
- **License**: MIT

## Architecture

```
src/
├── main/        # Electron main process (command relay)
├── fork/        # Async service module execution (heavy work)
├── render/      # Vue 3 UI (Element Plus, Pinia, Monaco Editor)
├── shared/      # Cross-process utilities
├── lang/        # i18n (30+ languages)
└── helper-go/   # Go helper for Windows admin tasks
```

**Three processes**: Main → Relay → Fork (heavy work). The main process relays commands from the UI to the fork process for async execution.

## Essential Commands

```bash
yarn install          # Install dependencies (postinstall builds native deps)
yarn dev              # Start dev server with HMR (port 4000)
yarn build            # Production build (platform-specific, drops console/debugger)
yarn clean            # Clean node-pty build artifacts
yarn fix-flyenv-helper  # macOS only: remove quarantine flag from helper binaries
```

### Testing

```bash
yarn test:helper              # Run contract + Go tests (non-admin)
yarn test:helper:admin        # Run contract + Go tests (admin, Windows)
yarn test:helper:contract     # Contract check only (verifies TS↔Go helper alignment)
yarn test:helper:go           # Go unit tests only
yarn test:helper:go:vet       # Go vet only
```

## Path Aliases

- `@` → `src/render/`
- `@shared` → `src/shared/`
- `@lang` → `src/lang/`

## Build Configuration

**Entry Points**:
- `src/main/index.ts` → `dist/electron/main.mjs`
- `src/fork/index.ts` → `dist/electron/fork.mjs`
- `src/render/index.html` → Main window
- `src/render/tray.html` → Tray popup
- `src/render/capturer/capturer.html` → Screen capture

**Dev vs Prod**:
- Dev uses `src/main/index.dev.ts` (no minification, console preserved)
- Prod uses `src/main/index.ts` (minified, console/debugger dropped)

## Code Style

- **ESLint**: Flat config (`eslint.config.mjs`), Prettier integration
- **TypeScript**: Strict mode, `noUnusedLocals: true`, `noImplicitAny: true`
- **Formatting**: Prettier (2-space indent, single quotes, no semicolons, no trailing commas)
- **Vue**: `<script lang="ts">` or `<script lang="tsx">` required (enforced by `vue/block-lang`)
- **Dark Mode**: CSS selector-based (`darkMode: 'selector'` in Tailwind)

**Key Rules**:
- `@typescript-eslint/no-explicit-any`: `off` in practice
- `vue/multi-word-component-names`: `off`
- `prettier/prettier`: `error` (formatting issues = build failures)
- `@typescript-eslint/no-unused-vars`: ignores args matching `^[hH]$` (Vue render function)
- `no-useless-escape`: `warn`

## Adding a New Module

1. **Define enum**: Add to `src/render/core/type.ts` → `AppModuleEnum`
2. **Create fork module**: `src/fork/module/MyService/index.ts`
   - Extend `Base` class from `src/fork/module/Base/index.ts`
   - Implement: `_startServer()`, `_stopService()`, `fetchAllOnlineVersion()`, `installSoft()`
3. **Create UI components**: `src/render/components/MyService/`
   - `Module.ts` - Module definition with `moduleType`, `typeFlag`, `aside`, `asideIndex`, `index`, `isService`, `isTray`
   - `Index.vue` - Main view
   - `aside.vue` - Sidebar
4. **Add i18n**: Create `src/lang/*/myservice.json` for each language (30+ language dirs exist)

## Helper Go Contract

When adding/removing Go helper methods:
1. Update `src/helper-go/contract/helper-contract.json` first
2. Wire TS call sites in `src/main/`, `src/fork/`, `src/shared/`, `src/render/`
3. Wire Go dispatch in `src/helper-go/main.go`
4. Run `yarn test:helper:contract` until it passes

## Gotchas

- **node-pty builds**: Run `yarn clean` if native builds fail
- **Dev port**: 4000, configured in `configs/vite.port.ts`
- **macOS quarantine**: Run `yarn fix-flyenv-helper` after first install
- **Windows admin tasks**: Uses `flyenv-helper-windows-amd64-v1.exe`
- **Production builds drop console**: Both esbuild and Vite configs remove `console` and `debugger`
- **Vite compiles `.md` as Vue**: `vue({ include: [/\.vue$/, /\.md$/] })` in vite config
