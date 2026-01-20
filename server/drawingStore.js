// server/drawingStore.js
class DrawingStore {
  constructor() {
    this.lineHistory = []; // Stores all completed lines
    this.redoStack = [];   // Stores lines popped by Undo
  }

  addLine(line) {
    this.lineHistory.push(line);
    this.redoStack = []; // New action clears redo history
    return this.lineHistory;
  }

  undo() {
    if (this.lineHistory.length === 0) return null;
    const line = this.lineHistory.pop();
    this.redoStack.push(line);
    return this.lineHistory;
  }

  redo() {
    if (this.redoStack.length === 0) return null;
    const line = this.redoStack.pop();
    this.lineHistory.push(line);
    return this.lineHistory;
  }

  getHistory() {
    return this.lineHistory;
  }
  
  clear() {
    this.lineHistory = [];
    this.redoStack = [];
  }
}

module.exports = new DrawingStore();