import { describe, expect, it } from 'vitest'
import { CAPTIONS } from '../stage/copy.js'
import { DEFAULT_GESTURE_OPTIONS } from '../gestures/usePointerGestures.js'
import { DRAG_PRESS_MS, SCENES, SWIPE_MS, TAP_MS, TOTAL_MS, TYPE_CHAR_MS, getSceneBounds } from './timeline.js'

const SCENE_IDS = ['intro', 'one-app', 'several-apps', 'drag', 'snap', 'into-folder', 'new-folder', 'out-of-folder', 'end']
const KINDS = ['longPress', 'tap', 'swipe', 'type', 'drag', 'fadeOut']

// How long a step keeps the finger (or the keyboard) busy after its start.
function stepLength(step) {
  if (step.kind === 'longPress') return step.holdMs
  if (step.kind === 'tap') return TAP_MS
  if (step.kind === 'swipe') return SWIPE_MS
  if (step.kind === 'type') return step.text.length * TYPE_CHAR_MS
  if (step.kind === 'drag') return DRAG_PRESS_MS + step.moveMs + step.holdMs
  return 0
}

const allSteps = () => SCENES.flatMap((scene) => scene.steps.map((step) => ({ scene, step })))

describe('timeline', () => {
  it('scene durations sum to between 38000 and 44000 ms', () => {
    const sum = SCENES.reduce((total, scene) => total + scene.durationMs, 0)
    expect(sum).toBeGreaterThanOrEqual(38000)
    expect(sum).toBeLessThanOrEqual(44000)
    expect(TOTAL_MS).toBe(sum)
  })

  it('every step at lies within its scene duration', () => {
    allSteps().forEach(({ scene, step }) => {
      expect(step.at, `${scene.id} ${step.kind}`).toBeGreaterThanOrEqual(0)
      expect(step.at, `${scene.id} ${step.kind}`).toBeLessThan(scene.durationMs)
    })
  })

  it('every gesture finishes inside its scene', () => {
    allSteps().forEach(({ scene, step }) => {
      expect(step.at + stepLength(step), `${scene.id} ${step.kind}`).toBeLessThanOrEqual(scene.durationMs)
    })
  })

  it('getSceneBounds is contiguous starting at 0', () => {
    const bounds = getSceneBounds()
    expect(bounds.map((b) => b.id)).toEqual(SCENES.map((s) => s.id))
    expect(bounds[0].startMs).toBe(0)
    bounds.forEach((b, i) => {
      expect(b.endMs - b.startMs).toBe(SCENES[i].durationMs)
      if (i > 0) expect(b.startMs).toBe(bounds[i - 1].endMs)
    })
    expect(bounds.at(-1).endMs).toBe(TOTAL_MS)
  })

  it('starts moving a drag before the press would count as a long press', () => {
    expect(DRAG_PRESS_MS).toBeLessThan(DEFAULT_GESTURE_OPTIONS.longPressMs)
  })

  it('uses exactly the agreed scene ids, in order', () => {
    expect(SCENES.map((s) => s.id)).toEqual(SCENE_IDS)
  })

  it('captions every scene but the end, from the shared copy', () => {
    SCENES.forEach((scene) => {
      if (scene.id === 'end') expect(scene.caption).toBeNull()
      else expect(scene.caption).toBe(CAPTIONS[scene.id])
    })
  })

  it('keeps steps in time order and uses only known kinds and shapes', () => {
    SCENES.forEach((scene) => {
      const times = scene.steps.map((s) => s.at)
      expect(times).toEqual([...times].sort((a, b) => a - b))
      scene.steps.forEach((step) => {
        expect(KINDS).toContain(step.kind)
        if (['tap', 'longPress', 'type', 'drag'].includes(step.kind)) expect(typeof step.target).toBe('string')
        if (step.kind === 'drag') {
          expect(typeof step.to).toBe('string')
          expect(step.moveMs).toBeGreaterThan(0)
          expect(step.holdMs).toBeGreaterThan(0)
        }
        if (step.kind === 'swipe') {
          expect(step.from).toBe('page')
          expect(['left', 'right']).toContain(step.direction)
        }
        if (step.anchor !== undefined) {
          step.anchor.forEach((f) => expect(f).toBeGreaterThanOrEqual(0))
          step.anchor.forEach((f) => expect(f).toBeLessThanOrEqual(1))
        }
      })
    })
  })

  it('scripts the spec story through real data hooks', () => {
    const targets = (id) => SCENES.find((s) => s.id === id).steps.map((s) => s.target ?? s.kind)
    expect(targets('intro')).toEqual(['[data-widget="weather"]'])
    expect(targets('one-app')).toEqual(['[data-item="app:maps"]', 'swipe', '[data-slot="page:1:6"]', 'swipe'])
    expect(targets('several-apps')).toEqual([
      '[data-item="app:notes"]', '[data-item="app:podcasts"]', '[data-item="app:compass"]',
      'swipe', '[data-slot="page:1:13"]',
    ])
    expect(targets('drag')).toEqual(['[data-item="app:tips"]'])
    expect(SCENES.find((s) => s.id === 'drag').steps[0].to).toBe('[data-slot="page:1:11"]')
    expect(targets('snap')).toEqual(['swipe', '[data-control="snap"]'])
    expect(targets('into-folder')).toContain('[data-folder-option="media"]')
    expect(targets('new-folder')).toContain('[data-control="create-folder"]')
    expect(targets('out-of-folder')).toContain('[data-control="move-out"]')
    expect(targets('end')).toEqual(['[data-control="done"]', 'fadeOut'])
  })

  it('one-app swipes back to page 0 after the drop and holds there so both pages read as unchanged', () => {
    const scene = SCENES.find((s) => s.id === 'one-app')
    const [, , place, back] = scene.steps
    expect(back).toMatchObject({ kind: 'swipe', direction: 'right' })
    expect(back.at - (place.at + TAP_MS)).toBeGreaterThanOrEqual(1000)
    expect(scene.durationMs - (back.at + SWIPE_MS)).toBeGreaterThanOrEqual(1000)
  })

  it('names the new folder by typing into the name field', () => {
    const typed = SCENES.find((s) => s.id === 'new-folder').steps.find((s) => s.kind === 'type')
    expect(typed).toMatchObject({ target: '[data-control="folder-name"]', text: 'Essentials' })
  })

  it('is frozen plain data', () => {
    expect(() => JSON.stringify(SCENES)).not.toThrow()
    expect(Object.isFrozen(SCENES)).toBe(true)
    expect(Object.isFrozen(SCENES[0].steps[0])).toBe(true)
  })
})
