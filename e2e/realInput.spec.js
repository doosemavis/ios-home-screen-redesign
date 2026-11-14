import { expect, test } from '@playwright/test'
import {
  PAGE_TURN_WAIT_MS, center, changed, clickAt, enterEdit, folderApp, goToPage, item,
  openSocialWithGap, slot, slotMap, tapSelect,
} from './helpers.js'

// Every selection and placement path driven by real browser input. Gesture surfaces
// capture the pointer, so the browser targets the resulting click at the capturing
// element; these tests prove no path depends on a click landing on the pressed icon.

const moveOut = (page) => page.locator('[data-control="move-out"]')

// Social keeps its other three apps, so it stays open; Chat now sits in the one gap.
async function expectMovedOutToGap(page, before) {
  await expect(slot(page, 'page:0:8').locator('[data-item="app:chat"]')).toHaveCount(1)
  await expect(folderApp(page, 'chat')).toHaveCount(0)
  await expect(folderApp(page, 'facetime')).toHaveCount(1)
  const after = await slotMap(page)
  expect(changed(before, after)).toEqual([])
  expect(Object.keys(after).filter((key) => !(key in before))).toEqual(['app:chat'])
}

test('a real tap selects and deselects a home-screen app and selects a folder by its badge', async ({ page }) => {
  await enterEdit(page)
  await tapSelect(page, 'app:notes')
  await expect(item(page, 'app:notes')).toHaveAttribute('data-selected', 'true')
  await tapSelect(page, 'app:notes')
  await expect(item(page, 'app:notes')).toHaveAttribute('data-selected', 'false')
  await clickAt(page, page.locator('[data-control="select:folder:social"]'))
  await expect(item(page, 'folder:social')).toHaveAttribute('data-selected', 'true')
  await expect(page.locator('[data-folder-overlay]')).toHaveCount(0)
})

test('a real tap on an empty slot places the selection there; nothing else moves', async ({ page }) => {
  await enterEdit(page)
  const before = await slotMap(page)
  await tapSelect(page, 'app:clock')
  await goToPage(page, 1)
  await clickAt(page, slot(page, 'page:1:12'))
  const after = await slotMap(page)
  expect(after['app:clock']).toBe('page:1:12')
  expect(changed(before, after)).toEqual(['app:clock'])
})

test('a real tap selects an app inside an open folder, and Move Out lands it in the gap', async ({ page }) => {
  await openSocialWithGap(page)
  const before = await slotMap(page)
  await expect(moveOut(page)).toBeDisabled()
  await clickAt(page, folderApp(page, 'chat'))
  await expect(folderApp(page, 'chat')).toHaveAttribute('data-selected', 'true')
  await expect(page.locator('[data-folder-badge]')).toHaveText(/1 selected/)
  await clickAt(page, moveOut(page))
  await expectMovedOutToGap(page, before)
})

test('a second real tap inside the folder deselects the app again', async ({ page }) => {
  await openSocialWithGap(page)
  await clickAt(page, folderApp(page, 'bird'))
  await expect(folderApp(page, 'bird')).toHaveAttribute('data-selected', 'true')
  await clickAt(page, folderApp(page, 'bird'))
  await expect(folderApp(page, 'bird')).toHaveAttribute('data-selected', 'false')
  await expect(moveOut(page)).toBeDisabled()
})

test('the chrome answers real clicks: Move, a sheet option, Snap and Done', async ({ page }) => {
  await enterEdit(page)
  await tapSelect(page, 'app:notes')
  await clickAt(page, page.locator('[data-control="move"]'))
  await expect(page.locator('[role="dialog"][aria-labelledby="move-sheet-title"]')).toBeVisible()
  await page.waitForTimeout(PAGE_TURN_WAIT_MS)
  await clickAt(page, page.locator('[data-folder-option="work"]'))
  await expect(page.locator('[aria-labelledby="move-sheet-title"]')).toHaveCount(0)
  await expect(item(page, 'app:notes')).toHaveCount(0)
  const snap = page.locator('[data-control="snap"]')
  await expect(snap).toBeEnabled()
  await clickAt(page, snap)
  await expect(snap).toBeDisabled()
  await clickAt(page, page.locator('[data-control="done"]'))
  await expect(page.locator('[data-edit-mode="false"]')).toBeVisible()
})

test.describe('with a touchscreen', () => {
  test.use({ hasTouch: true })

  const touchTap = async (page, locator) => {
    const at = await center(locator)
    await page.touchscreen.tap(at.x, at.y)
  }

  test('a real touch selects an app inside an open folder, and Move Out lands it in the gap', async ({ page }) => {
    await openSocialWithGap(page)
    const before = await slotMap(page)
    await touchTap(page, folderApp(page, 'chat'))
    await expect(folderApp(page, 'chat')).toHaveAttribute('data-selected', 'true')
    await touchTap(page, moveOut(page))
    await expectMovedOutToGap(page, before)
  })
})
