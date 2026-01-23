# 🏗️ Architecture Documentation

## 1. High-Level Data Flow

The application follows a **Client-Server-Client** broadcast model using WebSockets.

![High-Level Data Flow](.\src\assets\canvus-dataflow-diagram.png)

## 2. WebSocket Protocol (Socket.io)

We define a minimal set of events to keep overhead low.

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `join_room` | Client → Server | `{ name, color }` | User identifying themselves. |
| `load_canvas` | Server → Client | `Array<Line>` | Sent to a new user immediately upon connection. Contains full history. |
| `draw_line` | Bidirectional | `{ points: [{x,y}...], color, width }` | A completed stroke or chunk of points. `broadcast` to others. |
| `undo` | Client → Server | `null` | Request to undo the last action. |
| `redo` | Client → Server | `null` | Request to redo the last undone action. |
| `redraw_canvas` | Server → Client | `Array<Line>` | Sent after an Undo/Redo/Clear to force clients to repaint the whole state. |
| `update_users` | Server → Client | `Array<User>` | List of currently connected users for the UI counter. |
| `drawing_move` | Bidirectional | `{ from, to, color, width }` | Transient real-time stroke segment. Broadcast to others for immediate visual feedback. |
| `cursor_move` | Bidirectional | `{ x, y, name, color }` | Real-time cursor position for presence. Broadcast to others. |

## 3. Undo/Redo Strategy (Global State)

Unlike local-only drawing apps, **Undo/Redo must be global** in a collaborative setting to maintain a "Single Source of Truth."

*   **The Problem**: If User A undos, should it remove *their* last line, or the *global* last line?
*   **Our Decision**: **Global History Stack**.
    *   The server maintains a main `lineHistory` array and a `redoStack` array.
    *   **Undo**: Pops the last item from `lineHistory` and pushes it to `redoStack`. Triggers a `redraw_canvas` event to ALL users.
    *   **Redo**: Checks `redoStack`, pops, pushes back to `lineHistory`. Triggers `redraw_canvas`.
    *   **New Draw**: If a new line is drawn, the `redoStack` is **cleared** (standard behavior to avoid branching history).

## 4. Conflict Resolution & Concurrency

*   **Strategy**: **Last-Write-Wins (LWW)** / **Naive Broadcast**.
*   **Rationale**: For a creative drawing app, strict transactional integrity (locking the canvas) destroys the user experience.
*   We allow all users to emit points simultaneously.
*   The server simply appends them to the history in the order they arrive.
*   Since the Canvas API is raster-based, overlapping lines just "paint over" each other, naturally resolving conflicts without complex CRDTs (Conflict-free Replicated Data Types), which would be overkill for this scope.

## 5. Performance Decisions

### In-Memory Storage
We chose **JS Map** and **Arrays** in Node.js memory instead of a database (MongoDB).
*   **Pros**: Extremely fast read/write (Microsecond latency). No DB bottleneck for high-frequency drawing events.
*   **Cons**: Volatile (Server restart = Data loss).

### Batching vs. Streaming
*   We emit `draw_line` generally on `mouseup` (stroke completion) or in larger chunks, rather than emitting every single `mousemove` pixel.
*   **Benefit**: drastically reduces network packet overhead.
*   **Client-Side Smoothing**: We use **Quadratic Curve** interpolation (`ctx.quadraticCurveTo`) on the client. This allows us to send fewer coordinate points over the network while still rendering smooth, round curves locally.
*   **Real-time Previews**: To ensure responsiveness, we now also emit `drawing_move` events for the *current* stroke being drawn. This allows other users to see the stroke progress in real-time, even before it's "committed" to the history. These real-time segments are transient visuals.

## 6. Cursor Tracking
*   **Real-time Presence**: We broadcast cursor positions (`cursor_move`) to create a sense of presence.
*   **Visuals**: Remote cursors are rendered as a purely visual layer on top of the canvas, with the user's name and color. The DOM updates are smoothed with CSS transitions.
