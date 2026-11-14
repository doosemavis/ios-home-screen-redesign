import { expect } from '@playwright/test'

// Shared e2e helpers. Every interaction here is real browser input (page.mouse or a
// locator click), never dispatchEvent, so pointer capture and click targeting behave
// exactly as they do for a person using the demo.

export const STEP_MS = 20
export const PAGE_TURN_WAIT_MS = 600

export const item = (page, key) => page.locator(`[data-item="${key}"]`)
export const slot = (page, name) => page.locator(`[data-slot="${name}"]`)
export const folderApp = (page, id) => page.locator(`[data-folder-panel] [data-item="app:${id}"]`)

// Logical position (parent slot) of every item on the home screen (not inside an open
// folder or a sheet); immune to jiggle and pager transforms.
export async function slotMap(page) {
  return page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll('[data-slot] [data-item]')].map((el) => [
        el.getAttribute('data-item'),
        el.closest('[data-slot]')?.getAttribute('data-slot') ?? null,
      ]),
    ),
  )
}

export async function center(locator) {
  const box = await locator.boundingBox()
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

// A real mouse click at the centre of the element (no actionability checks, so
// jiggling icons and the frosted controls are clicked exactly where a person would).
export async function clickAt(page, locator, options) {
  const at = await center(locator)
  await page.mouse.click(at.x, at.y, options)
}

export async function enterEdit(page) {
  await page.goto('/')
  await clickAt(page, slot(page, 'page:0:8'), { button: 'right' })
  await expect(page.locator('[data-edit-mode="true"]')).toBeVisible()
}

export async function goToPage(page, index) {
  await clickAt(page, page.locator(`[data-dot="${index}"]`))
  await expect(page.locator(`[data-dot="${index}"]`)).toHaveAttribute('aria-current', 'page')
  await page.waitForTimeout(PAGE_TURN_WAIT_MS)
}

// Mouse down on a jiggling icon (no actionability checks), then fan out.
export async function pressOn(page, locator) {
  const from = await center(locator)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  return from
}

export const tapSelect = (page, key) => clickAt(page, item(page, key))

export const changed = (before, after) =>
  Object.keys(before).filter((key) => before[key] !== after[key]).sort()

// Frees page:0:8 by tapping Maps and placing it on page index 1, then opens Social by
// tapping its icon. Every step is a real mouse click.
export async function openSocialWithGap(page) {
  await enterEdit(page)
  await tapSelect(page, 'app:maps')
  await goToPage(page, 1)
  await clickAt(page, slot(page, 'page:1:6'))
  await expect(slot(page, 'page:1:6').locator('[data-item="app:maps"]')).toHaveCount(1)
  await goToPage(page, 0)
  await clickAt(page, page.locator('[data-item="folder:social"] [role="button"]'))
  await expect(page.locator('[data-folder-overlay="social"]')).toBeVisible()
  await page.waitForTimeout(PAGE_TURN_WAIT_MS)
}
