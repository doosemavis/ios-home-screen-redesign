import { beforeEach, describe, expect, it } from 'vitest'
import { resolveFolderTap, resolveTap } from './resolveTap.js'

// A miniature of the home-screen DOM: grid wallpaper with an app, a folder, an empty
// slot and the widget, plus the dock bar with an empty dock slot.
function buildScreen() {
  document.body.innerHTML = `
    <div data-surface>
      <div data-page="0">
        <div data-slot="page:0:0"><div data-widget="weather"><span data-in-widget></span></div></div>
        <div data-slot="page:0:2"><div data-item="folder:social"><div role="button" data-folder-body></div></div></div>
        <div data-slot="page:0:8"><div data-item="app:maps"><span data-label></span></div></div>
        <div data-slot="page:0:9"><span data-slot-mark="idle"></span></div>
      </div>
      <div data-dock><div data-slot="dock:3"></div></div>
    </div>`
  const q = (sel) => document.querySelector(sel)
  return { q, wallpaper: q('[data-page="0"]') }
}

const BROWSE = { editMode: false, selection: [] }
const EDIT = { editMode: true, selection: [] }
const SELECTING = { editMode: true, selection: [{ type: 'app', id: 'maps' }] }

describe('resolveTap outside edit mode', () => {
  let screen
  beforeEach(() => {
    screen = buildScreen()
  })

  it('opens a tapped folder', () => {
    expect(resolveTap(screen.q('[data-folder-body]'), BROWSE)).toEqual({ type: 'OPEN_FOLDER', folderId: 'social' })
    expect(resolveTap(screen.q('[data-slot="page:0:2"]'), BROWSE)).toEqual({ type: 'OPEN_FOLDER', folderId: 'social' })
  })

  it('does nothing for apps, empty slots or wallpaper', () => {
    expect(resolveTap(screen.q('[data-label]'), BROWSE)).toBeNull()
    expect(resolveTap(screen.q('[data-slot="page:0:9"]'), BROWSE)).toBeNull()
    expect(resolveTap(screen.wallpaper, BROWSE)).toBeNull()
  })
})

describe('resolveTap on wallpaper in edit mode', () => {
  let screen
  beforeEach(() => {
    screen = buildScreen()
  })

  it('exits edit mode on a wallpaper tap with nothing selected', () => {
    expect(resolveTap(screen.wallpaper, EDIT)).toEqual({ type: 'EXIT_EDIT' })
    expect(resolveTap(screen.q('[data-surface]'), EDIT)).toEqual({ type: 'EXIT_EDIT' })
  })

  it('never exits from an empty slot, its placeholder, the widget or the dock bar', () => {
    expect(resolveTap(screen.q('[data-slot="page:0:9"]'), EDIT)).toBeNull()
    expect(resolveTap(screen.q('[data-slot-mark]'), EDIT)).toBeNull()
    expect(resolveTap(screen.q('[data-in-widget]'), EDIT)).toBeNull()
    expect(resolveTap(screen.q('[data-dock]'), EDIT)).toBeNull()
    expect(resolveTap(screen.q('[data-slot="dock:3"]'), EDIT)).toBeNull()
  })

  it('does nothing on wallpaper while something is selected', () => {
    expect(resolveTap(screen.wallpaper, SELECTING)).toBeNull()
  })

  it('still places the selection on an empty slot and its placeholder', () => {
    const place = { type: 'PLACE_SELECTION', target: { area: 'page', page: 0, slot: 9 } }
    expect(resolveTap(screen.q('[data-slot-mark]'), SELECTING)).toEqual(place)
  })
})

describe('resolveFolderTap', () => {
  let q
  beforeEach(() => {
    document.body.innerHTML = `
      <div data-folder-overlay="social">
        <div data-folder-panel>
          <div data-item="app:chat"><span data-tile></span></div>
        </div>
        <button data-control="move-out"></button>
      </div>
      <div data-slot="page:0:8"><div data-item="app:maps"></div></div>`
    q = (sel) => document.querySelector(sel)
  })

  it('toggles the pressed folder app in edit mode, from the icon or anything inside it', () => {
    const toggle = { type: 'TOGGLE_FOLDER_SELECT', appId: 'chat' }
    expect(resolveFolderTap(q('[data-item="app:chat"]'), EDIT)).toEqual(toggle)
    expect(resolveFolderTap(q('[data-tile]'), EDIT)).toEqual(toggle)
  })

  it('ignores taps outside edit mode, on the bare panel, or on items outside the folder', () => {
    expect(resolveFolderTap(q('[data-item="app:chat"]'), BROWSE)).toBeNull()
    expect(resolveFolderTap(q('[data-folder-panel]'), EDIT)).toBeNull()
    expect(resolveFolderTap(q('[data-item="app:maps"]'), EDIT)).toBeNull()
    expect(resolveFolderTap(null, EDIT)).toBeNull()
    expect(resolveFolderTap({}, EDIT)).toBeNull()
  })
})
