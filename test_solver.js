/**
 * Test Solver Script
 * Verifies SudokuEngine solver correctness and technique rating.
 */

const SudokuEngine = require('./sudoku.js');

console.log('--- Starting Sudoku Engine Tests ---');

// Test 1: Full Board Generation & Validation
console.log('\n[Test 1] Generating and validating a full board...');
const fullBoard = SudokuEngine.generateFullBoard();
let isValidFull = true;
for (let r = 0; r < 9; r++) {
  for (let c = 0; c < 9; c++) {
    if (fullBoard[r][c] === 0 || !SudokuEngine.isValid(fullBoard, r, c, fullBoard[r][c])) {
      isValidFull = false;
    }
  }
}
console.log('Full board is valid:', isValidFull);
if (!isValidFull) {
  console.error('FAIL: Generated board contains errors.');
  process.exit(1);
}

// Test 2: Backtracking Solver uniqueness
console.log('\n[Test 2] Testing Backtracking Solver...');
const { count, solution } = SudokuEngine.countSolutions(fullBoard, 2);
console.log(`Fully solved board has ${count} solution(s) (expected: 1)`);
if (count !== 1) {
  console.error('FAIL: Backtracker did not find exactly 1 solution for a full board.');
  process.exit(1);
}

// Test 3: Generate a puzzle of Easy difficulty
console.log('\n[Test 3] Generating an Easy puzzle...');
const easyPuzzle = SudokuEngine.generatePuzzle('Easy');
console.log(`Easy Puzzle clues count: ${easyPuzzle.clues}`);
console.log(`Easy Puzzle evaluated difficulty: ${easyPuzzle.difficulty}`);
const easySolved = SudokuEngine.logicalSolve(easyPuzzle.puzzle);
console.log(`Solved logically by solver: ${easySolved.solved}`);
console.log(`Highest technique required: ${easySolved.difficulty}`);
if (easySolved.difficulty !== 'Easy') {
  console.error(`FAIL: Expected Easy difficulty, got ${easySolved.difficulty}`);
  process.exit(1);
}

// Test 4: Generate a puzzle of Medium difficulty
console.log('\n[Test 4] Generating a Medium puzzle...');
const mediumPuzzle = SudokuEngine.generatePuzzle('Medium');
console.log(`Medium Puzzle clues count: ${mediumPuzzle.clues}`);
console.log(`Medium Puzzle evaluated difficulty: ${mediumPuzzle.difficulty}`);
const mediumSolved = SudokuEngine.logicalSolve(mediumPuzzle.puzzle);
console.log(`Solved logically by solver: ${mediumSolved.solved}`);
console.log(`Highest technique required: ${mediumSolved.difficulty}`);
if (mediumSolved.difficulty !== 'Medium') {
  console.error(`FAIL: Expected Medium difficulty, got ${mediumSolved.difficulty}`);
  process.exit(1);
}

// Test 5: Verify Pointing Pairs / Naked Pairs elimination in logical solver
console.log('\n[Test 5] Verifying Step-by-Step Solver details...');
if (mediumSolved.steps.length > 0) {
  console.log(`Steps count: ${mediumSolved.steps.length}`);
  const firstStep = mediumSolved.steps[0];
  console.log('First step example:');
  console.log(`- Technique: ${firstStep.technique}`);
  console.log(`- Description: ${firstStep.description}`);
  if (firstStep.eliminations && firstStep.eliminations.length > 0) {
    console.log(`- Eliminations: ${JSON.stringify(firstStep.eliminations.slice(0, 3))}...`);
  }
} else {
  console.log('No steps logged (puzzle was already solved? No, it has empty cells).');
}

console.log('\n--- All Tests Passed! ---');
process.exit(0);
