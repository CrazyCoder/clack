import { release } from 'node:os';
import type { Readable, Writable } from 'node:stream';
import type { State } from '@clack/core';
import isUnicodeSupported from 'is-unicode-supported';
import { styleText } from './style-text.js';

// is-unicode-supported detects Windows terminals purely from env vars
// (WT_SESSION, TERM_PROGRAM, ...). Under Windows 11 default-terminal
// delegation the shell spawns before Windows Terminal attaches, so none of
// those vars exist in the process environment even though the renderer is
// Windows Terminal (microsoft/terminal#13006). Fall back to the OS build:
// consoles since Windows 10 1607 (build 14393) ship VT support and TrueType
// fonts that render these glyphs fine.
function isUnicodeSupportedWithDelegation(): boolean {
	if (isUnicodeSupported()) return true;
	if (process.platform !== 'win32') return false;
	const build = Number(release().split('.')[2] ?? 0);
	return build >= 14393;
}

export const unicode = isUnicodeSupportedWithDelegation();
export const isCI = (): boolean => process.env.CI === 'true';
export const isTTY = (output: Writable): boolean => {
	return (output as Writable & { isTTY?: boolean }).isTTY === true;
};
export const unicodeOr = (c: string, fallback: string) => (unicode ? c : fallback);
export const S_STEP_ACTIVE = unicodeOr('◆', '*');
export const S_STEP_CANCEL = unicodeOr('■', 'x');
export const S_STEP_ERROR = unicodeOr('▲', 'x');
export const S_STEP_SUBMIT = unicodeOr('◇', 'o');

export const S_BAR_START = unicodeOr('┌', 'T');
export const S_BAR = unicodeOr('│', '|');
export const S_BAR_END = unicodeOr('└', '—');
export const S_BAR_START_RIGHT = unicodeOr('┐', 'T');
export const S_BAR_END_RIGHT = unicodeOr('┘', '—');

export const S_RADIO_ACTIVE = unicodeOr('●', '>');
export const S_RADIO_INACTIVE = unicodeOr('○', ' ');
export const S_CHECKBOX_ACTIVE = unicodeOr('◻', '[•]');
export const S_CHECKBOX_SELECTED = unicodeOr('◼', '[+]');
export const S_CHECKBOX_INACTIVE = unicodeOr('◻', '[ ]');
export const S_PASSWORD_MASK = unicodeOr('▪', '•');

export const S_BAR_H = unicodeOr('─', '-');
export const S_CORNER_TOP_RIGHT = unicodeOr('╮', '+');
export const S_CONNECT_LEFT = unicodeOr('├', '+');
export const S_CORNER_BOTTOM_RIGHT = unicodeOr('╯', '+');
export const S_CORNER_BOTTOM_LEFT = unicodeOr('╰', '+');
export const S_CORNER_TOP_LEFT = unicodeOr('╭', '+');

export const S_INFO = unicodeOr('●', '•');
export const S_SUCCESS = unicodeOr('◆', '*');
export const S_WARN = unicodeOr('▲', '!');
export const S_ERROR = unicodeOr('■', 'x');

export const symbol = (state: State) => {
	switch (state) {
		case 'initial':
		case 'active':
			return styleText('cyan', S_STEP_ACTIVE);
		case 'cancel':
			return styleText('red', S_STEP_CANCEL);
		case 'error':
			return styleText('yellow', S_STEP_ERROR);
		case 'submit':
			return styleText('green', S_STEP_SUBMIT);
		case 'validating':
			return styleText('dim', S_STEP_ACTIVE);
	}
};

export const symbolBar = (state: State) => {
	switch (state) {
		case 'initial':
		case 'active':
			return styleText('cyan', S_BAR);
		case 'cancel':
			return styleText('red', S_BAR);
		case 'error':
			return styleText('yellow', S_BAR);
		case 'submit':
			return styleText('green', S_BAR);
	}
};

export interface CommonOptions {
	input?: Readable;
	output?: Writable;
	signal?: AbortSignal;
	withGuide?: boolean;
}

export function formatInstructionFooter(instructions: string[], hasGuide: boolean): string[] {
	const guidePrefix = hasGuide ? `${styleText('cyan', S_BAR)}  ` : '';
	const footerLines = [`${guidePrefix}${instructions.join(' • ')}`];
	if (hasGuide) {
		footerLines.push(styleText('cyan', S_BAR_END));
	}
	return footerLines;
}
