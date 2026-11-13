import { APPS } from '../model/catalog.js'
import { AppIcon } from './AppIcon.jsx'
import { FolderIcon } from './FolderIcon.jsx'

const isSelected = (selection, cell) =>
  selection.some((ref) => ref.type === cell.type && ref.id === cell.id)

// Renders the app or folder held by a layout cell (widgets are handled by PageGrid).
export function CellItem({ cell, folders, editMode, selection, jiggleIndex, showLabel = true }) {
  const selected = editMode && isSelected(selection, cell)
  if (cell.type === 'app' && APPS[cell.id] !== undefined) {
    return (
      <AppIcon
        app={APPS[cell.id]}
        editMode={editMode}
        selected={selected}
        jiggleIndex={jiggleIndex}
        showLabel={showLabel}
      />
    )
  }
  if (cell.type === 'folder' && folders[cell.id] !== undefined) {
    return (
      <FolderIcon
        folder={folders[cell.id]}
        editMode={editMode}
        selected={selected}
        jiggleIndex={jiggleIndex}
      />
    )
  }
  return null
}
