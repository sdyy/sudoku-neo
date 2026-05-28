/**
 * Sudoku Neo Core Engine
 * Contains Sudoku solver (Backtracking & Logical) and Generator
 */

// Helper to check if a value is valid in a cell
function isValid(board, r, c, val) {
  for (let i = 0; i < 9; i++) {
    if (board[r][i] === val && i !== c) return false;
    if (board[i][c] === val && i !== r) return false;
    
    const boxRow = Math.floor(r / 3) * 3 + Math.floor(i / 3);
    const boxCol = Math.floor(c / 3) * 3 + (i % 3);
    if (board[boxRow][boxCol] === val && (boxRow !== r || boxCol !== c)) return false;
  }
  return true;
}

// Backtracking solver to count solutions and check uniqueness
// Limits search to 'limit' solutions to avoid long execution
function countSolutions(board, limit = 2) {
  let solutionsCount = 0;
  let singleSolution = null;

  function solve(r, c) {
    if (solutionsCount >= limit) return;
    if (r === 9) {
      solutionsCount++;
      singleSolution = board.map(row => [...row]);
      return;
    }
    
    const nextR = c === 8 ? r + 1 : r;
    const nextC = c === 8 ? 0 : c + 1;
    
    if (board[r][c] !== 0) {
      solve(nextR, nextC);
    } else {
      for (let val = 1; val <= 9; val++) {
        if (isValid(board, r, c, val)) {
          board[r][c] = val;
          solve(nextR, nextC);
          board[r][c] = 0;
        }
      }
    }
  }

  // Deep copy to prevent modifying original board
  const tempBoard = board.map(row => [...row]);
  solve(0, 0);
  return { count: solutionsCount, solution: singleSolution };
}

// Generate a randomized full solved board
function generateFullBoard() {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));
  
  function fill(r, c) {
    if (r === 9) return true;
    
    const nextR = c === 8 ? r + 1 : r;
    const nextC = c === 8 ? 0 : c + 1;
    
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
    
    for (let val of numbers) {
      if (isValid(board, r, c, val)) {
        board[r][c] = val;
        if (fill(nextR, nextC)) return true;
        board[r][c] = 0;
      }
    }
    return false;
  }
  
  fill(0, 0);
  return board;
}

// Get cells in a house
function getHouseCells(type, index) {
  const cells = [];
  if (type === 'row') {
    for (let c = 0; c < 9; c++) cells.push({ r: index, c });
  } else if (type === 'col') {
    for (let r = 0; r < 9; r++) cells.push({ r, c: index });
  } else if (type === 'box') {
    const br = Math.floor(index / 3) * 3;
    const bc = (index % 3) * 3;
    for (let i = 0; i < 9; i++) {
      cells.push({ r: br + Math.floor(i / 3), c: bc + (i % 3) });
    }
  }
  return cells;
}

// Get the house indices for a coordinate
function getCellHouses(r, c) {
  return {
    row: r,
    col: c,
    box: Math.floor(r / 3) * 3 + Math.floor(c / 3)
  };
}

// House Name in Traditional Chinese
function getHouseName(type, index) {
  if (type === 'row') return `第 ${index + 1} 列`;
  if (type === 'col') return `第 ${index + 1} 行`;
  return `第 ${index + 1} 宮`;
}

// Logical Solver (Human-style rules)
function logicalSolve(grid) {
  // Setup working state
  const board = grid.map(row => [...row]);
  
  // Candidates represented as sets of 1-9 for empty cells
  const candidates = Array.from({ length: 9 }, (_, r) => 
    Array.from({ length: 9 }, (_, c) => {
      if (board[r][c] !== 0) return new Set();
      // Initialize candidates based on simple box/row/col check
      const s = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      for (let i = 0; i < 9; i++) {
        s.delete(board[r][i]);
        s.delete(board[i][c]);
      }
      const br = Math.floor(r / 3) * 3;
      const bc = Math.floor(c / 3) * 3;
      for (let dr = 0; dr < 3; dr++) {
        for (let dc = 0; dc < 3; dc++) {
          s.delete(board[br + dr][bc + dc]);
        }
      }
      return s;
    })
  );

  const steps = [];
  let maxTechnique = 'Easy';
  
  const DIFFICULTY_LEVELS = {
    'Naked Single': 'Easy',
    'Hidden Single': 'Easy',
    'Pointing': 'Medium',
    'Claiming': 'Medium',
    'Naked Pair': 'Medium',
    'Hidden Pair': 'Hard',
    'X-Wing': 'Hard',
    'XY-Wing': 'Expert'
  };

  function updateMaxTechnique(tech) {
    const currentLvl = DIFFICULTY_LEVELS[tech] || 'Easy';
    const lvlOrder = { 'Easy': 0, 'Medium': 1, 'Hard': 2, 'Expert': 3 };
    if (lvlOrder[currentLvl] > lvlOrder[maxTechnique]) {
      maxTechnique = currentLvl;
    }
  }

  // Eliminates a candidate from a cell and records it if it existed
  function eliminateCandidate(r, c, val, eliminationsList) {
    if (board[r][c] === 0 && candidates[r][c].has(val)) {
      candidates[r][c].delete(val);
      eliminationsList.push({ r, c, val });
      return true;
    }
    return false;
  }

  // Fills a cell, clears its candidates, and removes it from its neighbors' candidates
  function fillCell(r, c, val) {
    board[r][c] = val;
    candidates[r][c].clear();
    
    const elims = [];
    // Remove val from row and col
    for (let i = 0; i < 9; i++) {
      eliminateCandidate(r, i, val, elims);
      eliminateCandidate(i, c, val, elims);
    }
    // Remove val from box
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        eliminateCandidate(br + dr, bc + dc, val, elims);
      }
    }
    return elims;
  }

  let progress = true;

  while (progress) {
    progress = false;
    
    // Check if board is fully solved
    let isFull = true;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0) isFull = false;
      }
    }
    if (isFull) break;

    // 1. Naked Single
    let foundNakedSingle = false;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0 && candidates[r][c].size === 1) {
          const val = [...candidates[r][c]][0];
          const elims = fillCell(r, c, val);
          
          steps.push({
            technique: 'Naked Single',
            description: `儲存格 (R${r+1}, C${c+1}) 的候選數僅剩下 ${val}，因此必為 ${val}。`,
            cell: { r, c },
            value: val,
            eliminations: elims,
            highlightCells: [{ r, c, role: 'target' }]
          });
          
          updateMaxTechnique('Naked Single');
          foundNakedSingle = true;
          progress = true;
          break;
        }
      }
      if (foundNakedSingle) break;
    }
    if (foundNakedSingle) continue;

    // 2. Hidden Single
    let foundHiddenSingle = false;
    const houses = [];
    for (let i = 0; i < 9; i++) {
      houses.push({ type: 'row', index: i });
      houses.push({ type: 'col', index: i });
      houses.push({ type: 'box', index: i });
    }

    for (const house of houses) {
      const cells = getHouseCells(house.type, house.index);
      for (let val = 1; val <= 9; val++) {
        // Count how many cells can contain val
        const possibleCells = cells.filter(cell => board[cell.r][cell.c] === 0 && candidates[cell.r][cell.c].has(val));
        
        if (possibleCells.length === 1) {
          const cell = possibleCells[0];
          const elims = fillCell(cell.r, cell.c, val);
          
          steps.push({
            technique: 'Hidden Single',
            description: `在${getHouseName(house.type, house.index)}中，數字 ${val} 只能填在儲存格 (R${cell.r+1}, C${cell.c+1})。`,
            cell: cell,
            value: val,
            eliminations: elims,
            highlightCells: [
              { r: cell.r, c: cell.c, role: 'target' },
              ...cells.filter(o => o.r !== cell.r || o.c !== cell.c).map(o => ({ r: o.r, c: o.c, role: 'related' }))
            ]
          });
          
          updateMaxTechnique('Hidden Single');
          foundHiddenSingle = true;
          progress = true;
          break;
        }
      }
      if (foundHiddenSingle) break;
    }
    if (foundHiddenSingle) continue;

    // 3. Pointing Pairs/Triples (宮對行列)
    let foundPointing = false;
    for (let box = 0; box < 9; box++) {
      const boxCells = getHouseCells('box', box);
      for (let val = 1; val <= 9; val++) {
        const possible = boxCells.filter(cell => board[cell.r][cell.c] === 0 && candidates[cell.r][cell.c].has(val));
        if (possible.length >= 2 && possible.length <= 3) {
          // Check if all in same row
          const r0 = possible[0].r;
          const sameRow = possible.every(c => c.r === r0);
          
          // Check if all in same col
          const c0 = possible[0].c;
          const sameCol = possible.every(c => c.c === c0);
          
          if (sameRow) {
            const elims = [];
            for (let col = 0; col < 9; col++) {
              if (Math.floor(col / 3) !== (box % 3)) { // outside this box
                eliminateCandidate(r0, col, val, elims);
              }
            }
            if (elims.length > 0) {
              steps.push({
                technique: 'Pointing',
                description: `在第 ${box+1} 宮中，數字 ${val} 的候選位置全都在第 ${r0+1} 列。因此，可以排除該列其他區域的候選數 ${val}。`,
                cell: null,
                value: null,
                eliminations: elims,
                highlightCells: [
                  ...possible.map(p => ({ r: p.r, c: p.c, role: 'source' })),
                  ...elims.map(e => ({ r: e.r, c: e.c, role: 'eliminated' }))
                ]
              });
              updateMaxTechnique('Pointing');
              foundPointing = true;
              progress = true;
              break;
            }
          }
          
          if (sameCol) {
            const elims = [];
            for (let row = 0; row < 9; row++) {
              if (Math.floor(row / 3) !== Math.floor(box / 3)) { // outside this box
                eliminateCandidate(row, c0, val, elims);
              }
            }
            if (elims.length > 0) {
              steps.push({
                technique: 'Pointing',
                description: `在第 ${box+1} 宮中，數字 ${val} 的候選位置全都在第 ${c0+1} 行。因此，可以排除該行其他區域的候選數 ${val}。`,
                cell: null,
                value: null,
                eliminations: elims,
                highlightCells: [
                  ...possible.map(p => ({ r: p.r, c: p.c, role: 'source' })),
                  ...elims.map(e => ({ r: e.r, c: e.c, role: 'eliminated' }))
                ]
              });
              updateMaxTechnique('Pointing');
              foundPointing = true;
              progress = true;
              break;
            }
          }
        }
      }
      if (foundPointing) break;
    }
    if (foundPointing) continue;

    // 4. Box-Line Reduction / Claiming (行列對宮)
    let foundClaiming = false;
    const lines = [];
    for (let i = 0; i < 9; i++) {
      lines.push({ type: 'row', index: i });
      lines.push({ type: 'col', index: i });
    }
    
    for (const line of lines) {
      const lineCells = getHouseCells(line.type, line.index);
      for (let val = 1; val <= 9; val++) {
        const possible = lineCells.filter(cell => board[cell.r][cell.c] === 0 && candidates[cell.r][cell.c].has(val));
        if (possible.length >= 2 && possible.length <= 3) {
          // Check if all in same box
          const box0 = getCellHouses(possible[0].r, possible[0].c).box;
          const sameBox = possible.every(c => getCellHouses(c.r, c.c).box === box0);
          
          if (sameBox) {
            const elims = [];
            const boxCells = getHouseCells('box', box0);
            for (const cell of boxCells) {
              // check if cell is NOT on the line
              if (line.type === 'row' && cell.r !== line.index) {
                eliminateCandidate(cell.r, cell.c, val, elims);
              } else if (line.type === 'col' && cell.c !== line.index) {
                eliminateCandidate(cell.r, cell.c, val, elims);
              }
            }
            
            if (elims.length > 0) {
              steps.push({
                technique: 'Claiming',
                description: `在${getHouseName(line.type, line.index)}中，數字 ${val} 的候選位置全都在第 ${box0+1} 宮。因此，可以排除該宮其他區域的候選數 ${val}。`,
                cell: null,
                value: null,
                eliminations: elims,
                highlightCells: [
                  ...possible.map(p => ({ r: p.r, c: p.c, role: 'source' })),
                  ...elims.map(e => ({ r: e.r, c: e.c, role: 'eliminated' }))
                ]
              });
              updateMaxTechnique('Claiming');
              foundClaiming = true;
              progress = true;
              break;
            }
          }
        }
      }
      if (foundClaiming) break;
    }
    if (foundClaiming) continue;

    // 5. Naked Pair
    let foundNakedPair = false;
    for (const house of houses) {
      const cells = getHouseCells(house.type, house.index).filter(cell => board[cell.r][cell.c] === 0);
      // Find cells with exactly two candidates
      const pairs = cells.filter(cell => candidates[cell.r][cell.c].size === 2);
      
      if (pairs.length >= 2) {
        for (let i = 0; i < pairs.length; i++) {
          for (let j = i + 1; j < pairs.length; j++) {
            const c1 = pairs[i];
            const c2 = pairs[j];
            const cand1 = candidates[c1.r][c1.c];
            const cand2 = candidates[c2.r][c2.c];
            
            // Check if they have the exact same two candidates
            const match = [...cand1].every(v => cand2.has(v));
            if (match) {
              const vals = [...cand1];
              const elims = [];
              
              // Eliminate these candidates from other cells in the house
              for (const cell of cells) {
                if ((cell.r !== c1.r || cell.c !== c1.c) && (cell.r !== c2.r || cell.c !== c2.c)) {
                  eliminateCandidate(cell.r, cell.c, vals[0], elims);
                  eliminateCandidate(cell.r, cell.c, vals[1], elims);
                }
              }
              
              if (elims.length > 0) {
                steps.push({
                  technique: 'Naked Pair',
                  description: `在${getHouseName(house.type, house.index)}中，儲存格 (R${c1.r+1}, C${c1.c+1}) 與 (R${c2.r+1}, C${c2.c+1}) 的候選數均為 {${vals[0]}, ${vals[1]}}，形成顯性對數。因此，可排除此${house.type === 'row' ? '列' : house.type === 'col' ? '行' : '宮'}中其他單元格的候選數 ${vals[0]} 與 ${vals[1]}。`,
                  cell: null,
                  value: null,
                  eliminations: elims,
                  highlightCells: [
                    { r: c1.r, c: c1.c, role: 'source' },
                    { r: c2.r, c: c2.c, role: 'source' },
                    ...elims.map(e => ({ r: e.r, c: e.c, role: 'eliminated' }))
                  ]
                });
                updateMaxTechnique('Naked Pair');
                foundNakedPair = true;
                progress = true;
                break;
              }
            }
          }
          if (foundNakedPair) break;
        }
      }
      if (foundNakedPair) break;
    }
    if (foundNakedPair) continue;

    // 6. Hidden Pair
    let foundHiddenPair = false;
    for (const house of houses) {
      const cells = getHouseCells(house.type, house.index).filter(cell => board[cell.r][cell.c] === 0);
      
      // Look at pairs of numbers 1-9
      for (let a = 1; a <= 8; a++) {
        for (let b = a + 1; b <= 9; b++) {
          const cellsWithA = cells.filter(c => candidates[c.r][c.c].has(a));
          const cellsWithB = cells.filter(c => candidates[c.r][c.c].has(b));
          
          // They must both appear in exactly two cells, and those two cells must be the same
          if (cellsWithA.length === 2 && cellsWithB.length === 2 &&
              cellsWithA[0].r === cellsWithB[0].r && cellsWithA[0].c === cellsWithB[0].c &&
              cellsWithA[1].r === cellsWithB[1].r && cellsWithA[1].c === cellsWithB[1].c) {
            
            const c1 = cellsWithA[0];
            const c2 = cellsWithA[1];
            
            // Check if there are other candidates in these cells that we can eliminate
            const elims = [];
            for (let v of [...candidates[c1.r][c1.c]]) {
              if (v !== a && v !== b) {
                eliminateCandidate(c1.r, c1.c, v, elims);
              }
            }
            for (let v of [...candidates[c2.r][c2.c]]) {
              if (v !== a && v !== b) {
                eliminateCandidate(c2.r, c2.c, v, elims);
              }
            }
            
            if (elims.length > 0) {
              steps.push({
                technique: 'Hidden Pair',
                description: `在${getHouseName(house.type, house.index)}中，數字 {${a}, ${b}} 僅出現在儲存格 (R${c1.r+1}, C${c1.c+1}) 與 (R${c2.r+1}, C${c2.c+1}) 中，形成隱性對數。因此，可排除這兩個儲存格內的其他所有候選數。`,
                cell: null,
                value: null,
                eliminations: elims,
                highlightCells: [
                  { r: c1.r, c: c1.c, role: 'source' },
                  { r: c2.r, c: c2.c, role: 'source' },
                  ...elims.map(e => ({ r: e.r, c: e.c, role: 'eliminated' }))
                ]
              });
              updateMaxTechnique('Hidden Pair');
              foundHiddenPair = true;
              progress = true;
              break;
            }
          }
        }
        if (foundHiddenPair) break;
      }
      if (foundHiddenPair) break;
    }
    if (foundHiddenPair) continue;

    // 7. X-Wing
    let foundXWing = false;
    for (let val = 1; val <= 9; val++) {
      // Row-based X-Wing
      const rowOccurrences = [];
      for (let r = 0; r < 9; r++) {
        const cols = [];
        for (let c = 0; c < 9; c++) {
          if (board[r][c] === 0 && candidates[r][c].has(val)) {
            cols.push(c);
          }
        }
        if (cols.length === 2) {
          rowOccurrences.push({ r, cols });
        }
      }
      
      if (rowOccurrences.length >= 2) {
        for (let i = 0; i < rowOccurrences.length; i++) {
          for (let j = i + 1; j < rowOccurrences.length; j++) {
            const r1 = rowOccurrences[i].r;
            const r2 = rowOccurrences[j].r;
            const cols1 = rowOccurrences[i].cols;
            const cols2 = rowOccurrences[j].cols;
            
            if (cols1[0] === cols2[0] && cols1[1] === cols2[1]) {
              const c1 = cols1[0];
              const c2 = cols1[1];
              const elims = [];
              
              // Eliminate from col c1 and c2 in other rows
              for (let r = 0; r < 9; r++) {
                if (r !== r1 && r !== r2) {
                  eliminateCandidate(r, c1, val, elims);
                  eliminateCandidate(r, c2, val, elims);
                }
              }
              
              if (elims.length > 0) {
                steps.push({
                  technique: 'X-Wing',
                  description: `發現數字 ${val} 的 X-Wing（魚）。在第 ${r1+1} 列與第 ${r2+1} 列中，數字 ${val} 的候選位置均為第 ${c1+1} 行與第 ${c2+1} 行。因此，可以排除這兩行在其他各列的候選數 ${val}。`,
                  cell: null,
                  value: null,
                  eliminations: elims,
                  highlightCells: [
                    { r: r1, c: c1, role: 'source' },
                    { r: r1, c: c2, role: 'source' },
                    { r: r2, c: c1, role: 'source' },
                    { r: r2, c: c2, role: 'source' },
                    ...elims.map(e => ({ r: e.r, c: e.c, role: 'eliminated' }))
                  ]
                });
                updateMaxTechnique('X-Wing');
                foundXWing = true;
                progress = true;
                break;
              }
            }
          }
          if (foundXWing) break;
        }
      }
      if (foundXWing) continue;

      // Col-based X-Wing
      const colOccurrences = [];
      for (let c = 0; c < 9; c++) {
        const rows = [];
        for (let r = 0; r < 9; r++) {
          if (board[r][c] === 0 && candidates[r][c].has(val)) {
            rows.push(r);
          }
        }
        if (rows.length === 2) {
          colOccurrences.push({ c, rows });
        }
      }

      if (colOccurrences.length >= 2) {
        for (let i = 0; i < colOccurrences.length; i++) {
          for (let j = i + 1; j < colOccurrences.length; j++) {
            const c1 = colOccurrences[i].c;
            const c2 = colOccurrences[j].c;
            const rows1 = colOccurrences[i].rows;
            const rows2 = colOccurrences[j].rows;
            
            if (rows1[0] === rows2[0] && rows1[1] === rows2[1]) {
              const r1 = rows1[0];
              const r2 = rows1[1];
              const elims = [];
              
              // Eliminate from row r1 and r2 in other columns
              for (let c = 0; c < 9; c++) {
                if (c !== c1 && c !== c2) {
                  eliminateCandidate(r1, c, val, elims);
                  eliminateCandidate(r2, c, val, elims);
                }
              }
              
              if (elims.length > 0) {
                steps.push({
                  technique: 'X-Wing',
                  description: `發現數字 ${val} 的 X-Wing（魚）。在第 ${c1+1} 行與第 ${c2+1} 行中，數字 ${val} 的候選位置均為第 ${r1+1} 列與第 ${r2+1} 列。因此，可以排除這兩列在其他各行的候選數 ${val}。`,
                  cell: null,
                  value: null,
                  eliminations: elims,
                  highlightCells: [
                    { r: r1, c: c1, role: 'source' },
                    { r: r1, c: c2, role: 'source' },
                    { r: r2, c: c1, role: 'source' },
                    { r: r2, c: c2, role: 'source' },
                    ...elims.map(e => ({ r: e.r, c: e.c, role: 'eliminated' }))
                  ]
                });
                updateMaxTechnique('X-Wing');
                foundXWing = true;
                progress = true;
                break;
              }
            }
          }
          if (foundXWing) break;
        }
      }
      if (foundXWing) break;
    }
    if (foundXWing) continue;

    // 8. XY-Wing
    let foundXYWing = false;
    const bivalueCells = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0 && candidates[r][c].size === 2) {
          bivalueCells.push({ r, c, vals: [...candidates[r][c]] });
        }
      }
    }

    if (bivalueCells.length >= 3) {
      for (let i = 0; i < bivalueCells.length; i++) {
        const A = bivalueCells[i]; // Pivot candidate
        const X = A.vals[0];
        const Y = A.vals[1];
        
        // Find pincers
        for (let j = 0; j < bivalueCells.length; j++) {
          if (i === j) continue;
          const B = bivalueCells[j]; // Pincer 1 (sees A, contains X and Z)
          
          // Check if B sees A (shares row, col, or box)
          const housesA = getCellHouses(A.r, A.c);
          const housesB = getCellHouses(B.r, B.c);
          const BSeesA = (A.r === B.r || A.c === B.c || housesA.box === housesB.box);
          if (!BSeesA) continue;
          
          // B must contain X and another value Z (not Y)
          if (!B.vals.includes(X)) continue;
          const Z = B.vals[0] === X ? B.vals[1] : B.vals[0];
          if (Z === Y) continue; // must be bivalue with X and Z, Z !== Y
          
          for (let k = 0; k < bivalueCells.length; k++) {
            if (k === i || k === j) continue;
            const C = bivalueCells[k]; // Pincer 2 (sees A, contains Y and Z)
            
            // Check if C sees A
            const housesC = getCellHouses(C.r, C.c);
            const CSeesA = (A.r === C.r || A.c === C.c || housesA.box === housesC.box);
            if (!CSeesA) continue;
            
            // C must contain Y and Z
            if (!C.vals.includes(Y) || !C.vals.includes(Z)) continue;
            
            // B and C must not see each other (if they see each other, it's just a naked triple)
            const BSeesC = (B.r === C.r || B.c === C.c || housesB.box === housesC.box);
            if (BSeesC) continue;
            
            // We have pivot A {X, Y}, pincer B {X, Z}, pincer C {Y, Z}
            // Find cells D that see both B and C and have candidate Z
            const elims = [];
            for (let r = 0; r < 9; r++) {
              for (let c = 0; c < 9; c++) {
                if (board[r][c] === 0 && (r !== B.r || c !== B.c) && (r !== C.r || c !== C.c) && (r !== A.r || c !== A.c)) {
                  const housesD = getCellHouses(r, c);
                  const DSeesB = (r === B.r || c === B.c || housesD.box === housesB.box);
                  const DSeesC = (r === C.r || c === C.c || housesD.box === housesC.box);
                  
                  if (DSeesB && DSeesC) {
                    eliminateCandidate(r, c, Z, elims);
                  }
                }
              }
            }
            
            if (elims.length > 0) {
              steps.push({
                technique: 'XY-Wing',
                description: `發現 XY-Wing！樞紐格 (R${A.r+1}, C${A.c+1}) 候選數為 {${X}, ${Y}}，翼格 (R${B.r+1}, C${B.c+1}) 候選數為 {${X}, ${Z}}，另一翼格 (R${C.r+1}, C${C.c+1}) 候選數為 {${Y}, ${Z}}。因此，能同時看見兩個翼格的儲存格不能包含候選數 ${Z}，從中排除 ${Z}。`,
                cell: null,
                value: null,
                eliminations: elims,
                highlightCells: [
                  { r: A.r, c: A.c, role: 'pivot' },
                  { r: B.r, c: B.c, role: 'pincer1' },
                  { r: C.r, c: C.c, role: 'pincer2' },
                  ...elims.map(e => ({ r: e.r, c: e.c, role: 'eliminated' }))
                ]
              });
              updateMaxTechnique('XY-Wing');
              foundXYWing = true;
              progress = true;
              break;
            }
          }
          if (foundXYWing) break;
        }
        if (foundXYWing) break;
      }
    }
    if (foundXYWing) continue;
  }

  // Check if grid is fully solved
  let solved = true;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) solved = false;
    }
  }

  return {
    solved,
    steps,
    difficulty: maxTechnique,
    board
  };
}

// Generate puzzle of specific difficulty
// Target can be 'Easy', 'Medium', 'Hard', 'Expert'
function generatePuzzle(targetDifficulty = 'Easy', progressCallback = null) {
  let attempts = 0;
  const targetOrder = { 'Easy': 0, 'Medium': 1, 'Hard': 2, 'Expert': 3 };
  const targetLvl = targetOrder[targetDifficulty];

  while (attempts < 100) {
    attempts++;
    if (progressCallback) progressCallback(attempts);
    
    // 1. Create a full random solved board
    const full = generateFullBoard();
    const puzzle = full.map(row => [...row]);
    
    // 2. Shuffle cells list
    const cells = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        cells.push({ r, c });
      }
    }
    // Shuffling
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    // 3. Remove clues and check uniqueness and difficulty
    let currentDifficulty = 'Easy';
    let cluesCount = 81;
    
    for (const cell of cells) {
      // Dynamic stopping for clue count and difficulty matching
      if (currentDifficulty === targetDifficulty) {
        if (targetDifficulty === 'Easy' && cluesCount <= 38) break;
        if (targetDifficulty === 'Medium' && cluesCount <= 31) break;
        if (targetDifficulty === 'Hard' && cluesCount <= 27) break;
        if (targetDifficulty === 'Expert' && cluesCount <= 23) break;
      }

      const originalVal = puzzle[cell.r][cell.c];
      puzzle[cell.r][cell.c] = 0;
      
      // Check uniqueness of solution
      const { count } = countSolutions(puzzle, 2);
      if (count === 1) {
        // Evaluate difficulty of the remaining puzzle using logical solver
        const evaluation = logicalSolve(puzzle);
        
        // If solved by logical solver, let's look at its difficulty
        if (evaluation.solved) {
          const evalLvl = targetOrder[evaluation.difficulty] || 0;
          if (evalLvl <= targetLvl) {
            // Keep this removal, difficulty is within limits
            currentDifficulty = evaluation.difficulty;
            cluesCount--;
            continue;
          }
        } else {
          // If logical solver cannot solve it, but backtrack count is 1:
          // This puzzle requires techniques higher than XY-Wing.
          // This is suitable only for Expert/Master level.
          if (targetDifficulty === 'Expert') {
            currentDifficulty = 'Expert';
            cluesCount--;
            continue;
          }
        }
      }
      
      // If we broke uniqueness or difficulty exceeded target, put it back
      puzzle[cell.r][cell.c] = originalVal;
    }

    // Double check final clues count
    let finalCluesCount = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (puzzle[r][c] !== 0) finalCluesCount++;
      }
    }

    // Validate if the generated puzzle meets the difficulty requirements
    const meetsDifficulty = currentDifficulty === targetDifficulty;
    
    // We also want some reasonable clues bounds for user experience
    let reasonableClues = false;
    if (targetDifficulty === 'Easy' && finalCluesCount >= 32 && finalCluesCount <= 46) reasonableClues = true;
    else if (targetDifficulty === 'Medium' && finalCluesCount >= 26 && finalCluesCount <= 38) reasonableClues = true;
    else if (targetDifficulty === 'Hard' && finalCluesCount >= 22 && finalCluesCount <= 32) reasonableClues = true;
    else if (targetDifficulty === 'Expert' && finalCluesCount >= 17 && finalCluesCount <= 28) reasonableClues = true;

    if (meetsDifficulty && reasonableClues) {
      return {
        puzzle,
        solution: full,
        difficulty: targetDifficulty,
        clues: finalCluesCount,
        attempts
      };
    }
  }

  // Fallback: If after 100 attempts we didn't get the perfect puzzle, 
  // just generate one with relaxed clues constraints or return the best we have.
  const full = generateFullBoard();
  const puzzle = full.map(row => [...row]);
  let removed = 0;
  let targetClues = 40;
  if (targetDifficulty === 'Medium') targetClues = 33;
  if (targetDifficulty === 'Hard') targetClues = 28;
  if (targetDifficulty === 'Expert') targetClues = 23;
  
  const cells = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      cells.push({ r, c });
    }
  }
  cells.sort(() => Math.random() - 0.5);

  for (const cell of cells) {
    if (81 - removed <= targetClues) break;
    const originalVal = puzzle[cell.r][cell.c];
    puzzle[cell.r][cell.c] = 0;
    const { count } = countSolutions(puzzle, 2);
    if (count === 1) {
      removed++;
    } else {
      puzzle[cell.r][cell.c] = originalVal;
    }
  }

  return {
    puzzle,
    solution: full,
    difficulty: targetDifficulty,
    clues: 81 - removed,
    attempts: attempts + ' (fallback)'
  };
}

// Auto-fill candidates based on current board state (user entries + givens)
function autoCandidates(grid) {
  const result = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []));
  
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] !== 0) continue;
      
      const s = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      for (let i = 0; i < 9; i++) {
        s.delete(grid[r][i]);
        s.delete(grid[i][c]);
      }
      const br = Math.floor(r / 3) * 3;
      const bc = Math.floor(c / 3) * 3;
      for (let dr = 0; dr < 3; dr++) {
        for (let dc = 0; dc < 3; dc++) {
          s.delete(grid[br + dr][bc + dc]);
        }
      }
      result[r][c] = [...s].sort();
    }
  }
  return result;
}

// Export for Node/CommonJS or attach to window for browser
if (typeof exports !== 'undefined') {
  module.exports = {
    isValid,
    countSolutions,
    generateFullBoard,
    logicalSolve,
    generatePuzzle,
    autoCandidates,
    getHouseCells,
    getCellHouses,
    getHouseName
  };
} else {
  window.SudokuEngine = {
    isValid,
    countSolutions,
    generateFullBoard,
    logicalSolve,
    generatePuzzle,
    autoCandidates,
    getHouseCells,
    getCellHouses,
    getHouseName
  };
}
