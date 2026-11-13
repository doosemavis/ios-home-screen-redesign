import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import HomeScreenApp from '../HomeScreenApp.jsx'
import { createVirtualClock } from '../clock/clock.js'

const POINT = { pointerId: 1, clientX: 100, clientY: 300, button: 0 }

function setup() {
  const utils = render(<HomeScreenApp clock={createVirtualClock()} />)
  const q = (sel) => utils.container.querySelector(sel)
  const item = (id) => q(`[data-item="${id}"]`)
  const slot = (s) => q(`[data-slot="${s}"]`)
  const tap = (el) => {
    fireEvent.pointerDown(el, POINT)
    fireEvent.pointerUp(el, POINT)
  }
  const click = (sel) => fireEvent.click(q(sel))
  fireEvent.contextMenu(slot('page:0:8'))
  return { ...utils, q, item, slot, tap, click }
}

const selectApps = (ctx, ids) => ids.forEach((id) => ctx.tap(ctx.item(`app:${id}`)))

describe('Move sheet', () => {
  it('Move sheet lists existing folders and moves selection into chosen folder', () => {
    const ctx = setup()
    selectApps(ctx, ['maps', 'notes'])
    ctx.click('[data-control="move"]')
    const sheet = ctx.q('[role="dialog"]')
    expect(sheet).toHaveAttribute('aria-modal', 'true')
    expect(sheet).toHaveTextContent('Move 2 apps')
    ;['social', 'work', 'media', 'utilities'].forEach((id) =>
      expect(ctx.q(`[data-folder-option="${id}"]`)).not.toBeNull(),
    )
    expect(ctx.q('[data-control="new-folder"]')).not.toBeNull()
    ctx.click('[data-folder-option="media"]')
    expect(ctx.q('[role="dialog"]')).toBeNull()
    expect(ctx.slot('page:0:8').querySelector('[data-item]')).toBeNull()
    expect(ctx.slot('page:0:9').querySelector('[data-item]')).toBeNull()
    expect(ctx.slot('page:0:10').querySelector('[data-item="app:calendar"]')).not.toBeNull()
    ctx.tap(ctx.item('folder:media'))
    expect(ctx.q('[data-folder-overlay] [data-item="app:maps"]')).not.toBeNull()
    expect(ctx.q('[data-folder-overlay] [data-item="app:notes"]')).not.toBeNull()
  })

  it('tapping the sheet backdrop closes it', () => {
    const ctx = setup()
    selectApps(ctx, ['maps'])
    ctx.click('[data-control="move"]')
    ctx.click('[data-sheet-backdrop]')
    expect(ctx.q('[role="dialog"]')).toBeNull()
  })
})

describe('New folder', () => {
  it('New Folder creates folder at first selected app slot with apps inside', () => {
    const ctx = setup()
    selectApps(ctx, ['maps', 'notes'])
    ctx.click('[data-control="move"]')
    ctx.click('[data-control="new-folder"]')
    const input = ctx.q('[data-control="folder-name"]')
    expect(input).toHaveAttribute('placeholder', 'Folder name')
    fireEvent.change(input, { target: { value: 'Reading' } })
    ctx.click('[data-control="create-folder"]')
    expect(ctx.q('[role="dialog"]')).toBeNull()
    const created = ctx.slot('page:0:8').querySelector('[data-item="folder:folder-reading-1"]')
    expect(created).not.toBeNull()
    expect(created).toHaveTextContent('Reading')
    expect(ctx.slot('page:0:9').querySelector('[data-item]')).toBeNull()
    ctx.tap(created)
    expect(ctx.q('[data-folder-overlay] [data-item="app:maps"]')).not.toBeNull()
    expect(ctx.q('[data-folder-overlay] [data-item="app:notes"]')).not.toBeNull()
  })

  it('Create button disabled for blank name', () => {
    const ctx = setup()
    selectApps(ctx, ['maps'])
    ctx.click('[data-control="move"]')
    ctx.click('[data-control="new-folder"]')
    expect(ctx.q('[data-control="create-folder"]')).toBeDisabled()
    fireEvent.change(ctx.q('[data-control="folder-name"]'), { target: { value: '   ' } })
    expect(ctx.q('[data-control="create-folder"]')).toBeDisabled()
    fireEvent.change(ctx.q('[data-control="folder-name"]'), { target: { value: 'Go' } })
    expect(ctx.q('[data-control="create-folder"]')).toBeEnabled()
  })

  it('Enter in the name field submits', () => {
    const ctx = setup()
    selectApps(ctx, ['maps'])
    ctx.click('[data-control="move"]')
    ctx.click('[data-control="new-folder"]')
    const input = ctx.q('[data-control="folder-name"]')
    fireEvent.change(input, { target: { value: 'Quick' } })
    fireEvent.submit(input.closest('form'))
    expect(ctx.q('[data-item="folder:folder-quick-1"]')).not.toBeNull()
  })
})

describe('Folder overlay', () => {
  function openSocialWithRoom(ctx) {
    selectApps(ctx, ['maps', 'notes'])
    ctx.click('[data-control="move"]')
    ctx.click('[data-folder-option="media"]')
    ctx.tap(ctx.item('folder:social'))
  }

  it('folder overlay selects apps and Move Out places them on current page', () => {
    const ctx = setup()
    openSocialWithRoom(ctx)
    expect(ctx.q('[data-control="move-out"]')).toBeDisabled()
    fireEvent.click(ctx.q('[data-folder-overlay] [data-item="app:facetime"]'))
    expect(ctx.q('[data-folder-overlay] [data-item="app:facetime"]')).toHaveAttribute('data-selected', 'true')
    fireEvent.click(ctx.q('[data-folder-overlay] [data-item="app:chat"]'))
    expect(ctx.q('[data-control="move-out"]')).toBeEnabled()
    ctx.click('[data-control="move-out"]')
    expect(ctx.slot('page:0:8').querySelector('[data-item="app:facetime"]')).not.toBeNull()
    expect(ctx.slot('page:0:9').querySelector('[data-item="app:chat"]')).not.toBeNull()
    expect(ctx.slot('page:0:10').querySelector('[data-item="app:calendar"]')).not.toBeNull()
    expect(ctx.q('[data-folder-overlay] [data-item="app:facetime"]')).toBeNull()
    expect(ctx.q('[data-control="move-out"]')).toBeDisabled()
  })

  it('tapping outside overlay closes it', () => {
    const ctx = setup()
    openSocialWithRoom(ctx)
    expect(ctx.q('[data-folder-overlay]')).not.toBeNull()
    ctx.click('[data-overlay-backdrop]')
    expect(ctx.q('[data-folder-overlay]')).toBeNull()
  })

  it('gestures inside the overlay do not swipe the pager', () => {
    const ctx = setup()
    openSocialWithRoom(ctx)
    const target = ctx.q('[data-folder-overlay] [data-item="app:chat"]')
    fireEvent.pointerDown(target, { ...POINT, clientX: 300 })
    fireEvent.pointerMove(target, { ...POINT, clientX: 100 })
    fireEvent.pointerUp(target, { ...POINT, clientX: 100 })
    expect(ctx.q('[data-dot="0"]')).toHaveAttribute('aria-current', 'page')
  })
})
