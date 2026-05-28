# 數獨遊戲實作計畫 (Sudoku Neo) - 新增戰績與歷史紀錄系統

設計一款純本地端運行的現代化數獨遊戲。本計畫新增「個人戰績與歷史紀錄系統」，以記錄並展示玩家的最佳通關時間、平均失誤次數以及各難度的挑戰狀況。

## 使用者審查項目
> [!IMPORTANT]
> - **持久化儲存 (`localStorage`)**：戰績紀錄將完全存儲於本地瀏覽器，重啟或重新整理網頁皆不會遺失。
> - **歷史燈箱 (Modal) 設計**：點擊頂部導航欄的「📊 戰績」按鈕，將彈出半透明磨砂玻璃感 (Glassmorphism) 的燈箱，展示各難度最佳紀錄與近期戰績列表。
> - **最佳時間與錯誤率計算**：
>   - **最佳時間**：各個難度分開計算最短通關秒數。
>   - **平均錯誤數**：統計玩家在該難度下的平均失誤次數（如平均 0.4 次/局）。

## 新增功能設計

### 1. 資料結構 (`localStorage`)
紀錄陣列將命名為 `sudoku_neo_records`，每個紀錄包含以下欄位：
```typescript
interface GameRecord {
  id: string;          // 隨機唯一識別碼
  timestamp: number;   // 通關時間戳記 (Date.now())
  difficulty: string;  // 難度等級 (Easy, Medium, Hard, Expert)
  duration: number;    // 通關時間 (單位: 秒)
  mistakes: number;    // 通關時的失誤次數 (0 ~ 2，第 3 次失誤即失敗不計入)
  technique: string;   // 此局使用到的最高難度技巧 (如 Pointing Pair, XY-Wing)
}
```

### 2. UI 畫面配置 (HTML)
*   **入口按鈕**：在頂部 header 的「切換主題」旁，新增一個「📊 戰績」按鈕。
*   **統計燈箱 (`.stats-overlay`)**：
    *   **總結卡片 (Summary Cards)**：以 2x2 格狀網格顯示各難度（簡單、中等、困難、專家）的「最佳時間」與「平均失誤數」。
    *   **近期戰績列表 (History List)**：一個可以垂直捲動的列表，展示最近 10 次的通關詳情（包含日期、難度標籤、通關耗時、失誤數、使用最高技巧）。
    *   **控制按鈕**：包含「關閉」以及「清除所有紀錄（需確認）」按鈕。

### 3. CSS 視覺設計 (CSS)
*   建立具備毛玻璃磨砂質感、高對比度的燈箱外框，支援深/淺色主題。
*   使用 HSL 變數繪製四種難度的彩色標籤（例如：簡單 - 綠色、中等 - 黃色、困難 - 橙色、專家 - 紫色）。
*   手機端高度自適應，列表設定 `max-height` 與 `overflow-y: auto` 以免超出視窗。

---

## 預定變更

### [Component: UI & Styles]

#### [MODIFY] [index.html](file:///C:/Users/10110012/Documents/antigravity/silly-carson/index.html)
- 在標頭 `<header>` 中的主題切換按鈕旁，新增戰績燈箱入口按鈕 `<button id="statsToggleBtn">`。
- 在底部的 `main` 容器後方新增戰績燈箱模組 `<div id="statsOverlay" class="stats-overlay">`。

#### [MODIFY] [styles.css](file:///C:/Users/10110012/Documents/antigravity/silly-carson/styles.css)
- 新增戰績燈箱相關樣式，包含 `.stats-overlay`、`.stats-modal`、`.stats-grid`、`.history-table` 等。
- 確保其在手機窄螢幕上為響應式排版，文字大於 11px 以利閱讀。

---

### [Component: Core Logic & Controllers]

#### [MODIFY] [app.js](file:///C:/Users/10110012/Documents/antigravity/silly-carson/app.js)
- 新增 `loadRecords()`、`saveRecord(record)`、`clearRecords()` 等資料管理邏輯。
- 在遊戲挑戰成功（`showSuccessOverlay()` 被觸發）時，自動計算本次成績並呼叫 `saveRecord()` 存檔。
- 新增控制燈箱開啟與關閉的事件監聽，以及動態繪製燈箱內統計數字與歷史清單的 `renderStats()` 函式。

---

## 驗證計畫

### 手動驗證步驟
1. **記錄生成**：
   - 順利解出一局簡單難度數獨，檢查是否成功跳出通關畫面，且網頁 `localStorage` 中的 `sudoku_neo_records` 是否自動新增一筆對應數據。
2. **燈箱呈現與統計**：
   - 點擊頂部「📊 戰績」按鈕，確認燈箱順利開啟，且剛才通過的紀錄是否已正確統計在「簡單難度」的最佳時間中，且歷史列表中顯示該筆通關明細。
3. **多難度測試**：
   - 模擬或手動解出中等與專家級數獨，驗證不同難度是否各自計入各自的最佳時間。
4. **清除功能**：
   - 點擊「清除所有紀錄」按鈕，點選確認後，確認 `localStorage` 已清空，且燈箱內顯示「目前尚無任何通關紀錄」。
