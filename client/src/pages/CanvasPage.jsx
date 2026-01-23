import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Brush, Eraser, Undo, Redo, Trash2, ChevronUp, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSocket } from '../hooks/useSocket';
import { useDraw } from '../hooks/useDraw';
import './CanvasPage.css';

const CanvasPage = () => {
  // 1. User Info
  const location = useLocation();
  const { name, color } = location.state || { name: 'Guest', color: '#000' };

  // 2. Custom Hooks (The key to simplified code!)
  const { socket, users } = useSocket(name, color);

  const {
    canvasRef,
    startDrawing, draw, stopDrawing,
    handleAction,
    tool, setTool,
    brushColor, setBrushColor,
    brushSize, setBrushSize,
    eraserSize, setEraserSize
  } = useDraw(socket, color);

  // 3. UI State
  const [activeMenu, setActiveMenu] = useState(null);
  const [cursors, setCursors] = useState({});

  // 4. Cursor Tracking
  React.useEffect(() => {
    // Listen for remote cursors
    socket.on('cursor_move', (data) => {
      // data = { x, y, name, color }
      setCursors(prev => ({
        ...prev,
        [data.name]: data
      }));
    });

    return () => {
      socket.off('cursor_move');
    };
  }, [socket]);

  const handleMouseMove = (e) => {
    // Emit strictly drawing-related moves is in useDraw, but for general cursor over board:
    // We only care if over the board for visuals
    const boardRect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - boardRect.left;
    const y = e.clientY - boardRect.top;

    socket.emit('cursor_move', { x, y, name, color });
  };

  // --- UI Helpers ---

  const toggleMenu = (menuName) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  const selectTool = (toolName) => {
    if (tool === toolName) {
      toggleMenu(toolName);
    } else {
      setTool(toolName);
      toast.success(`${toolName.charAt(0).toUpperCase() + toolName.slice(1)} Active`);
    }
  };

  // Sort users: Current user ("You") always first
  const sortedUsers = [
    ...users.filter(u => u.name === name),
    ...users.filter(u => u.name !== name)
  ].slice(0, 5);

  const colors = [
    '#000000', '#ef4444', '#22c55e', '#3b82f6', '#eab308',
    '#a855f7', '#ec4899', '#f97316', '#06b6d4', '#64748b'
  ];

  // --- Render ---
  return (
    <div className="page-container">
      <div className="watermark">CANVUS</div>

      {/* The White Drawing Board */}
      <div className="board-container" onMouseMove={handleMouseMove}>

        {/* Remote Cursors Layer */}
        {Object.values(cursors).filter(c => c.name !== name).map((cursor) => (
          <div key={cursor.name}
            style={{
              position: 'absolute',
              left: cursor.x,
              top: cursor.y,
              pointerEvents: 'none',
              zIndex: 50,
              transition: 'top 0.1s linear, left 0.1s linear' // Smooth movement
            }}
          >
            <Navigation
              size={20}
              fill={cursor.color}
              color={cursor.color}
              style={{ transform: 'rotate(270deg)' }}
            />
            <span style={{
              background: cursor.color,
              color: '#fff',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px',
              marginLeft: '4px',
              whiteSpace: 'nowrap'
            }}>
              {cursor.name}
            </span>
          </div>
        ))}

        {/* Active User List */}
        <div className="user-list">
          {sortedUsers.map((user, index) => (
            <div key={index} className="user-item" style={{ color: user.color }}>
              {user.name} {user.name === name ? '(You)' : ''}
            </div>
          ))}
        </div>

        {/* Left Toolbar (Undo/Redo) */}
        <div className="toolbar toolbar-left">
          <button onClick={() => handleAction('undo')} className="tool-btn"><Undo size={20} /></button>
          <button onClick={() => handleAction('redo')} className="tool-btn"><Redo size={20} /></button>
          <div className="divider"></div>
          <button onClick={() => handleAction('clear')} className="tool-btn" style={{ color: '#ef4444' }}>
            <Trash2 size={20} />
          </button>
        </div>

        {/* The Canvas */}
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="drawing-canvas"
        />

        {/* Bottom Toolbar (Tools) */}
        <div className="toolbar toolbar-bottom">

          {/* Brush Tool Wrapper */}
          <div className="tool-wrapper">
            {activeMenu === 'brush' && (
              <div className="tool-menu menu-brush">
                <div className="menu-label">Size: {brushSize}px</div>
                <input
                  type="range" min="1" max="20"
                  className="size-slider"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                />
                <div className="color-grid">
                  {colors.map(c => (
                    <div key={c}
                      onClick={() => setBrushColor(c)}
                      className={`color-swatch ${brushColor === c ? 'active' : 'inactive'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={() => selectTool('brush')}
              className={`tool-btn ${tool === 'brush' ? 'active' : ''}`}
            >
              <Brush size={24} />
              <div className="tool-btn-label">
                <span>BRUSH</span> <ChevronUp size={12} style={{ marginLeft: '2px' }} />
              </div>
            </button>
          </div>

          {/* Eraser Tool Wrapper */}
          <div className="tool-wrapper">
            {activeMenu === 'eraser' && (
              <div className="tool-menu menu-eraser">
                <div className="menu-label">Size: {eraserSize}px</div>
                <input
                  type="range" min="5" max="50"
                  className="size-slider"
                  value={eraserSize}
                  onChange={(e) => setEraserSize(parseInt(e.target.value))}
                />
              </div>
            )}
            <button
              onClick={() => selectTool('eraser')}
              className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
            >
              <Eraser size={24} />
              <div className="tool-btn-label">
                <span>ERASER</span> <ChevronUp size={12} style={{ marginLeft: '2px' }} />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CanvasPage;