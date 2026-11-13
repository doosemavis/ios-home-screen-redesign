import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.js'],
    coverage: {
      provider: 'v8',
      include: [
        'src/model/**',
        'src/state/**',
        'src/clock/**',
        'src/record/timeline.js',
      ],
      thresholds: {
        lines: 80,
      },
    },
  },
})
