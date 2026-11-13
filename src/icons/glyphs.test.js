import { describe, expect, it } from 'vitest'
import { GLYPHS } from './glyphs.js'
import { glyphInk } from './ink.js'
import { APPS } from '../model/catalog.js'

describe('GLYPHS', () => {
  it('covers every glyph key the catalog uses', () => {
    const missing = Object.values(APPS)
      .map((app) => app.glyph)
      .filter((key) => GLYPHS[key] === undefined)
    expect(missing).toEqual([])
  })

  it('describes each glyph with at least one drawable element', () => {
    Object.entries(GLYPHS).forEach(([key, shapes]) => {
      expect(shapes.length, key).toBeGreaterThan(0)
      shapes.forEach(([tag]) => {
        expect(['path', 'circle', 'rect', 'ellipse'], key).toContain(tag)
      })
    })
  })

  it('includes the extra glyphs the screen chrome uses', () => {
    expect(GLYPHS.cloud).toBeDefined()
    expect(GLYPHS.magnifier).toBeDefined()
  })
})

describe('glyphInk', () => {
  it('uses white ink on dark or saturated gradients', () => {
    expect(glyphInk(['#2b2b30', '#050506'])).toBe('light')
    expect(glyphInk(['#5fb6ff', '#1a73e8'])).toBe('light')
  })

  it('uses dark ink on near-white gradients', () => {
    expect(glyphInk(['#ffffff', '#dcdce2'])).toBe('dark')
    expect(glyphInk(['#ffffff', '#e4e4ea'])).toBe('dark')
  })

  it('accepts shorthand hex colors', () => {
    expect(glyphInk(['#fff', '#eee'])).toBe('dark')
    expect(glyphInk(['#000', '#111'])).toBe('light')
  })
})
