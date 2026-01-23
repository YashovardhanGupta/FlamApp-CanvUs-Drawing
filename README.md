# 🎨 FlamApp CanvUs Drawing

A real-time collaborative whiteboard application built with the MERN stack (well, MER... since it uses in-memory storage for speed!). Multiple users can draw on the same canvas simultaneously with instant synchronization.

## 🚀 Setup Instructions

This project is set up to run with a single command from the root directory.

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation & Running
1.  **Install Dependencies**:
    This command installs dependencies for the root, client, and server folders automatically.
    ```bash
    npm install
    ```

2.  **Start the Application**:
    This will run both the Client (Vite) and Server (Express) concurrently.
    ```bash
    npm start
    ```
    - **Frontend**: http://localhost:5173
    - **Backend**: http://localhost:3001

## 🧪 How to Test with Multiple Users

1.  Open the application in your primary browser window (http://localhost:5173).
2.  Open a **New Incognito Window** (or a different browser) and navigate to the same URL.
3.  Enter a name when prompted (e.g., "User 1" and "User 2").
4.  Start drawing in one window!
    - **Expected**: The drawing should appear instantly in the other window.
    - **Online Count**: Check the "Online Users" count in the navbar; it should update as you join/leave. (Future Work)

## ⚠️ Known Limitations & Bugs

-   **Persistence**: The current version uses **in-memory storage** (server-side RAM) to store line history.
    -   *Impact*: If the server restarts or crashes, the drawing board is wiped clean. This was a design choice for low-latency performance during the prototype phase.
-   **Canvas Resizing**: The canvas size is calculated on load (`window.innerWidth/Height`).
    -   *Impact*: If you resize the browser window *after* loading, drawings might look slightly offset or scaled incorrectly until a refresh.
-   **Curve Smoothing**: We use quadratic curves for smoothing.
    -   *Impact*: Extremely fast mouse movements might occassionally look "pointy" before the curve algorithm catches up on the final stroke.
-   **Race Conditions**: Rare conflict if two users modify exactly the same pixel coordinate at the precise millisecond (though `canvas` generally handles this by layering 'last write wins').

## ⏱️ Time Spent

**Total Time**: ~3 Days

*   **Day 1 (4 hours)**:
    *   Initial project setup (Vite + Express).
    *   Setting up Socket.io server and connection.
    *   Basic canvas implementation (drawing lines locally).
*   **Day 2 (2 hours)**:
    *   Implementing broadcasting logic (sending points to other users).
    *   Building the synchronization protocol (History State).
*   **Day 3 (6-7 hours)**:
    *   Adding "Undo/Redo" functionality (managing stacks).
    *   UI Polish (Navbar, Tools, Color Picker).
    *   Refactoring code into Custom Hooks (`useDraw`, `useSocket`) for cleaner architecture.
    *   Adding "Online Users" tracking.
    *   Deployment attempts and documentation.
