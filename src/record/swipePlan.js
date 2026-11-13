// Where a scripted page swipe starts and ends. A swipe must start on empty grid space
// or the weather widget, never on an icon (in edit mode a press that moves on an icon
// is a drag). 'left' moves the finger left, i.e. goes to the next page.
import { RecorderError, pointIn } from './touchSynth.js'

export const SWIPE_SHARE = 0.6 // nominal travel, as a share of the screen width
export const EDGE_SHARE = 0.05 // the finger stays this far inside the glass
export const MIN_TRAVEL_SHARE = 0.45 // an empty slot is used only if it leaves this much room

const SIGN = { left: -1, right: 1 }
// On the widget, start on the side away from the swipe so the travel stays on screen.
const WIDGET_ANCHOR = { left: [0.85, 0.5], right: [0.15, 0.5] }

const currentPage = (root) => root.querySelector('[data-page]:not([inert])')

const emptySlots = (page) =>
  page === null
    ? []
    : [...page.querySelectorAll('[data-slot]')].filter((slot) => slot.querySelector('[data-item], [data-widget]') === null)

// End point for a swipe from `start`: SWIPE_SHARE of the width, clamped inside the glass.
function endFor(start, direction, screen) {
  const width = screen.right - screen.left
  const min = screen.left + EDGE_SHARE * width
  const max = screen.right - EDGE_SHARE * width
  const x = Math.min(max, Math.max(min, start.x + SIGN[direction] * SWIPE_SHARE * width))
  return { x, y: start.y }
}

// First empty slot (reading order) whose centre leaves room for the swipe; otherwise
// the weather widget. Returns { element, start, end } in viewport px.
export function planSwipe(root, direction) {
  if (SIGN[direction] === undefined) throw new RecorderError(`unknown swipe direction ${direction}`)
  const screenEl = root.querySelector('[data-edit-mode]')
  if (screenEl === null) throw new RecorderError('swipe: home screen not found')
  const screen = screenEl.getBoundingClientRect()
  const minTravel = MIN_TRAVEL_SHARE * (screen.right - screen.left)
  const roomy = emptySlots(currentPage(root))
    .map((element) => {
      const start = pointIn(element)
      return { element, start, end: endFor(start, direction, screen) }
    })
    .find(({ start, end }) => Math.abs(end.x - start.x) >= minTravel)
  if (roomy !== undefined) return roomy
  const widget = root.querySelector('[data-page]:not([inert]) [data-widget]')
  if (widget === null) throw new RecorderError(`swipe ${direction}: no empty slot or widget to start on`)
  const start = pointIn(widget, WIDGET_ANCHOR[direction])
  return { element: widget, start, end: endFor(start, direction, screen) }
}
