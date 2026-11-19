// gugak-exam/ 의 힌트·코드·문구·보기 목록·비밀 코드 비노출 검사. 실행: node test/check_exam_leak.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const EXAM_DIR = path.join(ROOT, 'gugak-exam');

const INSTRUMENTS = [
  '가야금', '거문고', '단소', '대금', '박',
  '부', '생황', '소금', '아쟁', '양금',
  '어', '운라', '장구', '축', '태평소',
  '편경', '편종', '피리', '해금', '훈'
];
const EXTRA_FORBIDDEN = ['장고', '향피리', '청공', '나발', '나각'];
const ALL_FORBIDDEN = INSTRUMENTS.concat(EXTRA_FORBIDDEN);
const MULTI_CHAR_FORBIDDEN = ALL_FORBIDDEN.filter(n => n.length >= 2);

// 1) items.js 구조·이미지 존재·listen 구간·힌트 누출 검사
const itemsPath = path.join(EXAM_DIR, 'items.js');
const itemsText = fs.readFileSync(itemsPath, 'utf8');
const sandbox = {window: {}};
vm.runInContext(itemsText, vm.createContext(sandbox));
const items = sandbox.window.EXAM_ITEMS;

assert(Array.isArray(items) && items.length === 20, 'items.js must define 20 items');
const codes = new Set();
for (const it of items) {
  assert(typeof it.code === 'string' && /^[a-z0-9]{5}$/.test(it.code), 'invalid code: ' + it.code);
  assert(!codes.has(it.code), 'duplicate code: ' + it.code);
  codes.add(it.code);

  assert(typeof it.img === 'string' && it.img.startsWith('img/'), 'invalid img path: ' + it.img);
  const imgFile = path.join(EXAM_DIR, it.img);
  assert(fs.existsSync(imgFile), 'missing img file: ' + imgFile);

  assert(Array.isArray(it.listen) && it.listen.length === 2, 'invalid listen array for ' + it.code);
  assert(Number.isFinite(it.listen[0]) && Number.isFinite(it.listen[1]) && it.listen[1] > it.listen[0], 'invalid listen interval for ' + it.code);

  assert(typeof it.hint === 'string' && it.hint.trim().length > 10, 'empty hint for ' + it.code);
  for (const name of ALL_FORBIDDEN) {
    assert(!it.hint.includes(name), `hint leak (${name}) in ${it.code}: ${it.hint}`);
  }
}

// items.js 원문 전체(주석 포함)에서 모든 악기 이름 0건
for (const name of ALL_FORBIDDEN) {
  assert(!itemsText.includes(name), `items.js raw text leak (${name})`);
}

// 2) app.js 원문 전체(주석·문자열 포함)에서 모든 악기 이름 0건
const appPath = path.join(EXAM_DIR, 'app.js');
const appText = fs.readFileSync(appPath, 'utf8');
for (const name of ALL_FORBIDDEN) {
  assert(!appText.includes(name), `app.js raw text leak (${name})`);
}

// 3) index.html 검사: #wordBank 가나다순 20개 일치, 보기 밖 다글자 이름 0건, 문항 코드 0건
const htmlText = fs.readFileSync(path.join(EXAM_DIR, 'index.html'), 'utf8');
const bankMatch = htmlText.match(/<ul[^>]*id="wordBank"[^>]*>([\s\S]*?)<\/ul>/);
assert(bankMatch, 'missing #wordBank in gugak-exam/index.html');
const bankItems = Array.from(bankMatch[1].matchAll(/<li>([^<]+)<\/li>/g), m => m[1].trim());
const expectedSorted = INSTRUMENTS.slice().sort((a, b) => a.localeCompare(b, 'ko'));
assert.deepStrictEqual(bankItems, expectedSorted, '#wordBank must list exactly 20 names in 가나다순');

const outsideBank = htmlText.replace(bankMatch[0], '');
for (const name of MULTI_CHAR_FORBIDDEN) {
  assert(!outsideBank.includes(name), `index.html outside #wordBank leak (${name})`);
}
for (const code of codes) {
  assert(!htmlText.includes(code), `index.html must not contain item code (${code})`);
}

// 4) exam-stats/ 및 test/ 파일에 items.js 비밀 코드가 들어 있지 않은지 확인
for (const dirName of ['exam-stats', 'test']) {
  const dirPath = path.join(ROOT, dirName);
  for (const fn of fs.readdirSync(dirPath)) {
    const full = path.join(dirPath, fn);
    if (!fs.statSync(full).isFile()) continue;
    const text = fs.readFileSync(full, 'utf8');
    for (const code of codes) {
      assert(!text.includes(code), `${dirName}/${fn} must not contain exam item code (${code})`);
    }
  }
}

console.log('exam leak check: 0 leaks across 20 items, app.js, index.html, exam-stats/, test/');
