// 나이스 일괄등록 엑셀 J열 채우기 XML 무결성 확인 스크립트
// 실행: node test/check_neis.js <xlsx_path>
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const assert = require('assert');
const NeisExcel = require(path.join(__dirname, '..', 'exam-stats', 'neis.js'));

function readZipEntry(buf, entryName) {
  // End of Central Directory (0x06054b50) 탐색
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65558); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  assert(eocdOffset >= 0, 'ZIP EOCD not found');
  const cdCount = buf.readUInt16LE(eocdOffset + 10);
  let pos = buf.readUInt32LE(eocdOffset + 16);

  for (let i = 0; i < cdCount; i++) {
    assert.strictEqual(buf.readUInt32LE(pos), 0x02014b50, 'Invalid ZIP central directory header');
    const compMethod = buf.readUInt16LE(pos + 10);
    const compSize = buf.readUInt32LE(pos + 20);
    const nameLen = buf.readUInt16LE(pos + 28);
    const extraLen = buf.readUInt16LE(pos + 30);
    const commentLen = buf.readUInt16LE(pos + 32);
    const localOffset = buf.readUInt32LE(pos + 42);
    const name = buf.toString('utf8', pos + 46, pos + 46 + nameLen);

    if (name === entryName) {
      assert.strictEqual(buf.readUInt32LE(localOffset), 0x04034b50, 'Invalid local file header');
      const lNameLen = buf.readUInt16LE(localOffset + 26);
      const lExtraLen = buf.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + lNameLen + lExtraLen;
      const compData = buf.subarray(dataStart, dataStart + compSize);
      if (compMethod === 0) return compData.toString('utf8');
      if (compMethod === 8) return zlib.inflateRawSync(compData).toString('utf8');
      throw new Error('Unsupported ZIP compression method: ' + compMethod);
    }
    pos += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error('ZIP entry not found: ' + entryName);
}

const xlsxPath = process.argv[2];
assert(xlsxPath && fs.existsSync(xlsxPath), 'Usage: node test/check_neis.js <path-to-neis.xlsx>');

const zipBuf = fs.readFileSync(xlsxPath);
const origXml = readZipEntry(zipBuf, 'xl/worksheets/sheet1.xml');
const filename = path.basename(xlsxPath);
const parsed = NeisExcel.parseSheetXml(origXml, filename);

assert.strictEqual(parsed.detectedGrade, 2, 'detectedGrade should be 2');
assert.strictEqual(parsed.maxScore, 30, 'F1 maxScore should be 30');
assert.strictEqual(parsed.jHeader, '합계', 'J2 header should be 합계');
assert.strictEqual(parsed.rows.length, 22, 'expected 22 student rows (rows 3..24)');
assert.strictEqual(parsed.rows[0].row, 3);
assert.strictEqual(parsed.rows[0].name, '학생01');
assert.strictEqual(parsed.rows[21].row, 24);
assert.strictEqual(parsed.rows[21].name, '학생22');

// 1) 가짜 성적 맵으로 J3..J24 전체 채우기 & XML 바이트 단위 비교(J셀의 <v>만 추가되었는지)
const fullStudentMap = {};
const expectedScores = {};
parsed.rows.forEach((r, idx) => {
  const num = NeisExcel.makeStudentId(2, r.cls, r.no);
  const sc = 10 + (idx % 21);
  fullStudentMap[num] = {num, name: r.name, submitted: true, score: sc, needsReview: false};
  expectedScores[r.row] = sc;
});

const fullPlan = NeisExcel.planNeisFill(parsed, 2, fullStudentMap, 30);
assert.strictEqual(fullPlan.fills.length, 22);
assert.strictEqual(fullPlan.missing.length, 0);
assert.strictEqual(fullPlan.needsReview.length, 0);
assert.strictEqual(fullPlan.nameMismatches.length, 0);
assert.strictEqual(fullPlan.maxScoreMismatch, false);

const patchedFullXml = NeisExcel.patchSheetXml(origXml, expectedScores, {overwriteExisting: false});

for (let row = 3; row <= 24; row++) {
  const expectedTag = `<c r="J${row}" s="7" t="inlineStr"><is><t>${expectedScores[row]}</t></is></c>`;
  assert(patchedFullXml.includes(expectedTag), `missing patched cell ${expectedTag}`);
}

// 패치된 J3..J24 의 <v>...</v> 만 제거하면 원본 XML과 1바이트도 다르지 않아야 함
const strippedBack = patchedFullXml.replace(
  /<c r="J(\d+)" s="7" t="inlineStr"><is><t>\d+<\/t><\/is><\/c>/g,
  (_, rStr) => {
    const rNum = Number(rStr);
    assert(rNum >= 3 && rNum <= 24, `unexpected J row modified: J${rNum}`);
    return `<c r="J${rNum}" s="7"></c>`;
  }
);
assert.strictEqual(strippedBack, origXml, 'XML outside J3..J24 <v> values must be byte-for-byte identical');

// 2) 경계 사례 단위 검사: self-closing J셀, 기존 값 보호/덮어쓰기, 미응시·확인 필요·이름 불일치·만점 불일치
const selfClosingXml = origXml.replace('<c r="J3" s="7"></c>', '<c r="J3" s="7"/>');
const patchedSelfClose = NeisExcel.patchSheetXml(selfClosingXml, {3: 28}, {overwriteExisting: false});
assert(patchedSelfClose.includes('<c r="J3" s="7" t="inlineStr"><is><t>28</t></is></c>'), 'self-closing cell patched');

const existingXml = origXml.replace('<c r="J4" s="7"></c>', '<c r="J4" s="7" t="inlineStr"><is><t>15</t></is></c>');
const parsedExisting = NeisExcel.parseSheetXml(existingXml, filename);
assert.strictEqual(parsedExisting.rows[1].hasExistingJ, true);
assert.strictEqual(parsedExisting.rows[1].existingJ, '15');

const partialMap = {
  '20101': {num: '20101', name: '학생01', submitted: true, score: 27, needsReview: false},
  '20102': {num: '20102', name: '학생02', submitted: true, score: 29, needsReview: false},
  '20103': {num: '20103', name: '다른이름', submitted: true, score: 25, needsReview: false},
  '20104': {num: '20104', name: '학생04', submitted: true, score: 22, needsReview: true, reviewReasons: ['제출 2회']}
};
const partialPlan = NeisExcel.planNeisFill(parsedExisting, 2, partialMap, 25);
assert.strictEqual(partialPlan.maxScoreMismatch, true, 'detects F1 max score mismatch (30 vs 25)');
assert.strictEqual(partialPlan.fills.length, 3);
assert.strictEqual(partialPlan.missing.length, 18);
assert.strictEqual(partialPlan.needsReview.length, 1);
assert.strictEqual(partialPlan.nameMismatches.length, 1);
assert.strictEqual(partialPlan.existingCells.length, 1);

const keepExistingXml = NeisExcel.patchSheetXml(existingXml, {3: 27, 4: 29}, {overwriteExisting: false});
assert(keepExistingXml.includes('<c r="J3" s="7" t="inlineStr"><is><t>27</t></is></c>'));
assert(keepExistingXml.includes('<c r="J4" s="7" t="inlineStr"><is><t>15</t></is></c>'), 'existing J4 kept when overwriteExisting=false');

const overwriteXml = NeisExcel.patchSheetXml(existingXml, {3: 27, 4: 29}, {overwriteExisting: true});
assert(overwriteXml.includes('<c r="J4" s="7" t="inlineStr"><is><t>29</t></is></c>'), 'existing J4 overwritten when overwriteExisting=true');

// 3) sharedStrings.xml (t="s") 파싱 및 패치 검증 (엑셀 재저장 파일 대응)
const sstXml = `<?xml version="1.0" encoding="UTF-8"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="7" uniqueCount="7">
  <si><t>( 영역만점 : 30 )</t></si>
  <si><t>합계</t></si>
  <si><t>1</t></si>
  <si><t>5</t></si>
  <si><r><t>학생</t></r><r><rPr><sz val="10"/></rPr><t>05</t></r><rPh sb="0" eb="2"><t>후리가나</t></rPh></si>
  <si><t>6</t></si>
  <si><t>24</t></si>
</sst>`;
const sstSheetXml = `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
  <row r="1"><c r="F1" s="3" t="s"><v>0</v></c></row>
  <row r="2"><c r="J2" s="6" t="s"><v>1</v></c></row>
  <row r="3"><c r="C3" s="7" t="s"><v>2</v></c><c r="D3" s="7" t="s"><v>3</v></c><c r="E3" s="7" t="s"><v>4</v></c><c r="J3" s="7"/></row>
  <row r="4"><c r="C4" s="7" t="s"><v>2</v></c><c r="D4" s="7" t="s"><v>5</v></c><c r="E4" s="7" t="s"><v>4</v></c><c r="J4" s="7" t="s"><v>6</v></c></row>
</sheetData></worksheet>`;

// sharedStrings 없이 t="s"만 있으면 인덱스 숫자를 반·번호로 오인하지 않고 빈값 처리
const withoutSst = NeisExcel.parseSheetXml(sstSheetXml, '2026학년도 2학기 주간 2학년 1반.xlsx');
assert.strictEqual(withoutSst.rows.length, 0, 't="s" without sharedStrings must not misread string indices');

const parsedSst = NeisExcel.parseSheetXml(sstSheetXml, '2026학년도 2학기 주간 2학년 1반.xlsx', sstXml);
assert.strictEqual(parsedSst.maxScore, 30, 'F1 sharedString maxScore parsed');
assert.strictEqual(parsedSst.jHeader, '합계', 'J2 sharedString header parsed');
assert.strictEqual(parsedSst.rows.length, 2, '2 rows parsed from sharedStrings');
assert.strictEqual(parsedSst.rows[0].cls, 1);
assert.strictEqual(parsedSst.rows[0].no, 5);
assert.strictEqual(parsedSst.rows[0].name, '학생05');
assert.strictEqual(parsedSst.rows[0].hasExistingJ, false);
assert.strictEqual(parsedSst.rows[1].no, 6);
assert.strictEqual(parsedSst.rows[1].hasExistingJ, true);
assert.strictEqual(parsedSst.rows[1].existingJ, '24');

const sstMap = {
  '20105': {num: '20105', name: '학생05', submitted: true, score: 26, needsReview: false},
  '20106': {num: '20106', name: '학생05', submitted: true, score: 28, needsReview: false}
};
const sstPlan = NeisExcel.planNeisFill(parsedSst, 2, sstMap, 30);
assert.strictEqual(sstPlan.fills.length, 2);
assert.strictEqual(sstPlan.existingCells.length, 1);
const patchedSstKeep = NeisExcel.patchSheetXml(sstSheetXml, {3: 26, 4: 28}, {overwriteExisting: false});
assert(patchedSstKeep.includes('<c r="J3" s="7" t="inlineStr"><is><t>26</t></is></c>'));
assert(patchedSstKeep.includes('<c r="J4" s="7" t="s"><v>6</v></c>'), 'existing t="s" J4 preserved when overwriteExisting=false');
const patchedSstOverwrite = NeisExcel.patchSheetXml(sstSheetXml, {3: 26, 4: 28}, {overwriteExisting: true});
assert(patchedSstOverwrite.includes('<c r="J4" s="7" t="inlineStr"><is><t>28</t></is></c>'), 'existing t="s" J4 replaced with inlineStr when overwriteExisting=true');

console.log(`neis check: ${filename} verified (J3..J24 only modified, byte-identical outside J <v>, all edge cases + sharedStrings passed)`);
