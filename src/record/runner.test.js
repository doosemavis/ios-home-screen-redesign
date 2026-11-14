import { afterEach, describe, expect, it, vi } from 'vitest'
import { createVirtualClock } from '../clock/clock.js'
import { createRunner } from './runner.js'
import { DRAG_PRESS_MS, SWIPE_MOVES, SWIPE_MS, TAP_MS, TYPE_CHAR_MS } from './timeline.js'

const SCREEN = { left: 0, top: 0, width: 360, height: 800 }

function withRect(el, { left, top, width, height }) {
  el.getBoundingClientRect = () => ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top })
  return el
}

function make(tag, attrs, rect, parent) {
  const el = document.createElement(tag)
  Object.entries(attrs).forEach(([name, value]) => el.setAttribute(name, value))
  if (rect) withRect(el, rect)
  parent.appendChild(el)
  return el
}

// A minimal phone: screen, page 0 (one filled slot, one empty slot, the widget) and an app.
function buildPhone() {
  const root = make('div', { 'data-stage': 'record' }, null, document.body)
  const screen = make('div', { 'data-edit-mode': 'true' }, SCREEN, root)
  const page = make('div', { 'data-page': '0' }, null, screen)
  make('div', { 'data-page': '1', inert: '' }, null, screen)
  const filled = make('div', { 'data-slot': 'page:0:2' }, { left: 270, top: 100, width: 80, height: 95 }, page)
  const maps = make('div', { 'data-item': 'app:maps' }, { left: 100, top: 200, width: 60, height: 80 }, filled)
  const empty = make('div', { 'data-slot': 'page:0:3' }, { left: 270, top: 300, width: 80, height: 95 }, page)
  const widgetSlot = make('div', { 'data-slot': 'page:0:0' }, null, page)
  const widget = make('div', { 'data-widget': 'weather' }, { left: 20, top: 100, width: 150, height: 170 }, widgetSlot)
  return { root, screen, maps, empty, widget }
}

// Records pointer/click events reaching `el` with the virtual time they arrived.
function recordEvents(el, clock) {
  const log = []
  const push = (event) =>
    log.push({ type: event.type, t: clock.now(), x: event.clientX, y: event.clientY, pointerType: event.pointerType })
  ;['pointerdown', 'pointermove', 'pointerup', 'click'].forEach((type) => el.addEventListener(type, push))
  return log
}

const scene = (steps, extra = {}) => ({ id: 's', caption: 'Caption', durationMs: 2000, steps, ...extra })
const hitSelf = (el) => () => el

afterEach(() => {
  document.body.innerHTML = ''
})

describe('createRunner', () => {
  it('runner dispatches pointerdown/up on target center at scheduled virtual times', () => {
    const clock = createVirtualClock()
    const { root, maps } = buildPhone()
    const log = recordEvents(maps, clock)
    createRunner({
      clock,
      root,
      scenes: [scene([{ at: 300, kind: 'tap', target: '[data-item="app:maps"]' }])],
      hitTest: hitSelf(maps),
    })
    clock.advance(299)
    expect(log).toEqual([])
    clock.advance(1)
    expect(log).toEqual([{ type: 'pointerdown', t: 300, x: 130, y: 240, pointerType: 'touch' }])
    clock.advance(TAP_MS - 1)
    expect(log).toHaveLength(1)
    clock.advance(1)
    expect(log.map((e) => [e.type, e.t, e.x, e.y])).toEqual([
      ['pointerdown', 300, 130, 240],
      ['pointerup', 300 + TAP_MS, 130, 240],
      ['click', 300 + TAP_MS, 130, 240],
    ])
  })

  it('runner emits captions per scene', () => {
    const clock = createVirtualClock()
    const onCaption = vi.fn()
    const scenes = [
      { id: 'a', caption: 'First', durationMs: 1000, steps: [] },
      { id: 'b', caption: 'Second', durationMs: 500, steps: [] },
      { id: 'end', caption: null, durationMs: 500, steps: [] },
    ]
    createRunner({ clock, root: buildPhone().root, scenes, onCaption })
    clock.advance(0)
    expect(onCaption.mock.calls).toEqual([['First']])
    clock.advance(999)
    expect(onCaption).toHaveBeenCalledTimes(1)
    clock.advance(1)
    expect(onCaption.mock.calls.at(-1)).toEqual(['Second'])
    clock.advance(500)
    expect(onCaption.mock.calls).toEqual([['First'], ['Second'], [null]])
  })

  it('reports its total length', () => {
    const scenes = [scene([]), scene([], { durationMs: 750 })]
    const runner = createRunner({ clock: createVirtualClock(), root: buildPhone().root, scenes })
    expect(runner.totalMs).toBe(2750)
  })

  it('taps at a fractional anchor inside the target', () => {
    const clock = createVirtualClock()
    const { root, maps } = buildPhone()
    const hitTest = vi.fn(() => maps)
    const log = recordEvents(maps, clock)
    createRunner({ clock, root, hitTest, scenes: [scene([{ at: 0, kind: 'tap', target: '[data-item="app:maps"]', anchor: [0.25, 1] }])] })
    clock.advance(0)
    expect(hitTest).toHaveBeenCalledWith(115, 280)
    expect(log[0]).toMatchObject({ x: 115, y: 280 })
  })

  it('dispatches on the element actually hit, which may be a child of the target', () => {
    const clock = createVirtualClock()
    const { root, maps } = buildPhone()
    const glyph = make('span', {}, null, maps)
    const onGlyph = recordEvents(glyph, clock)
    const onMaps = recordEvents(maps, clock)
    createRunner({ clock, root, hitTest: hitSelf(glyph), scenes: [scene([{ at: 0, kind: 'tap', target: '[data-item="app:maps"]' }])] })
    clock.advance(TAP_MS)
    expect(onGlyph.map((e) => e.type)).toEqual(['pointerdown', 'pointerup', 'click'])
    expect(onMaps.map((e) => e.type)).toEqual(['pointerdown', 'pointerup', 'click'])
  })

  it('fails loudly when the touch would land outside the target', () => {
    const clock = createVirtualClock()
    const { root, widget } = buildPhone()
    createRunner({ clock, root, hitTest: hitSelf(widget), scenes: [scene([{ at: 10, kind: 'tap', target: '[data-item="app:maps"]' }])] })
    expect(() => clock.advance(10)).toThrow(/\[data-item="app:maps"\].*missed/)
  })

  it('fails loudly when the target is missing', () => {
    const clock = createVirtualClock()
    const { root } = buildPhone()
    createRunner({ clock, root, scenes: [scene([{ at: 0, kind: 'tap', target: '[data-control="nope"]' }])] })
    expect(() => clock.advance(0)).toThrow(/\[data-control="nope"\].*not found/)
  })

  it('holds a long-press for holdMs and sends no click', () => {
    const clock = createVirtualClock()
    const { root, widget } = buildPhone()
    const log = recordEvents(widget, clock)
    createRunner({ clock, root, hitTest: hitSelf(widget), scenes: [scene([{ at: 100, kind: 'longPress', target: '[data-widget="weather"]', holdMs: 900 }])] })
    clock.advance(2000)
    expect(log.map((e) => [e.type, e.t])).toEqual([['pointerdown', 100], ['pointerup', 1000]])
  })

  it('swipes left from an empty slot of the current page: down, 8 moves over 280ms, up', () => {
    const clock = createVirtualClock()
    const { root, empty } = buildPhone()
    const log = recordEvents(empty, clock)
    createRunner({ clock, root, hitTest: hitSelf(empty), scenes: [scene([{ at: 0, kind: 'swipe', from: 'page', direction: 'left' }])] })
    clock.advance(SWIPE_MS)
    expect(log.map((e) => e.type)).toEqual(['pointerdown', ...Array(SWIPE_MOVES).fill('pointermove'), 'pointerup'])
    expect(log[0]).toMatchObject({ t: 0, x: 310, y: 347.5 })
    expect(log.at(-1).t).toBe(SWIPE_MS)
    const xs = log.map((e) => e.x)
    xs.slice(1).forEach((x, i) => expect(x).toBeLessThan(xs[i]))
    expect(log.at(-1).x).toBeCloseTo(310 - 0.6 * SCREEN.width)
    expect(new Set(log.map((e) => e.y))).toEqual(new Set([347.5]))
  })

  it('swipes from the weather widget when no empty slot leaves room, never from an icon', () => {
    const clock = createVirtualClock()
    const { root, widget } = buildPhone()
    const log = recordEvents(widget, clock)
    createRunner({ clock, root, hitTest: hitSelf(widget), scenes: [scene([{ at: 0, kind: 'swipe', from: 'page', direction: 'right' }])] })
    clock.advance(SWIPE_MS)
    expect(log[0].type).toBe('pointerdown')
    expect(log.at(-1).x).toBeGreaterThan(log[0].x)
    expect(log.at(-1).x).toBeLessThanOrEqual(SCREEN.width)
  })

  it('drags: presses, pauses, glides to the slot centre, hovers, then lifts with no click', () => {
    const clock = createVirtualClock()
    const { root, maps } = buildPhone()
    const log = recordEvents(maps, clock)
    const step = { at: 100, kind: 'drag', target: '[data-item="app:maps"]', to: '[data-slot="page:0:3"]', moveMs: 400, holdMs: 300 }
    createRunner({ clock, root, hitTest: hitSelf(maps), scenes: [scene([step])] })
    clock.advance(100 + DRAG_PRESS_MS - 1)
    expect(log.map((e) => e.type)).toEqual(['pointerdown'])
    clock.advance(2000)
    const moves = log.filter((e) => e.type === 'pointermove')
    expect(log[0]).toMatchObject({ type: 'pointerdown', t: 100, x: 130, y: 240 })
    expect(moves.length).toBeGreaterThan(10)
    expect(moves[0].t).toBeGreaterThanOrEqual(100 + DRAG_PRESS_MS)
    moves.slice(1).forEach((m, i) => expect(m.x).toBeGreaterThan(moves[i].x))
    expect(moves.at(-1)).toMatchObject({ t: 100 + DRAG_PRESS_MS + 400, x: 310, y: 347.5 })
    expect(log.at(-1)).toMatchObject({ type: 'pointerup', t: 100 + DRAG_PRESS_MS + 400 + 300, x: 310, y: 347.5 })
    expect(log.some((e) => e.type === 'click')).toBe(false)
  })

  it('fails loudly when the drag destination is missing', () => {
    const clock = createVirtualClock()
    const { root, maps } = buildPhone()
    const step = { at: 0, kind: 'drag', target: '[data-item="app:maps"]', to: '[data-slot="page:0:9"]', moveMs: 400, holdMs: 300 }
    createRunner({ clock, root, hitTest: hitSelf(maps), scenes: [scene([step])] })
    expect(() => clock.advance(0)).toThrow(/page:0:9/)
  })

  it('types character by character through the native value setter', () => {
    const clock = createVirtualClock()
    const { root } = buildPhone()
    const input = make('input', { 'data-control': 'folder-name' }, null, root)
    const seen = []
    input.addEventListener('input', (event) => seen.push([clock.now(), event.target.value]))
    createRunner({ clock, root, scenes: [scene([{ at: 50, kind: 'type', target: '[data-control="folder-name"]', text: 'Abc' }])] })
    clock.advance(1000)
    expect(seen).toEqual([[50, 'A'], [50 + TYPE_CHAR_MS, 'Ab'], [50 + 2 * TYPE_CHAR_MS, 'Abc']])
  })

  it('starts the fade-out on cue', () => {
    const clock = createVirtualClock()
    const onFadeOut = vi.fn()
    createRunner({ clock, root: buildPhone().root, onFadeOut, scenes: [scene([]), scene([{ at: 400, kind: 'fadeOut' }])] })
    clock.advance(2399)
    expect(onFadeOut).not.toHaveBeenCalled()
    clock.advance(1)
    expect(onFadeOut).toHaveBeenCalledTimes(1)
  })

  it('dispose cancels everything still scheduled', () => {
    const clock = createVirtualClock()
    const { root, maps } = buildPhone()
    const onCaption = vi.fn()
    const log = recordEvents(maps, clock)
    const runner = createRunner({ clock, root, onCaption, hitTest: hitSelf(maps), scenes: [scene([{ at: 0, kind: 'tap', target: '[data-item="app:maps"]' }])] })
    clock.advance(0)
    runner.dispose()
    clock.advance(5000)
    expect(log.map((e) => e.type)).toEqual(['pointerdown'])
    expect(onCaption).toHaveBeenCalledTimes(1)
  })
})
