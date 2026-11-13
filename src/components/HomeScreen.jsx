import { PAGE_COUNT } from '../model/constants.js'
import { Dock } from './Dock.jsx'
import { PageGrid } from './PageGrid.jsx'
import { PageIndicator } from './PageIndicator.jsx'
import { StatusBar } from './StatusBar.jsx'
import styles from './HomeScreen.module.css'

// The home screen for the current page, rendered from reducer state.
export function HomeScreen({ state, dispatch }) {
  const { layout, page, editMode, selection } = state

  // Desktop shortcut for hand use; the video enters edit mode with a long-press.
  const handleContextMenu = (event) => {
    event.preventDefault()
    dispatch({ type: 'ENTER_EDIT' })
  }

  return (
    <div className={styles.home} onContextMenu={handleContextMenu} data-edit-mode={String(editMode)}>
      <StatusBar editMode={editMode} onDone={() => dispatch({ type: 'EXIT_EDIT' })} />
      <PageGrid
        pageIndex={page}
        cells={layout.pages[page]}
        folders={layout.folders}
        editMode={editMode}
        selection={selection}
      />
      <PageIndicator editMode={editMode} page={page} pageCount={PAGE_COUNT} />
      <Dock cells={layout.dock} folders={layout.folders} editMode={editMode} selection={selection} />
    </div>
  )
}
