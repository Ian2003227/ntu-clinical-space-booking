/* 臨床組空間借用申請單 — PDF 填寫模組（瀏覽器 / Node 共用）
 *
 * 所有座標以原始 PDF（595.2 × 841.92 pt）左上角為原點的 top 值表示，
 * 由 pdfplumber 逐字元量測而得；繪製時轉換為 pdf-lib 的左下角座標系。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FormFill = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PAGE_H = 841.92;

  // pdf-lib 1.x 期待 fontkit 1.x 的 subset.encodeStream()；fontkit 2 改為
  // encode()。此轉接層讓兩個版本的 fontkit 都能用。
  function adaptFontkit(fk) {
    return {
      create: function (buffer, postscriptName) {
        var font = fk.create(buffer, postscriptName);
        var origCreateSubset = font.createSubset.bind(font);
        font.createSubset = function () {
          var subset = origCreateSubset();
          if (!subset.encodeStream) {
            subset.encodeStream = function () {
              var listeners = {};
              var stream = { on: function (evt, cb) { listeners[evt] = cb; return stream; } };
              setTimeout(function () {
                try {
                  var data = subset.encode();
                  if (listeners.data) listeners.data(data);
                  if (listeners.end) listeners.end();
                } catch (e) {
                  if (listeners.error) listeners.error(e);
                }
              }, 0);
              return stream;
            };
          }
          return subset;
        };
        return font;
      }
    };
  }

  // 勾選框（□ 字元 bbox 的 x0 / top，邊長 16.1）
  var CHECKBOX = {
    course:   [167.5, 212.7], experiment: [247.5, 212.7], labMeeting: [295.5, 212.7],
    meeting:  [399.5, 212.7], discussion: [447.5, 212.7],
    talk:     [167.5, 234.8], oral:       [215.5, 234.8],
    seminar:  [167.5, 256.7], event:      [167.5, 278.7], other: [167.5, 300.8],
    feeNo:    [167.5, 323.6], feeYes:     [167.5, 345.5],
    internal: [167.5, 374.0], external:   [167.5, 402.1]
  };

  // 表格 5 列的上下邊界（top 座標）
  var ROWS = [
    [106.6, 126.2], [127.0, 146.4], [147.1, 166.8], [167.5, 187.0], [187.7, 207.1]
  ];
  // 欄位 x 範圍：日期（在預印斜線左側）、星期（斜線右側）、時間、教室
  var COL = {
    date:    [57.0, 127.0],
    weekday: [136.5, 208.5],
    time:    [211.0, 365.0],
    room:    [367.0, 520.5]
  };

  var WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

  function y(top) { return PAGE_H - top; }

  return {
    WEEKDAYS: WEEKDAYS,

    /**
     * @param {object} PDFLib   pdf-lib 模組
     * @param {object} fontkit  @pdf-lib/fontkit 模組
     * @param {ArrayBuffer|Uint8Array} baseBytes  申請單 PDF（已含最新聯絡人）
     * @param {ArrayBuffer|Uint8Array} fontBytes  Noto Sans TC OTF
     * @param {object} data 表單資料，見 index.html collectFormData()
     * @returns {Promise<Uint8Array>} 填寫完成的 PDF
     */
    fillForm: async function (PDFLib, fontkit, baseBytes, fontBytes, data) {
      var doc = await PDFLib.PDFDocument.load(baseBytes);
      doc.registerFontkit(adaptFontkit(fontkit));
      var font = await doc.embedFont(fontBytes, { subset: true });
      var page = doc.getPage(0);
      var black = PDFLib.rgb(0, 0, 0);

      function drawText(text, xLeft, baselineTop, size, maxWidth) {
        if (!text) return;
        text = String(text);
        var s = size;
        if (maxWidth) {
          while (s > 6 && font.widthOfTextAtSize(text, s) > maxWidth) s -= 0.25;
        }
        page.drawText(text, { x: xLeft, y: y(baselineTop), size: s, font: font, color: black });
      }

      // 置中：xRange = [x0, x1]，vCenterTop = 垂直中心的 top 座標
      function drawCentered(text, xRange, vCenterTop, size) {
        if (!text) return;
        text = String(text);
        var maxW = xRange[1] - xRange[0];
        var s = size;
        while (s > 6 && font.widthOfTextAtSize(text, s) > maxW) s -= 0.25;
        var w = font.widthOfTextAtSize(text, s);
        var x = xRange[0] + (maxW - w) / 2;
        drawText(text, x, vCenterTop + s * 0.36, s);
      }

      // 右對齊（用於「  年  月  日」前的數字）
      function drawRightAligned(text, xRight, baselineTop, size) {
        if (!text) return;
        text = String(text);
        var w = font.widthOfTextAtSize(text, size);
        drawText(text, xRight - w, baselineTop, size);
      }

      // 勾選（向量打勾，不依賴字型）
      function check(key) {
        var c = CHECKBOX[key];
        if (!c) return;
        var x0 = c[0], top = c[1];
        var opts = { thickness: 1.4, color: black, lineCap: PDFLib.LineCapStyle ? PDFLib.LineCapStyle.Round : undefined };
        page.drawLine(Object.assign({
          start: { x: x0 + 4.2,  y: y(top + 9.2) },
          end:   { x: x0 + 6.9,  y: y(top + 12.3) }
        }, opts));
        page.drawLine(Object.assign({
          start: { x: x0 + 6.9,  y: y(top + 12.3) },
          end:   { x: x0 + 12.6, y: y(top + 4.6) }
        }, opts));
      }

      // ── 填寫日期（上方，民國年）─────────────────
      if (data.fillDate) {
        var fd = data.fillDate; // {y(民國), m, d}
        drawRightAligned(fd.y, 434.0, 80.0, 10.5);
        drawRightAligned(fd.m, 461.5, 80.0, 10.5);
        drawRightAligned(fd.d, 489.5, 80.0, 10.5);
        // 下方（教師簽名區下的填寫日期）
        drawRightAligned(fd.y, 395.0, 664.4, 11);
        drawRightAligned(fd.m, 443.0, 664.4, 11);
        drawRightAligned(fd.d, 491.0, 664.4, 11);
      }

      // ── 借用時段（至多 5 列）───────────────────
      (data.rows || []).slice(0, 5).forEach(function (row, i) {
        var vc = (ROWS[i][0] + ROWS[i][1]) / 2;
        drawCentered(row.date,    COL.date,    vc, 12);
        drawCentered(row.weekday, COL.weekday, vc, 12);
        drawCentered(row.time,    COL.time,    vc, 12);
        drawCentered(row.room,    COL.room,    vc, 12);
      });

      // ── 借用事由 ───────────────────────────────
      var p = data.purposes || {};
      ['course', 'experiment', 'labMeeting', 'meeting', 'discussion', 'talk', 'oral']
        .forEach(function (k) { if (p[k]) check(k); });
      if (p.seminar) { check('seminar'); drawText(p.seminarText, 236, 268.6, 11, 272); }
      if (p.event)   { check('event');   drawText(p.eventText,   220, 290.6, 11, 288); }
      if (p.other)   { check('other');   drawText(p.otherText,   220, 312.7, 11, 288); }

      // ── 收費 ───────────────────────────────────
      if (data.fee && data.fee.charged) {
        check('feeYes');
        drawCentered(data.fee.amount, [233, 374], 351.5, 12);
      } else {
        check('feeNo');
      }

      // ── 參與人員 ───────────────────────────────
      var pp = data.participants || {};
      if (pp.internal) check('internal');
      if (pp.external) {
        check('external');
        drawText(pp.externalText, 251, 414.0, 11, 122);
      }
      drawCentered(pp.total, [464, 494], 408.2, 12);

      // ── 聯絡人 / 連絡電話 ──────────────────────
      drawCentered(data.contactName, [164, 292], 435.1, 13);
      drawText(data.phone1, 418, 431.8, 10.5, 100);
      drawText(data.phone2, 418, 445.7, 10.5, 100);

      return doc.save();
    }
  };
}));
