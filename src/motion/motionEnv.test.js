import { describe, expect, it, vi } from 'vitest'
import { whenAnimationsSettle } from './motionEnv.js'

function deferredAnimation() {
  let finish
  let cancel
  const finished = new Promise((resolve, reject) => {
    finish = resolve
    cancel = () => reject(new DOMException('cancelled', 'AbortError'))
  })
  return { finished, finish, cancel }
}

const elementWith = (animations) => ({ getAnimations: () => animations })

describe('whenAnimationsSettle', () => {
  it('runs at once when nothing is animating (or the element cannot report animations)', () => {
    const callback = vi.fn()
    whenAnimationsSettle(elementWith([]), callback)
    whenAnimationsSettle(null, callback)
    whenAnimationsSettle({}, callback)
    expect(callback).toHaveBeenCalledTimes(3)
  })

  it('waits for every running animation to finish', async () => {
    const callback = vi.fn()
    const slide = deferredAnimation()
    const fade = deferredAnimation()
    whenAnimationsSettle(elementWith([slide, fade]), callback)

    slide.finish()
    await Promise.resolve()
    expect(callback).not.toHaveBeenCalled()

    fade.finish()
    await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1))
  })

  it('treats a cancelled animation as settled', async () => {
    const callback = vi.fn()
    const slide = deferredAnimation()
    whenAnimationsSettle(elementWith([slide]), callback)
    slide.cancel()
    await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1))
  })

  it('never calls back once cancelled', async () => {
    const callback = vi.fn()
    const slide = deferredAnimation()
    const stop = whenAnimationsSettle(elementWith([slide]), callback)
    stop()
    slide.finish()
    await slide.finished
    await Promise.resolve()
    expect(callback).not.toHaveBeenCalled()
  })
})
