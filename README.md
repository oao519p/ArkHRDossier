# Arknights HR Dossier

明日方舟人事部文檔 — 玩家幹員資料查詢工具，支援繁中服（SKPORT）與簡中服（SKLAND）。

![version](https://img.shields.io/badge/version-v0.2.0--beta-blue)
![preview](https://img.shields.io/badge/status-active-brightgreen)

> ⚠️ 僅支援電腦版瀏覽器，手機版功能可能無法正常使用

---

## 功能

- 透過 SKPORT / SKLAND API 取得玩家幹員資料
- 或直接上傳本地 JSON 檔案
- **卡片模式**：幹員半身像卡片，包含精英化、等級、潛能、技能、模組
  - 模組切換：預設模組 / 全部模組 / 關閉不顯示
  - 技能切換：預設模組 / 全部模組 / 關閉不顯示
- **表格模式**：完整資訊列表，顯示全部技能與模組
- **數據統計欄位**：精二 / 技能專三/二/一 / 模組 Lv1-3，支援六/五/四星篩選
- 職業 / 稀有度 / 等級 / 獲取時間排序、搜尋名稱
- 深色 / 淺色模式
- 輸出：下載 HTML（快速外連 / 完整離線）、下載卡片圖片 ZIP、下載 JSON

---

## 本地執行

### 需求

- [Node.js](https://nodejs.org) LTS 版本

### 步驟

```bash
# 1. clone 專案
git clone https://github.com/oao519p/Arknights_OperatorInfo.git
cd Arknights_OperatorInfo

# 2. 安裝依賴
npm install

# 3. 啟動本地 server
npm run serve
```

瀏覽器開啟 `http://localhost:8080`

> ⚠️ 不可直接用瀏覽器開啟 `index.html`（`file://` 協議會封鎖 ES module 載入）

---

## 取得憑證

1. 瀏覽器開啟 [SKPORT](https://www.skport.com) 或 [SKLAND](https://www.skland.com) 並登入
2. 按 `F12` 開啟開發者工具，切換到 **Console** 分頁
3. 貼上以下指令並按 Enter：

```js
copy(localStorage.getItem('SK_OAUTH_CRED_KEY') + ',' + localStorage.getItem('SK_TOKEN_CACHE_KEY'))
```

4. 剪貼簿會自動複製 `cred,token`，貼入網頁輸入框即可

---

## 檔案結構

```
Arknights_OperatorInfo/
├── index.html        # 主頁面
├── serve.js          # 本地開發 HTTP server
├── fetch_skport.js   # Node.js CLI 資料抓取腳本
├── package.json
├── css/
│   ├── main.css      # 流程步驟、topbar 樣式
│   └── cards.css     # 幹員卡片樣式
├── js/
│   ├── api.js        # API 簽名與呼叫
│   ├── cards.js      # 卡片渲染邏輯
│   └── main.js       # 流程控制
└── image/            # 本地技能圖片備份
```
---

## 資源

- 圖片資源：[PRTS Wiki](https://prts.wiki)
- API：[SKPORT](https://www.skport.com) / [SKLAND](https://www.skland.com)

## 回報問題

- [Facebook](https://www.facebook.com/obeigon)
- [GitHub Issues](https://github.com/oao519p/Arknights_OperatorInfo/issues)
