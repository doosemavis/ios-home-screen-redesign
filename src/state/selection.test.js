import { describe, it, expect } from 'vitest'
import { toggleRef } from './selection.js'

const a = { type: 'app', id: 'maps' }
const b = { type: 'app', id: 'notes' }

describe('toggleRef', () => {
  it('appends a ref not yet selected, preserving order', () => {
    expect(toggleRef([a], b)).toEqual([a, b])
  })
  it('removes a ref already selected', () => {
    expect(toggleRef([a, b], a)).toEqual([b])
  })
  it('distinguishes type as well as id', () => {
    const folder = { type: 'folder', id: 'maps' }
    expect(toggleRef([a], folder)).toEqual([a, folder])
  })
  it('does not mutate the input', () => {
    const input = Object.freeze([a])
    expect(() => toggleRef(input, b)).not.toThrow()
  })
})
