import { useRef } from 'react'
import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SNAPPY_MS, SPRING_SNAPPY } from './springs.js'
import { useFlip } from './useFlip.js'

const SLOT_PX = 80
const PAGE_PX = 400

// Two regions side by side (like two pager pages); only region 0 is on screen.
function Harness({ regions, takeSettle }) {
  const ref = useRef(null)
  useFlip(ref, [regions], takeSettle)
  return (
    <div ref={ref} data-container>
      {regions.map((slots, r) => (
        <div key={r} data-region={r}>
          {slots.map((key, slot) => (
            <div key={slot} data-slot={slot}>
              {key !== null && (
                <div data-flip={key}>
                  <div data-item={key} />
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

const rect = (left, top, width, height) => ({
  left, top, width, height, right: left + width, bottom: top + height, x: left, y: top,
})

function rectOf(element) {
  if (element.hasAttribute('data-container')) return rect(0, 0, PAGE_PX, PAGE_PX)
  const region = Number(element.closest('[data-region]')?.getAttribute('data-region') ?? 0)
  if (element.hasAttribute('data-region')) return rect(region * PAGE_PX, 0, PAGE_PX, PAGE_PX)
  const slot = Number(element.closest('[data-slot]')?.getAttribute('data-slot') ?? 0)
  return rect(region * PAGE_PX + slot * SLOT_PX, 0, 60, 60)
}

function stubLayout() {
  const restore = []
  const define = (name, get) => {
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, name)
    Object.defineProperty(HTMLElement.prototype, name, { configurable: true, get })
    restore.push(() => Object.defineProperty(HTMLElement.prototype, name, original))
  }
  define('offsetParent', function offsetParent() {
    return this.parentElement?.closest('[data-region]') ?? null
  })
  define('offsetLeft', function offsetLeft() {
    return Number(this.closest('[data-slot]')?.getAttribute('data-slot') ?? 0) * SLOT_PX
  })
  define('offsetTop', () => 0)
  define('offsetWidth', function offsetWidth() {
    return rectOf(this).width
  })
  const gbcr = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function bcr() {
    return rectOf(this)
  })
  return () => {
    restore.forEach((undo) => undo())
    gbcr.mockRestore()
  }
}

const fakeAnimation = () => ({ finished: Promise.resolve(), cancel: vi.fn() })

describe('useFlip', () => {
  let unstub
  let animate

  beforeEach(() => {
    unstub = stubLayout()
    animate = vi.fn(fakeAnimation)
    Element.prototype.animate = animate
  })

  afterEach(() => {
    unstub()
    delete Element.prototype.animate
  })

  const animatedKeys = () => animate.mock.contexts.map((el) => el.getAttribute('data-flip'))

  it('useFlip animates only items whose rect changed', () => {
    const { rerender } = render(<Harness regions={[['a', 'b', 'c', null]]} />)
    expect(animate).not.toHaveBeenCalled()

    rerender(<Harness regions={[[null, 'b', 'c', 'a']]} />)

    expect(animatedKeys()).toEqual(['a'])
    const [keyframes, options] = animate.mock.calls[0]
    expect(keyframes).toEqual([{ transform: `translate(${-3 * SLOT_PX}px, 0px)` }, { transform: 'none' }])
    expect(options).toMatchObject({ duration: SNAPPY_MS, easing: SPRING_SNAPPY })
  })

  it('pops arrivals in place instead of flying them across from an off-screen page', () => {
    const { rerender } = render(<Harness regions={[['a', null], [null, 'z']]} />)
    rerender(<Harness regions={[['a', 'z'], [null, null]]} />)

    expect(animatedKeys()).toEqual(['z'])
    const [keyframes] = animate.mock.calls[0]
    expect(keyframes[0]).toMatchObject({ opacity: 0 })
    expect(keyframes.some((frame) => String(frame.transform).includes('translate'))).toBe(false)
  })

  it('settles a dropped item from the drag point', () => {
    const takeSettle = vi.fn(() => null)
    const { rerender } = render(<Harness regions={[['a', null]]} takeSettle={takeSettle} />)
    takeSettle.mockReturnValueOnce({ key: 'a', point: { x: 130, y: 30 } })
    rerender(<Harness regions={[[null, 'a']]} takeSettle={takeSettle} />)

    // Slot 1's tile centre is (110, 30); the ghost was centred on the drop point.
    expect(animatedKeys()).toEqual(['a'])
    expect(animate.mock.calls[0][0][0].transform).toMatch(/^translate\(20px, 0px\) scale/)
  })

  it('does nothing when the Web Animations API is unavailable', () => {
    delete Element.prototype.animate
    const { rerender } = render(<Harness regions={[['a', null]]} />)
    expect(() => rerender(<Harness regions={[[null, 'a']]} />)).not.toThrow()
  })
})
