# CanvUs - Collaborative Drawing App
## Project Documentation & Interview Guide

This document is designed to help you understand every part of the generic "CanvUs" codebase. It covers the architecture, code logic, dependencies, and common interview questions you might face.

---

## 1. Project Architecture
The project is split into two main parts:
1.  **Client (Frontend)**: The User Interface. Written in **React.js**. It runs in the user's browser.
2.  **Server (Backend)**: The Logic Hub. Written in **Node.js** & **Express**. It runs on a computer/cloud and handles data synchronization.

**How they talk:**
They communicate using **WebSockets** (specifically `socket.io`). Unlike standard HTTP requests (which are like sending a letter and waiting for a reply), WebSockets are like a phone call—the connection stays open, allowing instant data transfer.

---

## 2. Dependencies (What we used & Why)

### Frontend (Client)
| Dependency | Why we used it? |
| :--- | :--- |
| **react** | The library to build the UI. Makes it easy to manage state (like selected tools). |
| **socket.io-client** | Connects to the backend to send/receive drawing data instantly. |
| **react-router-dom** | Handles navigation between the Landing Page and the Canvas Page. |
| **lucide-react** | Provides clean, modern icons (Brush, Eraser, Undo) without needing images. |
| **react-hot-toast** | Shows beautiful popup notifications (e.g., "User joined") with minimal code. |

### Backend (Server)
| Dependency | Why we used it? |
| :--- | :--- |
| **express** | A lightweight web server framework to handle initial connections. |
| **socket.io** | The engine that powers the real-time communication. |
| **nodemon** | A development tool that restarts the server automatically when we change code. |
| **cors** | Security middleware to allow our frontend (port 5173) to talk to our backend (port 3001). |

---

## 3. React Concepts Used (Hooks)

### `useState` (The Memory)
*   **What it does:** Remembers data that changes over time and updates the screen when it does.
*   **Where we used it:** `tool` (Brush/Eraser), `color` (Red/Blue), `users` (User List).
*   **Why:** When you click "Eraser", we call `setTool('eraser')`. React sees this change and re-renders the toolbar to show the eraser is active.

### `useEffect` (The Setup/Cleanup)
*   **What it does:** Runs code when the component "mounts" (appears) or when specific data changes.
*   **Where we used it:** Connecting to the socket when the page loads; setting up the canvas resolution.
*   **Why:** We only want to connect to the server *once* when the user enters the room, not every time they move the mouse.

### `useRef` (The Direct Access - *Important*)
*   **What it does:** Remembers data *without* triggering a re-render. It also gives direct access to HTML elements.
*   **Where we used it:** `canvasRef`, `ctxRef`, `currentStroke`.
*   **Why (Interview Question):** Why not use `useState` for mouse coordinates?
    *   **Answer:** Drawing fires hundreds of events per second. If we used `useState`, React would try to "re-render" the entire page hundreds of times a second, causing massive lag. `useRef` lets us draw directly to the canvas silently and efficiently.

### Custom Hooks (`useDraw`, `useSocket`)
*   **What acts:** These are functions we wrote to organize our code.
*   **Why:** Instead of a 400-line `CanvasPage.jsx`, we moved the logic out.
    *   `useSocket`: "Handle the connection."
    *   `useDraw`: "Handle the math and pixels."
    *   `CanvasPage`: "Handle the Layout and Buttons."

---

## 4. Code Walkthrough

### `client/src/pages/CanvasPage.jsx`
The main visual component. It contains almost no logic, only UI.
-   **Layout**: Splits the screen into "Board Container", "Toolbars", and "User List".
-   **CSS Integration**: Uses standard CSS classes (`.toolbar`, `.tool-btn`) for styling.
-   **Hook Usage**: Calls `useDraw()` to get functions like `startDrawing` and `undo`.

### `client/src/hooks/useDraw.js`
The "Brain" of the drawing features.
-   **`startDrawing`**: Fires on `onMouseDown`. Starts a new path (`ctx.beginPath()`) and moves the "pen" to the mouse location.
-   **`draw`**: Fires on `onMouseMove`. Draws a line to the new mouse location (`ctx.lineTo()`).
-   **`stopDrawing`**: Fires on `onMouseUp`. Sends the finished stroke data to the server via `socket.emit('draw_line')`.
-   **Quadratic Curves**: We don't just connect dots; we calculate the midpoint between dots and draw a curve (`ctx.quadraticCurveTo`). This makes lines look smooth, like ink, rather than jagged robot lines.

### `server/canvasHandler.js`
The event manager.
-   **`draw_line`**: When User A sends a line, the server broadcasts it to Users B, C, and D.
-   **`history`**: The server saves every stroke in a `lineHistory` array. When a new user joins, it sends them the whole array (`load_canvas`) so they can see what was already drawn.

---

## 5. Potential Interview Questions

**Q1: Why did you use WebSockets instead of HTTP requests?**
> **A:** HTTP is one-way (Client asks -> Server responds). For a drawing app, I need instantaneous updates. If I used HTTP, I'd have to ping the server every 100ms ("Any new lines?"), which is slow and resource-heavy. WebSockets allow the server to push updates immediately.

**Q2: How do you handle multiple users drawing at the same time?**
> **A:** The server acts as the source of truth. Every time a user finishes a stroke, it's sent to the server and appended to a `history` list. The server then broadcasts that specific stroke to everyone else.

**Q3: How does the "Undo" feature work with multiple users?**
> **A:** Currently, the Undo feature is global (shared). If I click undo, it removes the last line from the server's `history` array and tells everyone to `redraw_canvas`—which clears their screen and repaints the remaining history.
> *(Advanced Answer: A better approach for the future would be to track "who drew what" and only undo my own lines.)*

**Q4: How did you optimize the performance?**
> **A:**
> 1.  Used `useRef` for drawing to avoid React re-renders.
> 2.  Used `quadraticCurveTo` logic locally to make lines look smooth without sending excessive data points.
> 3.  Only broadcasting the final stroke path (on `mouseUp`) rather than every single pixel (on `mouseMove`) to reduce network traffic.

**Q5: What was the hardest challenge?**
> **A:** Synchronizing the canvas state for new users. When someone joins late, they need to see everything that was already drawn. I solved this by maintaining a `lineHistory` array on the server and emitting a `load_canvas` event immediately upon connection.
