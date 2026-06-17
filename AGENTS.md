# Arknights Operator Info — AGENTS.md

## 專案概述

明日方舟幹員卡片查詢工具，支援繁中服（SKPORT）與簡中服（SKLAND）。
使用者輸入憑證後，透過 API 取得幹員資料，並以視覺化卡片呈現。

**技術棧：** 純 JavaScript（ES Modules）+ HTML + CSS，無框架依賴。
**執行環境：** Node.js（本地 dev server）+ 現代瀏覽器。

---

## 檔案架構

```
Arknights_OperatorInfo/
├── index.html          # 主頁面（三步驟流程 + 卡片檢視器）
├── serve.js            # 本地 HTTP dev server（port 8080）
├── fetch_skport.js     # Node.js CLI 腳本，直接輸出 JSON 檔案
├── package.json        # 依賴：axios、crypto-js（僅 CLI 用）
├── css/
│   ├── main.css        # 流程步驟、topbar、深/淺色模式樣式
│   └── cards.css       # 幹員卡片樣式（grid、portrait、badge 等）
└── js/
    ├── api.js          # API 簽名（HMAC-SHA256 + MD5）與 fetch 呼叫
    ├── cards.js        # 卡片渲染、篩選、排序、匯出（HTML/ZIP/JSON）
    └── main.js         # 流程控制（步驟切換、JSON 上傳）
```

---

## 常用指令

```bash
# 安裝依賴（首次或更新後執行）
npm install

# 啟動本地 dev server（瀏覽器開啟 http://localhost:8080）
npm run serve

# 執行 CLI 資料抓取腳本（需先在 fetch_skport.js 填入 INPUT 憑證）
npm start
```

> ⚠️ **不可直接用瀏覽器開啟 `index.html`**（`file://` 協議會封鎖 ES module 載入）

---

## 資料流程

```
使用者輸入 cred,token
    → api.js: parseCredInput()
    → api.js: fetchBinding()        # 取得綁定帳號列表
    → api.js: fetchPlayerInfo(uid)  # 取得完整幹員資料
    → cards.js: initViewer(data)    # 渲染卡片 grid
```

**JSON 上傳路徑（跳過 API）：**
```
上傳本地 JSON → main.js: FileReader → cards.js: initViewer(data)
```

---

## API 說明

### 支援平台

| 平台 | Domain | 說明 |
|------|--------|------|
| SKPORT | `https://zonai.skport.com` | 繁中服（海外版森空島） |
| SKLAND | `https://zonai.skland.com` | 簡中服（森空島） |

### 簽名機制（`js/api.js: getSign()`）

1. 取得當前 Unix timestamp（毫秒 - 300ms，轉秒）
2. 組合 `headerObj = { platform: '3', timestamp, dId: '', vName: '1.0.0' }`
3. `signStr = path + params + timestamp + JSON.stringify(headerObj)`
4. `sign = MD5(HmacSHA256(signStr, token))`
5. 將 `cred`、`timestamp`、`sign` 等放入 request headers

### 取得憑證方式

1. 登入 [SKPORT](https://www.skport.com) 或 [SKLAND](https://www.skland.com)
2. 按 `F12` → Console，執行：
   ```js
   copy(localStorage.getItem('SK_OAUTH_CRED_KEY') + ',' + localStorage.getItem('SK_TOKEN_CACHE_KEY'))
   ```
3. 剪貼簿內容即為 `cred,token`，貼入網頁輸入框

---

## 圖片資源

所有圖片來自 [PRTS Wiki](https://torappu.prts.wiki)，URL 規則：

| 類型 | URL 格式 |
|------|---------|
| 幹員立繪 | `https://torappu.prts.wiki/assets/char_portrait/{skinId}.png` |
| 職業圖示 | `https://torappu.prts.wiki/assets/profession_large_icon/icon_profession_{prof}_large.png` |
| 精英化圖示 | `https://torappu.prts.wiki/assets/elite_icon/elite_{phase}_large.png` |
| 技能圖示 | `https://torappu.prts.wiki/assets/skill_icon/skill_icon_{id}.png` |
| 稀有度圖示 | `https://torappu.prts.wiki/assets/rarity_icon/rarity_{r}.png` |
| 潛能圖示 | `https://torappu.prts.wiki/assets/potential_icon/potential_{r}.png` |
| 模組圖示 | `https://torappu.prts.wiki/assets/uniequip_direction/{typeIcon}.png` |

**skinId 轉換規則（`cards.js: skinIdToUrl()`）：**
- 含 `@`：將 `@` 替換為 `_`，`#` 替換為 `%23`
- 不含 `@`：將 `#` 替換為 `_`

**本地備份技能圖片：** `./image/` 目錄，`LOCAL_SKILLS` Set 中列出的 ID 優先使用本地圖片。

---

## 開發慣例

- **模組系統**：ES Modules（`type: "module"`），使用 `import/export`
- **DOM 操作**：原生 JS，無框架，`DOMContentLoaded` 後綁定事件
- **錯誤處理**：API 錯誤顯示於對應步驟的 `err-*` 元素
- **狀態管理**：`cards.js` 中以模組層級變數（`gData`、`sortMode` 等）管理狀態
- **圖片載入失敗**：`img.onerror` 處理，本地技能圖片 fallback 至 `skchr_svrash_1.png`，其他圖片設為透明
- **匯出功能**：HTML 匯出會將本地圖片 inline 為 base64；ZIP 匯出使用 CDN 載入 `html2canvas` + `jszip`

---

## 常見問題

- **CORS 錯誤**：必須透過 `npm run serve` 啟動 server，不可直接開啟 `index.html`
- **憑證過期**：SKPORT/SKLAND token 有時效性，需重新從 localStorage 取得
- **CLI 腳本**：`fetch_skport.js` 需手動在檔案內填入 `INPUT` 憑證，不接受命令列參數
- **`CryptoJS` 來源**：CLI 腳本使用 npm 套件；瀏覽器端 `api.js` 使用 CDN（`index.html` 中載入）

---

## 編隊模式（PRTS 模式）

新增的檢視模式，參考 PRTS Wiki 的 half-container 風格排版。

### 檢視模式

| 模式 | `viewMode` 值 | 說明 |
|------|---------------|------|
| 編隊模式 | `'prts'` | PRTS 風格卡片，120×250px，裝飾圖層疊加 |
| 卡片模式 | `'card'` | 原有卡片模式 |
| 表格模式 | `'table'` | 表格列表 |

**預設模式**：編隊模式（`viewMode = 'prts'`）

### 檔案

| 檔案 | 說明 |
|------|------|
| `css/cards.css` | 末尾新增 `.prts-card`、`.prts-grid`、`.prts-wrap` 等專屬 CSS |
| `js/cards.js` | 新增 `renderPRTS()` 函數、`isMaxLevel()` 滿級判斷 |
| `index.html` | 檢視列新增 `<button data-view="prts">編隊模式</button>` |

### CSS 層次（z-index）

| z-index | 元素 | 說明 |
|---------|------|------|
| 1 | `.deco-bg-img` | 背景裝飾 |
| 2 | `.portrait-bg` | 半身像（`<img>` + `object-fit: cover`） |
| 3 | `.patch` | 左下角底色填充 |
| 3 | `.deco-light` | 亮光 |
| 4 | `.deco-lh` | lh 底部裝飾 |
| 5 | `.deco-uhs` | uh 陰影 |
| 6 | `.deco-uh` | uh 左上角裝飾 |
| 7 | `.prof-icon` | 職業圖示 |
| 8 | `.rarity-stars` | 稀有度 |
| 9 | `.bottom-row` | 底部 UI（等級、模組、技能、名字） |
| 10 | `.all-spec3-badge` | 全技能專三標誌（右上角） |

### 裝飾圖片（本地）

| 圖片 | 路徑 | 稀有度邏輯 |
|------|------|-----------|
| uh | `./image/deco-uh/{r}.png` | 按稀有度 0-5 各用對應檔案 |
| uhs | `./image/deco-uh/uhs.png` | 統一使用同一個 |
| lh | `./image/deco-lh/{r}.png` | 0-2 共用 `0.png`，3-5 各用對應 |
| light | `./image/deco-light/{r}.png` | 按稀有度 0-5 各用對應檔案 |
| bg-img | `./image/deco-bg-img/{r}.png` | 0-2 共用 `0.png`，3-5 各用對應 |

### 滿級等級圈

滿級時等級圈顯示金色漸層邊框（`#fadc06` → `#c49a00` → fade out）。

**滿級條件**：

| 稀有度 | 精二 | 精一 | 精零 |
|--------|------|------|------|
| ★6 | Lv90 | Lv80 | Lv50 |
| ★5 | Lv80 | Lv70 | Lv50 |
| ★4 | Lv70 | Lv60 | Lv45 |
| ★3 | — | Lv55 | Lv40 |
| ★1-2 | — | — | Lv30 |

### 全技能專三標誌（`all-spec3-badge`）

符合條件時在卡片右上角（`top:4px right:5px`，z-index 10）顯示 `./image/specialized_icon/spec3.png`：

| 稀有度 | 需要技能數 | 條件 |
|--------|-----------|------|
| rarity 5（★6） | 3 | 全部 `specializeLevel === 3` |
| rarity 4（★5）/ rarity 3（★4） | 2 | 全部 `specializeLevel === 3` |
| rarity 2 以下 | — | 不顯示 |

- `visFlags['spec3-badge']`：控制開關，預設 `true`
- 控制列：`#prts-vis-row`（僅編隊模式顯示），按鈕 `data-vis="spec3-badge"`
- 圖片本身帶光效，CSS 只做定位（不使用 `filter`，確保 html2canvas 匯出正確）

### 控制列行為

- 編隊模式顯示：`#prts-vis-row`（全專精標誌開關）
- 編隊模式隱藏：技能切換、模組切換、顯示開關（卡片用）、名字切換

### 輸出

- **ZIP**：支援 `.prts-card` 截圖
- **長圖 PNG**：支援 `.prts-wrap` 包含
- **HTML**：正常輸出
