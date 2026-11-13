/* eslint-disable react-refresh/only-export-components -- test fixture, never hot-reloaded */
import { useRef } from 'react'
import { vi } from 'vitest'
import { useFlip } from '../motion/useFlip.js'

// Synthetic home-screen geometry for FLIP tests. Regions sit side by side like pager
// pages (region n at x = n·PAGE_PX, only region 0 on screen); region "dock" sits on
// screen below them. Every slot is SLOT_PX wide; tiles are 60×60 at the slot's left.
export const SLOT_PX = 80
export const PAGE_PX = 400
export const DOCK_TOP = 320

const isFolder = (key) => key.startsWith('folder:')

function Item({ itemKey }) {
  return (
    <div data-flip={itemKey}>
      <div data-item={itemKey}>{isFolder(itemKey) && <div role="button" />}</div>
    </div>
  )
}

// `regions` maps a region id (0, 1, …, "dock") to an array of item keys or null.
export function Harness({ regions, options }) {
  const ref = useRef(null)
  useFlip(ref, [regions], options)
  return (
    <div ref={ref} data-container>
      {Object.entries(regions).map(([id, slots]) => (
        <div key={id} data-region={id}>
          {slots.map((key, slot) => (
            <div key={slot} data-slot={slot}>
              {key !== null && <Item itemKey={key} />}
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

function regionOrigin(element) {
  const id = element.closest('[data-region]')?.getAttribute('data-region') ?? '0'
  return id === 'dock' ? { x: 0, y: DOCK_TOP } : { x: Number(id) * PAGE_PX, y: 0 }
}

const slotLeft = (element) => Number(element.closest('[data-slot]')?.getAttribute('data-slot') ?? 0) * SLOT_PX

function rectOf(element) {
  if (element.hasAttribute('data-container')) return rect(0, 0, PAGE_PX, PAGE_PX)
  const origin = regionOrigin(element)
  if (element.hasAttribute('data-region')) return rect(origin.x, origin.y, PAGE_PX, PAGE_PX - DOCK_TOP)
  if (element.hasAttribute('data-departing')) {
    return rect(origin.x + parseFloat(element.style.left), origin.y + parseFloat(element.style.top), 60, 60)
  }
  return rect(origin.x + slotLeft(element), origin.y, 60, 60)
}

// Stubs offset* and getBoundingClientRect on every element; returns the undo function.
export function stubLayout() {
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
    return slotLeft(this)
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

// Installs a spy as Element.prototype.animate whose animations finish at once.
export function installAnimateSpy() {
  const animate = vi.fn(() => ({ finished: Promise.resolve(), cancel: vi.fn() }))
  Element.prototype.animate = animate
  return animate
}

export const flipKeyOf = (el) => el.getAttribute('data-flip') ?? el.getAttribute('data-departing')
