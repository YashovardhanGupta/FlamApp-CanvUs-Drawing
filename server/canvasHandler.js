// server/canvasHandler.js
const drawingStore = require('./drawingStore');

// In-memory user store for this server instance
// Map<socketId, {id, name, color}>
const users = new Map();

module.exports = (io, socket) => {
  // 1. Send existing board to new user
  const history = drawingStore.getHistory();
  socket.emit('load_canvas', history);

  // Handle Join Room (Track User)
  socket.on('join_room', ({ name, color }) => {
    const user = { id: socket.id, name, color };
    users.set(socket.id, user);

    // Broadcast list to everyone
    io.emit('update_users', Array.from(users.values()));

    // Notify others (toast)
    socket.broadcast.emit('user_joined', name);
  });

  // 2. Handle new line
  socket.on('draw_line', (data) => {
    // data = { points: [{x,y}, {x,y}], color, width }
    drawingStore.addLine(data);

    // Broadcast ONLY the new line to others (efficient)
    socket.broadcast.emit('draw_line', data);
  });

  // 3. Handle Undo
  socket.on('undo', () => {
    const newHistory = drawingStore.undo();
    if (newHistory) {
      // Undo is hard to patch, easiest is to redraw whole board
      io.emit('redraw_canvas', newHistory);
    }
  });

  // 4. Handle Redo
  socket.on('redo', () => {
    const newHistory = drawingStore.redo();
    if (newHistory) {
      io.emit('redraw_canvas', newHistory);
    }
  });

  // 5. Clear
  socket.on('clear', () => {
    drawingStore.clear();
    io.emit('clear_canvas');
  })

  // 6. Handle Disconnect
  socket.on('disconnect', () => {
    users.delete(socket.id);
    io.emit('update_users', Array.from(users.values()));
  });
};