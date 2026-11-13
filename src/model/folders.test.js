import { describe, expect, it } from 'vitest'
import { createInitialLayout } from './initialLayout.js'
import { getCell } from './layout.js'
import { createFolder, moveOutOfFolder, moveToFolder } from './folders.js'
import { deepFreeze } from '../test/deepFreeze.js'
import { diffLayouts } from '../test/diffLayouts.js'

const app = (id) => ({ type: 'app', id })
const folder = (id) => ({ type: 'folder', id })

describe('moveToFolder', () => {
  it('moves selected apps into a folder in selection order and leaves gaps', () => {
    const l = createInitialLayout()
    const r = moveToFolder(l, [app('podcasts'), app('notes')], 'social')
    expect(r.ok).toBe(true)
    expect(r.layout.folders.social.appIds).toEqual([
      'facetime', 'chat', 'photogram', 'bird', 'podcasts', 'notes',
    ])
    expect(getCell(r.layout, { area: 'page', page: 0, slot: 9 })).toBeNull()
    expect(getCell(r.layout, { area: 'page', page: 0, slot: 12 })).toBeNull()
    expect(diffLayouts(l, r.layout)).toEqual(['folder:social', 'page:0:12', 'page:0:9'])
  })

  it('rejects moving folders into a folder', () => {
    const l = createInitialLayout()
    expect(moveToFolder(l, [app('notes'), folder('work')], 'social')).toEqual({
      ok: false,
      reason: 'folders-cannot-nest',
    })
  })

  it('rejects unknown folders and invalid refs', () => {
    const l = createInitialLayout()
    expect(moveToFolder(l, [app('notes')], 'ghost')).toEqual({ ok: false, reason: 'invalid-target' })
    const bad = { ok: false, reason: 'invalid-refs' }
    expect(moveToFolder(l, [], 'social')).toEqual(bad)
    expect(moveToFolder(l, [app('ghost')], 'social')).toEqual(bad)
    expect(moveToFolder(l, [{ type: 'widget', id: 'weather' }], 'social')).toEqual(bad)
  })

  it('deletes a source folder it empties and clears its cell', () => {
    const l = createInitialLayout()
    const refs = ['flashlight', 'scanner', 'contacts'].map(app)
    const r = moveToFolder(l, refs, 'media')
    expect(r.ok).toBe(true)
    expect(r.layout.folders.utilities).toBeUndefined()
    expect(getCell(r.layout, { area: 'page', page: 0, slot: 7 })).toBeNull()
    expect(diffLayouts(l, r.layout)).toEqual(['folder:media', 'folder:utilities', 'page:0:7'])
  })

  it('keeps a source folder that still has apps', () => {
    const l = createInitialLayout()
    const r = moveToFolder(l, [app('chat')], 'media')
    expect(r.layout.folders.social.appIds).toEqual(['facetime', 'photogram', 'bird'])
    expect(diffLayouts(l, r.layout)).toEqual(['folder:media', 'folder:social'])
  })
})

describe('createFolder', () => {
  const opts = { id: 'folder-new-1', name: 'New', page: 0 }

  it('creates a folder at the first selected app slot', () => {
    const l = createInitialLayout()
    const r = createFolder(l, [app('podcasts'), app('notes')], opts)
    expect(r.ok).toBe(true)
    expect(getCell(r.layout, { area: 'page', page: 0, slot: 12 })).toEqual(folder('folder-new-1'))
    expect(getCell(r.layout, { area: 'page', page: 0, slot: 9 })).toBeNull()
    expect(r.layout.folders['folder-new-1']).toEqual({
      id: 'folder-new-1', name: 'New', appIds: ['podcasts', 'notes'],
    })
    expect(diffLayouts(l, r.layout)).toEqual(['folder:folder-new-1', 'page:0:12', 'page:0:9'])
  })

  it('creates a folder at first empty slot when first app is off-page', () => {
    const l = createInitialLayout()
    const r = createFolder(l, [app('calculator'), app('notes')], { ...opts, page: 2 })
    expect(r.ok).toBe(true)
    expect(getCell(r.layout, { area: 'page', page: 2, slot: 4 })).toEqual(folder('folder-new-1'))
    expect(diffLayouts(l, r.layout)).toEqual(
      ['folder:folder-new-1', 'page:0:9', 'page:1:0', 'page:2:4'],
    )
  })

  it('takes apps out of other folders and trims the name', () => {
    const l = createInitialLayout()
    const r = createFolder(l, [app('chat'), app('bird')], { ...opts, name: '  Pals ', page: 1 })
    expect(r.layout.folders['folder-new-1'].name).toBe('Pals')
    expect(getCell(r.layout, { area: 'page', page: 1, slot: 6 })).toEqual(folder('folder-new-1'))
    expect(r.layout.folders.social.appIds).toEqual(['facetime', 'photogram'])
  })

  it('requires a folder name', () => {
    const l = createInitialLayout()
    const bad = { ok: false, reason: 'name-required' }
    expect(createFolder(l, [app('notes')], { ...opts, name: '' })).toEqual(bad)
    expect(createFolder(l, [app('notes')], { ...opts, name: '   ' })).toEqual(bad)
    expect(createFolder(l, [app('notes')], { ...opts, name: undefined })).toEqual(bad)
  })

  it('rejects folders, invalid refs, duplicate ids and bad pages', () => {
    const l = createInitialLayout()
    expect(createFolder(l, [folder('work')], opts).reason).toBe('folders-cannot-nest')
    expect(createFolder(l, [], opts).reason).toBe('invalid-refs')
    expect(createFolder(l, [app('ghost')], opts).reason).toBe('invalid-refs')
    expect(createFolder(l, [app('notes')], { ...opts, id: 'social' }).reason).toBe('duplicate-id')
    expect(createFolder(l, [app('notes')], { ...opts, page: 9 }).reason).toBe('invalid-target')
  })

  it('reuses the slot of a folder it empties on a full page', () => {
    const l = createInitialLayout()
    const refs = ['flashlight', 'scanner', 'contacts'].map(app)
    const r = createFolder(l, refs, { id: 'folder-new-1', name: 'U', page: 0 })
    expect(r.ok).toBe(true)
    expect(r.layout.folders.utilities).toBeUndefined()
    expect(getCell(r.layout, { area: 'page', page: 0, slot: 7 })).toEqual(folder('folder-new-1'))
    expect(diffLayouts(l, r.layout)).toEqual(['folder:folder-new-1', 'folder:utilities', 'page:0:7'])
  })

  it('refuses when the page has no empty slot', () => {
    const l = createInitialLayout()
    expect(createFolder(l, [app('calculator')], opts)).toEqual({
      ok: false,
      reason: 'not-enough-space',
    })
  })
})

describe('moveOutOfFolder', () => {
  it('moves apps out of a folder into first empty slots without moving others', () => {
    const l = createInitialLayout()
    const r = moveOutOfFolder(l, 'social', ['bird', 'chat'], 1)
    expect(r.ok).toBe(true)
    expect(getCell(r.layout, { area: 'page', page: 1, slot: 6 })).toEqual(app('bird'))
    expect(getCell(r.layout, { area: 'page', page: 1, slot: 7 })).toEqual(app('chat'))
    expect(r.layout.folders.social.appIds).toEqual(['facetime', 'photogram'])
    expect(diffLayouts(l, r.layout)).toEqual(['folder:social', 'page:1:6', 'page:1:7'])
  })

  it('removes folder when its last app moves out', () => {
    const l = createInitialLayout()
    const r = moveOutOfFolder(l, 'media', ['videos', 'radio', 'recorder'], 1)
    expect(r.ok).toBe(true)
    expect(r.layout.folders.media).toBeUndefined()
    expect(getCell(r.layout, { area: 'page', page: 0, slot: 6 })).toBeNull()
    expect(r.layout.pages[1].slice(6, 11).map((c) => c?.id ?? null)).toEqual([
      'videos', 'radio', 'fitness', 'find', 'recorder',
    ])
    expect(diffLayouts(l, r.layout)).toEqual(
      ['folder:media', 'page:0:6', 'page:1:10', 'page:1:6', 'page:1:7'],
    )
  })

  it('refuses move-out when page lacks room', () => {
    const l = deepFreeze(createInitialLayout())
    expect(moveOutOfFolder(l, 'social', ['chat'], 0)).toEqual({
      ok: false,
      reason: 'not-enough-space',
    })
  })

  it('may reuse the freed cell of the folder it empties on the same page', () => {
    const l = createInitialLayout()
    const first = moveOutOfFolder(l, 'utilities', ['flashlight', 'scanner'], 1)
    const r = moveOutOfFolder(first.layout, 'utilities', ['contacts'], 0)
    expect(r.ok).toBe(true)
    expect(getCell(r.layout, { area: 'page', page: 0, slot: 7 })).toEqual(app('contacts'))
    expect(r.layout.folders.utilities).toBeUndefined()
    expect(diffLayouts(first.layout, r.layout)).toEqual(['folder:utilities', 'page:0:7'])
  })

  it('validates folder, apps and page', () => {
    const l = createInitialLayout()
    expect(moveOutOfFolder(l, 'ghost', ['chat'], 1).reason).toBe('invalid-target')
    expect(moveOutOfFolder(l, 'social', ['mail'], 1).reason).toBe('invalid-refs')
    expect(moveOutOfFolder(l, 'social', [], 1).reason).toBe('invalid-refs')
    expect(moveOutOfFolder(l, 'social', ['chat', 'chat'], 1).reason).toBe('invalid-refs')
    expect(moveOutOfFolder(l, 'social', ['chat'], 7).reason).toBe('invalid-target')
  })
})

describe('folder operations do not mutate frozen input', () => {
  it('works on frozen layouts', () => {
    const l = deepFreeze(createInitialLayout())
    expect(() => {
      moveToFolder(l, [app('notes')], 'social')
      createFolder(l, [app('notes')], { id: 'f', name: 'F', page: 0 })
      moveOutOfFolder(l, 'media', ['videos'], 1)
    }).not.toThrow()
  })
})
