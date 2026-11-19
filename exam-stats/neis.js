(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NeisExcel = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function decodeXmlEntities(str) {
    return String(str || '').replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, function (_, ent) {
      if (ent === 'amp') return '&';
      if (ent === 'lt') return '<';
      if (ent === 'gt') return '>';
      if (ent === 'quot') return '"';
      if (ent === 'apos') return "'";
      if (ent.indexOf('#x') === 0) return String.fromCodePoint(parseInt(ent.slice(2), 16));
      if (ent.indexOf('#') === 0) return String.fromCodePoint(parseInt(ent.slice(1), 10));
      return _;
    });
  }

  function detectGradeFromFilename(filename) {
    var m = String(filename || '').match(/([1-3])\s*학년(?!도)/); // '2023학년도'의 3을 학년으로 읽지 않게
    return m ? Number(m[1]) : null;
  }

  function outputFilename(filename) {
    var base = String(filename || 'neis.xlsx').replace(/\.xlsx$/i, '');
    return base + '_점수입력.xlsx';
  }

  function extractCellValue(attrs, inner) {
    if (!inner) return '';
    var isMatch = inner.match(/<is\b[^>]*>([\s\S]*?)<\/is>/);
    if (isMatch) {
      var parts = [];
      var tRe = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
      var tm;
      while ((tm = tRe.exec(isMatch[1])) !== null) {
        parts.push(decodeXmlEntities(tm[1]));
      }
      return parts.join('');
    }
    var vMatch = inner.match(/<v\b[^>]*>([\s\S]*?)<\/v>/);
    if (vMatch) return decodeXmlEntities(vMatch[1]);
    return '';
  }

  function parseRowCells(rowInner) {
    var cells = {};
    var cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    var cm;
    while ((cm = cellRe.exec(rowInner)) !== null) {
      var attrs = cm[1];
      var refMatch = attrs.match(/\br="([A-Z]+)\d+"/);
      if (!refMatch) continue;
      var col = refMatch[1];
      cells[col] = extractCellValue(attrs, cm[2] || '');
    }
    return cells;
  }

  function parseSheetXml(xml, filename) {
    var source = String(xml || '');
    var rowRe = /<row\b([^>]*?)>([\s\S]*?)<\/row>/g;
    var rm;
    var f1Text = '';
    var j2Text = '';
    var rows = [];

    while ((rm = rowRe.exec(source)) !== null) {
      var rowAttrMatch = rm[1].match(/\br="(\d+)"/);
      if (!rowAttrMatch) continue;
      var rowNum = Number(rowAttrMatch[1]);
      var cells = parseRowCells(rm[2]);

      if (rowNum === 1) {
        f1Text = (cells.F || '').trim();
        continue;
      }
      if (rowNum === 2) {
        j2Text = (cells.J || '').replace(/\s+/g, ' ').trim();
        continue;
      }
      if (rowNum < 3) continue;

      var clsRaw = (cells.C || '').trim();
      var noRaw = (cells.D || '').trim();
      var name = (cells.E || '').trim();
      if (!clsRaw && !noRaw && !name) continue;

      var cls = /^\d+$/.test(clsRaw) ? Number(clsRaw) : NaN;
      var no = /^\d+$/.test(noRaw) ? Number(noRaw) : NaN;
      var existingJ = (cells.J || '').trim();

      rows.push({
        row: rowNum,
        subject: (cells.A || '').trim(),
        area: (cells.B || '').trim(),
        clsRaw: clsRaw,
        noRaw: noRaw,
        cls: cls,
        no: no,
        name: name,
        existingJ: existingJ,
        hasExistingJ: existingJ !== ''
      });
    }

    var maxMatch = f1Text.match(/영역만점\s*[:：]\s*(\d+(?:\.\d+)?)/);
    return {
      filename: filename || '',
      detectedGrade: detectGradeFromFilename(filename),
      f1Text: f1Text,
      maxScore: maxMatch ? Number(maxMatch[1]) : null,
      jHeader: j2Text,
      rows: rows
    };
  }

  function normName(name) {
    return String(name || '').replace(/\s+/g, '');
  }

  function makeStudentId(grade, cls, no) {
    if (!Number.isInteger(grade) || grade < 1 || grade > 3) return '';
    if (!Number.isInteger(cls) || cls < 1 || cls > 99) return '';
    if (!Number.isInteger(no) || no < 1 || no > 99) return '';
    return String(grade) + (cls < 10 ? '0' : '') + cls + (no < 10 ? '0' : '') + no;
  }

  function planNeisFill(parsed, grade, studentMap, currentMaxScore) {
    var fills = [];
    var missing = [];
    var needsReview = [];
    var nameMismatches = [];
    var existingCells = [];
    var map = studentMap || {};

    for (var i = 0; i < parsed.rows.length; i++) {
      var r = parsed.rows[i];
      var num = makeStudentId(Number(grade), r.cls, r.no);
      var st = num ? map[num] : null;

      if (!st || !st.submitted) {
        missing.push({
          row: r.row,
          num: num,
          cls: r.clsRaw,
          no: r.noRaw,
          name: r.name,
          reason: num ? '미응시' : '학번 만들기 실패'
        });
        continue;
      }

      if (st.needsReview) {
        needsReview.push({
          row: r.row,
          num: num,
          cls: r.clsRaw,
          no: r.noRaw,
          name: r.name,
          examName: st.name || '',
          reasons: st.reviewReasons || []
        });
        continue;
      }

      if (normName(r.name) !== normName(st.name)) {
        nameMismatches.push({
          row: r.row,
          num: num,
          neisName: r.name,
          examName: st.name || ''
        });
      }

      if (r.hasExistingJ) {
        existingCells.push({
          row: r.row,
          num: num,
          name: r.name,
          existingJ: r.existingJ,
          nextScore: st.score
        });
      }

      fills.push({
        row: r.row,
        num: num,
        score: st.score,
        neisName: r.name,
        examName: st.name || '',
        existingJ: r.existingJ,
        hasExistingJ: r.hasExistingJ
      });
    }

    var maxScoreMismatch = parsed.maxScore !== null &&
      Number.isFinite(Number(currentMaxScore)) &&
      Number(parsed.maxScore) !== Number(currentMaxScore);

    return {
      grade: grade ? Number(grade) : null,
      maxScore: parsed.maxScore,
      currentMaxScore: Number(currentMaxScore),
      maxScoreMismatch: maxScoreMismatch,
      jHeaderWarning: parsed.jHeader !== '합계',
      fills: fills,
      missing: missing,
      needsReview: needsReview,
      nameMismatches: nameMismatches,
      existingCells: existingCells
    };
  }

  function hasNonEmptyCellValue(inner) {
    if (!inner) return false;
    var vm = inner.match(/<v\b[^>]*>([\s\S]*?)<\/v>/);
    if (vm && vm[1].trim() !== '') return true;
    var tm = inner.match(/<t\b[^>]*>([\s\S]*?)<\/t>/);
    if (tm && tm[1].trim() !== '') return true;
    return false;
  }

  function patchSheetXml(xml, scoreByRow, options) {
    var source = String(xml || '');
    var scores = scoreByRow || {};
    var overwriteExisting = !!(options && options.overwriteExisting);
    var seenRows = {};

    var patched = source.replace(/<c\b([^>]*?\br="J(\d+)"[^>]*?)(?:\s*\/>|>([\s\S]*?)<\/c>)/g, function (full, attrs, rowStr, inner) {
      var rowNum = Number(rowStr);
      if (!Object.prototype.hasOwnProperty.call(scores, rowNum)) return full;
      seenRows[rowNum] = true;
      if (!overwriteExisting && hasNonEmptyCellValue(inner)) {
        return full;
      }
      var cleanAttrs = attrs.replace(/\s+t="[^"]*"/g, '');
      // 나이스 양식은 모든 칸이 글자(@) 형식이라, 점수도 옆 칸과 같은 inlineStr 글자로 넣어요.
      return '<c' + cleanAttrs + ' t="inlineStr"><is><t>' + String(scores[rowNum]) + '</t></is></c>';
    });

    var missingTargetRows = {};
    var hasMissingTarget = false;
    Object.keys(scores).forEach(function (k) {
      var rowNum = Number(k);
      if (!seenRows[rowNum]) {
        missingTargetRows[rowNum] = scores[k];
        hasMissingTarget = true;
      }
    });

    if (hasMissingTarget) {
      patched = patched.replace(/<row\b([^>]*\br="(\d+)"[^>]*)>([\s\S]*?)<\/row>/g, function (full, rowAttrs, rowStr, rowInner) {
        var rowNum = Number(rowStr);
        if (!Object.prototype.hasOwnProperty.call(missingTargetRows, rowNum)) return full;
        return '<row' + rowAttrs + '>' + rowInner + '<c r="J' + rowNum + '" s="7" t="inlineStr"><is><t>' + String(missingTargetRows[rowNum]) + '</t></is></c></row>';
      });
    }

    return patched;
  }

  return {
    detectGradeFromFilename: detectGradeFromFilename,
    outputFilename: outputFilename,
    parseSheetXml: parseSheetXml,
    makeStudentId: makeStudentId,
    planNeisFill: planNeisFill,
    patchSheetXml: patchSheetXml
  };
});
