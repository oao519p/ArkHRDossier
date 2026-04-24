# Arknights Operator Info Card

明日方舟幹員卡片查詢工具，支援繁中服（SKPORT）與簡中服（SKLAND）。

![preview](https://img.shields.io/badge/status-active-brightgreen)

---

## 功能

- 透過 SKPORT / SKLAND API 取得玩家幹員資料
- 或直接上傳本地 JSON 檔案
- 幹員卡片視覺化展示，包含：
  - 精英化、等級、潛能、技能、模組
  - 職業 / 稀有度篩選
  - 搜尋、排序
  - 深色 / 淺色模式
- 輸出：下載 HTML、下載卡片圖片 ZIP、下載 JSON

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
skport-fetch/
├── index.html        # 主頁面
├── serve.js          # 本地開發 HTTP server
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
