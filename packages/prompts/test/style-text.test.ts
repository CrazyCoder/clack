import { afterEach, describe, expect, test } from 'vitest';
import { faintAsGray, styleText } from '../src/style-text.js';

describe('styleText', () => {
	const original = process.env.CLACK_FAINT;

	afterEach(() => {
		if (original === undefined) delete process.env.CLACK_FAINT;
		else process.env.CLACK_FAINT = original;
	});

	test('faint is gray on Windows and faint elsewhere by default', () => {
		expect(faintAsGray({}, 'win32')).toBe(true);
		expect(faintAsGray({}, 'darwin')).toBe(false);
		expect(faintAsGray({}, 'linux')).toBe(false);
	});

	test('CLACK_FAINT overrides the platform default', () => {
		expect(faintAsGray({ CLACK_FAINT: 'dim' }, 'win32')).toBe(false);
		expect(faintAsGray({ CLACK_FAINT: 'gray' }, 'linux')).toBe(true);
	});

	test('draws dim as gray, alone and in a list', () => {
		process.env.CLACK_FAINT = 'gray';
		expect(styleText('dim', 'x')).toBe('\x1b[90mx\x1b[39m');
		expect(styleText(['strikethrough', 'dim'], 'x')).toBe('\x1b[9m\x1b[90mx\x1b[39m\x1b[29m');
	});

	test('keeps gray after a color span nested inside it', () => {
		process.env.CLACK_FAINT = 'gray';
		const inner = styleText('cyan', 'b');
		expect(styleText('dim', `a ${inner} c`)).toBe('\x1b[90ma \x1b[36mb\x1b[90m c\x1b[39m');
	});

	test('leaves dim alone when CLACK_FAINT=dim, and other formats always', () => {
		process.env.CLACK_FAINT = 'dim';
		expect(styleText('dim', 'x')).toBe('\x1b[2mx\x1b[22m');
		process.env.CLACK_FAINT = 'gray';
		expect(styleText('cyan', 'x')).toBe('\x1b[36mx\x1b[39m');
	});
});
