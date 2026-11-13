import { createContext, useContext } from 'react'

const IDLE_DRAG = { sourceKey: null, hoverTarget: null }

// What the grids need to know about an in-flight drag: the dragged item's key
// (to dim it in place) and the slot under the pointer (to glow it).
export const DragContext = createContext(IDLE_DRAG)

export const useDragView = () => useContext(DragContext)
