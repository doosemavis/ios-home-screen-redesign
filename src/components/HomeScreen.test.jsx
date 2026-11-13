import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { HomeScreen } from './HomeScreen.jsx'
import { createInitialLayout } from '../model/initialLayout.js'
import { initialState } from '../state/homeScreenReducer.js'

const PAGE_0_APPS = [
  'maps', 'notes', 'calendar', 'photos',
  'podcasts', 'books', 'camera', 'wallet',
  'compass', 'stocks', 'clock', 'health',
  'settings', 'files', 'reminders', 'tv',
]

function setup(overrides = {}) {
  const state = { ...initialState(createInitialLayout()), ...overrides }
  const dispatch = vi.fn()
  const utils = render(<HomeScreen state={state} dispatch={dispatch} />)
  return { ...utils, dispatch, state }
}

const inSlot = (container, slot, item) =>
  container.querySelector(`[data-slot="${slot}"] [data-item="${item}"]`)

describe('HomeScreen', () => {
  it('renders page 1 items with data attributes', () => {
    const { container } = setup()
    PAGE_0_APPS.forEach((id, i) => {
      expect(inSlot(container, `page:0:${8 + i}`, `app:${id}`)).not.toBeNull()
    })
    expect(inSlot(container, 'page:0:2', 'folder:social')).not.toBeNull()
    expect(inSlot(container, 'page:0:3', 'folder:work')).not.toBeNull()
    expect(inSlot(container, 'page:0:6', 'folder:media')).not.toBeNull()
    expect(inSlot(container, 'page:0:7', 'folder:utilities')).not.toBeNull()
    expect(inSlot(container, 'dock:0', 'app:phone')).not.toBeNull()
    expect(inSlot(container, 'dock:3', 'app:music')).not.toBeNull()
    expect(container.querySelector('[data-item="app:calculator"]')).toBeNull()
  })

  it('renders the current page only', () => {
    const { container } = setup({ page: 1 })
    expect(inSlot(container, 'page:1:0', 'app:calculator')).not.toBeNull()
    expect(container.querySelector('[data-slot="page:1:6"]')).not.toBeNull()
    expect(container.querySelector('[data-item="app:maps"]')).toBeNull()
  })

  it('renders weather widget once', () => {
    const { container } = setup()
    expect(container.querySelectorAll('[data-widget="weather"]')).toHaveLength(1)
    expect(container.querySelector('[data-slot="page:0:0"] [data-widget="weather"]')).not.toBeNull()
  })

  it('shows Search pill outside edit mode and page dots in edit mode', () => {
    const normal = setup()
    expect(normal.container.querySelector('[data-control="search"]')).not.toBeNull()
    expect(normal.container.querySelector('[data-control="page-dots"]')).toBeNull()
    normal.unmount()

    const edit = setup({ editMode: true, page: 1 })
    expect(edit.container.querySelector('[data-control="search"]')).toBeNull()
    const dots = edit.container.querySelectorAll('[data-control="page-dots"] [data-dot]')
    expect(dots).toHaveLength(3)
    const active = [...dots].map((d) => d.getAttribute('aria-current'))
    expect(active).toEqual([null, 'page', null])
  })

  it('marks selected items', () => {
    const { container } = setup({
      editMode: true,
      selection: [{ type: 'app', id: 'notes' }],
    })
    const notes = container.querySelector('[data-item="app:notes"]')
    const maps = container.querySelector('[data-item="app:maps"]')
    expect(notes).toHaveAttribute('data-selected', 'true')
    expect(maps).toHaveAttribute('data-selected', 'false')
  })

  it('enters edit mode on right-click', () => {
    const { container, dispatch } = setup()
    fireEvent.contextMenu(container.querySelector('[data-slot="page:0:8"]'))
    expect(dispatch).toHaveBeenCalledWith({ type: 'ENTER_EDIT' })
  })

  it('shows a Done control only in edit mode that exits edit mode', () => {
    const normal = setup()
    expect(normal.container.querySelector('[data-control="done"]')).toBeNull()
    normal.unmount()

    const { container, dispatch } = setup({ editMode: true })
    fireEvent.click(container.querySelector('[data-control="done"]'))
    expect(dispatch).toHaveBeenCalledWith({ type: 'EXIT_EDIT' })
  })

  it('shows the canonical 9:41 time', () => {
    const { getByText } = setup()
    expect(getByText('9:41')).toBeInTheDocument()
  })

  it('contains no emoji characters', () => {
    const { container } = setup({ editMode: true })
    expect(container.textContent).not.toMatch(/\p{Extended_Pictographic}/u)
  })
})
