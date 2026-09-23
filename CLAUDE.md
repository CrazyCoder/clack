# Clack (Local Fork)

Local clone of [bombshell-dev/clack](https://github.com/bombshell-dev/clack). Used as the source for the vendored CJS bundle in `support-toolkit/scripts/setup/vendor/clack-prompts.js`.

## Local Patches

### Windows `setRawMode(false)` freeze fix

**Files:** `packages/core/src/utils/index.ts`, `packages/core/src/prompts/prompt.ts`

**Problem:** On Windows, sequential clack prompts freeze on the second prompt — cursor keys and Esc stop working, only Enter "unfreezes" input. This is a libuv race condition: `setRawMode(false)` between prompts triggers a blocking `ReadConsole()` that cannot be cancelled, which races with the next prompt's `ReadConsoleInput()`.

**Root cause:** Two call sites toggle stdin to cooked mode between prompts:
1. `setRawMode(input, false)` in `utils/index.ts` — the clack wrapper called by Prompt on submit/cancel/close
2. `rl.close()` in `prompt.ts` — Node.js readline internally calls `input.setRawMode(false)` when `rl.terminal` is true

The `block()` function already had both guards (`!isWindows` check + `rl.terminal = false`), but the `Prompt` class did not.

**Fix:**
- `utils/index.ts`: Skip `setRawMode(false)` on Windows (same guard `block()` already uses)
- `prompt.ts`: Set `this.rl.terminal = false` before `this.rl.close()` to prevent readline from calling `setRawMode(false)` internally

**References:**
- [libuv/libuv#852](https://github.com/libuv/libuv/issues/852) — root cause in libuv's Windows TTY
- [nodejs/node#49588](https://github.com/nodejs/node/issues/49588) — Node.js tracking issue
- [nodejs/node#31762](https://github.com/nodejs/node/issues/31762) — `rl.terminal = false` workaround
- [bombshell-dev/clack#76](https://github.com/bombshell-dev/clack/issues/76) — clack's original partial fix (block only)

**Consumer note:** Since `setRawMode(false)` is never called between prompts on Windows, consumers must explicitly call `process.stdin.setRawMode(false)` when their prompt session is fully complete (before returning control to a non-raw-mode caller or exiting).

### Windows Terminal default-terminal delegation Unicode fix

**Files:** `packages/prompts/src/common.ts`

**Problem:** On Windows 11, running a clack app from cmd.exe / PowerShell launched outside the Windows Terminal app (Start menu, Run dialog, shortcuts) renders the ASCII symbol fallback (`T`, `|`, `o`, `*`) even though the window is drawn by Windows Terminal, which renders `┌ │ ◆ ◇` fine.

**Root cause:** With Windows Terminal as the OS default terminal, the shell process spawns first and WT attaches to it afterwards, so `WT_SESSION` / `TERM_PROGRAM` never appear in the environment ([microsoft/terminal#13006](https://github.com/microsoft/terminal/issues/13006) — by design; Microsoft discourages env-based WT detection). `is-unicode-supported` checks only those env vars on win32, so it reports no Unicode support.

**Fix:** `common.ts` wraps `is-unicode-supported` — when it returns false on win32, fall back to the OS build number: builds ≥ 14393 (Windows 10 1607) have VT-capable consoles with TrueType fonts that render these glyphs. Non-Windows behavior is unchanged.

## Building

```bash
pnpm install --frozen-lockfile
pnpm run build
```

## Bundling to support-toolkit

The support-toolkit uses a CJS bundle (Node.js `require()`). Clack outputs ESM only, so we bundle with esbuild:

```bash
npx esbuild packages/prompts/dist/index.mjs \
  --bundle --format=cjs --platform=node \
  --outfile=<support-toolkit>/scripts/setup/vendor/clack-prompts.js
```
