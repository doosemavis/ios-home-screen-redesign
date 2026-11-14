import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render } from '@testing-library/react'
import HomeScreenApp from '../HomeScreenApp.jsx'
import { HomeScreen } from './HomeScreen.jsx'
import { createVirtualClock } from '../clock/clock.js'
import { createInitialLayout } from '../model/initialLayout.js'
import { initialState } from '../state/homeScreenReducer.js'

const POINT = { pointerId: 1, clientX: 100, clientY: 300, button: 0 }

function setup() {
  const clock = createVirtualClock()
  const utils = render(<HomeScreenApp clock={clock} />)
  const q = (sel) => utils.container.querySelector(sel)
  const item = (id) => q(`[data-item="${id}"]`)
  const slot = (s) => q(`[data-slot="${s}"]`)
  const home = () => q('[data-edit-mode]')
  return { ...utils, clock, q, item, slot, home }
}

const press = (el, point = POINT) => fireEvent.pointerDown(el, point)
const release = (el, point = POINT) => fireEvent.pointerUp(el, point)
const tap = (el) => {
  press(el)
  release(el)
}
const editMode = (ctx) => fireEvent.contextMenu(ctx.slot('page:0:8'))

describe('edit mode and long-press', () => {
  it('long-press for 500ms enters edit mode', () => {
    const ctx = setup()
    press(ctx.slot('page:0:8'))
    act(() => ctx.clock.advance(499))
    expect(ctx.home()).toHaveAttribute('data-edit-mode', 'false')
    act(() => ctx.clock.advance(1))
    expect(ctx.home()).toHaveAttribute('data-edit-mode', 'true')
  })

  it('releasing before 500ms cancels the long-press', () => {
    const ctx = setup()
    press(ctx.slot('page:0:8'))
    release(ctx.slot('page:0:8'))
    act(() => ctx.clock.advance(600))
    expect(ctx.home()).toHaveAttribute('data-edit-mode', 'false')
  })
})

describe('tap selection and placement', () => {
  it('tap selects and deselects an app in edit mode', () => {
    const ctx = setup()
    editMode(ctx)
    tap(ctx.item('app:maps'))
    expect(ctx.item('app:maps')).toHaveAttribute('data-selected', 'true')
    expect(ctx.item('app:maps')).toHaveAttribute('aria-pressed', 'true')
    tap(ctx.item('app:maps'))
    expect(ctx.item('app:maps')).toHaveAttribute('data-selected', 'false')
  })

  it('does not select outside edit mode', () => {
    const ctx = setup()
    tap(ctx.item('app:maps'))
    expect(ctx.item('app:maps')).toHaveAttribute('data-selected', 'false')
  })

  it('tapping an empty slot on page 2 places the selected app and leaves page 1 gap', () => {
    const ctx = setup()
    editMode(ctx)
    fireEvent.click(ctx.q('[data-dot="1"]'))
    tap(ctx.item('app:calculator'))
    fireEvent.click(ctx.q('[data-dot="2"]'))
    tap(ctx.slot('page:2:10'))
    expect(ctx.slot('page:2:10').querySelector('[data-item="app:calculator"]')).not.toBeNull()
    expect(ctx.slot('page:1:0').querySelector('[data-item]')).toBeNull()
    expect(ctx.slot('page:1:1').querySelector('[data-item="app:voicememos"]')).not.toBeNull()
    expect(ctx.q('[data-control="badge"]')).toBeNull()
  })

  it('second tap on an empty slot after placement does nothing', () => {
    const ctx = setup()
    editMode(ctx)
    fireEvent.click(ctx.q('[data-dot="2"]'))
    tap(ctx.item('app:store'))
    tap(ctx.slot('page:2:10'))
    const before = ctx.slot('page:2:11').innerHTML
    tap(ctx.slot('page:2:11'))
    expect(ctx.slot('page:2:11').innerHTML).toBe(before)
    expect(ctx.slot('page:2:11').querySelector('[data-item]')).toBeNull()
    expect(ctx.q('[data-control="toast"]')).toBeNull()
  })

  it('selection badge shows count and persists across page change', () => {
    const ctx = setup()
    editMode(ctx)
    expect(ctx.q('[data-control="badge"]')).toBeNull()
    tap(ctx.item('app:maps'))
    tap(ctx.item('app:notes'))
    expect(ctx.q('[data-control="badge"]')).toHaveTextContent('2 selected')
    fireEvent.click(ctx.q('[data-dot="1"]'))
    expect(ctx.q('[data-control="badge"]')).toHaveTextContent('2 selected')
  })

  it('controls disabled with empty selection and snap disabled when snapped', () => {
    const ctx = setup()
    editMode(ctx)
    expect(ctx.q('[data-control="move"]')).toBeDisabled()
    expect(ctx.q('[data-control="snap"]')).toBeDisabled()
    tap(ctx.item('app:maps'))
    expect(ctx.q('[data-control="move"]')).toBeEnabled()
    fireEvent.click(ctx.q('[data-dot="1"]'))
    expect(ctx.q('[data-control="snap"]')).toBeEnabled()
    fireEvent.click(ctx.q('[data-control="snap"]'))
    expect(ctx.slot('page:1:16').querySelector('[data-item]')).toBeNull()
    expect(ctx.slot('page:1:6').querySelector('[data-item="app:fitness"]')).not.toBeNull()
    expect(ctx.q('[data-control="snap"]')).toBeDisabled()
  })

  it('the Snap pill reads "Snap" on screen and "Snap to Grid" to assistive tech', () => {
    const ctx = setup()
    editMode(ctx)
    const snap = ctx.q('[data-control="snap"]')
    expect(snap).toHaveTextContent(/^Snap$/)
    expect(snap).toHaveAccessibleName('Snap to Grid')
  })
})

describe('refusal feedback', () => {
  it('shows toast and shakes on refused placement', () => {
    const ctx = setup()
    editMode(ctx)
    fireEvent.click(ctx.q('[data-dot="1"]'))
    ;['calculator', 'voicememos', 'translate'].forEach((id) => tap(ctx.item(`app:${id}`)))
    fireEvent.click(ctx.q('[data-dot="2"]'))
    expect(ctx.q('[data-shake]')).toHaveAttribute('data-shake', 'none')
    tap(ctx.slot('page:2:22'))
    expect(ctx.q('[data-control="toast"]')).toHaveTextContent('Not enough room on this page')
    const first = ctx.q('[data-shake]').getAttribute('data-shake')
    expect(first).not.toBe('none')
    act(() => ctx.clock.advance(1999))
    expect(ctx.q('[data-control="toast"]')).not.toBeNull()
    act(() => ctx.clock.advance(1))
    expect(ctx.q('[data-control="toast"]')).toBeNull()
    tap(ctx.slot('page:2:22'))
    const second = ctx.q('[data-shake]').getAttribute('data-shake')
    expect(second).not.toBe('none')
    expect(second).not.toBe(first)
  })
})

describe('swipe and pager', () => {
  it('renders every page in a track translated to the current page', () => {
    const ctx = setup()
    expect(ctx.container.querySelectorAll('[data-page]')).toHaveLength(3)
    expect(ctx.q('[data-pager-track]').style.transform).toBe('translateX(0%)')
    editMode(ctx)
    fireEvent.click(ctx.q('[data-dot="2"]'))
    expect(ctx.q('[data-pager-track]').style.transform).toBe('translateX(-66.6667%)')
  })

  it('swiping left on empty grid space goes to the next page, clamped', () => {
    const ctx = setup()
    editMode(ctx)
    const swipe = (from, to) => {
      press(ctx.slot('page:0:20'), { ...POINT, clientX: from })
      fireEvent.pointerMove(ctx.slot('page:0:20'), { ...POINT, clientX: to })
      release(ctx.slot('page:0:20'), { ...POINT, clientX: to })
    }
    swipe(300, 200)
    expect(ctx.q('[data-dot="1"]')).toHaveAttribute('aria-current', 'page')
    swipe(300, 200)
    swipe(300, 200)
    expect(ctx.q('[data-dot="2"]')).toHaveAttribute('aria-current', 'page')
    swipe(100, 250)
    expect(ctx.q('[data-dot="1"]')).toHaveAttribute('aria-current', 'page')
  })

  it('a short move is not a swipe', () => {
    const ctx = setup()
    editMode(ctx)
    press(ctx.slot('page:0:20'), { ...POINT, clientX: 300 })
    fireEvent.pointerMove(ctx.slot('page:0:20'), { ...POINT, clientX: 280 })
    release(ctx.slot('page:0:20'), { ...POINT, clientX: 280 })
    expect(ctx.q('[data-dot="0"]')).toHaveAttribute('aria-current', 'page')
  })

  it('dragging an icon in edit mode calls onDragStart rather than swiping', () => {
    const ctx = setup()
    editMode(ctx)
    press(ctx.item('app:maps'), { ...POINT, clientX: 300 })
    fireEvent.pointerMove(ctx.item('app:maps'), { ...POINT, clientX: 200 })
    release(ctx.item('app:maps'), { ...POINT, clientX: 200 })
    expect(ctx.q('[data-dot="0"]')).toHaveAttribute('aria-current', 'page')
    expect(ctx.item('app:maps')).toHaveAttribute('data-selected', 'false')
  })
})

describe('folders in edit mode', () => {
  it('tapping a folder opens it, select circle selects it', () => {
    const dispatch = vi.fn()
    const state = { ...initialState(createInitialLayout()), editMode: true }
    const { container } = render(<HomeScreen state={state} dispatch={dispatch} />)
    const folder = container.querySelector('[data-item="folder:social"]')
    tap(folder)
    expect(dispatch).toHaveBeenCalledWith({ type: 'OPEN_FOLDER', folderId: 'social' })
    dispatch.mockClear()
    tap(container.querySelector('[data-control="select:folder:social"]'))
    expect(dispatch).toHaveBeenCalledWith({
      type: 'TOGGLE_SELECT',
      ref: { type: 'folder', id: 'social' },
    })
  })
})
