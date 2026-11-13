import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render } from '@testing-library/react'
import HomeScreenApp from '../HomeScreenApp.jsx'
import { ClockProvider } from '../clock/ClockContext.jsx'
import { HomeScreen } from './HomeScreen.jsx'
import { createInitialLayout } from '../model/initialLayout.js'
import { initialState } from '../state/homeScreenReducer.js'
import { createVirtualClock } from '../clock/clock.js'

const SCREEN_WIDTH = 362
const POINT = { pointerId: 1, clientX: 100, clientY: 300, button: 0 }

let hitSlot = null

function stubGeometry({ rectWidth = SCREEN_WIDTH, offsetWidth = 0 } = {}) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0, top: 0, right: rectWidth, bottom: 700, width: rectWidth, height: 700, x: 0, y: 0,
  })
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => offsetWidth })
}

beforeEach(() => {
  hitSlot = null
  stubGeometry()
  document.elementFromPoint = vi.fn(() => hitSlot)
})

afterEach(() => {
  vi.restoreAllMocks()
  delete HTMLElement.prototype.offsetWidth
  delete document.elementFromPoint
})

function setup() {
  const clock = createVirtualClock()
  const utils = render(<HomeScreenApp clock={clock} />)
  const q = (sel) => utils.container.querySelector(sel)
  const ctx = { ...utils, clock, q, item: (id) => q(`[data-item="${id}"]`), slot: (s) => q(`[data-slot="${s}"]`) }
  fireEvent.contextMenu(ctx.slot('page:0:8'))
  return ctx
}

const at = (clientX, clientY = 300, pointerId = 1) => ({ ...POINT, clientX, clientY, pointerId })

function startDrag(ctx, itemId, to = 160) {
  const el = ctx.item(itemId)
  fireEvent.pointerDown(el, at(100))
  fireEvent.pointerMove(el, at(to))
  return el
}

function dragTo(ctx, itemId, slotName) {
  const el = startDrag(ctx, itemId)
  hitSlot = ctx.slot(slotName)
  fireEvent.pointerMove(el, at(200))
  fireEvent.pointerUp(el, at(200))
}

const occupant = (ctx, slotName) => ctx.slot(slotName).querySelector('[data-item]')?.getAttribute('data-item') ?? null

describe('pointer drag and drop', () => {
  it('dragging an app onto an empty slot places it', () => {
    const ctx = setup()
    fireEvent.click(ctx.q('[data-dot="1"]'))
    dragTo(ctx, 'app:calculator', 'page:1:6')
    expect(occupant(ctx, 'page:1:6')).toBe('app:calculator')
    expect(occupant(ctx, 'page:1:0')).toBeNull()
    expect(occupant(ctx, 'page:1:1')).toBe('app:voicememos')
  })

  it('dragging an app onto an app swaps them 1:1', () => {
    const ctx = setup()
    dragTo(ctx, 'app:maps', 'page:0:9')
    expect(occupant(ctx, 'page:0:9')).toBe('app:maps')
    expect(occupant(ctx, 'page:0:8')).toBe('app:notes')
    expect(occupant(ctx, 'page:0:10')).toBe('app:calendar')
  })

  it('dragging an app onto a folder moves it inside', () => {
    const ctx = setup()
    dragTo(ctx, 'app:maps', 'page:0:2')
    expect(occupant(ctx, 'page:0:8')).toBeNull()
    expect(ctx.item('app:maps')).toBeNull()
    expect(occupant(ctx, 'page:0:2')).toBe('folder:social')
  })

  it('dragging a folder into the dock is refused with a shake', () => {
    const ctx = setup()
    expect(ctx.q('[data-shake]')).toHaveAttribute('data-shake', 'none')
    dragTo(ctx, 'folder:social', 'dock:0')
    expect(occupant(ctx, 'dock:0')).toBe('app:phone')
    expect(occupant(ctx, 'page:0:2')).toBe('folder:social')
    expect(ctx.q('[data-shake]')).not.toHaveAttribute('data-shake', 'none')
  })

  it('releasing over no slot changes nothing', () => {
    const ctx = setup()
    dragTo(ctx, 'app:maps', 'page:0:8')
    hitSlot = null
    const el = startDrag(ctx, 'app:notes')
    fireEvent.pointerUp(el, at(200))
    expect(occupant(ctx, 'page:0:9')).toBe('app:notes')
    expect(occupant(ctx, 'page:0:8')).toBe('app:maps')
  })

  it('shows a ghost, dims the source and glows the hovered slot while dragging', () => {
    const ctx = setup()
    const el = startDrag(ctx, 'app:maps')
    hitSlot = ctx.slot('page:0:9')
    fireEvent.pointerMove(el, at(170))
    expect(ctx.q('[data-drag-ghost]')).not.toBeNull()
    expect(ctx.container.querySelectorAll('[data-item="app:maps"]')).toHaveLength(1)
    expect(ctx.item('app:maps')).toHaveAttribute('data-drag-source', 'true')
    expect(ctx.slot('page:0:9')).toHaveAttribute('data-drop-target', 'true')
    fireEvent.pointerUp(el, at(170))
    expect(ctx.q('[data-drag-ghost]')).toBeNull()
    expect(ctx.q('[data-drop-target]')).toBeNull()
  })

  it('a cancelled pointer ends the drag without dropping', () => {
    const ctx = setup()
    const el = startDrag(ctx, 'app:maps')
    hitSlot = ctx.slot('page:0:9')
    fireEvent.pointerCancel(el, at(170))
    expect(ctx.q('[data-drag-ghost]')).toBeNull()
    expect(occupant(ctx, 'page:0:8')).toBe('app:maps')
  })

  it('ignores a second pointer during a drag', () => {
    const ctx = setup()
    const el = startDrag(ctx, 'app:maps')
    hitSlot = ctx.slot('page:0:9')
    fireEvent.pointerUp(el, at(170, 300, 2))
    expect(occupant(ctx, 'page:0:8')).toBe('app:maps')
    expect(ctx.q('[data-drag-ghost]')).not.toBeNull()
  })

  it('does not start a drag outside edit mode', () => {
    const ctx = setup()
    fireEvent.click(ctx.q('[data-control="done"]'))
    startDrag(ctx, 'app:maps')
    expect(ctx.q('[data-drag-ghost]')).toBeNull()
  })

  it('normalizes the move threshold by the phone scale', () => {
    stubGeometry({ rectWidth: SCREEN_WIDTH / 2, offsetWidth: SCREEN_WIDTH })
    const ctx = setup()
    startDrag(ctx, 'app:maps', 106)
    expect(ctx.q('[data-drag-ghost]')).not.toBeNull()
  })
})

describe('edge hover page turn', () => {
  it('holding a drag at the right edge for 600ms turns the page, and again if held', () => {
    const ctx = setup()
    const el = startDrag(ctx, 'app:maps')
    fireEvent.pointerMove(el, at(SCREEN_WIDTH - 10))
    act(() => ctx.clock.advance(599))
    expect(ctx.q('[data-dot="0"]')).toHaveAttribute('aria-current', 'page')
    act(() => ctx.clock.advance(1))
    expect(ctx.q('[data-dot="1"]')).toHaveAttribute('aria-current', 'page')
    act(() => ctx.clock.advance(600))
    expect(ctx.q('[data-dot="2"]')).toHaveAttribute('aria-current', 'page')
  })

  it('holding at the left edge turns back, leaving the edge cancels the turn', () => {
    const ctx = setup()
    fireEvent.click(ctx.q('[data-dot="1"]'))
    const el = startDrag(ctx, 'app:calculator')
    fireEvent.pointerMove(el, at(10))
    act(() => ctx.clock.advance(600))
    expect(ctx.q('[data-dot="0"]')).toHaveAttribute('aria-current', 'page')
    fireEvent.pointerMove(el, at(10))
    fireEvent.pointerMove(el, at(150))
    act(() => ctx.clock.advance(2000))
    expect(ctx.q('[data-dot="0"]')).toHaveAttribute('aria-current', 'page')
  })

  it('releasing stops the page timer', () => {
    const ctx = setup()
    const el = startDrag(ctx, 'app:maps')
    fireEvent.pointerMove(el, at(SCREEN_WIDTH - 5))
    fireEvent.pointerUp(el, at(SCREEN_WIDTH - 5))
    act(() => ctx.clock.advance(2000))
    expect(ctx.q('[data-dot="0"]')).toHaveAttribute('aria-current', 'page')
  })
})

describe('dock and widget drags', () => {
  it('dragging a dock app onto an empty page slot places it', () => {
    const ctx = setup()
    fireEvent.click(ctx.q('[data-dot="1"]'))
    dragTo(ctx, 'app:phone', 'page:1:6')
    expect(occupant(ctx, 'page:1:6')).toBe('app:phone')
    expect(occupant(ctx, 'dock:0')).toBeNull()
    expect(occupant(ctx, 'dock:1')).toBe('app:messages')
  })

  it('dragging a page app onto an empty dock slot places it', () => {
    const ctx = setup()
    fireEvent.click(ctx.q('[data-dot="1"]'))
    dragTo(ctx, 'app:phone', 'page:1:6')
    dragTo(ctx, 'app:calculator', 'dock:0')
    expect(occupant(ctx, 'dock:0')).toBe('app:calculator')
    expect(occupant(ctx, 'page:1:0')).toBeNull()
    expect(occupant(ctx, 'page:1:6')).toBe('app:phone')
  })

  it('dropping onto the weather widget is refused with a shake and nothing moves', () => {
    const ctx = setup()
    dragTo(ctx, 'app:maps', 'page:0:0')
    expect(occupant(ctx, 'page:0:8')).toBe('app:maps')
    expect(ctx.q('[data-shake]')).not.toHaveAttribute('data-shake', 'none')
  })

  it('glows only valid targets, never the widget or the item own slot', () => {
    const ctx = setup()
    const el = startDrag(ctx, 'app:maps')
    hitSlot = ctx.slot('page:0:0')
    fireEvent.pointerMove(el, at(170))
    expect(ctx.q('[data-drop-target]')).toBeNull()
    hitSlot = ctx.slot('page:0:8')
    fireEvent.pointerMove(el, at(171))
    expect(ctx.q('[data-drop-target]')).toBeNull()
    hitSlot = ctx.slot('page:0:9')
    fireEvent.pointerMove(el, at(172))
    expect(ctx.q('[data-drop-target]')).toBe(ctx.slot('page:0:9'))
  })

  it('refreshes the glow when an edge hold turns the page', () => {
    const ctx = setup()
    const el = startDrag(ctx, 'app:maps')
    fireEvent.pointerMove(el, at(SCREEN_WIDTH - 10))
    hitSlot = ctx.slot('page:1:6')
    act(() => ctx.clock.advance(600))
    expect(ctx.slot('page:1:6')).toHaveAttribute('data-drop-target', 'true')
  })
})

describe('edge timer and swipe edge cases', () => {
  it('stops the edge timer on unmount', () => {
    const clock = createVirtualClock()
    const dispatch = vi.fn()
    const state = { ...initialState(createInitialLayout()), editMode: true }
    const { container, unmount } = render(
      <ClockProvider clock={clock}>
        <HomeScreen state={state} dispatch={dispatch} />
      </ClockProvider>,
    )
    const el = container.querySelector('[data-item="app:maps"]')
    fireEvent.pointerDown(el, at(100))
    fireEvent.pointerMove(el, at(160))
    fireEvent.pointerMove(el, at(SCREEN_WIDTH - 10))
    unmount()
    act(() => clock.advance(3000))
    expect(dispatch).not.toHaveBeenCalledWith({ type: 'GO_TO_PAGE', page: 1 })
  })

  it('a swipe starting on empty grid space in edit mode changes page', () => {
    const ctx = setup()
    fireEvent.click(ctx.q('[data-dot="1"]'))
    const empty = ctx.slot('page:1:6')
    fireEvent.pointerDown(empty, at(300))
    fireEvent.pointerMove(empty, at(180))
    fireEvent.pointerUp(empty, at(180))
    expect(ctx.q('[data-dot="2"]')).toHaveAttribute('aria-current', 'page')
    expect(ctx.q('[data-drag-ghost]')).toBeNull()
  })
})

describe('stuck gestures', () => {
  it('a new pointerdown replaces a gesture whose pointer lost capture', () => {
    const ctx = setup()
    HTMLElement.prototype.hasPointerCapture = () => false
    fireEvent.pointerDown(ctx.item('app:maps'), at(100, 300, 1))
    fireEvent.pointerDown(ctx.item('app:notes'), at(100, 300, 2))
    fireEvent.pointerUp(ctx.item('app:notes'), at(100, 300, 2))
    delete HTMLElement.prototype.hasPointerCapture
    expect(ctx.item('app:notes')).toHaveAttribute('data-selected', 'true')
  })

  it('losing pointer capture mid-drag ends the drag and frees input', () => {
    const ctx = setup()
    const el = startDrag(ctx, 'app:maps')
    fireEvent.lostPointerCapture(el, at(160))
    expect(ctx.q('[data-drag-ghost]')).toBeNull()
    fireEvent.pointerDown(ctx.item('app:notes'), at(100, 300, 2))
    fireEvent.pointerUp(ctx.item('app:notes'), at(100, 300, 2))
    expect(ctx.item('app:notes')).toHaveAttribute('data-selected', 'true')
  })
})
