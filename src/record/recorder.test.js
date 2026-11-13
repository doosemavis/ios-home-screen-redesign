import { describe, expect, it, vi } from 'vitest'
import { createVirtualClock } from '../clock/clock.js'
import { createRecorder } from './recorder.js'

function setup(overrides = {}) {
  const clock = createVirtualClock()
  const calls = []
  const stepper = { step: vi.fn(async (now) => calls.push(['step', now])) }
  const flush = vi.fn(async () => calls.push(['flush', clock.now()]))
  const recorder = createRecorder({ clock, stepper, flush, totalMs: 1000, whenReady: () => Promise.resolve(), ...overrides })
  return { clock, stepper, flush, recorder, calls }
}

describe('createRecorder', () => {
  it('advances the clock, lets React flush, then steps animations at the new time', async () => {
    const { recorder, calls, clock } = setup()
    await recorder.ready
    calls.length = 0
    await recorder.advance(16)
    expect(clock.now()).toBe(16)
    expect(calls).toEqual([['flush', 16], ['step', 16]])
    expect(recorder.totalMs).toBe(1000)
  })

  it('runs overlapping advance calls one after another', async () => {
    const { recorder, calls } = setup()
    await recorder.ready
    calls.length = 0
    await Promise.all([recorder.advance(10), recorder.advance(10)])
    expect(calls).toEqual([['flush', 10], ['step', 10], ['flush', 20], ['step', 20]])
  })

  it('resolves ready after fonts and the first commit, with animations stepped at 0', async () => {
    const order = []
    const { recorder, stepper } = setup({ whenReady: async () => order.push('fonts') })
    await recorder.ready
    expect(order).toEqual(['fonts'])
    expect(stepper.step).toHaveBeenCalledWith(0)
  })

  it('fails loudly when a scripted step throws: error is set and advance rejects', async () => {
    const { recorder, clock } = setup()
    clock.setTimeout(() => {
      throw new Error('Recorder: touch for [data-item="app:maps"] missed')
    }, 5)
    await expect(recorder.advance(10)).rejects.toThrow(/app:maps.*missed/)
    expect(recorder.error).toMatch(/app:maps.*missed/)
    await expect(recorder.advance(10)).rejects.toThrow(/app:maps/)
  })

  it('fails on errors reported from elsewhere (e.g. an event handler)', async () => {
    const { recorder } = setup()
    expect(recorder.error).toBeNull()
    recorder.report(new Error('boom in a handler'))
    recorder.report(new Error('second error is ignored'))
    expect(recorder.error).toMatch(/boom in a handler/)
    await expect(recorder.advance(16)).rejects.toThrow(/boom/)
  })

  it('a stepper failure (a runaway animation chain) is recorded in error', async () => {
    const step = vi.fn(async (now) => {
      if (now > 0) throw new Error('Recorder: animations still changing after 4 passes at 16ms')
    })
    const { recorder } = setup({ stepper: { step } })
    await recorder.ready
    await expect(recorder.advance(16)).rejects.toThrow(/still changing/)
    expect(recorder.error).toMatch(/still changing after 4 passes/)
    await expect(recorder.advance(16)).rejects.toThrow(/still changing/)
  })

  it('a disposed recorder (e.g. the discarded StrictMode mount) never touches the page again', async () => {
    const { recorder, stepper, clock } = setup()
    recorder.dispose()
    await recorder.ready
    expect(stepper.step).not.toHaveBeenCalled()
    await expect(recorder.advance(16)).rejects.toThrow(/disposed/)
    expect(clock.now()).toBe(0)
  })

  it('rejects nonsense step sizes', async () => {
    const { recorder } = setup()
    await expect(recorder.advance(-1)).rejects.toThrow(/advance/)
    await expect(recorder.advance(Number.NaN)).rejects.toThrow(/advance/)
  })
})
