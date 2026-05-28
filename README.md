# 🌌 Sudoku Neo - 智慧數獨

一款純本地端運行的現代化數獨遊戲。採用精美的 **Glassmorphism (玻璃擬物化)** 視覺風格，支援隨機難度謎題生成、無限步復原重做、自動存檔、個人統計數據，以及專為學習設計的**智能邏輯提示系統**。

👉 **[立即線上遊玩！](https://sdyy.github.io/sudoku-neo/)**

---

## ✨ 核心特色

*   🎨 **極致現代美學**：精緻的玻璃擬物化 UI 設計，搭配動態漸層背景與滑順的微交互動畫。完整支援**深色主題**（預設）與**淺色主題**一鍵切換。
*   🚀 **本地端即時生成**：結合**隨機化回溯演算法**與 **Web Worker 異步運算**。謎題生成在背景獨立執行緒進行，主網頁動畫毫不卡頓，0.1 秒即可完成載入。
*   🎓 **教學式提示系統 (Tutorial Hints)**：
    提示不只是給答案！系統會使用「邏輯解題器」分析當前盤面，用亮色在網格上高亮相關儲存格，並以繁體中文圖解推導過程，引導您學習以下高階數獨技巧：
    *   *Naked/Hidden Single (唯一餘數 / 隱性單數)*
    *   *Pointing Pairs/Triples (區塊摒除法)*
    *   *Box-Line Reduction / Claiming (行列區塊摒除)*
    *   *Naked/Hidden Pairs (顯性 / 隱性對數)*
    *   *X-Wing / XY-Wing (X翼 / XY翼)*
*   ✍️ **草稿輔助 (Pencil Marks)**：支援填寫小數字候選數，並提供一鍵「自動填充所有候選數 (Auto Candidates)」功能，助您快速進行中高難度推理。
*   💾 **進度自動保存**：利用瀏覽器 `localStorage`，隨時關閉網頁皆可自動恢復進度（含計時器與復原堆疊）。
*   🏆 **個人戰績與最佳紀錄 (v1.1.4)**：
    *   記錄各難度（簡單、中等、困難、專家）的**個人最佳通關時間**與**平均失誤數**。
    *   顯示最近 15 局通關明細，並針對手機螢幕寬度自動進行響應式排版（隱藏次要欄位以防切邊）。
*   🛡️ **氣泡防禦機制**：針對 DOM 重繪與點擊穿透進行了優化，點擊格子時不會誤判為失焦，觸控精準。

---

## 🛠️ 技術棧

*   **HTML5**：語意化標籤，結構清晰，符合 SEO 最佳實踐。
*   **CSS3**：純 Vanilla CSS 設計，極致彈性彈性佈局（CSS Grid / Flexbox）適配 iOS/Android 與桌面端。
*   **ES6 JavaScript**：純原生邏輯運算，零外部依賴庫（Zero Dependencies）。
*   **Web Worker API**：背景非同步生成謎題，防阻 UI 卡頓。
*   **LocalStorage API**：本地端儲存遊戲狀態與歷史戰績。

---

## 📂 專案目錄結構

```bash
├── index.html          # 網頁主要骨架與彈窗結構
├── styles.css          # Glassmorphism 樣式與手機端響應式 CSS 規則
├── app.js              # UI 渲染、事件監聽與遊戲狀態控制
├── sudoku.js           # 數獨核心生成引擎與邏輯解題器 (提供提示與評級)
├── generator.worker.js # Web Worker 背景執行緒，專責謎題生成
├── test_solver.js      # 解題演算法單元測試腳本
└── .github/
    └── workflows/
        └── deploy.yml  # GitHub Actions 自動化部署設定 (GitHub Pages)
```

---

## 💻 本機運行與開發

本專案完全不需任何伺服器或建置工具，即可直接在您的瀏覽器運行！

1. 克隆此專案：
   ```bash
   git clone git@github.com:sdyy/sudoku-neo.git
   cd sudoku-neo
   ```
2. 雙擊開啟 `index.html`，即可直接開始遊玩！

---

## 🧪 運行演算法測試

如果您修改了 `sudoku.js` 的解題引擎，可以使用 Node.js 運行測試腳本驗證正確性：

```bash
node test_solver.js
```

---

## 📄 開源授權

本專案採用 **MIT License** 授權。歡迎自由修改與二次分發。
