import { afterEach, describe, expect, it } from 'vitest'
import { beginTouch } from './touchSession.js'

const POINT = { x: 10, y: 20 }
const METHODS = ['setPointerCapture', 'hasPointerCapture', 'releasePointerCapture']

// A surface holding an icon; `log` collects "<type>@<element>" for every event seen.
function build() {
  document.body.innerHTML = '<div id="surface"><div id="icon"><span id="glyph"></span></div></div>'
  const byId = (id) => document.getElementById(id)
  const log = []
  ;['pointerdown', 'pointermove', 'pointerup', 'lostpointercapture', 'click'].forEach((type) =>
    ['surface', 'icon', 'glyph'].forEach((id) =>
      byId(id).addEventListener(type, (event) => {
        if (event.target === event.currentTarget) log.push(`${type}@${id}`)
      }),
    ),
  )
  return { surface: byId('surface'), icon: byId('icon'), glyph: byId('glyph'), log }
}

const captureOnDown = (el) =>
  el.addEventListener('pointerdown', (event) => event.currentTarget.setPointerCapture(event.pointerId))

const descriptors = () => METHODS.map((name) => Object.getOwnPropertyDescriptor(Element.prototype, name))

afterEach(() => {
  document.body.innerHTML = ''
})

describe('beginTouch', () => {
  it('without capture, every event and the click stay on the element hit', () => {
    const { glyph, log } = build()
    const touch = beginTouch(glyph, POINT, 7)
    touch.move({ x: 12, y: 20 })
    touch.end(POINT, { click: true })
    expect(log).toEqual(['pointerdown@glyph', 'pointermove@glyph', 'pointerup@glyph', 'click@glyph'])
  })

  it('once an ancestor captures, the rest of the touch and the click go to it', () => {
    const { surface, glyph, log } = build()
    captureOnDown(surface)
    const touch = beginTouch(glyph, POINT, 7)
    touch.move({ x: 30, y: 20 })
    touch.end(POINT, { click: true })
    expect(log).toEqual([
      'pointerdown@glyph',
      'pointermove@surface',
      'pointerup@surface',
      'lostpointercapture@surface',
      'click@surface',
    ])
  })

  it('a long-press or swipe release sends no click', () => {
    const { surface, glyph, log } = build()
    captureOnDown(surface)
    beginTouch(glyph, POINT, 7).end(POINT)
    expect(log).toEqual(['pointerdown@glyph', 'pointerup@surface', 'lostpointercapture@surface'])
  })

  it('answers hasPointerCapture and releasePointerCapture for its pointer only', () => {
    const { surface, icon, glyph, log } = build()
    const seen = []
    surface.addEventListener('pointerdown', (event) => {
      surface.setPointerCapture(7)
      seen.push(surface.hasPointerCapture(7), icon.hasPointerCapture(7))
      icon.releasePointerCapture(7)
      seen.push(surface.hasPointerCapture(7))
      surface.releasePointerCapture(event.pointerId)
      seen.push(surface.hasPointerCapture(7))
    })
    beginTouch(glyph, POINT, 7).end(POINT, { click: true })
    expect(seen).toEqual([true, false, true, false])
    expect(log).toEqual(['pointerdown@glyph', 'pointerup@glyph', 'click@glyph'])
  })

  it('passes other pointer ids to the environment and restores the prototype afterwards', () => {
    const before = descriptors()
    const { surface, glyph } = build()
    const seen = []
    surface.addEventListener('pointerdown', () => {
      seen.push(surface.hasPointerCapture(99))
      expect(() => surface.setPointerCapture(99)).not.toThrow()
      surface.releasePointerCapture(99)
    })
    beginTouch(glyph, POINT, 7).end(POINT)
    expect(seen).toEqual([false])
    expect(descriptors()).toEqual(before)
  })

  it('restores the prototype even when dispatching throws', () => {
    const before = descriptors()
    const { glyph } = build()
    const broken = Object.assign(glyph, {
      dispatchEvent: () => {
        throw new Error('dispatch failed')
      },
    })
    expect(() => beginTouch(broken, POINT, 7)).toThrow('dispatch failed')
    expect(descriptors()).toEqual(before)
  })
})
