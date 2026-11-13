import { describe, expect, it, vi } from 'vitest'
import { createAnimationStepper } from './animationStepper.js'

// Test double for a WAAPI Animation: records pause/finish and the seeks it receives.
function fakeAnimation({ endTime = 300, onFinish = () => {} } = {}) {
  return {
    currentTime: 0,
    paused: false,
    finishCount: 0,
    pause() {
      this.paused = true
    },
    finish() {
      this.finishCount += 1
      this.currentTime = endTime
      onFinish()
    },
    effect: { getComputedTiming: () => ({ endTime }) },
  }
}

const noFlush = () => Promise.resolve()

describe('createAnimationStepper', () => {
  it('pauses each animation and seeks it to virtual time since it was first seen', async () => {
    const first = fakeAnimation()
    const later = fakeAnimation()
    let live = [first]
    const stepper = createAnimationStepper({ getAnimations: () => live, flush: noFlush })
    await stepper.step(100)
    expect(first).toMatchObject({ paused: true, currentTime: 0 })
    live = [first, later]
    await stepper.step(150)
    expect(first.currentTime).toBe(50)
    expect(later).toMatchObject({ paused: true, currentTime: 0 })
    await stepper.step(200)
    expect([first.currentTime, later.currentTime]).toEqual([100, 50])
  })

  it('finishes a finite animation once its stepped time reaches the end, exactly once', async () => {
    const animation = fakeAnimation({ endTime: 300 })
    const stepper = createAnimationStepper({ getAnimations: () => [animation], flush: noFlush })
    await stepper.step(0)
    await stepper.step(299)
    expect(animation.finishCount).toBe(0)
    await stepper.step(300)
    expect(animation.finishCount).toBe(1)
    await stepper.step(400)
    expect(animation.finishCount).toBe(1)
    expect(animation.currentTime).toBe(300)
  })

  it('only steps infinite animations (the jiggle)', async () => {
    const jiggle = fakeAnimation({ endTime: Infinity })
    const stepper = createAnimationStepper({ getAnimations: () => [jiggle], flush: noFlush })
    await stepper.step(0)
    await stepper.step(100000)
    expect(jiggle).toMatchObject({ currentTime: 100000, finishCount: 0 })
  })

  it('steps animations a finish() handler creates within the same frame', async () => {
    const followUp = fakeAnimation()
    let live = []
    const exit = fakeAnimation({ endTime: 0, onFinish: () => (live = [followUp]) })
    live = [exit]
    const flush = vi.fn(noFlush)
    const stepper = createAnimationStepper({ getAnimations: () => live, flush })
    await stepper.step(500)
    expect(exit.finishCount).toBe(1)
    expect(followUp).toMatchObject({ paused: true, currentTime: 0 })
    expect(flush).toHaveBeenCalled()
  })

  it('fails loudly after maxPasses if animations keep appearing (a runaway chain)', async () => {
    const getAnimations = vi.fn(() => [fakeAnimation({ endTime: 0 })])
    const stepper = createAnimationStepper({ getAnimations, flush: noFlush, maxPasses: 3 })
    await expect(stepper.step(40)).rejects.toThrow(/Recorder: animations still changing after 3 passes at 40ms/)
    expect(getAnimations).toHaveBeenCalledTimes(3)
  })

  it('does not fail when the chain settles on the last allowed pass', async () => {
    const followUp = fakeAnimation({ endTime: 1000 })
    let live = []
    const exit = fakeAnimation({ endTime: 0, onFinish: () => (live = [followUp]) })
    live = [exit]
    const stepper = createAnimationStepper({ getAnimations: () => live, flush: noFlush, maxPasses: 3 })
    await expect(stepper.step(0)).resolves.toBeUndefined()
  })

  it('needs no extra pass when nothing is new or finished', async () => {
    const animation = fakeAnimation({ endTime: 1000 })
    const getAnimations = vi.fn(() => [animation])
    const flush = vi.fn(noFlush)
    const stepper = createAnimationStepper({ getAnimations, flush })
    await stepper.step(0)
    getAnimations.mockClear()
    flush.mockClear()
    await stepper.step(10)
    expect(getAnimations).toHaveBeenCalledTimes(1)
    expect(flush).not.toHaveBeenCalled()
  })

  it('treats an animation without timing as never ending', async () => {
    const animation = { ...fakeAnimation(), effect: null }
    const stepper = createAnimationStepper({ getAnimations: () => [animation], flush: noFlush })
    await stepper.step(0)
    await stepper.step(5000)
    expect(animation.finishCount).toBe(0)
  })
})
