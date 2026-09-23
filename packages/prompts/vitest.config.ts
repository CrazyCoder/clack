import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		env: {
			FORCE_COLOR: '1',
			// Snapshots hold upstream's faint styling on every platform.
			CLACK_FAINT: 'dim',
		},
		snapshotSerializers: ['vitest-ansi-serializer'],
	},
});
