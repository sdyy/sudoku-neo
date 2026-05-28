# Sudoku Neo 開發任務清單

- [x] 核心引擎與邏輯解題器開發 (`sudoku.js`)
  - [x] 數獨基礎資料結構與回溯解題器 (Backtracking Solver)
  - [x] 邏輯解題方法實作 (Naked Single, Hidden Single, Pointing, Claiming, Naked/Hidden Pair, X-Wing, XY-Wing)
  - [x] 難度分級與隨機挖洞生成算法
- [x] 網頁背景生成器開發 (`generator.worker.js`)
  - [x] Web Worker 通訊與生成流程
- [x] 前端介面與美化樣式開發 (`styles.css` 與 `index.html`)
  - [x] CSS 設計系統（變數、字型、Glassmorphism 風格、排版）
  - [x] Responsive 數獨網格與候選數排版
  - [x] HTML 語意化結構與無障礙標籤
- [x] UI 互動與存檔邏輯開發 (`app.js`)
  - [x] 鍵盤/滑鼠/觸控格點選取與輸入邏輯
  - [x] Undo/Redo 復原重做歷史管理器
  - [x] 遊戲進度與計時器存檔 (`localStorage`)
  - [x] 教學式提示系統與視覺標記
- [x] 測試與驗證
  - [x] 撰寫進階技巧測試 (`test_solver.js`) 並以 `node` 執行驗證
  - [x] 瀏覽器相容性與 Worker 效能手動測試


