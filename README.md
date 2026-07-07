# 臺大心理系臨床組空間借用網站

一頁式網站，說明臨床組教室／空間的借用流程：

1. 在 Google 行事曆查詢時段是否已被借用
2. 下載並填寫借用申請單（每次至多 5 個時段、至少提前兩週）
3. 取得臨床組召集人與指導教授親筆簽名後，掃描寄給聯絡人登記
4. 鑰匙：S119 送交黃小姐協助開門；其他教室向臨床組指導教授借鑰匙

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
  蓋上新的聯絡人，讓同學下載到的 PDF 永遠是最新版

約 1–2 分鐘後網站就會更新，不需要碰任何程式碼。

## 專案結構

```
├── index.html              # 一頁式網站
├── config.json             # ★ 聯絡人設定（唯一需要維護的檔案）
├── assets/
│   └── form-blank.pdf      # 原始空白申請單（115.02 更）
├── scripts/
│   └── build_pdf.py        # 產生蓋印後 PDF、組裝 dist/
└── .github/workflows/deploy.yml  # 自動部署到 GitHub Pages
```

## 本機測試

```bash
pip install pymupdf
python scripts/build_pdf.py
cd dist && python -m http.server 8000
```

## 更換申請單版本

若系上更新了空白表單，把新檔案覆蓋到 `assets/form-blank.pdf`。
若新表單「註1」聯絡人文字位置改變，需同步調整 `scripts/build_pdf.py`
中的 `OLD_TEXT_RECT` 座標（可用 pdfplumber 量測）。
