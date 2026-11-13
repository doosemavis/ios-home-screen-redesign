import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DOCK_TOP, Harness, SLOT_PX, flipKeyOf, installAnimateSpy, stubLayout } from '../test/flipHarness.jsx'
import { SNAPPY_MS, SPRING_SNAPPY } from './springs.js'

describe('useFlip', () => {
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

  const animatedKeys = () => animate.mock.contexts.map(flipKeyOf)

  it('useFlip animates only items whose rect changed', () => {
    const { rerender } = render(<Harness regions={{ 0: ['a', 'b', 'c', null] }} />)
    expect(animate).not.toHaveBeenCalled()

    rerender(<Harness regions={{ 0: [null, 'b', 'c', 'a'] }} />)

    expect(animatedKeys()).toEqual(['a'])
    const [keyframes, options] = animate.mock.calls[0]
    expect(keyframes).toEqual([{ transform: `translate(${-3 * SLOT_PX}px, 0px)` }, { transform: 'none' }])
    expect(options).toMatchObject({ duration: SNAPPY_MS, easing: SPRING_SNAPPY })
  })

  it('glides additively so an interrupting move continues from where the icon is', () => {
    const { rerender } = render(<Harness regions={{ 0: ['a', null, null] }} />)
    rerender(<Harness regions={{ 0: [null, 'a', null] }} />)
    rerender(<Harness regions={{ 0: [null, null, 'a'] }} />)

    expect(animate).toHaveBeenCalledTimes(2)
    expect(animate.mock.calls.map(([, options]) => options.composite)).toEqual(['add', 'add'])
    expect(animate.mock.calls[1][0][0].transform).toBe(`translate(${-SLOT_PX}px, 0px)`)
  })

  it('glides between a visible page and the dock using their on-screen offset', () => {
    const { rerender } = render(<Harness regions={{ 0: [null, 'a'], dock: [null, null] }} />)
    rerender(<Harness regions={{ 0: [null, null], dock: ['a', null] }} />)

    expect(animatedKeys()).toEqual(['a'])
    expect(animate.mock.calls[0][0][0].transform).toBe(`translate(${SLOT_PX}px, ${-DOCK_TOP}px)`)
  })

  it('pops arrivals in place instead of flying them across from an off-screen page', () => {
    const { rerender } = render(<Harness regions={{ 0: ['a', null], 1: [null, 'z'] }} />)
    rerender(<Harness regions={{ 0: ['a', 'z'], 1: [null, null] }} />)

    expect(animatedKeys()).toEqual(['z'])
    const [keyframes] = animate.mock.calls[0]
    expect(keyframes[0]).toMatchObject({ opacity: 0 })
    expect(keyframes.some((frame) => String(frame.transform).includes('translate'))).toBe(false)
  })

  it('staggers several arrivals', () => {
    const { rerender } = render(<Harness regions={{ 0: [null, null, null], 1: ['x', 'y', 'z'] }} />)
    rerender(<Harness regions={{ 0: ['x', 'y', 'z'], 1: [null, null, null] }} />)

    expect(animatedKeys()).toEqual(['x', 'y', 'z'])
    expect(animate.mock.calls.map(([, options]) => options.delay)).toEqual([0, 40, 80])
  })

  it('settles a dropped item from the drag point', () => {
    const takeSettle = vi.fn(() => null)
    const options = { takeSettle }
    const { rerender } = render(<Harness regions={{ 0: ['a', null] }} options={options} />)
    takeSettle.mockReturnValueOnce({ key: 'a', point: { x: 130, y: 30 } })
    rerender(<Harness regions={{ 0: [null, 'a'] }} options={options} />)

    // Slot 1's tile centre is (110, 30); the ghost was centred on the drop point.
    expect(animatedKeys()).toEqual(['a'])
    expect(animate.mock.calls[0][0][0].transform).toMatch(/^translate\(20px, 0px\) scale/)
  })

  it('does nothing when the Web Animations API is unavailable', () => {
    delete Element.prototype.animate
    const { rerender } = render(<Harness regions={{ 0: ['a', null] }} />)
    expect(() => rerender(<Harness regions={{ 0: [null, 'a'] }} />)).not.toThrow()
  })
})
