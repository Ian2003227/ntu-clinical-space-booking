# 臺大心理系臨床心理學組 空間借用網站

一頁式網站，提供臨床心理學組教室／空間借用的完整流程：

1. 在 Google 行事曆查詢時段是否已被借用
2. **線上填寫申請單**，系統即時在瀏覽器產生填妥的申請單 PDF（也可下載空白表單手寫）
3. 列印後依序取得指導教授親筆簽名、臨床組召集人簽名，掃描寄給聯絡人登記
4. 鑰匙：S119 送交黃小姐協助開門；其他教室由負責人於借用成功時說明鑰匙位置與使用規則

## 🔧 如何更換聯絡人（重點！）

只需要改 **一個檔案**：[`config.json`](config.json)

```json
{
  "contactName": "簡同學",
  "contactEmail": "r14227201@ntu.edu.tw",
  "calendarId": "yslin1130@gmail.com",
  "formVersion": "115.02 更"
}
```

在 GitHub 網頁上直接編輯 `config.json` → Commit 之後，GitHub Actions 會自動：

- 更新網站上所有顯示聯絡人的地方（步驟三、頁尾、寄信按鈕）
- **重新產生申請單 PDF**：把表單「註1」裡的舊聯絡人 email 與姓名移除，
  蓋上新的聯絡人；線上填表功能也以這份 PDF 為底稿，所以產出的申請單
  永遠帶著最新聯絡人

約 1–2 分鐘後網站就會更新，不需要碰任何程式碼。

## 專案結構

```
├── index.html                  # 一頁式網站（含線上填表 UI）
├── config.json                 # ★ 聯絡人設定（唯一需要維護的檔案）
├── assets/
│   ├── form-blank.pdf          # 原始空白申請單（115.02 更）
│   ├── form-fill.js            # 申請單 PDF 填寫模組（座標定義在此）
│   ├── fonts/NotoSansTC-Regular.ttf   # 填表用中文字型（SIL OFL；由官方 OTF 轉 TTF）
│   └── vendor/
│       ├── pdf-lib.min.js      # pdf-lib 1.17
│       └── fontkit2.browser.js # fontkit 2（esbuild 打包）
├── scripts/build_pdf.py        # 部署時蓋印聯絡人、組裝 dist/
└── .github/workflows/deploy.yml
```

## 技術備註（維護前請讀）

- **fontkit 版本**：@pdf-lib/fontkit 1.x 對 CJK TTF 子集化會產生損壞的字型
  （字形資料截斷），因此改用 fontkit 2 + `form-fill.js` 內的 `adaptFontkit`
  轉接層（補上 pdf-lib 期待的 `subset.encodeStream()`）。不要換回 1.x。
- **字型**：pdf-lib+fontkit 對 CFF 格式 OTF 的子集化也有問題，故字型須為
  TTF（glyf）。目前的 TTF 由 Noto Sans TC OTF 以 fontTools+cu2qu 轉出。
- **座標**：`form-fill.js` 與 `scripts/build_pdf.py` 內的座標都是以
  pdfplumber 對原始表單逐字元量測而得（頁面 595.2×841.92pt，左上原點）。
  若系上更新空白表單版面，需重新量測。

## 本機測試

```bash
pip install pymupdf
python scripts/build_pdf.py
cd dist && python -m http.server 8000
```
