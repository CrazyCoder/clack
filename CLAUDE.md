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

### Faint text drawn as gray on Windows

**Files:** `packages/prompts/src/style-text.ts`, the `styleText` import line of every other `packages/prompts/src/*.ts` file, `packages/prompts/vitest.config.ts`

**Problem:** clack mutes hints, inactive rows and instructions with faint text (SGR 2). Windows Terminal draws faint text by halving each RGB component of the foreground, which always moves it toward black. On a light scheme, faint text comes out darker than normal text, so the emphasis is reversed and the cursor row of a multiselect is the hardest row to see ([microsoft/terminal#16493](https://github.com/microsoft/terminal/issues/16493), open). conhost does not draw faint at all.

**Fix:** `style-text.ts` wraps `styleText` from `node:util` and draws `dim` as `gray` (SGR 90, the scheme's bright black), including in lists such as `['strikethrough', 'dim']`. The prompts package imports `styleText` from it instead of `node:util`; call sites are unchanged, which keeps rebases onto upstream to one import line per file. `@clack/core` uses `styleText` only for `inverse` and is untouched.

Gray is the default on win32 only. Other terminals blend faint text toward the background and keep upstream's look, and on some dark schemes bright black is close to the background. `CLACK_FAINT=gray` or `CLACK_FAINT=dim` overrides the default, read on every call.

**Tests:** `test/style-text.test.ts`. `vitest.config.ts` sets `CLACK_FAINT=dim` so upstream's snapshots hold on every platform.

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
