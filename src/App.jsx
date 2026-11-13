import React from 'react';
import { useFitScale } from './useFitScale';


const { useState } = React;

const IOSHomeScreenDemo = () => {
  const scale = useFitScale();

  const [apps, setApps] = useState([
    { id: 1, name: 'Photos', icon: '📷', color: '#FF9500', folder: null, position: 4 },
    { id: 2, name: 'Camera', icon: '📸', color: '#5856D6', folder: null, position: 5 },
    { id: 3, name: 'Maps', icon: '🗺️', color: '#34C759', folder: null, position: 6 },
    { id: 4, name: 'Weather', icon: '🌤️', color: '#5AC8FA', folder: null, position: 7 },
    { id: 5, name: 'Notes', icon: '📝', color: '#FFCC00', folder: null, position: 8 },
    { id: 6, name: 'Calendar', icon: '📅', color: '#FF3B30', folder: null, position: 9 },
    { id: 7, name: 'Clock', icon: '⏰', color: '#FF9500', folder: null, position: 10 },
    { id: 8, name: 'Calc', icon: '🔢', color: '#1C1C1E', folder: null, position: 11 },
    { id: 9, name: 'Fitness', icon: '💪', color: '#30D158', folder: null, position: 12 },
    { id: 10, name: 'Music', icon: '🎵', color: '#FC3C44', folder: null, position: 13 },
    { id: 11, name: 'Podcasts', icon: '🎙️', color: '#8E44AD', folder: null, position: 14 },
    { id: 12, name: 'Books', icon: '📚', color: '#FF9500', folder: null, position: 15 },
    { id: 13, name: 'News', icon: '📰', color: '#FD4351', folder: null, position: 16 },
    { id: 14, name: 'Stocks', icon: '📈', color: '#1C1C1E', folder: null, position: 17 },
    { id: 15, name: 'Voice', icon: '🎤', color: '#FF3B30', folder: null, position: 18 },
    // Dock apps (positions 100-103 represent dock slots)
    { id: 101, name: 'Phone', icon: '📱', color: '#30D158', folder: null, position: 100 },
    { id: 102, name: 'Messages', icon: '💬', color: '#30D158', folder: null, position: 101 },
    { id: 103, name: 'Safari', icon: '🧭', color: '#007AFF', folder: null, position: 102 },
    { id: 104, name: 'Music', icon: '🎵', color: '#FC3C44', folder: null, position: 103 },
  ]);

  const [folders, setFolders] = useState([
    { id: 'social', name: 'Social', color: '#007AFF', position: 0 },
    { id: 'games', name: 'Games', color: '#34C759', position: 1 },
    { id: 'productivity', name: 'Productivity', color: '#FF9500', position: 2 },
    { id: 'utilities', name: 'Utilities', color: '#8E8E93', position: 3 },
  ]);

  const [jiggleMode, setJiggleMode] = useState(false);
  const [selectedApps, setSelectedApps] = useState([]);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [notification] = useState(null);
  const [openFolder, setOpenFolder] = useState(null);
  const [draggedApp, setDraggedApp] = useState(null);
  const [draggedFolder, setDraggedFolder] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [selectedFolderApps, setSelectedFolderApps] = useState([]);

  // Grid configuration
  const TOTAL_SLOTS = 28;
  const DOCK_SLOTS = 4;
  const DOCK_START = 100; // Dock positions are 100-103

  // Get dock apps
  const getDockApps = () => {
    const dockApps = Array(DOCK_SLOTS).fill(null);
    apps.filter(app => !app.folder && app.position >= DOCK_START && app.position < DOCK_START + DOCK_SLOTS)
      .forEach(app => {
        dockApps[app.position - DOCK_START] = app;
      });
    return dockApps;
  };

  // Build grid based on positions
  const buildGrid = () => {
    const grid = Array(TOTAL_SLOTS).fill(null).map((_, i) => ({ type: 'empty', position: i }));
    
    // Place folders at their positions
    folders.forEach(folder => {
      if (folder.position >= 0 && folder.position < TOTAL_SLOTS) {
        grid[folder.position] = { type: 'folder', data: folder, position: folder.position };
      }
    });
    
    // Place visible apps at their positions
    apps.filter(app => !app.folder).forEach(app => {
      if (app.position >= 0 && app.position < TOTAL_SLOTS) {
        grid[app.position] = { type: 'app', data: app, position: app.position };
      }
    });
    
    return grid;
  };

  const handleDragStart = (e, app) => {
    if (!jiggleMode) return;
    setDraggedApp(app);
    setDraggedFolder(null);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleFolderDragStart = (e, folder) => {
    if (!jiggleMode) return;
    setDraggedFolder(folder);
    setDraggedApp(null);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, slotIndex) => {
    if (!jiggleMode || (!draggedApp && !draggedFolder)) return;
    e.preventDefault();
    setDragOverSlot(slotIndex);
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = (e, slotIndex) => {
    e.preventDefault();
    
    // Handle folder drop
    if (draggedFolder) {
      const grid = buildGrid();
      const targetSlot = grid[slotIndex];
      const draggedFolderOldPosition = draggedFolder.position;
      
      if (targetSlot.type === 'empty') {
        // Move folder to empty slot
        setFolders(prev => prev.map(f => 
          f.id === draggedFolder.id 
            ? { ...f, position: slotIndex }
            : f
        ));
      } else if (targetSlot.type === 'folder') {
        // Swap folders
        setFolders(prev => prev.map(f => {
          if (f.id === draggedFolder.id) {
            return { ...f, position: slotIndex };
          }
          if (f.id === targetSlot.data.id) {
            return { ...f, position: draggedFolderOldPosition };
          }
          return f;
        }));
      } else if (targetSlot.type === 'app') {
        // Swap folder with app
        setFolders(prev => prev.map(f => 
          f.id === draggedFolder.id 
            ? { ...f, position: slotIndex }
            : f
        ));
        setApps(prev => prev.map(app => 
          app.id === targetSlot.data.id 
            ? { ...app, position: draggedFolderOldPosition }
            : app
        ));
      }
      
      setDraggedFolder(null);
      setDragOverSlot(null);
      return;
    }
    
    if (!draggedApp) return;

    const isDockSlot = slotIndex >= DOCK_START;
    const draggedAppOldPosition = draggedApp.position;

    if (isDockSlot) {
      // Dropping into dock
      const dockPosition = slotIndex;
      const existingDockApp = apps.find(a => a.position === dockPosition && !a.folder);
      
      if (existingDockApp) {
        // Swap with existing dock app
        setApps(prev => prev.map(app => {
          if (app.id === draggedApp.id) {
            return { ...app, position: dockPosition };
          }
          if (app.id === existingDockApp.id) {
            return { ...app, position: draggedAppOldPosition };
          }
          return app;
        }));
      } else {
        // Move to empty dock slot
        setApps(prev => prev.map(app => 
          app.id === draggedApp.id 
            ? { ...app, position: dockPosition }
            : app
        ));
      }
    } else {
      // Dropping into main grid
      const grid = buildGrid();
      const targetSlot = grid[slotIndex];

      // If dropping on a folder, move app into that folder
      if (targetSlot.type === 'folder') {
        setApps(prev => prev.map(app => 
          app.id === draggedApp.id 
            ? { ...app, folder: targetSlot.data.id }
            : app
        ));
        // Close folder overlay if we moved the app out
        if (draggedApp.folder) {
          setOpenFolder(null);
          setSelectedFolderApps([]);
        }
      } 
      // If dropping on empty slot, move app to that position
      else if (targetSlot.type === 'empty') {
        setApps(prev => prev.map(app => 
          app.id === draggedApp.id 
            ? { ...app, folder: null, position: slotIndex }
            : app
        ));
        // Close folder overlay if we moved the app out of a folder
        if (draggedApp.folder) {
          setOpenFolder(null);
          setSelectedFolderApps([]);
        }
      }
      // If dropping on another app, swap positions
      else if (targetSlot.type === 'app') {
        // If dragged app is from a folder, just place it at target position and move target app
        if (draggedApp.folder) {
          setApps(prev => prev.map(app => {
            if (app.id === draggedApp.id) {
              return { ...app, folder: null, position: slotIndex };
            }
            if (app.id === targetSlot.data.id) {
              return { ...app, position: draggedAppOldPosition < DOCK_START ? draggedAppOldPosition : findAvailablePositions(1)[0] };
            }
            return app;
          }));
          setOpenFolder(null);
          setSelectedFolderApps([]);
        } else {
          // Normal swap between two home screen apps
          setApps(prev => prev.map(app => {
            if (app.id === draggedApp.id) {
              return { ...app, position: slotIndex };
            }
            if (app.id === targetSlot.data.id) {
              return { ...app, position: draggedAppOldPosition };
            }
            return app;
          }));
        }
      }
    }

    setDraggedApp(null);
    setDragOverSlot(null);
  };

  const handleDragEnd = () => {
    setDraggedApp(null);
    setDraggedFolder(null);
    setDragOverSlot(null);
  };

  const toggleFolderAppSelection = (appId) => {
    setSelectedFolderApps(prev => 
      prev.includes(appId) 
        ? prev.filter(id => id !== appId)
        : [...prev, appId]
    );
  };

  // Find the closest available grid positions
  const findAvailablePositions = (count) => {
    const grid = buildGrid();
    const available = [];
    
    for (let i = 0; i < TOTAL_SLOTS && available.length < count; i++) {
      if (grid[i].type === 'empty') {
        available.push(i);
      }
    }
    
    return available;
  };

  // Move selected apps out of folder to closest available grid positions
  const moveAppsOutOfFolder = () => {
    if (selectedFolderApps.length === 0) return;
    
    const availablePositions = findAvailablePositions(selectedFolderApps.length);
    
    if (availablePositions.length < selectedFolderApps.length) {
      return;
    }
    
    setApps(prev => prev.map(app => {
      const selectionIndex = selectedFolderApps.indexOf(app.id);
      if (selectionIndex !== -1) {
        return { 
          ...app, 
          folder: null, 
          position: availablePositions[selectionIndex] 
        };
      }
      return app;
    }));
    
    setSelectedFolderApps([]);
  };

  // Check if apps are already snapped to grid
  const isAlreadySnapped = () => {
    // Get all folder positions first
    const folderPositions = new Set(folders.map(f => f.position));
    
    // Get visible apps (not in folders and not in dock) sorted by current position
    const visibleAppsList = apps
      .filter(app => !app.folder && app.position < DOCK_START)
      .sort((a, b) => a.position - b.position);
    
    // Find available positions (excluding folder positions)
    const availablePositions = [];
    for (let i = 0; i < TOTAL_SLOTS; i++) {
      if (!folderPositions.has(i)) {
        availablePositions.push(i);
      }
    }
    
    // Check if each app is already at its snapped position
    for (let i = 0; i < visibleAppsList.length; i++) {
      if (visibleAppsList[i].position !== availablePositions[i]) {
        return false;
      }
    }
    
    return true;
  };

  // Snap all apps to compact grid layout (classic iOS style)
  const snapToGrid = () => {
    // Get all folder positions first (they stay in place)
    const folderPositions = new Set(folders.map(f => f.position));
    
    // Get visible apps (not in folders and not in dock) sorted by current position
    const visibleAppsList = apps
      .filter(app => !app.folder && app.position < DOCK_START)
      .sort((a, b) => a.position - b.position);
    
    // Find available positions (excluding folder positions)
    const availablePositions = [];
    for (let i = 0; i < TOTAL_SLOTS; i++) {
      if (!folderPositions.has(i)) {
        availablePositions.push(i);
      }
    }
    
    // Assign apps to consecutive available positions (dock apps stay in dock)
    setApps(prev => prev.map(app => {
      if (app.folder) return app; // Apps in folders don't change
      if (app.position >= DOCK_START) return app; // Dock apps stay in dock
      
      const appIndex = visibleAppsList.findIndex(a => a.id === app.id);
      if (appIndex !== -1 && appIndex < availablePositions.length) {
        return { ...app, position: availablePositions[appIndex] };
      }
      return app;
    }));
  };

  // const showNotification = (message) => {
  //   setNotification(message);
  //   setTimeout(() => setNotification(null), 2500);
  // };

  const toggleJiggleMode = () => {
    if (jiggleMode) {
      setJiggleMode(false);
      setSelectedApps([]);
    } else {
      setJiggleMode(true);
    }
  };

  const toggleAppSelection = (appId) => {
    if (!jiggleMode) return;
    setSelectedApps(prev => 
      prev.includes(appId) 
        ? prev.filter(id => id !== appId)
        : [...prev, appId]
    );
  };

  const moveAppsToFolder = (folderId) => {
    setApps(prev => prev.map(app => 
      selectedApps.includes(app.id) 
        ? { ...app, folder: folderId }
        : app
    ));
    
    setShowActionSheet(false);
    setSelectedApps([]);
  };

  const createNewFolder = () => {
    if (!newFolderName.trim()) return;
    
    // Find the first available position for the new folder
    const grid = buildGrid();
    let newPosition = 0;
    for (let i = 0; i < TOTAL_SLOTS; i++) {
      if (grid[i].type === 'empty') {
        newPosition = i;
        break;
      }
    }
    
    const newFolder = {
      id: `folder-${Date.now()}`,
      name: newFolderName.trim(),
      color: '#007AFF',
      position: newPosition
    };
    
    setFolders(prev => [...prev, newFolder]);
    setNewFolderName('');
    setShowNewFolderInput(false);
    
    // Move apps to the new folder
    setApps(prev => prev.map(app => 
      selectedApps.includes(app.id) 
        ? { ...app, folder: newFolder.id }
        : app
    ));
    
    setShowActionSheet(false);
    setSelectedApps([]);
  };

  // const visibleApps = apps.filter(app => !app.folder);
  const getAppsInFolder = (folderId) => apps.filter(app => app.folder === folderId);

  return (
    <div style={{ ...styles.container, zoom: scale }}>
      {/* Status Bar */}
      <div style={styles.statusBar}>
        <span style={styles.time}>9:41</span>
        {/* Status icons stay in the layout (hidden in edit mode) so the grid doesn't shift */}
        <div style={{ ...styles.statusIcons, visibility: jiggleMode ? 'hidden' : 'visible' }}>
          <span>📶</span>
          <span>📡</span>
          <span>🔋</span>
        </div>
        {/* Done Button takes the status icons' place in edit mode, like iOS */}
        {jiggleMode && (
          <button
            style={styles.doneButton}
            onClick={toggleJiggleMode}
          >
            Done
          </button>
        )}
      </div>

      {/* Home Screen */}
      <div 
        style={styles.homeScreen}
        onContextMenu={(e) => { e.preventDefault(); toggleJiggleMode(); }}
        onClick={(e) => {
          if (e.target === e.currentTarget && jiggleMode && selectedApps.length === 0) {
            toggleJiggleMode();
          }
        }}
      >
        {/* App Grid */}
        <div style={styles.appGrid}>
          {buildGrid().map((slot, index) => {
            const isDropTarget = dragOverSlot === index && (draggedApp || draggedFolder);
            
            if (slot.type === 'folder') {
              const folder = slot.data;
              const folderApps = getAppsInFolder(folder.id);
              const isDragging = draggedFolder?.id === folder.id;
              return (
                <div 
                  key={folder.id} 
                  style={{
                    ...styles.appWrapper,
                    opacity: isDragging ? 0.4 : 1,
                    cursor: jiggleMode ? 'grab' : 'pointer',
                  }}
                  draggable={jiggleMode}
                  onDragStart={(e) => handleFolderDragStart(e, folder)}
                  onDragEnd={handleDragEnd}
                  onClick={() => !isDragging && setOpenFolder(folder.id)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  {/* Glowing grid outline in edit mode */}
                  {jiggleMode && (
                    <div style={{
                      ...styles.glowingOutline,
                      borderColor: isDropTarget ? 'rgba(48, 209, 88, 0.8)' : undefined,
                      boxShadow: isDropTarget ? '0 0 20px rgba(48, 209, 88, 0.6)' : undefined,
                    }} />
                  )}
                  <div 
                    style={{
                      ...styles.folderIcon,
                      animation: jiggleMode && !isDragging ? 'jiggle 0.2s ease-in-out infinite alternate' : 'none',
                      transform: isDropTarget ? 'scale(1.1)' : undefined,
                      transition: 'transform 0.15s ease',
                    }}
                  >
                    <div style={styles.folderGrid}>
                      {folderApps.slice(0, 9).map((app) => (
                        <div 
                          key={app.id} 
                          style={{
                            ...styles.miniAppIcon, 
                            background: app.color,
                          }}
                        >
                          <span style={styles.miniAppEmoji}>{app.icon}</span>
                        </div>
                      ))}
                    </div>
                    {folderApps.length === 0 && (
                      <div style={styles.emptyFolder}>Empty</div>
                    )}
                  </div>
                  <span style={styles.appName}>{folder.name}</span>
                  {folderApps.length > 0 && (
                    <span style={styles.folderBadge}>{folderApps.length}</span>
                  )}
                </div>
              );
            }
            
            if (slot.type === 'app') {
              const app = slot.data;
              const isSelected = selectedApps.includes(app.id);
              const isDragging = draggedApp?.id === app.id;
              return (
                <div 
                  key={app.id} 
                  style={{
                    ...styles.appWrapper,
                    opacity: isDragging ? 0.4 : 1,
                    cursor: jiggleMode ? 'grab' : 'pointer',
                  }}
                  draggable={jiggleMode}
                  onDragStart={(e) => handleDragStart(e, app)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onClick={() => jiggleMode && toggleAppSelection(app.id)}
                >
                  {/* Glowing grid outline in edit mode */}
                  {jiggleMode && (
                    <div style={{
                      ...styles.glowingOutline,
                      borderColor: isDropTarget ? 'rgba(48, 209, 88, 0.8)' : undefined,
                      boxShadow: isDropTarget ? '0 0 20px rgba(48, 209, 88, 0.6)' : undefined,
                    }} />
                  )}
                  <div 
                    style={{
                      ...styles.appIcon,
                      background: app.color,
                      animation: jiggleMode && !isDragging ? `jiggle 0.2s ease-in-out ${app.id * 0.05}s infinite alternate` : 'none',
                      boxShadow: isSelected 
                        ? '0 0 0 3px #30D158, 0 4px 12px rgba(0,0,0,0.3)' 
                        : '0 4px 12px rgba(0,0,0,0.2)',
                    }}
                  >
                    <span style={styles.appEmoji}>{app.icon}</span>
                  </div>
                  <span style={styles.appName}>{app.name}</span>
                </div>
              );
            }
            
            // Empty slot
            return (
              <div 
                key={`empty-${slot.position}`} 
                style={styles.appWrapper}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
              >
                {jiggleMode && (
                  <div style={{
                    ...styles.glowingOutline,
                    borderColor: isDropTarget ? 'rgba(48, 209, 88, 0.8)' : undefined,
                    boxShadow: isDropTarget ? '0 0 20px rgba(48, 209, 88, 0.6)' : undefined,
                  }} />
                )}
                <div style={{
                  ...styles.emptySlot,
                  background: isDropTarget ? 'rgba(48, 209, 88, 0.15)' : undefined,
                  borderRadius: '13px',
                  transition: 'background 0.15s ease',
                }} />
              </div>
            );
          })}
        </div>

        {/* Move To Button - peeks from volume up button location */}
        {jiggleMode && (
          <div 
            style={{
              ...styles.moveButtonTab,
              opacity: selectedApps.length > 0 ? 1 : 0.3,
              cursor: selectedApps.length > 0 ? 'pointer' : 'default',
            }}
            onClick={() => {
              if (selectedApps.length > 0) {
                setShowActionSheet(true);
              }
            }}
          >
            <span style={styles.moveButtonText}>MOVE</span>
          </div>
        )}

        {/* Snap to Grid Button - volume down button location */}
        {jiggleMode && (
          <div 
            style={{
              ...styles.snapButtonTab,
              opacity: isAlreadySnapped() ? 0.3 : 1,
              cursor: isAlreadySnapped() ? 'default' : 'pointer',
              padding: 0,
              overflow: 'hidden',
            }}
            onClick={() => !isAlreadySnapped() && snapToGrid()}
          >
            <svg 
              width="18" 
              height="55" 
              viewBox="0 0 18 55"
              style={{ display: 'block' }}
            >
              {/* Vertical lines */}
              <line x1="4.5" y1="0" x2="4.5" y2="55" stroke="white" strokeWidth="1" opacity="0.9" />
              <line x1="9" y1="0" x2="9" y2="55" stroke="white" strokeWidth="1" opacity="0.9" />
              <line x1="13.5" y1="0" x2="13.5" y2="55" stroke="white" strokeWidth="1" opacity="0.9" />
              {/* Horizontal lines */}
              <line x1="0" y1="9.2" x2="18" y2="9.2" stroke="white" strokeWidth="1" opacity="0.9" />
              <line x1="0" y1="18.3" x2="18" y2="18.3" stroke="white" strokeWidth="1" opacity="0.9" />
              <line x1="0" y1="27.5" x2="18" y2="27.5" stroke="white" strokeWidth="1" opacity="0.9" />
              <line x1="0" y1="36.7" x2="18" y2="36.7" stroke="white" strokeWidth="1" opacity="0.9" />
              <line x1="0" y1="45.8" x2="18" y2="45.8" stroke="white" strokeWidth="1" opacity="0.9" />
            </svg>
          </div>
        )}
      </div>

      {/* Dock */}
      <div style={styles.dock}>
        {getDockApps().map((app, i) => {
          const dockPosition = DOCK_START + i;
          const isDropTarget = dragOverSlot === dockPosition && draggedApp;
          const isDragging = app && draggedApp?.id === app.id;
          
          if (app) {
            return (
              <div 
                key={app.id} 
                style={{
                  ...styles.dockAppWrapper,
                  opacity: isDragging ? 0.4 : 1,
                }}
                draggable={jiggleMode}
                onDragStart={(e) => handleDragStart(e, app)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, dockPosition)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, dockPosition)}
              >
                {jiggleMode && (
                  <div style={{
                    ...styles.dockGlowingOutline,
                    borderColor: isDropTarget ? 'rgba(48, 209, 88, 0.8)' : undefined,
                    boxShadow: isDropTarget ? '0 0 20px rgba(48, 209, 88, 0.6)' : undefined,
                  }} />
                )}
                <div 
                  style={{
                    ...styles.dockIcon,
                    background: app.color,
                    animation: jiggleMode && !isDragging ? 'jiggle 0.2s ease-in-out infinite alternate' : 'none',
                  }}
                >
                  <span style={{fontSize: '28px'}}>{app.icon}</span>
                </div>
              </div>
            );
          } else {
            // Empty dock slot
            return (
              <div 
                key={`dock-empty-${i}`}
                style={styles.dockAppWrapper}
                onDragOver={(e) => handleDragOver(e, dockPosition)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, dockPosition)}
              >
                {jiggleMode && (
                  <div style={{
                    ...styles.dockGlowingOutline,
                    borderColor: isDropTarget ? 'rgba(48, 209, 88, 0.8)' : undefined,
                    boxShadow: isDropTarget ? '0 0 20px rgba(48, 209, 88, 0.6)' : undefined,
                  }} />
                )}
                <div style={{
                  ...styles.dockEmptySlot,
                  background: isDropTarget ? 'rgba(48, 209, 88, 0.15)' : undefined,
                }} />
              </div>
            );
          }
        })}
      </div>

      {/* Home Indicator */}
      <div style={styles.homeIndicator} />

      {/* Expanded Folder Overlay */}
      {openFolder && (
        <div 
          style={{
            ...styles.folderOverlay,
            pointerEvents: draggedApp ? 'none' : 'auto',
          }}
          onClick={() => {
            setOpenFolder(null);
            setSelectedFolderApps([]);
          }}
        >
          <div 
            style={{
              ...styles.expandedFolder,
              pointerEvents: draggedApp ? 'none' : 'auto',
            }}
            onClick={e => e.stopPropagation()}
            onContextMenu={(e) => { 
              e.preventDefault(); 
              if (!jiggleMode) {
                setJiggleMode(true);
              }
            }}
          >
            <div style={styles.expandedFolderHeader}>
              <span style={styles.expandedFolderName}>
                {folders.find(f => f.id === openFolder)?.name}
              </span>
              {jiggleMode && selectedFolderApps.length > 0 && (
                <div style={styles.selectedCount}>
                  {selectedFolderApps.length} selected
                </div>
              )}
            </div>
            <div style={styles.expandedFolderGrid}>
              {getAppsInFolder(openFolder).map(app => {
                const isSelected = selectedFolderApps.includes(app.id);
                const isDragging = draggedApp?.id === app.id;
                return (
                  <div 
                    key={app.id} 
                    style={{
                      ...styles.expandedAppWrapper,
                      cursor: jiggleMode ? 'grab' : 'default',
                      opacity: isDragging ? 0.4 : 1,
                      pointerEvents: 'auto',
                    }}
                    draggable={jiggleMode}
                    onDragStart={(e) => {
                      handleDragStart(e, app);
                    }}
                    onDragEnd={() => {
                      handleDragEnd();
                    }}
                    onClick={() => jiggleMode && !draggedApp && toggleFolderAppSelection(app.id)}
                    onContextMenu={(e) => { 
                      e.preventDefault();
                      e.stopPropagation();
                      if (!jiggleMode) {
                        setJiggleMode(true);
                      }
                    }}
                  >
                    {jiggleMode && (
                      <div style={{
                        ...styles.folderAppOutline,
                        borderColor: isSelected ? 'rgba(48, 209, 88, 0.8)' : 'rgba(255, 255, 255, 0.35)',
                        boxShadow: isSelected ? '0 0 15px rgba(48, 209, 88, 0.5)' : '0 0 12px rgba(255, 255, 255, 0.2)',
                      }} />
                    )}
                    <div 
                      style={{
                        ...styles.appIcon,
                        background: app.color,
                        animation: jiggleMode && !isDragging ? 'jiggle 0.2s ease-in-out infinite alternate' : 'none',
                      }}
                    >
                      <span style={styles.appEmoji}>{app.icon}</span>
                    </div>
                    <span style={styles.expandedAppName}>{app.name}</span>
                  </div>
                );
              })}
              {getAppsInFolder(openFolder).length === 0 && (
                <div style={styles.emptyFolderMessage}>No apps in this folder</div>
              )}
            </div>
            
            {/* Move Out Button */}
            {jiggleMode && selectedFolderApps.length > 0 && (
              <button 
                style={styles.moveOutButton}
                onClick={moveAppsOutOfFolder}
              >
                Move to Home Screen
              </button>
            )}
          </div>
        </div>
      )}

      {/* Action Sheet Overlay */}
      {showActionSheet && (
        <div 
          style={styles.overlay}
          onClick={() => {
            setShowActionSheet(false);
            setShowNewFolderInput(false);
            setNewFolderName('');
          }}
        >
          <div 
            style={styles.actionSheet}
            onClick={e => e.stopPropagation()}
          >
            <div style={styles.actionSheetHeader}>
              <span style={styles.actionSheetTitle}>
                Move {selectedApps.length} App{selectedApps.length > 1 ? 's' : ''} to Folder
              </span>
            </div>
            
            <div style={styles.folderList}>
              {folders.map(folder => (
                <button
                  key={folder.id}
                  style={styles.folderOption}
                  onClick={() => moveAppsToFolder(folder.id)}
                >
                  <div style={{...styles.folderOptionIcon, background: folder.color}}>
                    <span style={{fontSize: '16px'}}>📁</span>
                  </div>
                  <span style={styles.folderOptionName}>{folder.name}</span>
                  <span style={styles.folderOptionCount}>
                    {getAppsInFolder(folder.id).length} apps
                  </span>
                  <span style={styles.chevron}>›</span>
                </button>
              ))}
              
              {/* New Folder Option */}
              {!showNewFolderInput ? (
                <button
                  style={{...styles.folderOption, ...styles.newFolderOption}}
                  onClick={() => setShowNewFolderInput(true)}
                >
                  <div style={styles.newFolderIcon}>
                    <span style={{fontSize: '18px'}}>+</span>
                  </div>
                  <span style={styles.folderOptionName}>New Folder...</span>
                </button>
              ) : (
                <div style={styles.newFolderInputWrapper}>
                  <input
                    type="text"
                    placeholder="Folder name"
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && createNewFolder()}
                    style={styles.newFolderInput}
                    autoFocus
                  />
                  <button 
                    style={styles.createFolderBtn}
                    onClick={createNewFolder}
                  >
                    Create
                  </button>
                </div>
              )}
            </div>

            <button 
              style={styles.cancelButton}
              onClick={() => {
                setShowActionSheet(false);
                setShowNewFolderInput(false);
                setNewFolderName('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div style={styles.notification}>
          {notification}
        </div>
      )}

      {/* Jiggle Animation */}
      <style>{`
        @keyframes jiggle {
          0% { transform: rotate(-1.25deg); }
          100% { transform: rotate(1.25deg); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes folderExpand {
          0% { 
            transform: scale(0.3);
            opacity: 0;
          }
          100% { 
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes toastIn {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInFromRight {
          0% { transform: translateX(60px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInFromLeft {
          0% { transform: translateX(-60px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes bubblePulse {
          0%, 100% { transform: scaleX(1); }
          3% { transform: scaleX(2.2); }
          6% { transform: scaleX(1.2); }
          8% { transform: scaleX(1.8); }
          12% { transform: scaleX(1); }
        }
        @keyframes glowPulse {
          0%, 100% { 
            border-color: rgba(255, 255, 255, 0.25);
            box-shadow: 0 0 6px rgba(255, 255, 255, 0.15), inset 0 0 6px rgba(255, 255, 255, 0.05);
          }
          50% { 
            border-color: rgba(255, 255, 255, 0.5);
            box-shadow: 0 0 14px rgba(255, 255, 255, 0.4), inset 0 0 10px rgba(255, 255, 255, 0.1);
          }
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    width: '390px',
    height: '844px',
    margin: '0 auto',
    background: 'linear-gradient(145deg, #1a1a2e 0%, #0d1b2a 30%, #1b263b 60%, #415a77 100%)',
    borderRadius: '47px',
    overflow: 'hidden',
    position: 'relative',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif',
    boxShadow: '0 25px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.05)',
    userSelect: 'none',
  },
  statusBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 28px 8px',
    color: 'white',
    position: 'relative',
  },
  time: {
    fontWeight: '600',
    fontSize: '15px',
  },
  statusIcons: {
    display: 'flex',
    gap: '4px',
    fontSize: '14px',
  },
  instructionBanner: {
    background: 'rgba(255,255,255,0.12)',
    backdropFilter: 'blur(10px)',
    margin: '0 16px 8px',
    padding: '12px 16px',
    borderRadius: '14px',
    textAlign: 'center',
  },
  instructionTitle: {
    color: 'white',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '4px',
  },
  instructionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '12px',
  },
  homeScreen: {
    padding: '8px 20px',
    height: 'calc(100% - 200px)',
    position: 'relative',
  },
  appGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gridTemplateRows: 'repeat(7, 85px)',
    gap: '8px 12px',
    justifyItems: 'center',
    alignItems: 'start',
  },
  appWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    position: 'relative',
    minHeight: '85px',
  },
  glowingOutline: {
    position: 'absolute',
    top: '-4px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '68px',
    height: '68px',
    borderRadius: '17px',
    border: '1px solid rgba(255, 255, 255, 0.35)',
    boxShadow: '0 0 12px rgba(255, 255, 255, 0.2), inset 0 0 8px rgba(255, 255, 255, 0.05)',
    pointerEvents: 'none',
    animation: 'glowPulse 2s ease-in-out infinite',
  },
  emptySlot: {
    width: '60px',
    height: '60px',
    borderRadius: '13px',
  },
  appIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '13px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    boxShadow: '0 4px 12px rgba(0,0,0,0.25), inset 0 1px 1px rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  appEmoji: {
    fontSize: '30px',
  },
  appName: {
    color: 'white',
    fontSize: '11px',
    textAlign: 'center',
    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
    maxWidth: '70px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  plusSign: {
    position: 'absolute',
    bottom: '-6px',
    right: '-6px',
    width: '24px',
    height: '24px',
    background: '#30D158',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '18px',
    fontWeight: 'bold',
    border: '2.5px solid white',
    boxShadow: '0 2px 8px rgba(48,209,88,0.4)',
    cursor: 'pointer',
  },
  deleteButton: {
    position: 'absolute',
    top: '-6px',
    left: '-6px',
    width: '20px',
    height: '20px',
    background: 'rgba(60,60,60,0.9)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '16px',
    fontWeight: 'bold',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  folderIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '13px',
    background: 'rgba(255,255,255,0.18)',
    backdropFilter: 'blur(25px)',
    WebkitBackdropFilter: 'blur(25px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.4), inset 0 -1px 1px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    border: '0.5px solid rgba(255,255,255,0.2)',
  },
  folderGrid: {
    display: 'grid',
    gridTemplateColumns: '14px 14px 14px',
    gridTemplateRows: '14px 14px 14px',
    gap: '2px',
  },
  miniAppIcon: {
    width: '14px',
    height: '14px',
    borderRadius: '3px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
  },
  miniAppEmoji: {
    fontSize: '8px',
  },
  emptyFolder: {
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '9px',
    width: '100%',
    height: '100%',
  },
  folderBadge: {
    position: 'absolute',
    top: '-2px',
    right: '4px',
    background: '#FF3B30',
    color: 'white',
    fontSize: '10px',
    fontWeight: '600',
    padding: '1px 5px',
    borderRadius: '10px',
    minWidth: '16px',
    textAlign: 'center',
  },
  moveButtonTab: {
    position: 'absolute',
    left: '0px',
    top: '140px',
    width: '18px',
    height: '55px',
    background: '#007AFF',
    borderRadius: '0 8px 8px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '2px 0 8px rgba(0,122,255,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
    zIndex: 100,
    pointerEvents: 'auto',
    border: '0.5px solid rgba(255,255,255,0.2)',
    borderLeft: 'none',
  },
  moveButtonInner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.2s ease',
  },
  moveButtonIcon: {
    color: 'white',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  moveButtonText: {
    color: 'white',
    fontSize: '7px',
    fontWeight: '600',
    writingMode: 'vertical-rl',
    textOrientation: 'mixed',
    letterSpacing: '0.5px',
  },
  snapButtonTab: {
    position: 'absolute',
    left: '0px',
    top: '205px',
    width: '18px',
    height: '55px',
    background: '#007AFF',
    borderRadius: '0 8px 8px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '2px 0 8px rgba(0,122,255,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
    zIndex: 100,
    pointerEvents: 'auto',
    border: '0.5px solid rgba(255,255,255,0.2)',
    borderLeft: 'none',
  },
  snapButtonIcon: {
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  doneButton: {
    position: 'absolute',
    top: '50%',
    right: '16px',
    transform: 'translateY(-50%)',
    background: 'rgba(255,255,255,0.18)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    color: 'white',
    border: '0.5px solid rgba(255,255,255,0.2)',
    padding: '8px 16px',
    borderRadius: '16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)',
  },
  dock: {
    position: 'absolute',
    bottom: '30px',
    left: '16px',
    right: '16px',
    height: '84px',
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(40px)',
    WebkitBackdropFilter: 'blur(40px)',
    borderRadius: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: '0 20px',
    boxShadow: '0 4px 30px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -1px 1px rgba(0,0,0,0.05)',
    border: '0.5px solid rgba(255,255,255,0.2)',
  },
  dockIcon: {
    width: '54px',
    height: '54px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.25), inset 0 1px 1px rgba(255,255,255,0.3)',
  },
  dockAppWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  dockGlowingOutline: {
    position: 'absolute',
    width: '62px',
    height: '62px',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.35)',
    boxShadow: '0 0 12px rgba(255, 255, 255, 0.2), inset 0 0 8px rgba(255, 255, 255, 0.05)',
    pointerEvents: 'none',
    animation: 'glowPulse 2s ease-in-out infinite',
  },
  dockEmptySlot: {
    width: '54px',
    height: '54px',
    borderRadius: '12px',
    transition: 'background 0.15s ease',
  },
  homeIndicator: {
    position: 'absolute',
    bottom: '8px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '134px',
    height: '5px',
    background: 'white',
    borderRadius: '3px',
    opacity: 0.6,
  },
  folderOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    animation: 'fadeIn 0.2s ease',
    zIndex: 150,
  },
  expandedFolder: {
    width: '100%',
    maxWidth: '340px',
    background: 'rgba(120,120,130,0.35)',
    backdropFilter: 'blur(50px)',
    WebkitBackdropFilter: 'blur(50px)',
    borderRadius: '28px',
    padding: '24px',
    animation: 'folderExpand 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    maxHeight: '70%',
    overflow: 'hidden',
    boxShadow: '0 8px 40px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.4), inset 0 -1px 1px rgba(0,0,0,0.1)',
    border: '0.5px solid rgba(255,255,255,0.25)',
  },
  expandedFolderHeader: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  expandedFolderName: {
    color: 'white',
    fontSize: '22px',
    fontWeight: '600',
  },
  expandedFolderGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    justifyItems: 'center',
    overflowY: 'auto',
    overflowX: 'hidden',
    maxHeight: '400px',
    padding: '4px',
  },
  expandedAppWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    position: 'relative',
  },
  expandedAppName: {
    color: 'white',
    fontSize: '11px',
    textAlign: 'center',
    maxWidth: '65px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  folderAppOutline: {
    position: 'absolute',
    top: '-4px',
    width: '68px',
    height: '68px',
    borderRadius: '17px',
    border: '1px solid rgba(255, 255, 255, 0.35)',
    boxShadow: '0 0 12px rgba(255, 255, 255, 0.2)',
    pointerEvents: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  },
  selectedCount: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '13px',
    marginTop: '4px',
  },
  moveOutButton: {
    width: '100%',
    marginTop: '20px',
    padding: '14px',
    background: '#007AFF',
    border: 'none',
    borderRadius: '12px',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,122,255,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
  },
  emptyFolderMessage: {
    gridColumn: '1 / -1',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '14px',
    textAlign: 'center',
    padding: '40px 0',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: '20px',
    animation: 'fadeIn 0.2s ease',
    zIndex: 100,
  },
  actionSheet: {
    width: '100%',
    background: 'rgba(60,60,65,0.85)',
    backdropFilter: 'blur(50px)',
    WebkitBackdropFilter: 'blur(50px)',
    borderRadius: '14px',
    overflow: 'hidden',
    animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    marginBottom: '10px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
    border: '0.5px solid rgba(255,255,255,0.15)',
  },
  actionSheetHeader: {
    padding: '18px 20px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  actionSheetTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '13px',
    textAlign: 'center',
    display: 'block',
  },
  folderList: {
    maxHeight: '280px',
    overflowY: 'auto',
  },
  folderOption: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 20px',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.15s ease',
  },
  folderOptionIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderOptionName: {
    color: 'white',
    fontSize: '17px',
    flex: 1,
  },
  folderOptionCount: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '14px',
  },
  chevron: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '20px',
    fontWeight: '300',
  },
  newFolderOption: {
    borderBottom: 'none',
  },
  newFolderIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#007AFF',
    fontWeight: '300',
  },
  newFolderInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 20px 14px',
  },
  newFolderInput: {
    flex: 1,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '10px',
    padding: '12px 16px',
    color: 'white',
    fontSize: '16px',
    outline: 'none',
  },
  createFolderBtn: {
    background: '#007AFF',
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  cancelButton: {
    width: '100%',
    padding: '18px',
    background: 'rgba(255,255,255,0.08)',
    border: 'none',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    color: '#007AFF',
    fontSize: '18px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  notification: {
    position: 'absolute',
    top: '100px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(60,60,65,0.85)',
    backdropFilter: 'blur(30px)',
    WebkitBackdropFilter: 'blur(30px)',
    color: 'white',
    padding: '14px 24px',
    borderRadius: '14px',
    fontSize: '14px',
    fontWeight: '500',
    boxShadow: '0 8px 30px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15)',
    border: '0.5px solid rgba(255,255,255,0.15)',
    animation: 'toastIn 0.3s ease',
    zIndex: 200,
  },
};

export default IOSHomeScreenDemo;
