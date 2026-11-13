# iOS App Grouping UX Demo

An interactive prototype demonstrating improved UX for organizing apps on an iOS home screen.

## Features

- **Multi-select apps**: Enter edit mode (right-click), then tap apps to select multiple
- **Move to folder**: Use the blue "MOVE" button to move selected apps to existing or new folders
- **Drag and drop**: Drag apps, folders to any grid position
- **Snap to grid**: Use the grid button to auto-organize apps into a compact layout
- **Dock support**: Drag apps to/from the dock
- **Folder management**: Create new folders, drag apps out of folders

## How to Run

Built with Vite + React. Requires Node.js.

```bash
cd iOS-Emulator
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

The phone renders at roughly real iPhone size and shrinks to fit smaller browser windows.

Other scripts:

- `npm run build` - Production build into `dist/`
- `npm run preview` - Serve the production build locally
- `npm run lint` - Run ESLint

## Usage

1. **Enter Edit Mode**: Right-click anywhere on the home screen
2. **Select Apps**: Click on apps to select them (green border indicates selection)
3. **Move Apps**: 
   - Click the blue "MOVE" button on the left edge
   - Choose a folder or create a new one
4. **Drag & Drop**: Drag apps/folders to reposition them
5. **Snap to Grid**: Click the grid button to auto-organize
6. **Open Folders**: Click on a folder to expand it
7. **Exit Edit Mode**: Click "Done" button

## Files

- `index.html` - Page shell that loads the app
- `src/main.jsx` - Entry point that mounts the app
- `src/App.jsx` - React component with all the logic and styles
- `src/useFitScale.js` - Scales the phone to real-world size and fits it to the window
