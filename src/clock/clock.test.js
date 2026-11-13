import { describe, it, expect, vi } from 'vitest'
import { createRealClock, createVirtualClock } from './clock.js'

describe('virtual clock', () => {
  it('starts at zero and advances now()', () => {
    const clock = createVirtualClock()
    expect(clock.now()).toBe(0)
    clock.advance(250)
    expect(clock.now()).toBe(250)
  })

  it('fires timers in order on advance', () => {
    const clock = createVirtualClock()
    const fired = []
    clock.setTimeout(() => fired.push('b'), 200)
    clock.setTimeout(() => fired.push('a'), 100)
    clock.setTimeout(() => fired.push('c'), 300)
    clock.advance(250)
    expect(fired).toEqual(['a', 'b'])
    clock.advance(100)
    expect(fired).toEqual(['a', 'b', 'c'])
  })

  it('fires equal-time timers in scheduling order', () => {
    const clock = createVirtualClock()
    const fired = []
    clock.setTimeout(() => fired.push(1), 50)
    clock.setTimeout(() => fired.push(2), 50)
    clock.advance(50)
    expect(fired).toEqual([1, 2])
  })

  it('reports the timer due time as now() inside a callback', () => {
    const clock = createVirtualClock()
    let seen = -1
    clock.setTimeout(() => { seen = clock.now() }, 120)
    clock.advance(500)
    expect(seen).toBe(120)
    expect(clock.now()).toBe(500)
  })

  it('timer scheduled during advance fires if due', () => {
    const clock = createVirtualClock()
    const fired = []
    clock.setTimeout(() => {
      fired.push('first')
      clock.setTimeout(() => fired.push('nested'), 50)
    }, 100)
    clock.advance(200)
    expect(fired).toEqual(['first', 'nested'])
  })

  it('timer scheduled during advance does not fire if not due', () => {
    const clock = createVirtualClock()
    const fired = []
    clock.setTimeout(() => clock.setTimeout(() => fired.push('late'), 500), 100)
    clock.advance(200)
    expect(fired).toEqual([])
    clock.advance(400)
    expect(fired).toEqual(['late'])
  })

  it('clearTimeout cancels', () => {
    const clock = createVirtualClock()
    const fn = vi.fn()
    const id = clock.setTimeout(fn, 100)
    clock.clearTimeout(id)
    clock.advance(200)
    expect(fn).not.toHaveBeenCalled()
  })

  it('clearTimeout of an unknown id is harmless', () => {
    const clock = createVirtualClock()
    expect(() => clock.clearTimeout(999)).not.toThrow()
  })

  it('fires a timer only once', () => {
    const clock = createVirtualClock()
    const fn = vi.fn()
    clock.setTimeout(fn, 10)
    clock.advance(100)
    clock.advance(100)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('real clock', () => {
  it('now() is a number and setTimeout/clearTimeout work', () => {
    vi.useFakeTimers()
    const clock = createRealClock()
    expect(typeof clock.now()).toBe('number')
    const fn = vi.fn()
    clock.setTimeout(fn, 100)
    const cancelled = vi.fn()
    clock.clearTimeout(clock.setTimeout(cancelled, 100))
    vi.advanceTimersByTime(150)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(cancelled).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})
