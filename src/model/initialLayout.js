import { DOCK_SLOTS, PAGE_COUNT, SLOTS_PER_PAGE } from './constants.js'

const app = (id) => ({ type: 'app', id })
const folder = (id) => ({ type: 'folder', id })
const widget = (anchor) => ({ type: 'widget', id: 'weather', anchor })

const emptyPage = () => Array.from({ length: SLOTS_PER_PAGE }, () => null)

function fillPage(entries) {
  return emptyPage().map((_, slot) => entries[slot] ?? null)
}

const PAGE_0_APP_IDS = [
  'maps', 'notes', 'podcasts', 'compass',
  'books', 'stocks', 'camera', 'clock',
  'settings', 'calendar', 'photos', 'reminders',
  'wallet', 'health', 'files', 'tv',
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
    pages: pages.slice(0, PAGE_COUNT),
    dock: dock.slice(0, DOCK_SLOTS),
    folders: Object.fromEntries(
      FOLDERS.map((f) => [f.id, { ...f, appIds: [...f.appIds] }]),
    ),
  }
}
