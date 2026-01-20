const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const canvasHandler = require('./canvasHandler');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // Allow connections from any frontend (simpler for dev)
    methods: ["GET", "POST"],
  },
});

io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);
  canvasHandler(io, socket);
});

server.listen(3001, () => {
  console.log("SERVER RUNNING ON PORT 3001");
});