#!/usr/bin/env python3
"""將 config.json 的聯絡人資訊蓋印到空白申請單 PDF 上，並組裝 dist/ 供部署。

原始表單註1的聯絡人（email + 姓名）位置是固定的；此腳本先以 redaction
真正移除舊文字，再重新寫上 config.json 中的聯絡人。之後若聯絡人更換，
只需修改 config.json，重新部署即可。

字型：email 用內建 Helvetica，中文用 PyMuPDF 內建繁體中文字型（china-t），
不需額外字型檔，CI 上結果與本機一致。
"""
import json
import shutil
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"

# 原 PDF 中「 r14227201@ntu.edu.tw （簡同學），」的範圍（pt，左上原點）。
# 由 pdfplumber 逐字元量測而得；原文字以雙重列印模擬粗體，偏移 0.48pt，
# 因此矩形邊界須避開前後字元（予/確）的 bbox。
OLD_TEXT_RECT = pymupdf.Rect(156.0, 726.5, 318.9, 739.5)
TEXT_X = 157.0          # 新文字起點（原 email 起點約 159.6）
BASELINE_Y = 736.0      # 原行 top=727.78、bottom=737.86，基線約在此
MAX_WIDTH = 318.9 - TEXT_X - 1.0
FONT_SIZE = 10.08       # 原註解文字大小
BOLD_OFFSET = 0.35      # 雙重列印模擬粗體


def build_pdf(config: dict, out_path: Path) -> None:
    doc = pymupdf.open(ROOT / "assets" / "form-blank.pdf")
    page = doc[0]

    page.add_redact_annot(OLD_TEXT_RECT)
    page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE)

    email = config["contactEmail"]
    zh = f"（{config['contactName']}），"

    f_latin = pymupdf.Font("helv")
    f_cjk = pymupdf.Font("china-t")

    size = FONT_SIZE
    while (f_latin.text_length(email, fontsize=size)
           + f_cjk.text_length(zh, fontsize=size)) > MAX_WIDTH and size > 6:
        size -= 0.25

    email_end = TEXT_X + f_latin.text_length(email, fontsize=size)
    for dx in (0, BOLD_OFFSET):
        page.insert_text((TEXT_X + dx, BASELINE_Y + dx), email,
                         fontname="helv", fontsize=size)
        page.insert_text((email_end + dx, BASELINE_Y + dx), zh,
                         fontname="china-t", fontsize=size)

    doc.ez_save(out_path)
    doc.close()


def main() -> None:
    config = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))

    if DIST.exists():
        shutil.rmtree(DIST)
    # assets/ 全部進站（vendor 函式庫、字型、form-fill.js），僅排除原始空白檔
    shutil.copytree(ROOT / "assets", DIST / "assets",
                    ignore=shutil.ignore_patterns("form-blank.pdf"))

    shutil.copy(ROOT / "index.html", DIST / "index.html")
    shutil.copy(ROOT / "config.json", DIST / "config.json")

    build_pdf(config, DIST / "assets" / "booking-form.pdf")
    print(f"OK: dist/ 已產生，聯絡人 = {config['contactEmail']}（{config['contactName']}）")


if __name__ == "__main__":
    main()
