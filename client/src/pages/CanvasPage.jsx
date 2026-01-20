import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import { Brush, Eraser, Undo, Redo, Trash2, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast'; // Import toast

const socket = io.connect("http://localhost:3001");

const CanvasPage = () => {
  const location = useLocation();
  const { name, color } = location.state || { name: 'Guest', color: '#000' };

  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('brush');
  const [users, setUsers] = useState([]);

  // Tool Properties State
  const [brushColor, setBrushColor] = useState(color);
  const [brushSize, setBrushSize] = useState(5);
  const [eraserSize, setEraserSize] = useState(20);

  // Menu State
  const [activeMenu, setActiveMenu] = useState(null); // 'brush' or 'eraser'

  const currentStroke = useRef([]);

  useEffect(() => {
    // Initialize brush color to the user's chosen glow color if they haven't picked one
    setBrushColor(color);
  }, [color]);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth * 0.96;
    canvas.height = window.innerHeight * 0.92;

    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;

    socket.emit('join_room', { name, color });

    // --- Listeners with Toasts ---

    socket.on('update_users', (userList) => {
      setUsers(userList);
    });

    socket.on('user_joined', (userName) => {
      // Notify when someone else joins
      toast(`${userName} joined the session`, {
        icon: '👋',
        style: { borderRadius: '10px', background: '#333', color: '#fff' },
      });
    });

    socket.on('load_canvas', (history) => {
      history.forEach(line => drawLineOnCanvas(ctx, line));
      toast.success('Canvas loaded!');
    });

    socket.on('draw_line', (line) => drawLineOnCanvas(ctx, line));

    socket.on('redraw_canvas', (history) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      history.forEach(line => drawLineOnCanvas(ctx, line));
    });

    socket.on('clear_canvas', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      toast('Canvas wiped clean!', { icon: '🧹' });
    });

    return () => {
      socket.off('load_canvas');
      socket.off('draw_line');
      socket.off('redraw_canvas');
      socket.off('clear_canvas');
      socket.off('user_joined');
      socket.off('update_users');
    };
  }, []);

  // --- Drawing Logic (Same as before) ---
  const drawLineOnCanvas = (ctx, lineData) => {
    const { points, color, width } = lineData;
    if (points.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 2; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    if (points.length > 2) {
      ctx.quadraticCurveTo(points[points.length - 2].x, points[points.length - 2].y, points[points.length - 1].x, points[points.length - 1].y);
    }
    ctx.stroke();
  };

  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    setIsDrawing(true);
    currentStroke.current = [{ x: offsetX, y: offsetY }];
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(offsetX, offsetY);
    // Use dynamic state
    ctxRef.current.strokeStyle = tool === 'eraser' ? '#ffffff' : brushColor;
    ctxRef.current.lineWidth = tool === 'eraser' ? eraserSize : brushSize;
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    ctxRef.current.lineTo(offsetX, offsetY);
    ctxRef.current.stroke();
    currentStroke.current.push({ x: offsetX, y: offsetY });
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    ctxRef.current.closePath();
    if (currentStroke.current.length > 0) {
      socket.emit('draw_line', {
        points: currentStroke.current,
        color: tool === 'eraser' ? '#ffffff' : brushColor,
        width: tool === 'eraser' ? eraserSize : brushSize
      });
    }
    currentStroke.current = [];
  };

  // Helper for buttons to give feedback
  const handleAction = (action) => {
    socket.emit(action);
  }

  const toggleMenu = (menuName) => {
    if (activeMenu === menuName) {
      setActiveMenu(null);
    } else {
      setActiveMenu(menuName);
    }
  };

  const selectTool = (toolName) => {
    setTool(toolName);
    // Optional: Open menu automatically when selecting? 
    // User requested "If i press the brush tool i will have options". 
    // Let's toggle it or keep it separate. The prompt says "With a ^ clearly indicate that if i press the brush tool i will have options". 
    // I'll make the button trigger selection, and the user can click again to toggle, or click a caret area. 
    // For simplicity, clicking the button sets tool. If already active, it toggles menu.
    if (tool === toolName) {
      toggleMenu(toolName);
    } else {
      setTool(toolName);
      toast.success(`${toolName.charAt(0).toUpperCase() + toolName.slice(1)} Active`);
    }
  };

  // Sort users: Me first, then others
  const sortedUsers = [
    ...users.filter(u => u.name === name),
    ...users.filter(u => u.name !== name)
  ].slice(0, 5); // Max 5

  const colors = [
    '#000000', '#ef4444', '#22c55e', '#3b82f6', '#eab308',
    '#a855f7', '#ec4899', '#f97316', '#06b6d4', '#64748b'
  ];

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="watermark" style={{ zIndex: 5 }}>CANVUS</div>
      {/* <div style={{ position: 'absolute', top: 80, left: 30, color: color, fontWeight: 'bold', zIndex: 5 }}>
        User: {name}
      </div> */}

      {/* Board Container */}
      <div style={{
        position: 'relative',
        width: '96vw',
        height: '92vh',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}>

        {/* Active Users Board */}
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '25px',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '8px'
        }}>
          {sortedUsers.map((user, index) => (
            <div key={index} style={{
              padding: '6px 14px',
              borderRadius: '20px',
              backgroundColor: 'rgba(230, 230, 230, 0.4)',
              backdropFilter: 'blur(4px)',
              color: user.color,
              fontWeight: 'bold',
              fontSize: '0.9rem',
              border: '1px solid rgba(0,0,0,0.05)',
              maxWidth: '150px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {user.name} {user.name === name ? '(You)' : ''}
            </div>
          ))}
        </div>

        {/* Left Toolbar */}
        <div className="toolbar" style={{
          position: 'absolute',
          top: '50%',
          left: '20px',
          transform: 'translateY(-50%)',
          padding: '16px 8px',
          flexDirection: 'column',
          zIndex: 10
        }}>
          <button onClick={() => handleAction('undo')} className="tool-btn"><Undo size={20} /></button>
          <button onClick={() => handleAction('redo')} className="tool-btn"><Redo size={20} /></button>

          <div style={{ width: '100%', height: '1px', backgroundColor: '#555', margin: '8px 0' }}></div>

          <button onClick={() => handleAction('clear')} className="tool-btn" style={{ color: '#ef4444' }}><Trash2 size={20} /></button>
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            borderRadius: '16px',
            cursor: 'crosshair'
          }}
        />

        {/* Bottom Toolbar */}
        <div className="toolbar" style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 24px',
          zIndex: 10,
          overflow: 'visible' // Allow menus to pop out
        }}>
          {/* Brush Tool */}
          <div style={{ position: 'relative' }}>
            {activeMenu === 'brush' && (
              <div style={{
                position: 'absolute',
                bottom: '120%',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#172554',
                padding: '12px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                minWidth: '140px'
              }}>
                <div style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>Size: {brushSize}px</div>
                <input
                  type="range" min="1" max="20"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                  {colors.map(c => (
                    <div key={c}
                      onClick={() => setBrushColor(c)}
                      style={{
                        width: '24px', height: '24px', borderRadius: '50%',
                        backgroundColor: c,
                        border: brushColor === c ? '2px solid white' : '1px solid rgba(255,255,255,0.2)',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}
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
              <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                <span>BRUSH</span> <ChevronUp size={12} style={{ marginLeft: '2px' }} />
              </div>
            </button>
          </div>

          {/* Eraser Tool */}
          <div style={{ position: 'relative' }}>
            {activeMenu === 'eraser' && (
              <div style={{
                position: 'absolute',
                bottom: '120%',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#172554',
                padding: '12px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                minWidth: '120px'
              }}>
                <div style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>Size: {eraserSize}px</div>
                <input
                  type="range" min="5" max="50"
                  value={eraserSize}
                  onChange={(e) => setEraserSize(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            )}
            <button
              onClick={() => selectTool('eraser')}
              className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
            >
              <Eraser size={24} />
              <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
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