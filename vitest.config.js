import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}'],
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
