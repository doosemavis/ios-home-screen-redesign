import { expect, test } from '@playwright/test'
import {
  PAGE_TURN_WAIT_MS, STEP_MS, center, changed, enterEdit, goToPage, item, openSocialWithGap,
  pressOn, slot, slotMap, tapSelect,
} from './helpers.js'

const EDGE_HOLD_MS = 700

async function selectTwoAndPlace(page) {
  await enterEdit(page)
  const before = await slotMap(page)
  await tapSelect(page, 'app:maps')
  await tapSelect(page, 'app:notes')
  // The weather widget is not draggable, so a swipe starting on it turns the page.
  const swipeFrom = await center(slot(page, 'page:0:0'))
  await page.mouse.move(swipeFrom.x + 60, swipeFrom.y)
  await page.mouse.down()
  await page.mouse.move(swipeFrom.x - 80, swipeFrom.y, { steps: 6 })
  await page.mouse.up()
  await page.waitForTimeout(PAGE_TURN_WAIT_MS)
  await expect(page.locator('[data-dot="1"]')).toHaveAttribute('aria-current', 'page')
  await goToPage(page, 2)
  const target = await center(slot(page, 'page:2:10'))
  await page.mouse.click(target.x, target.y)
  const after = await slotMap(page)
  expect(after['app:maps']).toBe('page:2:10')
  expect(after['app:notes']).toBe('page:2:11')
  expect(changed(before, after)).toEqual(['app:maps', 'app:notes'])
}

test('select two apps, swipe to page 2, tap slot, no other icon moves', async ({ page }) => {
  await selectTwoAndPlace(page)
})

test('places correctly at small viewport', async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 600 })
  await selectTwoAndPlace(page)
})

test('drag one app to page 2 via edge hover', async ({ page }) => {
  await enterEdit(page)
  await goToPage(page, 1)
  const before = await slotMap(page)
  const from = await pressOn(page, item(page, 'app:calculator'))
  await page.mouse.move(from.x + 20, from.y + 20, { steps: 4 })
  const screen = await page.locator('[data-edit-mode]').boundingBox()
  await page.mouse.move(screen.x + screen.width - 6, from.y, { steps: 8 })
  await page.waitForTimeout(EDGE_HOLD_MS)
  await expect(page.locator('[data-dot="2"]')).toHaveAttribute('aria-current', 'page')
  await page.waitForTimeout(PAGE_TURN_WAIT_MS)
  const target = await center(slot(page, 'page:2:10'))
  await page.mouse.move(target.x, target.y, { steps: 8 })
  await page.waitForTimeout(STEP_MS)
  await page.mouse.up()
  const after = await slotMap(page)
  expect(after['app:calculator']).toBe('page:2:10')
  expect(changed(before, after)).toEqual(['app:calculator'])
})

test('dragging an app onto another app swaps just those two', async ({ page }) => {
  await enterEdit(page)
  const before = await slotMap(page)
  const from = await pressOn(page, item(page, 'app:maps'))
  const to = await center(item(page, 'app:notes'))
  await page.mouse.move(from.x + 15, from.y, { steps: 3 })
  await page.mouse.move(to.x, to.y, { steps: 6 })
  await page.mouse.up()
  const after = await slotMap(page)
  expect(after['app:maps']).toBe(before['app:notes'])
  expect(after['app:notes']).toBe(before['app:maps'])
  expect(changed(before, after)).toEqual(['app:maps', 'app:notes'])
})

test('ghost follows the pointer and swap works at small viewport', async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 600 })
  await enterEdit(page)
  const before = await slotMap(page)
  const from = await pressOn(page, item(page, 'app:maps'))
  const to = await center(item(page, 'app:notes'))
  await page.mouse.move(from.x + 12, from.y, { steps: 3 })
  await page.mouse.move(to.x, to.y, { steps: 6 })
  const ghost = await center(page.locator('[data-drag-ghost]'))
  expect(Math.abs(ghost.x - to.x)).toBeLessThan(3)
  expect(Math.abs(ghost.y - to.y)).toBeLessThan(3)
  await page.mouse.up()
  const after = await slotMap(page)
  expect(changed(before, after)).toEqual(['app:maps', 'app:notes'])
})

test('drag an app out of an open folder onto an empty page slot; nothing else moves', async ({ page }) => {
  await openSocialWithGap(page)
  const before = await slotMap(page)
  const chat = page.locator('[data-folder-panel] [data-item="app:chat"]')
  const from = await pressOn(page, chat)
  await page.mouse.move(from.x + 15, from.y + 15, { steps: 3 })
  await expect(page.locator('[data-folder-overlay][data-dragging="true"]')).toBeVisible()
  const target = await center(slot(page, 'page:0:8'))
  await page.mouse.move(target.x, target.y, { steps: 8 })
  await expect(slot(page, 'page:0:8').locator('[data-drop-target="true"]')).toHaveCount(1)
  await page.mouse.up()
  await expect(page.locator('[data-folder-overlay]')).toHaveCount(0)
  const after = await slotMap(page)
  expect(after['app:chat']).toBe('page:0:8')
  expect(changed(before, after)).toEqual([])
  expect(Object.keys(after).filter((key) => !(key in before))).toEqual(['app:chat'])
  await expect(page.locator('[data-edit-mode="true"]')).toBeVisible()
})
