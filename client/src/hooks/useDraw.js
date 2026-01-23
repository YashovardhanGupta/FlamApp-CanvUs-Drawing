import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

export const useDraw = (socket, initialColor) => {
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const currentStroke = useRef([]);

    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState('brush'); // 'brush' | 'eraser'

    // Customization State
    const [brushColor, setBrushColor] = useState(initialColor);
    const [brushSize, setBrushSize] = useState(5);
    const [eraserSize, setEraserSize] = useState(20);

    // Sync initial color if it changes
    useEffect(() => {
        setBrushColor(initialColor);
    }, [initialColor]);

    // Setup Canvas and Listeners
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Set resolution (High DPI support logic can go here if needed)
        canvas.width = window.innerWidth * 0.96;
        canvas.height = window.innerHeight * 0.92;

        const ctx = canvas.getContext('2d');
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctxRef.current = ctx;

        // --- Drawing Handlers for Socket Events ---

        const drawLine = (lineData) => {
            const { points, color, width } = lineData;
            if (!points || points.length < 2) return;

            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);

            // Quadratic Curve Smoothing
            for (let i = 1; i < points.length - 2; i++) {
                const midPointX = (points[i].x + points[i + 1].x) / 2;
                const midPointY = (points[i].y + points[i + 1].y) / 2;
                ctx.quadraticCurveTo(points[i].x, points[i].y, midPointX, midPointY);
            }

            if (points.length > 2) {
                const last = points.length - 1;
                const secondLast = points.length - 2;
                ctx.quadraticCurveTo(points[secondLast].x, points[secondLast].y, points[last].x, points[last].y);
            } else if (points.length === 2) {
                // For simple 2-point lines (real-time segments)
                ctx.lineTo(points[1].x, points[1].y);
            }
            ctx.stroke();
        };

        const handleLoadCanvas = (history) => {
            history.forEach(drawLine);
            toast.success('Canvas loaded!');
        };

        const handleDrawLine = (line) => {
            drawLine(line);
        };

        const handleRedraw = (history) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            history.forEach(drawLine);
        };

        const handleClear = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            toast('Canvas wiped clean!', { icon: '🧹' });
        };

        // Attach Listeners
        socket.on('load_canvas', handleLoadCanvas);
        socket.on('draw_line', handleDrawLine);
        socket.on('drawing_move', (data) => {
            // data = { from, to, color, width }
            const { from, to, color, width } = data;
            drawLine({ points: [from, to], color, width });
        });
        socket.on('redraw_canvas', handleRedraw);
        socket.on('clear_canvas', handleClear);

        return () => {
            socket.off('load_canvas', handleLoadCanvas);
            socket.off('draw_line', handleDrawLine);
            socket.off('redraw_canvas', handleRedraw);
            socket.off('clear_canvas', handleClear);
        };
    }, [socket]); // Re-run if socket instance changes (it shouldn't)

    // --- Interaction Logic ---

    const startDrawing = ({ nativeEvent }) => {
        const { offsetX, offsetY } = nativeEvent;
        setIsDrawing(true);
        currentStroke.current = [{ x: offsetX, y: offsetY }];

        ctxRef.current.beginPath();
        ctxRef.current.moveTo(offsetX, offsetY);
        ctxRef.current.strokeStyle = tool === 'eraser' ? '#ffffff' : brushColor;
        ctxRef.current.lineWidth = tool === 'eraser' ? eraserSize : brushSize;
    };

    const draw = ({ nativeEvent }) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = nativeEvent;

        // Draw locally
        ctxRef.current.lineTo(offsetX, offsetY);
        ctxRef.current.stroke();

        // Add to local history
        currentStroke.current.push({ x: offsetX, y: offsetY });

        // Stream points to others for real-time effect
        // We send the LAST point and the CURRENT point to draw a segment
        const points = currentStroke.current;
        if (points.length >= 2) {
            const lastPoint = points[points.length - 2];
            socket.emit('drawing_move', {
                from: lastPoint,
                to: { x: offsetX, y: offsetY },
                color: tool === 'eraser' ? '#ffffff' : brushColor,
                width: tool === 'eraser' ? eraserSize : brushSize
            });
        }
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

    const handleAction = (action) => {
        socket.emit(action);
    };

    return {
        canvasRef,
        startDrawing,
        draw,
        stopDrawing,
        handleAction,
        tool, setTool,
        brushColor, setBrushColor,
        brushSize, setBrushSize,
        eraserSize, setEraserSize
    };
};
