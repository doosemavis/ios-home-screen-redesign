import { SLOTS_PER_PAGE } from './constants.js'

const app = (id) => ({ type: 'app', id })
const folder = (id) => ({ type: 'folder', id })
const widget = (anchor) => ({ type: 'widget', id: 'weather', anchor })

const emptyPage = () => Array.from({ length: SLOTS_PER_PAGE }, () => null)

function fillPage(entries) {
  return emptyPage().map((_, slot) => entries[slot] ?? null)
}

// Slots 8-23, four per row (rows 2-5). Scene apps are spread across rows.
const PAGE_0_APP_IDS = [
  'maps', 'notes', 'calendar', 'photos',
  'podcasts', 'books', 'camera', 'wallet',
  'compass', 'stocks', 'clock', 'health',
  'settings', 'files', 'reminders', 'tv',
]

function buildHomePage() {
  const entries = {
    0: widget(true),
    1: widget(false),
    4: widget(false),
    5: widget(false),
    2: folder('social'),
    3: folder('work'),
    6: folder('media'),
    7: folder('utilities'),
  }
  PAGE_0_APP_IDS.forEach((id, i) => {
    entries[8 + i] = app(id)
  })
  return fillPage(entries)
}

function buildSecondPage() {
  const slots = [0, 1, 2, 3, 4, 5, 8, 9, 16, 17]
  const ids = [
    'calculator', 'voicememos', 'translate', 'measure', 'shortcuts',
    'home', 'fitness', 'find', 'tips', 'news',
  ]
  return fillPage(Object.fromEntries(slots.map((s, i) => [s, app(ids[i])])))
}

function buildThirdPage() {
  const ids = ['store', 'mirror', 'magnifier', 'watch']
  return fillPage(Object.fromEntries(ids.map((id, i) => [i, app(id)])))
}

const FOLDERS = [
  { id: 'social', name: 'Social', appIds: ['facetime', 'chat', 'photogram', 'bird'] },
  { id: 'work', name: 'Work', appIds: ['mail', 'docs', 'sheets', 'tasks'] },
  { id: 'media', name: 'Media', appIds: ['videos', 'radio', 'recorder'] },
  { id: 'utilities', name: 'Utilities', appIds: ['flashlight', 'scanner', 'contacts'] },
]

export function createInitialLayout() {
  const pages = [buildHomePage(), buildSecondPage(), buildThirdPage()]
  const dock = ['phone', 'messages', 'browser', 'music'].map(app)
  return {
    pages,
    dock,
    folders: Object.fromEntries(
      FOLDERS.map((f) => [f.id, { ...f, appIds: [...f.appIds] }]),
    ),
  }
}
