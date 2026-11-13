import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { zoomFolderIn, zoomFolderOut } from './folderZoom.js'
import { GENTLE_MS, SPRING_GENTLE } from './springs.js'

// Layer 400×800 at the viewport origin, zoom 1. Content at (50, 200) in the layer;
// panel (300×300) at (0, 40) inside the content, so its centre is (200, 390).
// The folder tile (60×60) sits at (290, 70): centre (320, 100).
function buildDom({ withTile = true } = {}) {
  document.body.innerHTML = `
    <div id="home">
      ${withTile ? '<div data-item="folder:f"><div role="button" id="tile"></div></div>' : ''}
      <div id="layer" data-folder-overlay="f">
        <div data-overlay-backdrop></div>
        <div data-folder-content id="content"><div data-folder-panel id="panel"></div></div>
      </div>
    </div>`
  return {
    layer: { rect: [0, 0, 400, 800], offset: [0, 0, 400, 800], parent: null },
    content: { rect: [50, 200, 300, 400], offset: [50, 200, 300, 400], parent: 'layer' },
    panel: { rect: [50, 240, 300, 300], offset: [0, 40, 300, 300], parent: 'content' },
    tile: { rect: [290, 70, 60, 60], offset: [0, 0, 60, 60], parent: null },
  }
}

function stub(geometry) {
  const of = (el) => geometry[el.id]
  const getter = (name, read) =>
    vi.spyOn(HTMLElement.prototype, name, 'get').mockImplementation(function get() {
      return read(of(this))
    })
  const spies = [
    getter('offsetLeft', (g) => g?.offset[0] ?? 0),
    getter('offsetTop', (g) => g?.offset[1] ?? 0),
    getter('offsetWidth', (g) => g?.offset[2] ?? 0),
    getter('offsetHeight', (g) => g?.offset[3] ?? 0),
    getter('offsetParent', (g) => (g?.parent ? document.getElementById(g.parent) : null)),
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function rect() {
      const [left, top, width, height] = of(this)?.rect ?? [0, 0, 0, 0]
      return { left, top, width, height, right: left + width, bottom: top + height }
    }),
  ]
  return () => spies.forEach((spy) => spy.mockRestore())
}

describe('folder zoom', () => {
  let animate
  let unstub

  beforeEach(() => {
    animate = vi.fn(() => ({ finished: Promise.resolve(), cancel: vi.fn() }))
    Element.prototype.animate = animate
  })

  afterEach(() => {
    unstub()
    delete Element.prototype.animate
    document.body.innerHTML = ''
  })

  const layer = () => document.getElementById('layer')

  it('opens out of the icon: scales from tile size about the point that maps the panel onto the tile', () => {
    unstub = stub(buildDom())
    zoomFolderIn(layer(), 'f')

    expect(animate.mock.contexts[0].id).toBe('content')
    const [frames, timing] = animate.mock.calls[0]
    // s = 60/300 = 0.2; F = C + (I − C)/(1 − s) = (350, 27.5) in the layer → (300, −172.5) in the content.
    expect(frames[0]).toMatchObject({ transform: 'scale(0.2)', opacity: 0, filter: 'blur(6px)' })
    expect(frames[0].transformOrigin).toBe('300px -172.5px')
    expect(frames.at(-1)).toMatchObject({ transform: 'none', opacity: 1 })
    expect(timing).toMatchObject({ duration: GENTLE_MS, easing: SPRING_GENTLE })
  })

  it('closes back into the icon and fades the backdrop, returning both animations', () => {
    unstub = stub(buildDom())
    const animations = zoomFolderOut(layer())

    expect(animations).toHaveLength(2)
    const contentCall = animate.mock.calls[animate.mock.contexts.findIndex((el) => el.id === 'content')]
    expect(contentCall[0].at(-1)).toMatchObject({ transform: 'scale(0.2)', opacity: 0 })
    expect(animate.mock.contexts.some((el) => el.hasAttribute('data-overlay-backdrop'))).toBe(true)
  })

  it('falls back to a gentle shrink about the centre when the folder icon is gone', () => {
    unstub = stub(buildDom({ withTile: false }))
    zoomFolderIn(layer(), 'f')
    const [frames] = animate.mock.calls[0]
    expect(frames[0]).toMatchObject({ transform: 'scale(0.86)', transformOrigin: 'center' })
  })
})
