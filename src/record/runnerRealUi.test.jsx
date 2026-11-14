import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import HomeScreenApp from '../HomeScreenApp.jsx'
import { createVirtualClock } from '../clock/clock.js'
import { installGeometry, removeGeometry } from '../test/homeHarness.js'
import { createRunner } from './runner.js'
import { TAP_MS } from './timeline.js'

// The record runner driving the real home screen. Its touches are routed like real
// pointers (the panel and the surface capture them), so a control that only works
// when the click lands on the pressed element fails here, as it does for a person.

const inFolder = (appId) => `[data-folder-panel] [data-item="app:${appId}"]`
const tap = (at, target) => ({ at, kind: 'tap', target })
// Frees page:0:8 (Maps → page index 1, via the page dots), then works inside Social.
const STEPS = [
  { at: 0, kind: 'longPress', target: '[data-widget="weather"]', holdMs: 700 },
  tap(1000, '[data-item="app:maps"]'),
  tap(1400, '[data-dot="1"]'),
  tap(1800, '[data-slot="page:1:6"]'),
  tap(2200, '[data-dot="0"]'),
  tap(2600, '[data-item="folder:social"] [role="button"]'),
  tap(3000, inFolder('chat')),
  tap(3400, inFolder('photogram')),
  tap(3800, inFolder('photogram')),
  tap(4200, '[data-control="move-out"]'),
]
const FRAME_MS = 16
const SCENES = [{ id: 'folder', caption: null, durationMs: 5000, steps: STEPS }]

// jsdom has no layout, so the hit test answers with each step's own target in order.
function scriptedHitTest(container) {
  const queue = STEPS.map((step) => step.target)
  return () => container.querySelector(queue.shift())
}

beforeEach(() => {
  installGeometry()
})
afterEach(removeGeometry)

describe('record runner on the real UI', () => {
  it('selects apps inside an open folder and moves them out, as a real tap does', () => {
    const clock = createVirtualClock()
    const { container } = render(<HomeScreenApp clock={clock} />)
    const q = (sel) => container.querySelector(sel)
    createRunner({ clock, root: container, scenes: SCENES, hitTest: scriptedHitTest(container) })
    // Like the recorder: one frame per act, so React commits between scripted touches.
    const until = (ms) => {
      while (clock.now() < ms + TAP_MS) act(() => clock.advance(Math.min(FRAME_MS, ms + TAP_MS - clock.now())))
    }
    until(2600)
    expect(q('[data-edit-mode]')).toHaveAttribute('data-edit-mode', 'true')
    expect(q('[data-slot="page:1:6"] [data-item="app:maps"]')).not.toBeNull()
    expect(q('[data-folder-overlay="social"]')).not.toBeNull()
    until(3400)
    expect(q(inFolder('chat'))).toHaveAttribute('data-selected', 'true')
    expect(q(inFolder('photogram'))).toHaveAttribute('data-selected', 'true')
    until(3800)
    expect(q(inFolder('photogram'))).toHaveAttribute('data-selected', 'false')
    until(4200)
    expect(q(inFolder('chat'))).toBeNull()
    expect(q('[data-slot="page:0:8"] [data-item="app:chat"]')).not.toBeNull()
  })
})
