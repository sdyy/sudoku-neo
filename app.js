/**
 * Sudoku Neo App Controller
 * Manages UI, interactions, state, history, and Web Worker integration.
 */

// App State
let board = Array.from({ length: 9 }, () => Array(9).fill(0));
let originalBoard = Array.from({ length: 9 }, () => Array(9).fill(0));
let solution = Array.from({ length: 9 }, () => Array(9).fill(0));
let candidates = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []));

let selectedCell = null; // { r, c }
let isPencilMode = false;
let mistakes = 0;
const maxMistakes = 3;
let secondsElapsed = 0;
let timerInterval = null;
let isPaused = false;
let currentDifficulty = 'Easy';
let activeHint = null; // Step details from logicalSolve

// Undo/Redo History Stacks
let undoStack = [];
let redoStack = [];

// Worker Instance
let generatorWorker = null;

// DOM Elements
const sudokuGrid = document.getElementById('sudokuGrid');
const diffDisplay = document.getElementById('diffDisplay');
const mistakeDisplay = document.getElementById('mistakeDisplay');
const timerDisplay = document.getElementById('timerDisplay');
const difficultySelect = document.getElementById('difficultySelect');
const newGameBtn = document.getElementById('newGameBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const eraseBtn = document.getElementById('eraseBtn');
const pencilBtn = document.getElementById('pencilBtn');
const autoCandidatesBtn = document.getElementById('autoCandidatesBtn');
const clearNotesBtn = document.getElementById('clearNotesBtn');
const hintBtn = document.getElementById('hintBtn');

// UI Overhaul Elements
const detailsContent = document.getElementById('hintOverlayBody');
const hintOverlay = document.getElementById('hintOverlay');
const closeHintBtn = document.getElementById('closeHintBtn');
const settingsToggleBtn = document.getElementById('settingsToggleBtn');
const settingsOverlay = document.getElementById('settingsOverlay');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const settingsThemeToggle = document.getElementById('settingsThemeToggle');
const themeToggleText = document.getElementById('themeToggleText');

// Overlays
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingSubtext = document.getElementById('loadingSubtext');
const pauseOverlay = document.getElementById('pauseOverlay');
const pauseToggleBtn = document.getElementById('pauseToggleBtn');
const resumeGameBtn = document.getElementById('resumeGameBtn');
const successOverlay = document.getElementById('successOverlay');
const successNewGameBtn = document.getElementById('successNewGameBtn');

// Success Stats
const statDiff = document.getElementById('statDiff');
const statTime = document.getElementById('statTime');
const statMistakes = document.getElementById('statMistakes');
const statTechnique = document.getElementById('statTechnique');

// Helper to display overlay feedback
function showHintOverlay(content) {
  if (hintOverlay && detailsContent) {
    detailsContent.innerHTML = content;
    hintOverlay.style.display = 'flex';
  }
}

// Initialize App
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initEventListeners();
  setPencilMode(false);
  
  // Try to load saved game
  if (!loadGame()) {
    // If no save, generate default easy puzzle
    startNewGame('Easy');
  }
});

// Theme Logic
function initTheme() {
  const savedTheme = localStorage.getItem('sudoku_neo_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcons(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('sudoku_neo_theme', newTheme);
  updateThemeIcons(newTheme);
}

function updateThemeIcons(theme) {
  if (themeToggleText) {
    themeToggleText.textContent = theme === 'dark' ? '切換為淺色' : '切換為深色';
  }
}

// Pencil Mode Control
function setPencilMode(active) {
  isPencilMode = active;
  if (pencilBtn) {
    pencilBtn.classList.toggle('active-mode', isPencilMode);
  }
  document.body.classList.toggle('pencil-active', isPencilMode);
}

// History Management
function saveState() {
  // Push state snapshot
  undoStack.push({
    board: board.map(row => [...row]),
    candidates: candidates.map(row => row.map(cell => [...cell])),
    mistakes: mistakes
  });
  
  // Limit history stack size to 50
  if (undoStack.length > 50) {
    undoStack.shift();
  }
  
  // Clear redo stack on new action
  redoStack = [];
  updateHistoryButtons();
  saveGame();
}

function undo() {
  if (undoStack.length === 0) return;
  activeHint = null; // Clear active hint on action
  
  const currentState = {
    board: board.map(row => [...row]),
    candidates: candidates.map(row => row.map(cell => [...cell])),
    mistakes: mistakes
  };
  redoStack.push(currentState);
  
  const prevState = undoStack.pop();
  board = prevState.board;
  candidates = prevState.candidates;
  mistakes = prevState.mistakes;
  
  updateHistoryButtons();
  renderGrid();
  updateStatusDisplays();
  saveGame();
}

function redo() {
  if (redoStack.length === 0) return;
  activeHint = null;
  
  const currentState = {
    board: board.map(row => [...row]),
    candidates: candidates.map(row => row.map(cell => [...cell])),
    mistakes: mistakes
  };
  undoStack.push(currentState);
  
  const nextState = redoStack.pop();
  board = nextState.board;
  candidates = nextState.candidates;
  mistakes = nextState.mistakes;
  
  updateHistoryButtons();
  renderGrid();
  updateStatusDisplays();
  saveGame();
}

function updateHistoryButtons() {
  undoBtn.disabled = undoStack.length === 0;
  redoBtn.disabled = redoStack.length === 0;
}

// Timer Logic
function startTimer() {
  stopTimer();
  timerInterval = setInterval(() => {
    secondsElapsed++;
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerDisplay() {
  const mins = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
  const secs = (secondsElapsed % 60).toString().padStart(2, '0');
  timerDisplay.textContent = `${mins}:${secs}`;
}

function togglePause() {
  if (isPaused) {
    // Resume
    isPaused = false;
    pauseOverlay.classList.remove('active');
    startTimer();
    saveGame();
  } else {
    // Pause
    isPaused = true;
    pauseOverlay.classList.add('active');
    stopTimer();
    saveGame();
  }
}

// Grid Generation via Web Worker
// Helper to handle the successfully generated puzzle data
function handleGenerationResult(data, difficulty) {
  board = data.puzzle.map(row => [...row]);
  originalBoard = data.puzzle.map(row => [...row]);
  solution = data.solution.map(row => [...row]);
  candidates = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []));
  
  mistakes = 0;
  secondsElapsed = 0;
  undoStack = [];
  redoStack = [];
  
  loadingOverlay.classList.remove('active');
  
  // Focus on board, start timer
  updateStatusDisplays();
  updateHistoryButtons();
  renderGrid();
  startTimer();
  
  detailsContent.innerHTML = `
    新遊戲已生成！<br>
    難度：<strong>${getDifficultyName(difficulty)}</strong><br>
    提示線索數：<strong>${data.clues}</strong> 個<br><br>
    填寫錯誤將計入失誤。祝您解題愉快！
  `;
  saveGame();
}

// Fallback to generate puzzle on the main thread
function generateOnMainThread(difficulty) {
  loadingSubtext.textContent = '正在本地端計算結構 (主執行緒模式)...';
  
  // yield control back to browser briefly so it paints the loading overlay and spinner
  setTimeout(() => {
    try {
      const result = SudokuEngine.generatePuzzle(difficulty, (attempts) => {
        console.log(`Main thread generation attempt: ${attempts}`);
      });
      handleGenerationResult(result, difficulty);
    } catch (error) {
      console.error('Main thread generation failed:', error);
      loadingOverlay.classList.remove('active');
      alert('遊戲生成失敗，請重試。');
    }
  }, 100);
}

// Grid Generation via Web Worker with Main-Thread Fallback
function startNewGame(difficulty) {
  stopTimer();
  activeHint = null;
  if (hintOverlay) {
    hintOverlay.style.display = 'none';
  }
  selectedCell = null;
  isPaused = false;
  pauseOverlay.classList.remove('active');
  successOverlay.classList.remove('active');
  
  currentDifficulty = difficulty;
  difficultySelect.value = difficulty;
  
  // Show loading
  loadingSubtext.textContent = '正在尋找符合難度的對稱結構 (嘗試次數: 1)';
  loadingOverlay.classList.add('active');
  
  // Terminate existing worker if active
  if (generatorWorker) {
    generatorWorker.terminate();
    generatorWorker = null;
  }
  
  try {
    // Create worker
    generatorWorker = new Worker('generator.worker.js');
    
    generatorWorker.postMessage({
      type: 'generate',
      difficulty: difficulty
    });
    
    generatorWorker.onmessage = function(e) {
      const { type, attempts, data, message } = e.data;
      
      if (type === 'progress') {
        loadingSubtext.textContent = `正在尋找符合難度的對稱結構 (嘗試次數: ${attempts})`;
      } else if (type === 'result') {
        if (generatorWorker) {
          generatorWorker.terminate();
          generatorWorker = null;
        }
        handleGenerationResult(data, difficulty);
      } else if (type === 'error') {
        console.warn('Worker reports error, falling back to main thread:', message);
        if (generatorWorker) {
          generatorWorker.terminate();
          generatorWorker = null;
        }
        generateOnMainThread(difficulty);
      }
    };
    
    generatorWorker.onerror = function(e) {
      console.warn('Worker onerror event triggered, falling back to main thread:', e);
      e.preventDefault(); // Stop default error reporting
      if (generatorWorker) {
        generatorWorker.terminate();
        generatorWorker = null;
      }
      generateOnMainThread(difficulty);
    };
    
  } catch (err) {
    console.warn('Failed to construct Worker (likely CORS or file:// restriction), falling back to main thread:', err);
    if (generatorWorker) {
      generatorWorker.terminate();
      generatorWorker = null;
    }
    generateOnMainThread(difficulty);
  }
}

// Convert Difficulty ID to Chinese Name
function getDifficultyName(diff) {
  const names = { 'Easy': '簡單', 'Medium': '中等', 'Hard': '困難', 'Expert': '專家' };
  return names[diff] || diff;
}

// Update Displays (Mistakes, Difficulty, Timer)
function updateStatusDisplays() {
  diffDisplay.textContent = getDifficultyName(currentDifficulty);
  mistakeDisplay.textContent = `${mistakes} / ${maxMistakes}`;
  updateTimerDisplay();
}

// Rendering Grid
function renderGrid() {
  sudokuGrid.innerHTML = '';
  
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cellVal = board[r][c];
      const isOrig = originalBoard[r][c] !== 0;
      
      const cellEl = document.createElement('div');
      cellEl.classList.add('sudoku-cell');
      cellEl.dataset.row = r;
      cellEl.dataset.col = c;
      
      // Determine base cell class
      if (isOrig) {
        cellEl.classList.add('original');
        cellEl.textContent = cellVal;
      } else if (cellVal !== 0) {
        cellEl.classList.add('user-filled');
        cellEl.textContent = cellVal;
        
        // Mark mistakes
        if (cellVal !== solution[r][c]) {
          cellEl.classList.add('conflict');
        }
      } else {
        // Render candidates
        const candGrid = document.createElement('div');
        candGrid.classList.add('candidates-grid');
        
        const cellCands = candidates[r][c];
        
        for (let i = 1; i <= 9; i++) {
          const candCell = document.createElement('span');
          candCell.classList.add('candidate-cell');
          candCell.textContent = i;
          
          if (cellCands.includes(i)) {
            candCell.classList.add('active');
            
            // Highlight candidate if it matches the selected cell's value
            if (selectedCell) {
              const selectedVal = board[selectedCell.r][selectedCell.c];
              if (selectedVal !== 0 && selectedVal === i) {
                candCell.classList.add('match-selected');
              }
            }
            
            // Check if this candidate is eliminated by active hint
            if (activeHint && activeHint.eliminations) {
              const isEliminated = activeHint.eliminations.some(e => e.r === r && e.c === c && e.val === i);
              if (isEliminated) {
                candCell.classList.add('hint-eliminated');
              }
            }
          } else {
            candCell.classList.add('hidden');
          }
          candGrid.appendChild(candCell);
        }
        cellEl.appendChild(candGrid);
      }
      
      // Apply selections & highlights
      if (selectedCell && selectedCell.r === r && selectedCell.c === c) {
        cellEl.classList.add('selected');
      } else if (selectedCell) {
        // Highlight row, col, box (cross highlight)
        const cellBox = Math.floor(r / 3) * 3 + Math.floor(c / 3);
        const selectedBox = Math.floor(selectedCell.r / 3) * 3 + Math.floor(selectedCell.c / 3);
        
        if (r === selectedCell.r || c === selectedCell.c || cellBox === selectedBox) {
          cellEl.classList.add('highlighted');
        }
        
        // Highlight same values
        const selectedVal = board[selectedCell.r][selectedCell.c];
        if (selectedVal !== 0 && cellVal === selectedVal) {
          cellEl.classList.add('hovered');
        }
      }
      
      // Apply active hint highlights
      if (activeHint && activeHint.highlightCells) {
        const hintCell = activeHint.highlightCells.find(h => h.r === r && h.c === c);
        if (hintCell) {
          if (hintCell.role === 'target') cellEl.classList.add('hint-target');
          else if (hintCell.role === 'source' || hintCell.role === 'pivot' || hintCell.role === 'pincer1' || hintCell.role === 'pincer2') cellEl.classList.add('hint-source');
          else if (hintCell.role === 'related') cellEl.classList.add('hint-related');
          else if (hintCell.role === 'eliminated') cellEl.classList.add('hint-eliminated');
        }
      }
      
      // Event Listeners for Cell Clicking
      cellEl.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent click from bubbling up to document and triggering deselect
        if (isPaused) return;
        activeHint = null; // Clear active hint
        selectedCell = { r, c };
        renderGrid();
      });
      
      sudokuGrid.appendChild(cellEl);
    }
  }
}

// Handle Inputs (Val: 1-9 or 0 for Erase)
function handleInput(val) {
  if (!selectedCell || isPaused) return;
  
  const { r, c } = selectedCell;
  
  // If original board clue, ignore
  if (originalBoard[r][c] !== 0) return;
  
  activeHint = null; // Clear active hint on input
  
  if (isPencilMode) {
    if (val === 0) {
      // Clear candidates
      saveState();
      candidates[r][c] = [];
      renderGrid();
      saveGame();
    } else {
      // Toggle candidate
      saveState();
      const idx = candidates[r][c].indexOf(val);
      if (idx === -1) {
        candidates[r][c].push(val);
        candidates[r][c].sort();
      } else {
        candidates[r][c].splice(idx, 1);
      }
      board[r][c] = 0; // Ensure main value is empty when typing notes
      renderGrid();
      saveGame();
    }
  } else {
    // Normal fill mode
    const currentVal = board[r][c];
    if (currentVal === val) return; // Unchanged
    
    saveState();
    board[r][c] = val;
    
    if (val !== 0) {
      // Clear candidates on fill
      candidates[r][c] = [];
      
      // If correct fill, auto-eliminate candidate from row, col, box
      if (val === solution[r][c]) {
        eliminateCandidateFromPeers(r, c, val);
      } else {
        // Wrong fill count mistake
        mistakes++;
        updateStatusDisplays();
        
        // Show wrong filled info
        let msg = `
          <span style="color: var(--text-conflict); font-weight: 600;">失誤！</span>填寫的數字與解答不符。<br>
          目前失誤：<strong>${mistakes} / ${maxMistakes}</strong>
        `;
        
        if (mistakes >= maxMistakes) {
          msg += `<br><br><span style="color: var(--text-conflict); font-weight: 600;">提示：</span>您已達到失誤次數上限，可以繼續作答或重啟新局。`;
        }
        showHintOverlay(msg);
      }
    }
    
    renderGrid();
    checkWinCondition();
    saveGame();
  }
}

// Helper to remove candidates when a correct number is filled
function eliminateCandidateFromPeers(r, c, val) {
  // Row and Column
  for (let i = 0; i < 9; i++) {
    const rIdx = candidates[r][i].indexOf(val);
    if (rIdx !== -1) candidates[r][i].splice(rIdx, 1);
    
    const cIdx = candidates[i][c].indexOf(val);
    if (cIdx !== -1) candidates[i][c].splice(cIdx, 1);
  }
  
  // Box
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let dr = 0; dr < 3; dr++) {
    for (let dc = 0; dc < 3; dc++) {
      const idx = candidates[br + dr][bc + dc].indexOf(val);
      if (idx !== -1) candidates[br + dr][bc + dc].splice(idx, 1);
    }
  }
}

// Check Win Condition
function checkWinCondition() {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== solution[r][c]) {
        return; // Not won yet
      }
    }
  }
  
  // Won!
  stopTimer();
  isPaused = false;
  
  // Calculate highest technique used in the solver for this board
  const evaluation = SudokuEngine.logicalSolve(originalBoard);
  const highestTechnique = getChineseTechniqueName(evaluation.difficulty);
  
  // Show stats in Success Overlay
  statDiff.textContent = getDifficultyName(currentDifficulty);
  
  const mins = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
  const secs = (secondsElapsed % 60).toString().padStart(2, '0');
  statTime.textContent = `${mins}:${secs}`;
  
  statMistakes.textContent = `${mistakes} / ${maxMistakes}`;
  statTechnique.textContent = highestTechnique;
  
  // Save game record to local storage
  saveRecord({
    id: Math.random().toString(36).substring(2, 11),
    timestamp: Date.now(),
    difficulty: currentDifficulty,
    duration: secondsElapsed,
    mistakes: mistakes,
    technique: highestTechnique
  });
  
  successOverlay.classList.add('active');
  localStorage.removeItem('sudoku_neo_save'); // Clear saved game on success
}

function getChineseTechniqueName(tech) {
  const names = {
    'Easy': '基礎摒除法 (Singles)',
    'Medium': '區塊摒除 / 顯性對數 (Pointing / Naked Pairs)',
    'Hard': '隱性對數 / X翼 (Hidden Pairs / X-Wing)',
    'Expert': 'XY翼 / 高級鏈式推理 (XY-Wing)'
  };
  return names[tech] || tech;
}

// Auto candidate solver utility
function autoCandidateNotes() {
  if (isPaused) return;
  activeHint = null;
  saveState();
  
  // Call engine
  const notes = SudokuEngine.autoCandidates(board);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        candidates[r][c] = notes[r][c];
      }
    }
  }
  
  renderGrid();
  detailsContent.innerHTML = '已為所有空白格自動填寫合法的候選數。';
  saveGame();
}

// Hint System
function triggerHint() {
  if (isPaused) return;
  
  // First check if there are wrong answers on board
  let hasMistakes = false;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== 0 && board[r][c] !== solution[r][c]) {
        hasMistakes = true;
      }
    }
  }
  
  if (hasMistakes) {
    showHintOverlay(`
      <span style="color: var(--text-conflict); font-weight: 600;">無法計算提示！</span><br><br>
      偵測到盤面上有<b>錯誤的填寫值</b>（紅色數字）。請先擦除錯誤填寫，系統才能提供正確的邏輯推理提示。
    `);
    return;
  }
  
  // Run logical solve on current board state
  const state = SudokuEngine.logicalSolve(board);
  
  if (state.solved && state.steps.length === 0) {
    showHintOverlay('此謎題已全部解完，或只剩下唯一的基礎步驟！');
    return;
  }
  
  if (state.steps && state.steps.length > 0) {
    // Find the first logical step whose eliminations or cell values are not yet completed by the user
    let step = null;
    for (const s of state.steps) {
      // 1. If it's a cell filling step, check if the cell is still empty
      if (s.value !== undefined && s.cell) {
        if (board[s.cell.r][s.cell.c] === 0) {
          step = s;
          break;
        }
      }
      // 2. If it's an elimination step, check if any of the proposed eliminations are still present in user candidates
      if (s.eliminations && s.eliminations.length > 0) {
        const isUseful = s.eliminations.some(e => {
          const cellCands = candidates[e.r][e.c];
          return cellCands && cellCands.includes(e.val);
        });
        if (isUseful) {
          step = s;
          break;
        }
      }
    }
    
    // If all logical steps have already had their target candidates eliminated by the user,
    // fallback to a backtracking fill-cell hint.
    if (!step) {
      let hintFound = false;
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (board[r][c] === 0) {
            const correctVal = solution[r][c];
            activeHint = {
              technique: 'Backtracking Fallback',
              highlightCells: [{ r, c, role: 'target' }],
              eliminations: []
            };
            renderGrid();
            showHintOverlay(`
              <h3>💡 提示（回溯推導）</h3><br>
              <b>應用技巧：</b>唯一推導 (Fallback)<br><br>
              當前盤面剩餘的邏輯推導排除步驟您均已手動完成！根據唯一解路徑：<br>
              儲存格 <b>(R${r+1}, C${c+1})</b> 必須填入數字 <b style="color: var(--accent-hover); font-size:15px;">${correctVal}</b>。
            `);
            hintFound = true;
            break;
          }
        }
        if (hintFound) break;
      }
      return;
    }
    
    activeHint = step;
    
    // Custom highlights
    renderGrid();
    
    // Explanation Formatting
    let techniqueDesc = getChineseTechniqueName(SudokuEngine.logicalSolve(originalBoard).difficulty);
    
    showHintOverlay(`
      <h3>💡 邏輯推導步驟</h3><br>
      <b>應用技巧：</b><span style="color: var(--accent-hover); font-weight: 600;">${getStepTechniqueName(step.technique)}</span><br><br>
      <b>推理邏輯：</b><br>
      ${step.description}<br><br>
      <i>（已在盤面上以綠色/黃色/藍色/紅色框線視覺化標記涉及的單元格，您可在其標示處採取行動）</i>
    `);
  } else {
    // Solver got stuck (requires guessing or advanced solver rules not implemented)
    // Give backtrack step as hint
    let hintFound = false;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0) {
          const correctVal = solution[r][c];
          activeHint = {
            technique: 'Backtracking Fallback',
            highlightCells: [{ r, c, role: 'target' }],
            eliminations: []
          };
          renderGrid();
          showHintOverlay(`
            <h3>💡 提示（回溯推導）</h3><br>
            <b>應用技巧：</b>唯一推導 (Fallback)<br><br>
            當前盤面難度極高，超出標準規則推導範圍。根據全局搜索與唯一解路徑：<br>
            儲存格 <b>(R${r+1}, C${c+1})</b> 必須填入數字 <b style="color: var(--accent-hover); font-size:15px;">${correctVal}</b>。
          `);
          hintFound = true;
          break;
        }
      }
      if (hintFound) break;
    }
  }
}

function getStepTechniqueName(tech) {
  const names = {
    'Naked Single': '唯一餘數 (Naked Single)',
    'Hidden Single': '隱性單數 (Hidden Single)',
    'Pointing': '區塊摒除法 (Pointing Pair/Triple)',
    'Claiming': '行列對宮摒除法 (Box-Line Reduction)',
    'Naked Pair': '顯性對數 (Naked Pair)',
    'Hidden Pair': '隱性對數 (Hidden Pair)',
    'X-Wing': 'X翼 (X-Wing / 魚)',
    'XY-Wing': 'XY翼 (XY-Wing / 彎曲雙翼)'
  };
  return names[tech] || tech;
}

// Local Storage Save/Load
function saveGame() {
  const gameData = {
    board,
    originalBoard,
    solution,
    candidates,
    mistakes,
    secondsElapsed,
    currentDifficulty,
    undoStack,
    redoStack
  };
  localStorage.setItem('sudoku_neo_save', JSON.stringify(gameData));
}

function loadGame() {
  const dataStr = localStorage.getItem('sudoku_neo_save');
  if (!dataStr) return false;
  
  try {
    const data = JSON.parse(dataStr);
    board = data.board;
    originalBoard = data.originalBoard;
    solution = data.solution;
    candidates = data.candidates;
    mistakes = data.mistakes;
    secondsElapsed = data.secondsElapsed;
    currentDifficulty = data.currentDifficulty;
    undoStack = data.undoStack || [];
    redoStack = data.redoStack || [];
    
    // Restore UI
    difficultySelect.value = currentDifficulty;
    updateStatusDisplays();
    updateHistoryButtons();
    renderGrid();
    startTimer();
    
    detailsContent.innerHTML = '已成功載入您上次的遊戲進度！';
    return true;
  } catch (e) {
    console.error('Failed to parse save game:', e);
    return false;
  }
}

// Event Listeners Configuration
function initEventListeners() {
  // Settings Modal Events
  if (settingsToggleBtn && settingsOverlay) {
    settingsToggleBtn.addEventListener('click', () => {
      settingsOverlay.style.display = 'flex';
      // Auto pause if game is running
      if (!isPaused && timerInterval) {
        togglePause();
      }
    });
  }
  
  if (closeSettingsBtn && settingsOverlay) {
    closeSettingsBtn.addEventListener('click', () => {
      settingsOverlay.style.display = 'none';
      // Auto resume if paused by opening settings
      if (isPaused && pauseOverlay.style.display !== 'flex' && !successOverlay.classList.contains('active')) {
        togglePause();
      }
    });
  }

  if (settingsThemeToggle) {
    settingsThemeToggle.addEventListener('click', toggleTheme);
  }

  // Hint Overlay Dismiss
  if (closeHintBtn && hintOverlay) {
    closeHintBtn.addEventListener('click', () => {
      activeHint = null;
      hintOverlay.style.display = 'none';
      renderGrid();
    });
  }
  
  // Stats Modal Events
  const statsToggleBtn = document.getElementById('statsToggleBtn');
  const statsOverlay = document.getElementById('statsOverlay');
  const closeStatsBtn = document.getElementById('closeStatsBtn');
  const clearStatsBtn = document.getElementById('clearStatsBtn');
  
  if (statsToggleBtn && statsOverlay) {
    statsToggleBtn.addEventListener('click', () => {
      renderStats();
      statsOverlay.style.display = 'flex';
      // Auto pause if game is running
      if (!isPaused && timerInterval) {
        togglePause();
      }
    });
  }
  
  if (closeStatsBtn && statsOverlay) {
    closeStatsBtn.addEventListener('click', () => {
      statsOverlay.style.display = 'none';
      // Auto resume if paused by opening stats
      if (isPaused && pauseOverlay.style.display !== 'flex' && !successOverlay.classList.contains('active')) {
        togglePause();
      }
    });
  }
  
  if (clearStatsBtn) {
    clearStatsBtn.addEventListener('click', () => {
      if (confirm('確定要清除所有的歷史通關紀錄與個人最佳戰績嗎？此動作無法復原。')) {
        clearRecords();
      }
    });
  }
  
  // Game control buttons
  newGameBtn.addEventListener('click', () => {
    // Auto close settings modal when starting new game from modal
    if (settingsOverlay) {
      settingsOverlay.style.display = 'none';
    }
    startNewGame(difficultySelect.value);
  });
  
  successNewGameBtn.addEventListener('click', () => {
    startNewGame(difficultySelect.value);
  });
  
  // Pause Toggle
  pauseToggleBtn.addEventListener('click', togglePause);
  resumeGameBtn.addEventListener('click', togglePause);
  
  // History
  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);
  
  // Erase
  eraseBtn.addEventListener('click', () => {
    handleInput(0);
  });
  
  // Pencil Mode
  pencilBtn.addEventListener('click', () => {
    setPencilMode(!isPencilMode);
  });
  
  // Auto candidates
  autoCandidatesBtn.addEventListener('click', autoCandidateNotes);
  
  // Clear notes
  clearNotesBtn.addEventListener('click', () => {
    if (isPaused) return;
    activeHint = null;
    saveState();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        candidates[r][c] = [];
      }
    }
    renderGrid();
    showHintOverlay('已清除所有網格中的草稿候選數。');
    if (settingsOverlay) {
      settingsOverlay.style.display = 'none';
    }
    if (isPaused) {
      togglePause();
    }
    saveGame();
  });
  
  // Hint
  hintBtn.addEventListener('click', triggerHint);
  
  // Keypad Clicking (Digits 1-9 only)
  document.querySelectorAll('.keypad-btn[data-value]').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = parseInt(btn.dataset.value);
      if (!isNaN(val)) {
        handleInput(val);
      }
    });
  });
  
  // Keyboard Events
  document.addEventListener('keydown', (e) => {
    if (isPaused) return;
    
    // Ignore input events if focusing on inputs/selects
    if (document.activeElement.tagName === 'SELECT') return;
    
    if (!selectedCell) return;
    
    let { r, c } = selectedCell;
    
    // Arrow Navigation
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      r = Math.max(0, r - 1);
      selectedCell = { r, c };
      activeHint = null;
      renderGrid();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      r = Math.min(8, r + 1);
      selectedCell = { r, c };
      activeHint = null;
      renderGrid();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      c = Math.max(0, c - 1);
      selectedCell = { r, c };
      activeHint = null;
      renderGrid();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      c = Math.min(8, c + 1);
      selectedCell = { r, c };
      activeHint = null;
      renderGrid();
    }
    
    // Value input 1-9
    else if (e.key >= '1' && e.key <= '9') {
      handleInput(parseInt(e.key));
    }
    
    // Erase input: Backspace, Delete, 0
    else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
      handleInput(0);
    }
    
    // Spacebar toggles pencil mode
    else if (e.key === ' ') {
      e.preventDefault();
      setPencilMode(!isPencilMode);
    }
  });
  
  // Click outside board to deselect cell, except when clicking game controls
  document.addEventListener('click', (e) => {
    // If the clicked element is no longer in the document body (e.g., was recreated by renderGrid), do not deselect
    if (!document.body.contains(e.target)) return;

    const gridEl = document.getElementById('sudokuGrid');
    const keypadEl = document.querySelector('.keypad');
    const bottomActionsEl = document.querySelector('.bottom-actions');
    const settingsToggleEl = document.getElementById('settingsToggleBtn');
    
    const isGridClick = gridEl && gridEl.contains(e.target);
    const isKeypadClick = keypadEl && keypadEl.contains(e.target);
    const isActionClick = bottomActionsEl && bottomActionsEl.contains(e.target);
    const isNewGameClick = (newGameBtn && newGameBtn.contains(e.target)) || (settingsToggleEl && settingsToggleEl.contains(e.target));
    
    if (!isGridClick && !isKeypadClick && !isActionClick && !isNewGameClick) {
      selectedCell = null;
      renderGrid();
    }
  });
}

// ==========================================
// Records & Statistics System
// ==========================================
function loadRecords() {
  try {
    const raw = localStorage.getItem('sudoku_neo_records');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load records:', e);
    return [];
  }
}

function saveRecord(record) {
  try {
    const records = loadRecords();
    records.unshift(record); // Add new record at the top
    localStorage.setItem('sudoku_neo_records', JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save record:', e);
  }
}

function clearRecords() {
  try {
    localStorage.removeItem('sudoku_neo_records');
    renderStats();
  } catch (e) {
    console.error('Failed to clear records:', e);
  }
}

function renderStats() {
  const records = loadRecords();
  
  // 1. Calculate best times and average mistakes for each difficulty
  const summary = {
    'Easy': { bestTime: null, totalMistakes: 0, count: 0 },
    'Medium': { bestTime: null, totalMistakes: 0, count: 0 },
    'Hard': { bestTime: null, totalMistakes: 0, count: 0 },
    'Expert': { bestTime: null, totalMistakes: 0, count: 0 }
  };
  
  records.forEach(rec => {
    const diff = rec.difficulty;
    if (summary[diff]) {
      summary[diff].count++;
      summary[diff].totalMistakes += rec.mistakes;
      if (summary[diff].bestTime === null || rec.duration < summary[diff].bestTime) {
        summary[diff].bestTime = rec.duration;
      }
    }
  });
  
  // Update UI stats cards
  const difficulties = ['Easy', 'Medium', 'Hard', 'Expert'];
  difficulties.forEach(diff => {
    const data = summary[diff];
    const bestTimeSpan = document.getElementById(`bestTime${diff}`);
    const avgMistakesSpan = document.getElementById(`avgMistakes${diff}`);
    
    if (bestTimeSpan && avgMistakesSpan) {
      if (data.count > 0) {
        // Format best time
        const mins = Math.floor(data.bestTime / 60).toString().padStart(2, '0');
        const secs = (data.bestTime % 60).toString().padStart(2, '0');
        bestTimeSpan.textContent = `${mins}:${secs}`;
        
        // Format avg mistakes (round to 1 decimal place)
        const avg = (data.totalMistakes / data.count).toFixed(1);
        avgMistakesSpan.textContent = `${avg} 次`;
      } else {
        bestTimeSpan.textContent = '--:--';
        avgMistakesSpan.textContent = '--';
      }
    }
  });
  
  // 2. Render recent history table
  const tbody = document.getElementById('historyTableBody');
  const noHistoryMsg = document.getElementById('noHistoryMsg');
  
  if (tbody && noHistoryMsg) {
    tbody.innerHTML = '';
    
    // Show last 15 records
    const recentRecords = records.slice(0, 15);
    if (recentRecords.length === 0) {
      noHistoryMsg.style.display = 'block';
    } else {
      noHistoryMsg.style.display = 'none';
      recentRecords.forEach(rec => {
        const tr = document.createElement('tr');
        
        // Date formatting (MM/DD HH:MM)
        const date = new Date(rec.timestamp);
        const mm = (date.getMonth() + 1).toString().padStart(2, '0');
        const dd = date.getDate().toString().padStart(2, '0');
        const hh = date.getHours().toString().padStart(2, '0');
        const min = date.getMinutes().toString().padStart(2, '0');
        const dateStr = `${mm}/${dd} ${hh}:${min}`;
        
        // Duration formatting
        const recMins = Math.floor(rec.duration / 60).toString().padStart(2, '0');
        const recSecs = (rec.duration % 60).toString().padStart(2, '0');
        const timeStr = `${recMins}:${recSecs}`;
        
        // Difficulty badge and name mapping
        const diffClass = rec.difficulty.toLowerCase();
        const diffName = getDifficultyName(rec.difficulty);
        
        tr.innerHTML = `
          <td class="hide-mobile">${dateStr}</td>
          <td><span class="diff-badge ${diffClass}">${diffName}</span></td>
          <td>${timeStr}</td>
          <td>${rec.mistakes} / 3</td>
          <td class="hide-mobile" style="color: var(--text-muted); font-size: 11px;">${rec.technique || '--'}</td>
        `;
        tbody.appendChild(tr);
      });
    }
  }
}
