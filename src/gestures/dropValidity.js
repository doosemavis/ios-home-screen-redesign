import { dropItem } from '../model/drop.js'
import { parseItem, parseSlot } from './resolveTap.js'

// True when releasing `itemKey` over `slotName` would actually change the layout
// (so never the item's own slot, the widget, or a refused target such as folder-to-dock).
export function isValidDrop(layout, itemKey, slotName) {
  const result = dropItem(layout, parseItem(itemKey), parseSlot(slotName))
  return result.ok && result.layout !== layout
}
