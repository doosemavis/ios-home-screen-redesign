import { fireEvent, render } from '@testing-library/react'
import { createElement } from 'react'
import { vi } from 'vitest'
import HomeScreenApp from '../HomeScreenApp.jsx'
import { createVirtualClock } from '../clock/clock.js'

// jsdom has no layout: every element reports one 362×700 box at the origin, and
// elementFromPoint returns whatever slot the test says is under the pointer.
export const SCREEN_WIDTH = 362
const POINT = { pointerId: 1, clientX: 100, clientY: 300, button: 0 }

export const at = (clientX, clientY = 300, pointerId = 1) => ({ ...POINT, clientX, clientY, pointerId })

export function installGeometry() {
  const hit = { el: null }
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0, top: 0, right: SCREEN_WIDTH, bottom: 700, width: SCREEN_WIDTH, height: 700, x: 0, y: 0,
  })
  document.elementFromPoint = vi.fn(() => hit.el)
  return hit
}

export function removeGeometry() {
  vi.restoreAllMocks()
  delete document.elementFromPoint
}

// The full app on a virtual clock, plus query and gesture helpers.
export function renderHome() {
  const clock = createVirtualClock()
  const utils = render(createElement(HomeScreenApp, { clock }))
  const q = (sel) => utils.container.querySelector(sel)
  const qa = (sel) => [...utils.container.querySelectorAll(sel)]
  return {
    ...utils,
    clock,
    q,
    qa,
    item: (key) => q(`[data-item="${key}"]`),
    slot: (name) => q(`[data-slot="${name}"]`),
    inFolder: (appId) => q(`[data-folder-panel] [data-item="app:${appId}"]`),
    editMode: () => q('[data-edit-mode]').getAttribute('data-edit-mode') === 'true',
    rightClick: (el) => fireEvent.contextMenu(el),
    tap: (el) => {
      fireEvent.pointerDown(el, POINT)
      fireEvent.pointerUp(el, POINT)
    },
  }
}

// Item key → slot name for every item on the home screen (folder contents excluded).
export const slotMap = (ctx) =>
  Object.fromEntries(
    ctx.qa('[data-slot] [data-item]').map((el) => [el.getAttribute('data-item'), el.closest('[data-slot]').getAttribute('data-slot')]),
  )

export const changedKeys = (before, after) =>
  [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((k) => before[k] !== after[k]).sort()

// Press on `el`, move past the drag threshold, then hover `slotName` (via the hit stub).
export function dragOver(ctx, hit, el, slotName) {
  fireEvent.pointerDown(el, at(100))
  fireEvent.pointerMove(el, at(160))
  hit.el = slotName === null ? null : ctx.slot(slotName)
  fireEvent.pointerMove(el, at(200))
}

export function dragDrop(ctx, hit, el, slotName) {
  dragOver(ctx, hit, el, slotName)
  fireEvent.pointerUp(el, at(200))
}
