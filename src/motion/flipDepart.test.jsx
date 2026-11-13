import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Harness, SLOT_PX, flipKeyOf, installAnimateSpy, stubLayout } from '../test/flipHarness.jsx'
import { SNAPPY_MS, SPRING_SNAPPY } from './springs.js'

// Apps a and b leave the grid into folder:f; b was selected first (index 0 in the folder).
const ORDER = { a: 1, b: 0 }
const intoF = (key) => (key in ORDER ? { target: 'folder:f', order: ORDER[key] } : null)

describe('useFlip: apps flying into a folder', () => {
  let unstub
  let animate

  beforeEach(() => {
    unstub = stubLayout()
    animate = installAnimateSpy()
  })

  afterEach(() => {
    unstub()
    delete Element.prototype.animate
  })

  const callsOn = (key) => animate.mock.calls.filter((_, i) => flipKeyOf(animate.mock.contexts[i]) === key)

  it('flies departing apps to the folder tile, shrinking, staggered in selection order', () => {
    const options = { destinationOf: intoF }
    const { rerender } = render(<Harness regions={{ 0: ['a', 'b', 'folder:f', null] }} options={options} />)
    rerender(<Harness regions={{ 0: [null, null, 'folder:f', null] }} options={options} />)

    const [[framesB, timingB]] = callsOn('b')
    const [[framesA, timingA]] = callsOn('a')
    expect(framesB.at(-1)).toMatchObject({ opacity: 0 })
    expect(framesB.at(-1).transform).toBe(`translate(${SLOT_PX}px, 0px) scale(0.22)`)
    expect(framesA.at(-1).transform).toBe(`translate(${2 * SLOT_PX}px, 0px) scale(0.22)`)
    expect(timingB).toMatchObject({ duration: SNAPPY_MS, easing: SPRING_SNAPPY, delay: 0 })
    expect(timingA.delay).toBeGreaterThan(timingB.delay)
  })

  it('then pops the folder icon once the apps land', () => {
    const options = { destinationOf: intoF }
    const { rerender } = render(<Harness regions={{ 0: ['a', 'b', 'folder:f'] }} options={options} />)
    rerender(<Harness regions={{ 0: [null, null, 'folder:f'] }} options={options} />)

    const [[frames, timing]] = callsOn('folder:f')
    expect(frames.map((f) => f.transform)).toEqual(['none', 'scale(1.12)', 'none'])
    expect(timing.composite).toBe('add')
    const lastDeparture = Math.max(...[...callsOn('a'), ...callsOn('b')].map(([, t]) => t.delay))
    expect(timing.delay).toBeGreaterThan(lastDeparture)
  })

  it('flies the apps into a folder created at the first app’s slot', () => {
    const order = { a: 0, b: 1 }
    const options = { destinationOf: (key) => (key in order ? { target: 'folder:n', order: order[key] } : null) }
    const { rerender } = render(<Harness regions={{ 0: ['a', 'b', null] }} options={options} />)
    rerender(<Harness regions={{ 0: ['folder:n', null, null] }} options={options} />)

    expect(callsOn('a')[0][0].at(-1).transform).toBe('translate(0px, 0px) scale(0.22)')
    expect(callsOn('b')[0][0].at(-1).transform).toBe(`translate(${-SLOT_PX}px, 0px) scale(0.22)`)
    expect(callsOn('folder:n').some(([frames]) => frames[1]?.transform === 'scale(1.12)')).toBe(true)
  })

  it('draws departing copies that cannot be hit or mistaken for icons, and removes them after', async () => {
    const options = { destinationOf: intoF }
    const { rerender, container } = render(<Harness regions={{ 0: ['a', 'folder:f'] }} options={options} />)
    rerender(<Harness regions={{ 0: [null, 'folder:f'] }} options={options} />)

    const ghost = container.querySelector('[data-departing="a"]')
    expect(ghost).not.toBeNull()
    expect(ghost.style.pointerEvents).toBe('none')
    expect(ghost.querySelector('[data-item]')).toBeNull()
    expect(container.querySelectorAll('[data-item="a"]')).toHaveLength(0)

    await act(async () => {})
    expect(container.querySelector('[data-departing]')).toBeNull()
  })

  it('lets apps that left for an off-screen folder vanish without flying across pages', () => {
    const options = { destinationOf: intoF }
    const { rerender } = render(<Harness regions={{ 0: ['a', null], 1: ['folder:f', null] }} options={options} />)
    rerender(<Harness regions={{ 0: [null, null], 1: ['folder:f', null] }} options={options} />)
    expect(animate).not.toHaveBeenCalled()
  })
})
