import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { GENTLE_MS, SNAPPY_MS, SPRING_GENTLE, SPRING_SNAPPY } from './springs.js'

// Vitest stubs CSS imports (even ?raw), so read the file from the repo root.
const css = readFileSync('src/motion/springs.css', 'utf8')
const stops = (easing) => easing.slice('linear('.length, -1).split(', ').map(Number)

describe('spring easings', () => {
  it('mirrors the JS constants exactly in the CSS custom properties', () => {
    expect(css).toContain(`--spring-snappy: ${SPRING_SNAPPY};`)
    expect(css).toContain(`--spring-gentle: ${SPRING_GENTLE};`)
    expect(css).toContain(`--snappy-ms: ${SNAPPY_MS}ms;`)
    expect(css).toContain(`--gentle-ms: ${GENTLE_MS}ms;`)
  })

  it('samples enough stops to look smooth and lands exactly on 0 and 1', () => {
    for (const easing of [SPRING_SNAPPY, SPRING_GENTLE]) {
      const values = stops(easing)
      expect(values.length).toBeGreaterThanOrEqual(30)
      expect(values.length).toBeLessThanOrEqual(60)
      expect(values[0]).toBe(0)
      expect(values.at(-1)).toBe(1)
    }
  })

  it('gives snappy a slight overshoot and gentle none', () => {
    const snappyPeak = Math.max(...stops(SPRING_SNAPPY))
    expect(snappyPeak).toBeGreaterThanOrEqual(1.03)
    expect(snappyPeak).toBeLessThanOrEqual(1.05)
    expect(Math.max(...stops(SPRING_GENTLE))).toBe(1)
  })
})
