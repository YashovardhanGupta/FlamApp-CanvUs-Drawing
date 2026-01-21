import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import { Brush, Eraser, Undo, Redo, Trash2, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import './CanvasPage.css'; // Importing our new CSS file

// Connect to the backend server
// In production, this URL would be your deployed server address
const socket = io.connect("http://localhost:3001");

const CanvasPage = () => {
  // 1. Get user details passed from the Landing Page
  const location = useLocation();
  const { name, color } = location.state || { name: 'Guest', color: '#000' };

  // 2. References (useRef) vs State (useState)
  // We use references for the Canvas and Context because we need direct access
  // to the DOM element without triggering re-renders every time we draw.
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const currentStroke = useRef([]); // Stores points for the line currently being drawn

  // 3. State Management
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('brush'); // 'brush' or 'eraser'
  const [users, setUsers] = useState([]);    // List of connected users

  // Tool Customization State
  const [brushColor, setBrushColor] = useState(color);
  const [brushSize, setBrushSize] = useState(5);
  const [eraserSize, setEraserSize] = useState(20);

  const [activeMenu, setActiveMenu] = useState(null); // Controls which popup menu is open

  // Set initial brush color when component loads
  useEffect(() => {
    setBrushColor(color);
  }, [color]);

  // 4. Setup Canvas & Socket Listeners
  // This useEffect runs once when the component mounts
  useEffect(() => {
    const canvas = canvasRef.current;

    // Set canvas resolution to match the visual "Board" size
    // We use window dimensions but scaled down slightly to fit our UI
    canvas.width = window.innerWidth * 0.96;
    canvas.height = window.innerHeight * 0.92;

    // Get the 2D drawing context (the "pen" we use to draw)
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';  // Makes lines start/end smoothly
    ctx.lineJoin = 'round'; // Makes corners smooth
    ctxRef.current = ctx;

    // Tell server we joined
    socket.emit('join_room', { name, color });

    // --- Socket Event Listeners ---

    // Update list of active users
    socket.on('update_users', (userList) => {
      setUsers(userList);
    });

    // Notify when a new user enters
    socket.on('user_joined', (userName) => {
      toast(`${userName} joined the session`, {
        icon: '👋',
        style: { borderRadius: '10px', background: '#333', color: '#fff' },
      });
    });

    // Receive the full drawing history when we first join
    socket.on('load_canvas', (history) => {
      history.forEach(line => drawLineOnCanvas(ctx, line));
      toast.success('Canvas loaded!');
    });

    // Receive a new line drawn by someone else
    socket.on('draw_line', (line) => drawLineOnCanvas(ctx, line));

    // Handle Undo/Redo commands from server
    socket.on('redraw_canvas', (history) => {
      // Clear entire board and re-draw everything from history
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      history.forEach(line => drawLineOnCanvas(ctx, line));
    });

    // Handle Clear command
    socket.on('clear_canvas', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      toast('Canvas wiped clean!', { icon: '🧹' });
    });

    // Cleanup: Remove listeners when leaving the page to avoid duplicates
    return () => {
      socket.off('load_canvas');
      socket.off('draw_line');
      socket.off('redraw_canvas');
      socket.off('clear_canvas');
      socket.off('user_joined');
      socket.off('update_users');
    };
  }, [name, color]); // Runs if name/color changes (rarely happens after mount)

  // 5. Drawing Helper Function
  // We use Quadratic Curves for smoother lines instead of jagged straight lines
  const drawLineOnCanvas = (ctx, lineData) => {
    const { points, color, width } = lineData;
    if (points.length < 2) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    // Smooth out the line by drawing curves between midpoints
    for (let i = 1; i < points.length - 2; i++) {
      const midPointX = (points[i].x + points[i + 1].x) / 2;
      const midPointY = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, midPointX, midPointY);
    }

    // Draw the last segment
    if (points.length > 2) {
      const last = points.length - 1;
      const secondLast = points.length - 2;
      ctx.quadraticCurveTo(points[secondLast].x, points[secondLast].y, points[last].x, points[last].y);
    }

    ctx.stroke();
  };

  // 6. Mouse Event Handlers (User actions)

  // Mouse Down: Start a new line
  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    setIsDrawing(true);

    // Initialize the line points array
    currentStroke.current = [{ x: offsetX, y: offsetY }];

    // Setup the visual "feedback" line (what YOU see immediately)
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(offsetX, offsetY);
    ctxRef.current.strokeStyle = tool === 'eraser' ? '#ffffff' : brushColor;
    ctxRef.current.lineWidth = tool === 'eraser' ? eraserSize : brushSize;
  };

  // Mouse Move: Continue drawing
  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;

    // Draw directly on canvas for real-time feedback
    ctxRef.current.lineTo(offsetX, offsetY);
    ctxRef.current.stroke();

    // Save points to send to server later
    currentStroke.current.push({ x: offsetX, y: offsetY });
  };

  // Mouse Up: Finish line & Send to Server
  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    ctxRef.current.closePath();

    // If we actually drew something, send it to everyone else
    if (currentStroke.current.length > 0) {
      socket.emit('draw_line', {
        points: currentStroke.current,
        color: tool === 'eraser' ? '#ffffff' : brushColor,
        width: tool === 'eraser' ? eraserSize : brushSize
      });
    }
    currentStroke.current = []; // Reset
  };

  // --- UI Helpers ---

  const handleAction = (action) => {
    socket.emit(action); // actions: undo, redo, clear
  }

  const toggleMenu = (menuName) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  const selectTool = (toolName) => {
    if (tool === toolName) {
      toggleMenu(toolName); // Toggle menu if already active
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

  // Expanded Color Palette (2 rows x 5 cols)
  const colors = [
    '#000000', '#ef4444', '#22c55e', '#3b82f6', '#eab308',
    '#a855f7', '#ec4899', '#f97316', '#06b6d4', '#64748b'
  ];

  // --- Render ---
  return (
    <div className="page-container">
      <div className="watermark">CANVUS</div>

      {/* The White Drawing Board */}
      <div className="board-container">

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