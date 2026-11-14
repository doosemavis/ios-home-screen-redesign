import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, fireEvent } from '@testing-library/react'
import { SNAPPY_MS } from '../motion/springs.js'
import { dragDrop, dragOver, installGeometry, removeGeometry, renderHome } from '../test/homeHarness.js'

// Empty-slot affordance and the drop glow: one icon-sized mark per slot.
const markCss = readFileSync(resolve(cwd(), 'src/components/SlotMark.module.css'), 'utf8')
let hit
beforeEach(() => {
  hit = installGeometry()
})
afterEach(removeGeometry)

const marks = (ctx) => ctx.qa('[data-slot-mark]')
const emptySlots = (ctx) =>
  ctx.qa('[data-slot]').filter((slot) => slot.querySelector('[data-item], [data-widget]') === null)
const markIn = (ctx, name) => ctx.slot(name).querySelector('[data-slot-mark]')

describe('empty-slot placeholders', () => {
  it('are absent outside edit mode', () => {
    const ctx = renderHome()
    expect(marks(ctx)).toHaveLength(0)
  })

  it('sit in every empty page and dock slot in edit mode, never on items or the widget', () => {
    const ctx = renderHome()
    ctx.rightClick(ctx.slot('page:0:8'))
    dragDrop(ctx, hit, ctx.item('app:phone'), 'page:1:6')
    act(() => ctx.clock.advance(SNAPPY_MS))
    const empty = emptySlots(ctx)
    expect(empty.map((s) => s.getAttribute('data-slot'))).toContain('dock:0')
    expect(marks(ctx)).toHaveLength(empty.length)
    empty.forEach((slot) => expect(slot.querySelector('[data-slot-mark="idle"]')).not.toBeNull())
    expect(ctx.slot('page:0:0').querySelector('[data-slot-mark]')).toBeNull()
    expect(markIn(ctx, 'page:0:9')).toBeNull()
    marks(ctx).forEach((mark) => {
      expect(mark).not.toHaveAttribute('data-item')
      expect(mark).toHaveAttribute('aria-hidden', 'true')
    })
  })

  it('pulse while something is selected', () => {
    const ctx = renderHome()
    ctx.rightClick(ctx.slot('page:0:8'))
    ctx.tap(ctx.item('app:maps'))
    const mark = markIn(ctx, 'page:1:6')
    expect(mark).toHaveAttribute('data-slot-mark', 'ready')
    expect(mark.className).toMatch(/pulse/)
    ctx.tap(ctx.item('app:maps'))
    expect(markIn(ctx, 'page:1:6').className).not.toMatch(/pulse/)
  })

  it('a tap on a placeholder places the selection', () => {
    const ctx = renderHome()
    ctx.rightClick(ctx.slot('page:0:8'))
    ctx.tap(ctx.item('app:maps'))
    ctx.tap(markIn(ctx, 'page:1:6'))
    expect(ctx.slot('page:1:6').querySelector('[data-item="app:maps"]')).not.toBeNull()
  })
})

describe('drop glow', () => {
  it('is the icon-sized mark inside the hovered empty slot, not the slot', () => {
    const ctx = renderHome()
    ctx.rightClick(ctx.slot('page:0:8'))
    dragOver(ctx, hit, ctx.item('app:maps'), 'page:1:6')
    const glow = ctx.q('[data-drop-target="true"]')
    expect(glow).toBe(markIn(ctx, 'page:1:6'))
    expect(glow).toHaveAttribute('data-slot-mark', 'hover')
    expect(ctx.slot('page:1:6')).not.toHaveAttribute('data-drop-target')
    expect(ctx.qa('[data-drop-target]')).toHaveLength(1)
  })

  it('is an icon-sized mark over an occupied target too, in pages and the dock', () => {
    const ctx = renderHome()
    ctx.rightClick(ctx.slot('page:0:8'))
    dragOver(ctx, hit, ctx.item('app:maps'), 'page:0:9')
    expect(ctx.q('[data-drop-target="true"]')).toBe(markIn(ctx, 'page:0:9'))
    fireEvent.pointerCancel(ctx.item('app:maps'))
    dragOver(ctx, hit, ctx.item('app:notes'), 'dock:1')
    expect(ctx.q('[data-drop-target="true"]')).toBe(markIn(ctx, 'dock:1'))
  })

  it('accepts a drop: the glow stays in the slot and fades out, then is gone', () => {
    const ctx = renderHome()
    ctx.rightClick(ctx.slot('page:0:8'))
    dragDrop(ctx, hit, ctx.item('app:maps'), 'page:1:6')
    expect(ctx.slot('page:1:6').querySelector('[data-item="app:maps"]')).not.toBeNull()
    const accepted = markIn(ctx, 'page:1:6')
    expect(accepted).toHaveAttribute('data-slot-mark', 'landing')
    expect(accepted).not.toHaveAttribute('data-drop-target')
    act(() => ctx.clock.advance(SNAPPY_MS - 1))
    expect(markIn(ctx, 'page:1:6')).toBe(accepted)
    act(() => ctx.clock.advance(1))
    expect(markIn(ctx, 'page:1:6')).toBeNull()
  })

  it('the accept fade keeps the glow ring exactly as it is and only lowers its opacity', () => {
    const landing = markCss.match(/\.landing\s*{([^}]*)}/)[1]
    const hover = markCss.match(/\.hover\s*{([^}]*)}/)[1]
    const ring = (rule) => ['outline-color', 'box-shadow'].map((prop) => rule.match(new RegExp(`${prop}:([^;]*);`))[1].trim())
    expect(ring(landing)).toEqual(ring(hover))
    expect(landing.match(/[a-z-]+(?=:)/g)).toEqual(['outline-color', 'box-shadow', 'animation'])
    expect(landing).toMatch(new RegExp(`animation:\\s*mark-accept ${SNAPPY_MS}ms`))
    const keyframes = markCss.match(/@keyframes mark-accept\s*{([\s\S]*?)\n}/)[1]
    expect(keyframes.match(/[a-z-]+(?=:)/g)).toEqual(['opacity', 'opacity'])
  })

  it('placeholders fade in where a slot empties, opacity only', () => {
    const rule = markCss.match(/\.mark\s*{([^}]*)}/)[1]
    expect(rule).toMatch(/animation:\s*mark-in /)
    const keyframes = markCss.match(/@keyframes mark-in\s*{([\s\S]*?)\n}/)[1]
    expect(keyframes.match(/[a-z-]+(?=:)/g)).toEqual(['opacity', 'opacity'])
  })

  it('the mark is a 60×60 squircle at the icon radius, centred over the icon', () => {
    const rule = markCss.match(/\.mark\s*{([^}]*)}/)[1]
    expect(rule).toMatch(/width:\s*60px/)
    expect(rule).toMatch(/height:\s*60px/)
    expect(rule).toMatch(/border-radius:\s*26%/)
    expect(rule).toMatch(/grid-area:\s*1 \/ 1/)
    expect(rule).not.toMatch(/position:\s*absolute/)
    expect(markCss).toMatch(/prefers-reduced-motion[\s\S]*\.pulse[\s\S]*animation:\s*none/)
  })
})
