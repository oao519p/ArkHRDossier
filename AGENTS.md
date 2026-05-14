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
