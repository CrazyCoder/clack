import { styleText as nodeStyleText } from 'node:util';

type Format = Parameters<typeof nodeStyleText>[0];
type Options = Parameters<typeof nodeStyleText>[2];

/**
 * Whether faint text (SGR 2) is drawn as gray (SGR 90) instead.
 *
 * Windows Terminal draws faint text by halving the foreground color, which on a
 * light scheme makes it darker than normal text (microsoft/terminal#16493), and
 * conhost does not draw faint at all. Gray is the scheme's bright black, muted on
 * both light and dark schemes, so it is the default on Windows. Other terminals
 * blend faint text toward the background and keep it. `CLACK_FAINT=gray|dim`
 * overrides the default, for example on a scheme whose bright black is close to
 * its background.
 */
export function faintAsGray(
	env: NodeJS.ProcessEnv = process.env,
	platform: NodeJS.Platform = process.platform
): boolean {
	if (env.CLACK_FAINT === 'gray') return true;
	if (env.CLACK_FAINT === 'dim') return false;
	return platform === 'win32';
}

/**
 * `styleText` from `node:util`, with `dim` drawn as gray when {@link faintAsGray}
 * says so. Node reopens gray after a color span nested in the text, so the rest
 * of the text stays gray.
 */
export function styleText(format: Format, text: string, options?: Options): string {
	const formats = Array.isArray(format) ? format : [format];
	if (!formats.includes('dim') || !faintAsGray()) return nodeStyleText(format, text, options);
	const gray = formats.map((f) => (f === 'dim' ? 'gray' : f)) as Format;
	return nodeStyleText(gray, text, options);
}
