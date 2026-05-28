/**
 * Sudoku Web Worker Generator
 * Runs the Sudoku puzzle generator in the background to prevent UI lag.
 */

// Import the Sudoku engine
importScripts('sudoku.js');

self.onmessage = function(e) {
  const { type, difficulty } = e.data;
  
  if (type === 'generate') {
    try {
      const result = self.SudokuEngine.generatePuzzle(difficulty, (attempts) => {
        // Send progress updates back to the UI
        self.postMessage({ type: 'progress', attempts });
      });
      
      self.postMessage({ type: 'result', data: result });
    } catch (error) {
      self.postMessage({ type: 'error', message: error.toString() });
    }
  }
};
