# 數獨遊戲實作計畫 (Sudoku Neo)

設計一款純本地端運行的現代化數獨遊戲。遊戲支援依難度隨機生成謎題，並內建「教學式提示系統」，能辨識高級解題技巧（如 X-Wing, XY-Wing, 指向對數等），且支援草稿（Pencil Marks）功能與 Web Worker 非同步生成，確保流暢的互動體驗。

## 使用者審查項目
> [!IMPORTANT]
> - **高級技巧驗證**：高難度謎題（Hard/Expert）的生成需要透過邏輯解題器進行分析與篩選。為了避免瀏覽器主執行緒因生成高難度謎題而卡頓，我們將使用 Web Worker 進行非同步生成，並搭配精美的載入動畫。
> - **提示系統設計**：當使用者請求提示時，系統將分析當前盤面，並**視覺化標記**涉及的單元格，同時以繁體中文說明使用的技巧名稱與推導邏輯（例如：「顯性對數」、「X翼」），而非僅直接填入數字，以達到教學效果。

## 開放問題
> [!NOTE]
> 1. **錯誤限制**：是否需要限制錯誤次數（例如：經典的 3 次錯誤即失敗），或者提供切換開關讓玩家自行選擇「經典模式」與「無盡練習模式」？
> 2. **草稿自動填寫**：是否需要提供「自動填寫所有候選數（Auto Candidates）」的功能，幫助玩家在中高難度中快速進入邏輯推理？
> 3. **本地存檔**：是否需要支援 `localStorage` 自動儲存當前遊戲進度，以便玩家在關閉網頁後能隨時繼續？
> 
> *註：計畫中預設將同時實作這些便利功能（錯誤限制開關、自動候選數、自動存檔），以提供最頂級的遊戲體驗。*

## 預定變更

---

### [Component: Core Engine & Logical Solver]
負責數獨的核心邏輯，包括隨機生成、盤面驗證、以及基於人類思維的邏輯解題器（用於難度評級與提示說明）。

#### [NEW] [sudoku.js](file:///C:/Users/10110012/Documents/antigravity/silly-carson/sudoku.js)
實作數獨引擎：
1. **資料結構**：
   - `SudokuBoard` 類別，保存 9x9 網格的狀態。每個格子包含：`value`（目前填寫值）、`solution`（正解）、`isGiven`（初始提示數）、`candidates`（候選數陣列/集合）。
2. **回溯解題器 (Backtracking Solver)**：
   - 用於快速驗證謎題是否有唯一解，以及計算解的數量。
3. **邏輯解題器 (Logical Solver)**：
   - 模擬人類解題步驟，按難度順序尋找解法：
     - **Naked Single (唯一餘數)**
     - **Hidden Single (隱性單數)**
     - **Pointing Pairs/Triples (區塊摒除法)**
     - **Box-Line Reduction / Claiming (行列區塊摒除法)**
     - **Naked Pair (顯性對數)**
     - **Hidden Pair (隱性對數)**
     - **X-Wing (X翼)**
     - **XY-Wing (XY翼)**
   - 每次解題會記錄詳細的步驟與涉及的單元格（格子的列、行、受影響的候選數），作為提示系統的輸入。
4. **難度分級與謎題生成器**：
   - 隨機生成終端盤面。
   - 隨機挖去數字，並使用邏輯解題器評估剩餘盤面。
   - 根據使用的最高技巧評定難度：
     - **Easy (簡單)**：僅需 Naked/Hidden Single。
     - **Medium (中等)**：需要 Pointing/Claiming 或 Naked Pair。
     - **Hard (困難)**：需要 Hidden Pair 或 X-Wing。
     - **Expert (專家)**：需要 XY-Wing 或更高級的技巧。

#### [NEW] [generator.worker.js](file:///C:/Users/10110012/Documents/antigravity/silly-carson/generator.worker.js)
- 將數獨生成邏輯放入 Web Worker 中。
- 透過 `postMessage` 與主執行緒通訊，傳遞生成進度與最終生成的謎題資料，防止 UI 卡頓。

---

### [Component: User Interface & Styles]
提供高質感的視覺外觀與順暢的互動效果。

#### [NEW] [styles.css](file:///C:/Users/10110012/Documents/antigravity/silly-carson/styles.css)
- **視覺風格**：
  - 採用 **Glassmorphism (玻璃擬物化)** 風格，搭配深色主題（預設）與淺色主題。
  - 柔和的漸層背景（Sleek purple/blue gradients），精緻的陰影與微動效。
  - 使用現代字型（例如首選 `Outfit`, `Inter`，無網路時回退至系統優質 sans-serif）。
- **網格版面**：
  - 自適應（Responsive）數獨網格，在手機與桌機上皆能完美呈現。
  - 3x3 大宮格線加粗，格線顏色有層次。
  - 候選數（3x3 小網格）在每個格子內部精細排版。
- **狀態與互動視覺**：
  - 選取狀態（選取的單元格、同列同行的十字高亮、相同數字的全盤高亮）。
  - 錯誤狀態（衝突數字以微弱紅色外框與文字抖動提示）。
  - 提示動畫（Hint 觸發時，以綠色/黃色漸進高亮受影響的單元格）。

#### [NEW] [index.html](file:///C:/Users/10110012/Documents/antigravity/silly-carson/index.html)
- 網頁結構：標題區、設定與狀態區（計時器、難度、錯誤數）、數獨畫布/網格區、控制面板（鉛筆模式切換、復原/重做、提示、橡皮擦、自動填寫）、數字鍵盤（1-9）。
- 整合 SEO 最佳實踐：適當的語意化標籤（`<header>`, `<main>`, `<section>` 等）、合適的 `title` 與 `meta` 描述。

#### [NEW] [app.js](file:///C:/Users/10110012/Documents/antigravity/silly-carson/app.js)
- 初始化 UI 與綁定事件。
- 與 `generator.worker.js` 通訊，管理遊戲狀態（進行中、暫停、完成、載入中）。
- 鍵盤事件監聽（方向鍵移動選取框、1-9 填值、Delete/Backspace 刪除、Space 切換鉛筆模式）。
- 實作 Undo/Redo 歷史紀錄堆疊。
- 管理計時器與 `localStorage` 存檔/讀檔邏輯。

---

## 驗證計畫

### 自動化測試與靜態檢查
- 開發完成後，撰寫一組簡單的測試腳本 `test_solver.js`，包含已知的數獨盤面，執行並驗證邏輯解題器能否正確識別 X-Wing, XY-Wing 等進階技巧。
- 使用瀏覽器主控台進行效能檢查，驗證 Worker 生成不同難度數獨的平均耗時。

### 手動驗證步驟
1. **生成與難度**：
   - 點擊 New Game，選擇不同難度，確認 Worker 順利生成，且 UI 顯示載入動畫。
2. **基本操作與輔助**：
   - 測試滑鼠點擊與鍵盤方向鍵導航。
   - 測試 Pen (正常輸入) 與 Pencil (填寫候選數) 模式。
   - 測試 Auto Candidates (自動填寫候選數) 能否準確排除已被同行列宮佔用的數字。
   - 測試 Undo/Redo 是否正常運作。
3. **提示與高級技巧**：
   - 點擊 Hint 鈕，檢查是否能正確顯示提示說明文字（包含步驟名稱與邏輯說明），並在盤面上以不同顏色高亮對應的儲存格。
4. **狀態持久化**：
   - 填寫部分數字後，重新整理網頁，確認進度（包括計時器與 Undo 歷史）能完美恢復。
