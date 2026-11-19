(function () {
  'use strict';

  var EXAM_WS = 'gugak-exam';
  var HUB = 'https://script.google.com/macros/s/AKfycbyIvmwidYjUqyMIx5SdVP4NhY5tsqAhuWOGzOhtRUI4NSYAoQkKMt-6s7DFud7s5aMN/exec';
  try {
    var qh = new URLSearchParams(location.search).get('hub');
    if (qh && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) HUB = qh;
  } catch (e) {}

  var KEY_STORE = 'classroom-hub:dash-key';
  var SCORE_STORE = 'classroom-hub:exam-scoring:' + EXAM_WS;
  var PICK_STORE = 'classroom-hub:exam-picks:' + EXAM_WS;

  var $ = function (id) { return document.getElementById(id); };
  var setupCard = $('setup');
  var appEl = $('app');
  var headActions = $('headActions');
  var dashUrlInput = $('dashUrl');
  var saveKeyBtn = $('saveKeyBtn');
  var setupErr = $('setupErr');
  var forgetKeyBtn = $('forgetKeyBtn');
  var refreshBtn = $('refreshBtn');
  var lastSync = $('lastSync');
  var loadErr = $('loadErr');
  var examTitle = $('examTitle');

  var gradeSel = $('gradeSel');
  var classSel = $('classSel');
  var baseInput = $('baseInput');
  var perInput = $('perInput');
  var resetScoreBtn = $('resetScoreBtn');
  var rubricNote = $('rubricNote');

  var gradeSummaryTitle = $('gradeSummaryTitle');
  var gradeSummaryBody = $('gradeSummaryBody');
  var stCount = $('stCount');
  var stRate = $('stRate');
  var stAvg = $('stAvg');
  var stCorrectAvg = $('stCorrectAvg');
  var stMinMax = $('stMinMax');
  var stReview = $('stReview');
  var distNote = $('distNote');
  var distChart = $('distChart');
  var itemChart = $('itemChart');
  var tableTitle = $('tableTitle');
  var studentBody = $('studentBody');
  var csvBtn = $('csvBtn');

  var neisDrop = $('neisDrop');
  var neisInput = $('neisInput');
  var neisAllBtn = $('neisAllBtn');
  var neisClearBtn = $('neisClearBtn');
  var neisOverwriteChk = $('neisOverwriteChk');
  var neisList = $('neisList');

  var detailModal = $('detailModal');
  var detailTitle = $('detailTitle');
  var detailSub = $('detailSub');
  var detailResetBtn = $('detailResetBtn');
  var detailCloseBtn = $('detailCloseBtn');
  var detailSubs = $('detailSubs');
  var detailSubLabel = $('detailSubLabel');
  var detailItemsBody = $('detailItemsBody');

  var archiveCount = $('archiveCount');
  var archiveBody = $('archiveBody');
  var resetModal = $('resetModal');
  var resetMsg = $('resetMsg');
  var resetErr = $('resetErr');
  var resetCancelBtn = $('resetCancelBtn');
  var resetOkBtn = $('resetOkBtn');
  var toastEl = $('toast');

  var key = null;
  var examData = null;
  var scoring = loadJson(SCORE_STORE, null);
  var picks = loadJson(PICK_STORE, {});
  var selectedGrade = '';
  var selectedClass = '';
  var neisFiles = [];
  var detailNum = '';
  var detailViewKey = '';
  var resetTarget = null;
  var resetBusy = false;
  var toastTimer = null;

  function store(k, v) {
    try {
      if (v == null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch (e) {}
  }

  function load(k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }

  function loadJson(k, fallback) {
    try {
      var raw = load(k);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch (e) { return fallback; }
  }

  function keyFromUrl(text) {
    var raw = String(text || '').trim();
    var m = raw.match(/[?&#](?:dash|k)=([A-Za-z0-9%_-]+)/);
    if (m) return decodeURIComponent(m[1]);
    if (/^[A-Za-z0-9_-]{8,}$/.test(raw)) return raw;
    return null;
  }

  (function initKey() {
    var m = location.hash.match(/[#&]k=([^&]+)/);
    if (m) {
      key = decodeURIComponent(m[1]);
      store(KEY_STORE, key);
      history.replaceState(null, '', location.pathname + location.search);
    } else {
      key = load(KEY_STORE);
    }
  })();

  function normName(name) {
    return String(name || '').replace(/\s+/g, '');
  }

  function parseStudentNum(num) {
    var m = /^([1-3])(\d{2})(\d{2})$/.exec(String(num || ''));
    if (!m) return { grade: null, cls: null, no: null, valid: false };
    return { grade: Number(m[1]), cls: Number(m[2]), no: Number(m[3]), valid: true };
  }

  function classKey(grade, cls) {
    return grade + '-' + cls;
  }

  function defaultScoring() {
    var base = examData && examData.exam && Number.isFinite(Number(examData.exam.base)) ? Number(examData.exam.base) : 10;
    var per = examData && examData.exam && Number.isFinite(Number(examData.exam.per)) ? Number(examData.exam.per) : 1;
    return { base: base, per: per };
  }

  function currentScoring() {
    var def = defaultScoring();
    if (!scoring || !Number.isFinite(Number(scoring.base)) || !Number.isFinite(Number(scoring.per))) {
      return def;
    }
    return { base: Number(scoring.base), per: Number(scoring.per) };
  }

  function calcScore(correct) {
    var sc = currentScoring();
    return Math.round((sc.base + sc.per * Number(correct || 0)) * 100) / 100;
  }

  function totalItemsCount() {
    return examData && examData.exam && Array.isArray(examData.exam.items) ? examData.exam.items.length : 20;
  }

  function subKey(sub) {
    return (sub.sid || '') + '|' + (sub.attempt || '') + '|' + (sub.time || '');
  }

  function buildStudentRecords() {
    var rows = (examData && examData.rows) || [];
    var statusList = (examData && examData.status) || [];
    var roster = (examData && examData.roster) || [];

    var byNum = {};
    function ensure(num) {
      if (!byNum[num]) {
        var parsed = parseStudentNum(num);
        byNum[num] = {
          num: num,
          grade: parsed.grade,
          cls: parsed.cls,
          no: parsed.no,
          rosterName: '',
          submissions: [],
          sessions: {},
          statusRow: null,
          submitted: false,
          official: null,
          officialPicked: false,
          needsReview: false,
          reviewReasons: [],
          displayName: '',
          convertedScore: null
        };
      }
      return byNum[num];
    }

    roster.forEach(function (r) {
      var rec = ensure(String(r.num || ''));
      rec.rosterName = String(r.name || '');
    });

    statusList.forEach(function (s) {
      var rec = ensure(String(s.num || ''));
      rec.statusRow = s;
      (s.sessions || []).forEach(function (sid) {
        if (sid) rec.sessions[sid] = true;
      });
    });

    var allSessions = (examData && examData.sessions) || {};
    Object.keys(allSessions).forEach(function (num) {
      var rec = ensure(String(num || ''));
      (allSessions[num] || []).forEach(function (sid) {
        if (sid) rec.sessions[sid] = true;
      });
    });

    rows.forEach(function (r, idx) {
      var rec = ensure(String(r.num || ''));
      var copy = Object.assign({ _idx: idx, _key: subKey(r) }, r);
      rec.submissions.push(copy);
      if (r.sid) rec.sessions[r.sid] = true;
    });

    Object.keys(byNum).forEach(function (num) {
      var rec = byNum[num];
      rec.submissions.sort(function (a, b) {
        if (a.time !== b.time) return a.time < b.time ? -1 : 1;
        if (a.attempt !== b.attempt) return a.attempt - b.attempt;
        return a._idx - b._idx;
      });

      if (rec.submissions.length > 0) {
        rec.submitted = true;
        var pickedKey = picks[num] || '';
        var chosen = null;
        if (pickedKey) {
          chosen = rec.submissions.find(function (s) { return s._key === pickedKey; }) || null;
        }
        rec.officialPicked = !!chosen;
        rec.official = chosen || rec.submissions[0];
        rec.convertedScore = calcScore(rec.official.correct);

        var nameSet = {};
        rec.submissions.forEach(function (s) {
          var nn = normName(s.name);
          if (nn) nameSet[nn] = s.name;
        });
        var distinctNames = Object.keys(nameSet);
        var distinctSessions = Object.keys(rec.sessions);
        var rosterMismatch = !!(rec.rosterName && rec.submissions.some(function (s) {
          return normName(s.name) !== normName(rec.rosterName);
        }));

        var reasons = [];
        if (rec.submissions.length > 1) reasons.push('제출 ' + rec.submissions.length + '회');
        if (distinctSessions.length > 1) reasons.push('세션 ' + distinctSessions.length + '개');
        if (distinctNames.length > 1 || rosterMismatch) reasons.push('이름 다름');
        rec.reviewReasons = reasons;
        rec.needsReview = !rec.officialPicked && reasons.length > 0;
        rec.displayName = rec.rosterName || rec.official.name || '';
      } else {
        rec.displayName = rec.rosterName || (rec.statusRow && rec.statusRow.name) || '';
      }
    });

    return byNum;
  }

  function sortRecords(list) {
    return list.slice().sort(function (a, b) {
      return String(a.num).localeCompare(String(b.num));
    });
  }

  function filterRecords(byNum, grade, cls) {
    var out = [];
    Object.keys(byNum).forEach(function (num) {
      var rec = byNum[num];
      if (!rec.submitted && !rec.rosterName) return;
      if (grade && String(rec.grade) !== String(grade)) return;
      if (cls && classKey(rec.grade, rec.cls) !== cls) return;
      out.push(rec);
    });
    return sortRecords(out);
  }

  function populateFilters(byNum) {
    var grades = {};
    var classes = {};
    Object.keys(byNum).forEach(function (num) {
      var rec = byNum[num];
      if (!rec.submitted && !rec.rosterName) return;
      if (rec.grade) {
        grades[rec.grade] = true;
        if (!selectedGrade || String(rec.grade) === String(selectedGrade)) {
          if (rec.cls) classes[classKey(rec.grade, rec.cls)] = { grade: rec.grade, cls: rec.cls };
        }
      }
    });

    var gList = Object.keys(grades).sort();
    gradeSel.textContent = '';
    var gAll = document.createElement('option');
    gAll.value = '';
    gAll.textContent = '전체 학년';
    gradeSel.appendChild(gAll);
    gList.forEach(function (g) {
      var o = document.createElement('option');
      o.value = g;
      o.textContent = g + '학년';
      gradeSel.appendChild(o);
    });
    if (selectedGrade && grades[selectedGrade]) gradeSel.value = selectedGrade;
    else { selectedGrade = ''; gradeSel.value = ''; }

    var cList = Object.keys(classes).sort(function (a, b) {
      var ca = classes[a], cb = classes[b];
      return ca.grade !== cb.grade ? ca.grade - cb.grade : ca.cls - cb.cls;
    });
    classSel.textContent = '';
    var cAll = document.createElement('option');
    cAll.value = '';
    cAll.textContent = '전체 반';
    classSel.appendChild(cAll);
    cList.forEach(function (ck) {
      var c = classes[ck];
      var o = document.createElement('option');
      o.value = ck;
      o.textContent = c.grade + '학년 ' + c.cls + '반';
      classSel.appendChild(o);
    });
    if (selectedClass && classes[selectedClass]) classSel.value = selectedClass;
    else { selectedClass = ''; classSel.value = ''; }
  }

  function renderScoringControls() {
    var sc = currentScoring();
    var total = totalItemsCount();
    var maxPt = calcScore(total);
    var minPt = calcScore(0);
    if (document.activeElement !== baseInput) baseInput.value = String(sc.base);
    if (document.activeElement !== perInput) perInput.value = String(sc.per);
    rubricNote.textContent = '환산 공식: ' + sc.base + ' + ' + sc.per + ' × 맞힌 개수 · 만점 ' + maxPt + '점 (' + total + '개 → ' + maxPt + '점, 0개 → ' + minPt + '점)';
  }

  function computeSummary(list) {
    var submitted = list.filter(function (r) { return r.submitted; });
    var missing = list.filter(function (r) { return !r.submitted; });
    var review = submitted.filter(function (r) { return r.needsReview; });
    var scores = submitted.map(function (r) { return r.convertedScore; });
    var corrects = submitted.map(function (r) { return r.official.correct; });
    var avgScore = scores.length ? Math.round((scores.reduce(function (a, b) { return a + b; }, 0) / scores.length) * 10) / 10 : null;
    var avgCorrect = corrects.length ? Math.round((corrects.reduce(function (a, b) { return a + b; }, 0) / corrects.length) * 10) / 10 : null;
    var maxScore = scores.length ? Math.max.apply(null, scores) : null;
    var minScore = scores.length ? Math.min.apply(null, scores) : null;
    return {
      total: list.length,
      submitted: submitted,
      missing: missing,
      review: review,
      avgScore: avgScore,
      avgCorrect: avgCorrect,
      maxScore: maxScore,
      minScore: minScore
    };
  }

  function renderGradeSummary(byNum) {
    var scope = filterRecords(byNum, selectedGrade, '');
    gradeSummaryTitle.textContent = selectedGrade ? (selectedGrade + '학년 반별 요약') : '전체 학년 반별 요약';
    var groups = {};
    scope.forEach(function (rec) {
      var ck = rec.grade && rec.cls ? classKey(rec.grade, rec.cls) : '기타';
      if (!groups[ck]) groups[ck] = { key: ck, grade: rec.grade, cls: rec.cls, list: [] };
      groups[ck].list.push(rec);
    });

    var keys = Object.keys(groups).sort(function (a, b) {
      var ga = groups[a], gb = groups[b];
      if (!ga.grade) return 1;
      if (!gb.grade) return -1;
      return ga.grade !== gb.grade ? ga.grade - gb.grade : ga.cls - gb.cls;
    });

    gradeSummaryBody.textContent = '';
    if (!keys.length) {
      var er = document.createElement('tr');
      var td = document.createElement('td');
      td.colSpan = 6;
      td.className = 'muted';
      td.textContent = '아직 제출된 시험 기록이나 명단이 없어요.';
      er.appendChild(td);
      gradeSummaryBody.appendChild(er);
      return;
    }

    keys.forEach(function (ck) {
      var g = groups[ck];
      var sm = computeSummary(g.list);
      var tr = document.createElement('tr');
      tr.className = 'clickable';
      var label = g.grade && g.cls ? (g.grade + '학년 ' + g.cls + '반') : '미분류';
      var cells = [
        label,
        sm.submitted.length + ' / ' + sm.total,
        sm.avgScore !== null ? (sm.avgScore + '점') : '-',
        sm.avgCorrect !== null ? (sm.avgCorrect + ' / ' + totalItemsCount()) : '-',
        sm.maxScore !== null ? (sm.maxScore + ' · ' + sm.minScore) : '-',
        sm.review.length ? (sm.review.length + '명') : '0명'
      ];
      cells.forEach(function (txt) {
        var td = document.createElement('td');
        td.textContent = txt;
        tr.appendChild(td);
      });
      if (g.grade && g.cls) {
        tr.addEventListener('click', function () {
          selectedGrade = String(g.grade);
          selectedClass = ck;
          renderAll();
        });
      }
      gradeSummaryBody.appendChild(tr);
    });
  }

  function renderCharts(filtered, sm) {
    var total = totalItemsCount();
    var bins = {};
    for (var c = 0; c <= total; c++) {
      var pt = calcScore(c);
      bins[pt] = (bins[pt] || 0);
    }
    sm.submitted.forEach(function (rec) {
      var pt = rec.convertedScore;
      bins[pt] = (bins[pt] || 0) + 1;
    });
    var binKeys = Object.keys(bins).map(Number).sort(function (a, b) { return a - b; });
    var maxCnt = Math.max(1, Math.max.apply(null, binKeys.map(function (k) { return bins[k]; })));

    distNote.textContent = binKeys[0] + '~' + binKeys[binKeys.length - 1] + '점';
    distChart.textContent = '';
    binKeys.forEach(function (pt) {
      var cnt = bins[pt];
      var col = document.createElement('div');
      col.className = 'dist-col';
      var cEl = document.createElement('span');
      cEl.className = 'dist-cnt';
      cEl.textContent = cnt ? String(cnt) : '';
      var wrap = document.createElement('div');
      wrap.className = 'dist-bar-wrap';
      var bar = document.createElement('div');
      bar.className = 'dist-bar' + (cnt === 0 ? ' zero' : '');
      bar.style.height = cnt ? Math.max(6, Math.round((cnt / maxCnt) * 100)) + '%' : '2px';
      bar.title = pt + '점: ' + cnt + '명';
      wrap.appendChild(bar);
      var lbl = document.createElement('span');
      lbl.className = 'dist-lbl';
      lbl.textContent = String(pt);
      col.appendChild(cEl);
      col.appendChild(wrap);
      col.appendChild(lbl);
      distChart.appendChild(col);
    });

    itemChart.textContent = '';
    var items = (examData && examData.exam && examData.exam.items) || [];
    var subCount = sm.submitted.length;
    var itemStats = items.map(function (item) {
      var ok = 0;
      sm.submitted.forEach(function (rec) {
        if (rec.official && rec.official.perItem && rec.official.perItem[item.code]) ok++;
      });
      var rate = subCount ? Math.round((ok / subCount) * 1000) / 10 : 0;
      return { code: item.code, answer: item.answer, ok: ok, total: subCount, rate: rate };
    }).sort(function (a, b) {
      if (a.rate !== b.rate) return a.rate - b.rate;
      return a.answer.localeCompare(b.answer, 'ko');
    });

    if (!itemStats.length) {
      var p = document.createElement('p');
      p.className = 'muted';
      p.textContent = '문항 정보가 없어요.';
      itemChart.appendChild(p);
      return;
    }

    itemStats.forEach(function (it) {
      var row = document.createElement('div');
      row.className = 'item-row';
      var name = document.createElement('span');
      name.className = 'item-name';
      name.textContent = it.answer;
      var track = document.createElement('div');
      track.className = 'item-track';
      var fill = document.createElement('div');
      fill.className = 'item-fill' + (it.rate < 50 && it.total > 0 ? ' low' : '');
      fill.style.width = it.rate + '%';
      track.appendChild(fill);
      var val = document.createElement('span');
      val.className = 'item-val';
      val.textContent = it.total ? (it.rate + '% (' + it.ok + '/' + it.total + ')') : '-';
      row.appendChild(name);
      row.appendChild(track);
      row.appendChild(val);
      itemChart.appendChild(row);
    });
  }

  function renderTable(filtered) {
    tableTitle.textContent = selectedClass
      ? selectedClass.replace('-', '학년 ') + '반 성적 (' + filtered.length + '명)'
      : selectedGrade
        ? selectedGrade + '학년 성적 (' + filtered.length + '명)'
        : '전체 성적 (' + filtered.length + '명)';

    studentBody.textContent = '';
    if (!filtered.length) {
      var er = document.createElement('tr');
      var td = document.createElement('td');
      td.colSpan = 10;
      td.className = 'muted';
      td.textContent = '표시할 학생이 없어요.';
      er.appendChild(td);
      studentBody.appendChild(er);
      return;
    }

    filtered.forEach(function (rec) {
      var tr = document.createElement('tr');
      if (!rec.submitted) {
        tr.className = 'unsub';
        var stLabel = (rec.statusRow && rec.statusRow.state) ? rec.statusRow.state : '미응시';
        [rec.num, rec.displayName, '-', '-', '-', '-', '-', '-', stLabel, '-'].forEach(function (txt, idx) {
          var td = document.createElement('td');
          if (idx === 8) {
            var b = document.createElement('span');
            b.className = 'badge muted';
            b.textContent = txt;
            td.appendChild(b);
          } else {
            td.textContent = txt;
          }
          tr.appendChild(td);
        });
        studentBody.appendChild(tr);
        return;
      }

      var off = rec.official;
      tr.className = 'clickable' + (rec.needsReview ? ' review-row' : '') + (off.auto ? ' early-row' : '');
      tr.addEventListener('click', function () {
        openDetailModal(rec.num);
      });

      var cols = [
        rec.num,
        rec.displayName,
        off.correct + ' / ' + totalItemsCount(),
        rec.convertedScore + '점',
        off.away + '회',
        off.auto ? '조기 종료(이탈 5회)' : '-',
        off.time || '-',
        (off.minutes || 0) + '분'
      ];
      cols.forEach(function (txt, idx) {
        var td = document.createElement('td');
        if (idx === 5 && off.auto) {
          var ab = document.createElement('span');
          ab.className = 'badge danger';
          ab.textContent = txt;
          td.appendChild(ab);
        } else {
          td.textContent = txt;
        }
        tr.appendChild(td);
      });

      var revTd = document.createElement('td');
      var badge = document.createElement('span');
      if (rec.needsReview) {
        badge.className = 'badge warn';
        badge.textContent = '확인 필요 (' + rec.reviewReasons.join(', ') + ')';
      } else if (rec.officialPicked) {
        badge.className = 'badge ok';
        badge.textContent = '확정됨';
      } else {
        badge.className = 'badge ok';
        badge.textContent = '정상';
      }
      revTd.appendChild(badge);
      tr.appendChild(revTd);

      var actTd = document.createElement('td');
      var rstBtn = document.createElement('button');
      rstBtn.type = 'button';
      rstBtn.className = 'btn-danger-ghost';
      rstBtn.textContent = '재응시 초기화';
      rstBtn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        openResetModal(rec.num, rec.displayName);
      });
      actTd.appendChild(rstBtn);
      tr.appendChild(actTd);

      studentBody.appendChild(tr);
    });
  }

  function openDetailModal(num) {
    if (!examData) return;
    var byNum = buildStudentRecords();
    var rec = byNum[num];
    if (!rec || !rec.submitted) return;

    if (detailNum !== num) detailViewKey = '';
    detailNum = num;
    if (!detailViewKey || !rec.submissions.some(function (s) { return s._key === detailViewKey; })) {
      detailViewKey = rec.official._key;
    }
    var viewedSub = rec.submissions.find(function (s) { return s._key === detailViewKey; }) || rec.official;

    detailTitle.textContent = rec.num + ' ' + rec.displayName;
    if (detailResetBtn) {
      detailResetBtn.onclick = function () {
        openResetModal(rec.num, rec.displayName);
      };
    }
    var extraInfo = [];
    if (rec.rosterName && rec.submissions.some(function (s) { return normName(s.name) !== normName(rec.rosterName); })) {
      extraInfo.push('명단 이름: ' + rec.rosterName);
    }
    if (rec.reviewReasons.length) extraInfo.push(rec.reviewReasons.join(' · '));
    detailSub.textContent = extraInfo.length ? extraInfo.join(' | ') : '제출 ' + rec.submissions.length + '건';

    detailSubs.textContent = '';
    rec.submissions.forEach(function (sub, idx) {
      var isOfficial = sub._key === rec.official._key;
      var isPicked = picks[num] === sub._key;
      var isViewed = sub._key === viewedSub._key;

      var div = document.createElement('div');
      div.className = 'sub-item' + (isOfficial ? ' picked' : '');

      var left = document.createElement('div');
      left.innerHTML = '';
      var strong = document.createElement('b');
      strong.textContent = (idx + 1) + '번째 제출 · ' + sub.correct + '/' + totalItemsCount() + ' (' + calcScore(sub.correct) + '점)';
      var meta = document.createElement('div');
      meta.className = 'muted';
      meta.textContent = (sub.time || '') + ' · 이탈 ' + sub.away + '회 · ' + (sub.minutes || 0) + '분 · ' +
        (sub.auto ? '조기 종료(이탈 5회 자동 제출) · ' : '') + '이름 "' + sub.name + '" · 세션 ' + String(sub.sid || '').slice(0, 8);
      left.appendChild(strong);
      left.appendChild(meta);

      var right = document.createElement('div');
      right.className = 'row';

      var viewBtn = document.createElement('button');
      viewBtn.type = 'button';
      viewBtn.className = 'btn-ghost';
      viewBtn.textContent = isViewed ? '답안 보는 중' : '답안 보기';
      viewBtn.disabled = isViewed;
      viewBtn.addEventListener('click', function () {
        detailViewKey = sub._key;
        openDetailModal(num);
      });
      right.appendChild(viewBtn);

      if (isPicked) {
        var unpickBtn = document.createElement('button');
        unpickBtn.type = 'button';
        unpickBtn.className = 'btn-ghost';
        unpickBtn.textContent = '확정 해제';
        unpickBtn.addEventListener('click', function () {
          delete picks[num];
          store(PICK_STORE, JSON.stringify(picks));
          renderAll();
          openDetailModal(num);
        });
        right.appendChild(unpickBtn);
      } else {
        var pickBtn = document.createElement('button');
        pickBtn.type = 'button';
        pickBtn.className = 'btn-primary';
        pickBtn.textContent = isOfficial ? '이 첫 제출 확정' : '이 제출을 공식 점수로 확정';
        pickBtn.addEventListener('click', function () {
          picks[num] = sub._key;
          store(PICK_STORE, JSON.stringify(picks));
          detailViewKey = sub._key;
          renderAll();
          openDetailModal(num);
        });
        right.appendChild(pickBtn);
      }

      div.appendChild(left);
      div.appendChild(right);
      detailSubs.appendChild(div);
    });

    detailSubLabel.textContent = viewedSub.time + ' 제출 · ' + viewedSub.correct + '/' + totalItemsCount();
    detailItemsBody.textContent = '';
    var items = (examData.exam && examData.exam.items) || [];
    items.forEach(function (item, i) {
      var tr = document.createElement('tr');
      var ans = (viewedSub.answers && viewedSub.answers['q:' + item.code]) || '';
      var ok = !!(viewedSub.perItem && viewedSub.perItem[item.code]);

      var t1 = document.createElement('td'); t1.textContent = String(i + 1);
      var t2 = document.createElement('td'); t2.textContent = item.answer;
      var t3 = document.createElement('td'); t3.textContent = ans || '(빈칸)';
      var t4 = document.createElement('td');
      var b = document.createElement('span');
      b.className = 'badge ' + (ok ? 'ok' : 'danger');
      b.textContent = ok ? '○' : '✕';
      t4.appendChild(b);

      tr.appendChild(t1); tr.appendChild(t2); tr.appendChild(t3); tr.appendChild(t4);
      detailItemsBody.appendChild(tr);
    });

    detailModal.hidden = false;
  }

  function buildNeisStudentMap(byNum) {
    var map = {};
    Object.keys(byNum).forEach(function (num) {
      var rec = byNum[num];
      map[num] = {
        num: num,
        name: rec.displayName,
        submitted: rec.submitted,
        score: rec.convertedScore,
        needsReview: rec.needsReview,
        reviewReasons: rec.reviewReasons
      };
    });
    return map;
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function renderNeisList(byNum) {
    var hasFiles = neisFiles.length > 0;
    neisAllBtn.hidden = !hasFiles;
    neisClearBtn.hidden = !hasFiles;
    neisList.textContent = '';
    if (!hasFiles) return;

    var studentMap = buildNeisStudentMap(byNum);
    var maxPt = calcScore(totalItemsCount());

    neisFiles.forEach(function (entry, idx) {
      var box = document.createElement('div');
      box.className = 'neis-file';

      var head = document.createElement('div');
      head.className = 'neis-file-head';
      var title = document.createElement('b');
      title.textContent = entry.name;

      var right = document.createElement('div');
      right.className = 'row';

      var gSel = document.createElement('select');
      gSel.setAttribute('aria-label', entry.name + ' 학년');
      var optNone = document.createElement('option');
      optNone.value = '';
      optNone.textContent = '학년 선택';
      gSel.appendChild(optNone);
      [1, 2, 3].forEach(function (g) {
        var o = document.createElement('option');
        o.value = String(g);
        o.textContent = g + '학년';
        gSel.appendChild(o);
      });
      gSel.value = entry.grade ? String(entry.grade) : '';
      gSel.addEventListener('change', function () {
        entry.grade = gSel.value ? Number(gSel.value) : null;
        renderNeisList(buildStudentRecords());
      });
      right.appendChild(gSel);

      var plan = window.NeisExcel.planNeisFill(entry.parsed, entry.grade, studentMap, maxPt);

      var dlBtn = document.createElement('button');
      dlBtn.type = 'button';
      dlBtn.className = 'btn-primary';
      dlBtn.textContent = '점수 넣어 다운로드';
      dlBtn.disabled = !entry.grade || !plan.fills.length;
      dlBtn.addEventListener('click', function () {
        exportSingleNeis(entry, plan);
      });
      right.appendChild(dlBtn);

      var rmBtn = document.createElement('button');
      rmBtn.type = 'button';
      rmBtn.className = 'btn-ghost';
      rmBtn.textContent = '빼기';
      rmBtn.addEventListener('click', function () {
        neisFiles.splice(idx, 1);
        renderNeisList(buildStudentRecords());
      });
      right.appendChild(rmBtn);

      head.appendChild(title);
      head.appendChild(right);
      box.appendChild(head);

      var sum = document.createElement('div');
      sum.className = 'neis-summary';
      var badges = [
        ['ok', '채울 학생 ' + plan.fills.length + '명'],
        ['muted', '미응시 ' + plan.missing.length + '명'],
        [plan.needsReview.length ? 'warn' : 'muted', '확인 필요 ' + plan.needsReview.length + '명']
      ];
      if (plan.nameMismatches.length) badges.push(['warn', '성명 다름 ' + plan.nameMismatches.length + '명']);
      if (plan.existingCells.length) badges.push(['warn', '기존 J값 ' + plan.existingCells.length + '칸']);
      if (entry.parsed.maxScore !== null) badges.push([plan.maxScoreMismatch ? 'danger' : 'muted', '파일 영역만점 ' + entry.parsed.maxScore]);
      badges.forEach(function (pair) {
        var b = document.createElement('span');
        b.className = 'badge ' + pair[0];
        b.textContent = pair[1];
        sum.appendChild(b);
      });
      box.appendChild(sum);

      var warns = document.createElement('div');
      warns.className = 'neis-warns';
      if (!entry.grade) {
        var wGrade = document.createElement('div');
        wGrade.className = 'danger-box-inline';
        wGrade.textContent = '파일 이름에서 학년을 찾지 못했어요. 오른쪽에서 학년을 먼저 골라 주세요.';
        warns.appendChild(wGrade);
      }
      if (plan.maxScoreMismatch) {
        var wMax = document.createElement('div');
        wMax.className = 'danger-box-inline';
        wMax.textContent = '파일 F1 영역만점(' + plan.maxScore + '점)과 지금 환산 만점(' + maxPt + '점)이 달라요.';
        warns.appendChild(wMax);
      }
      if (plan.jHeaderWarning) {
        var wJh = document.createElement('div');
        wJh.className = 'warn-box-inline';
        wJh.textContent = 'J2 칸 제목이 "합계"가 아니에요(' + (entry.parsed.jHeader || '빈칸') + '). 나이스 양식이 맞는지 확인해 주세요.';
        warns.appendChild(wJh);
      }
      if (plan.nameMismatches.length) {
        var wNm = document.createElement('div');
        wNm.className = 'warn-box-inline';
        wNm.textContent = '반·번호는 맞지만 이름이 다른 학생: ' + plan.nameMismatches.map(function (m) {
          return m.num + ' 엑셀("' + m.neisName + '") ≠ 시험("' + m.examName + '")';
        }).join(', ');
        warns.appendChild(wNm);
      }
      var earlyFills = plan.fills.filter(function (f) { var rc = byNum[f.num]; return rc && rc.official && rc.official.auto; });
      if (earlyFills.length) {
        var wEarly = document.createElement('div');
        wEarly.className = 'danger-box-inline';
        wEarly.textContent = '조기 종료(이탈 5회 자동 제출) 학생 — 점수는 넣지만 부정행위 여부를 확인해 주세요: ' + earlyFills.map(function (f) {
          var rc = byNum[f.num]; return f.num + ' ' + ((rc && rc.displayName) || '');
        }).join(', ');
        warns.appendChild(wEarly);
      }
      if (plan.needsReview.length) {
        var wRev = document.createElement('div');
        wRev.className = 'warn-box-inline';
        wRev.textContent = '확인 필요(빈칸으로 둠): ' + plan.needsReview.map(function (m) {
          return m.cls + '-' + m.no + ' ' + m.name;
        }).join(', ');
        warns.appendChild(wRev);
      }
      if (plan.missing.length) {
        var wMiss = document.createElement('div');
        wMiss.className = 'warn-box-inline';
        wMiss.textContent = '미응시(빈칸으로 둠, ' + plan.missing.length + '명): ' + plan.missing.slice(0, 10).map(function (m) {
          return m.cls + '-' + m.no + ' ' + m.name;
        }).join(', ') + (plan.missing.length > 10 ? ' 외 ' + (plan.missing.length - 10) + '명' : '');
        warns.appendChild(wMiss);
      }
      if (plan.existingCells.length) {
        var wEx = document.createElement('div');
        wEx.className = 'warn-box-inline';
        wEx.textContent = 'J열에 이미 값이 있는 칸: ' + plan.existingCells.map(function (e) {
          return e.name + '(J' + e.row + '=' + e.existingJ + ' → ' + e.nextScore + ')';
        }).join(', ');
        warns.appendChild(wEx);
      }
      if (warns.children.length) box.appendChild(warns);

      neisList.appendChild(box);
    });
  }

  function exportSingleNeis(entry, plan, skipConfirm) {
    if (!entry.grade) return Promise.resolve(false);
    var overwrite = neisOverwriteChk.checked;
    if (!overwrite && plan.existingCells.length && !skipConfirm) {
      overwrite = window.confirm(
        entry.name + '의 J열에 이미 값이 들어 있는 칸이 ' + plan.existingCells.length + '개 있어요.\n' +
        '확인을 누르면 새 점수로 덮어쓰고, 취소를 누르면 기존 값이 있는 칸은 그대로 둔 채 빈 칸만 채워요.'
      );
    }
    var scoreByRow = {};
    plan.fills.forEach(function (f) {
      if (!f.hasExistingJ || overwrite) scoreByRow[f.row] = f.score;
    });
    var patchedXml = window.NeisExcel.patchSheetXml(entry.xml, scoreByRow, { overwriteExisting: overwrite });
    return window.JSZip.loadAsync(entry.buffer, { createFolders: false }).then(function (freshZip) {
      // createFolders:false — 원본에 없는 폴더 항목(xl/, xl/worksheets/)이 zip에 새로 생기지 않게
      freshZip.file('xl/worksheets/sheet1.xml', patchedXml, { createFolders: false });
      return freshZip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        compression: 'DEFLATE'
      });
    }).then(function (blob) {
      downloadBlob(blob, window.NeisExcel.outputFilename(entry.name));
      return true;
    });
  }

  function handleNeisUpload(fileList) {
    if (!window.JSZip) {
      alert('엑셀 처리 도구(JSZip)를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.');
      return;
    }
    var files = Array.prototype.slice.call(fileList || []).filter(function (f) {
      return /\.xlsx$/i.test(f.name);
    });
    if (!files.length) return;

    Promise.all(files.map(function (file) {
      return file.arrayBuffer().then(function (buffer) {
        return window.JSZip.loadAsync(buffer).then(function (zip) {
          var sheetFile = zip.file('xl/worksheets/sheet1.xml');
          if (!sheetFile) throw new Error(file.name + ': xl/worksheets/sheet1.xml을 찾지 못했어요.');
          var sstFile = zip.file('xl/sharedStrings.xml');
          var readSst = sstFile ? sstFile.async('string') : Promise.resolve('');
          return Promise.all([sheetFile.async('string'), readSst]).then(function (pair) {
            var xml = pair[0];
            var sstXml = pair[1];
            var parsed = window.NeisExcel.parseSheetXml(xml, file.name, sstXml);
            var fallbackGrade = parsed.detectedGrade || (selectedGrade ? Number(selectedGrade) : null);
            return {
              name: file.name,
              buffer: buffer,
              xml: xml,
              parsed: parsed,
              grade: fallbackGrade
            };
          });
        });
      });
    })).then(function (loaded) {
      neisFiles = neisFiles.concat(loaded);
      renderNeisList(buildStudentRecords());
    }).catch(function (err) {
      alert(err && err.message ? err.message : '엑셀 파일을 읽는 중 오류가 났어요.');
    });
  }

  function csvCell(v) {
    var s = String(v == null ? '' : v);
    if (/^[\s\u0000-\u001f]*[=+\-@]/.test(s)) s = "'" + s;
    if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function exportCsv() {
    if (!examData) return;
    var byNum = buildStudentRecords();
    var filtered = filterRecords(byNum, selectedGrade, selectedClass);
    var items = (examData.exam && examData.exam.items) || [];
    var header = ['학번', '학년', '반', '번호', '이름', '상태', '맞힌개수', '환산점수', '이탈횟수', '조기종료(이탈5회)', '제출시각', '걸린시간(분)', '확인필요']
      .concat(items.map(function (it) { return it.answer; }));

    var lines = [header.map(csvCell).join(',')];
    filtered.forEach(function (rec) {
      var off = rec.official;
      var statusTxt = !rec.submitted ? '미응시' : (rec.needsReview ? '확인필요' : (rec.officialPicked ? '확정' : '정상'));
      var row = [
        rec.num,
        rec.grade || '',
        rec.cls || '',
        rec.no || '',
        rec.displayName,
        statusTxt,
        off ? off.correct : '',
        off ? rec.convertedScore : '',
        off ? off.away : '',
        off ? (off.auto ? '예' : '아니요') : '',
        off ? off.time : '',
        off ? off.minutes : '',
        rec.reviewReasons.join(' / ')
      ];
      items.forEach(function (it) {
        row.push(off && off.answers ? (off.answers['q:' + it.code] || '') : '');
      });
      lines.push(row.map(csvCell).join(','));
    });

    var blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var tag = selectedClass ? selectedClass.replace('-', '학년_') + '반' : (selectedGrade ? selectedGrade + '학년' : '전체');
    downloadBlob(blob, '국악기_수행평가_' + tag + '.csv');
  }

  function showToast(msg, isErr) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.className = 'toast' + (isErr ? ' err' : '');
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.hidden = true;
    }, 4500);
  }

  function returnToSetup(errMsg) {
    store(KEY_STORE, null);
    key = null;
    examData = null;
    setupCard.hidden = false;
    appEl.hidden = true;
    headActions.hidden = true;
    setupErr.textContent = (errMsg || '현황판 키가 올바르지 않아요.') + ' 현황판 주소를 다시 붙여 넣어 주세요.';
  }

  function openResetModal(num, name) {
    resetTarget = { num: num, name: name || '' };
    resetErr.textContent = '';
    resetOkBtn.disabled = false;
    resetOkBtn.textContent = '초기화하기';
    resetCancelBtn.disabled = false;
    resetMsg.textContent = num + ' ' + (name || '') + ' 학생의 시험 기록(제출·이탈 기록)을 지우고 다시 응시하게 할까요? 원래 답안은 아래 보관함에 남아서, 필요하면 \'통계에 되살리기\'로 다시 가져올 수 있어요.';
    resetModal.hidden = false;
    resetCancelBtn.focus();
  }

  function closeResetModal() {
    if (resetBusy) return;
    resetModal.hidden = true;
    resetTarget = null;
  }

  function restoreArchiveItem(item, btn) {
    if (!key || !item) return;
    btn.disabled = true;
    btn.textContent = '되살리는 중…';
    fetch(HUB, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ type: 'examRestore', key: key, ws: EXAM_WS, sid: item.sid, time: item.time })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok) {
          btn.disabled = false;
          btn.textContent = '통계에 되살리기';
          var errMsg = (d && d.error) || '되살리기에 실패했어요.';
          if (/키/.test(errMsg)) returnToSetup(errMsg);
          else showToast(errMsg, true);
          return;
        }
        showToast(item.num + ' ' + item.name + ' 학생의 제출을 통계에 되살렸어요.');
        fetchData();
      })
      .catch(function (err) {
        btn.disabled = false;
        btn.textContent = '통계에 되살리기';
        showToast((err && err.message) || '허브에 연결하지 못했어요.', true);
      });
  }

  function renderArchive() {
    if (!archiveBody || !archiveCount) return;
    var liveSet = {};
    ((examData && examData.rows) || []).forEach(function (r) {
      liveSet[(r.sid || '') + '|' + (r.time || '')] = true;
    });
    var deleted = ((examData && examData.archive) || []).filter(function (a) {
      return a.status === '제출' && !liveSet[(a.sid || '') + '|' + (a.time || '')];
    }).sort(function (a, b) {
      return a.time === b.time ? 0 : (a.time > b.time ? -1 : 1);
    });
    archiveCount.textContent = '지워진 제출 ' + deleted.length + '건';
    archiveCount.className = 'badge ' + (deleted.length ? 'warn' : 'muted');
    archiveBody.textContent = '';
    if (!deleted.length) {
      var er = document.createElement('tr');
      var td = document.createElement('td');
      td.colSpan = 7;
      td.className = 'muted';
      td.textContent = '지워진 제출 기록이 없어요.';
      er.appendChild(td);
      archiveBody.appendChild(er);
      return;
    }
    deleted.forEach(function (item) {
      var tr = document.createElement('tr');
      var scoreTxt = item.correct !== null && item.correct !== undefined
        ? (item.correct + ' / ' + (item.total || totalItemsCount()) + ' (' + calcScore(item.correct) + '점)')
        : '-';
      [
        item.time || '-',
        item.num || '-',
        item.name || '-',
        scoreTxt,
        (item.away || 0) + '회',
        item.auto ? '조기 종료' : '-'
      ].forEach(function (txt, idx) {
        var td = document.createElement('td');
        if (idx === 5 && item.auto) {
          var b = document.createElement('span');
          b.className = 'badge danger';
          b.textContent = txt;
          td.appendChild(b);
        } else {
          td.textContent = txt;
        }
        tr.appendChild(td);
      });
      var actTd = document.createElement('td');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-ghost';
      btn.textContent = '통계에 되살리기';
      btn.addEventListener('click', function () {
        restoreArchiveItem(item, btn);
      });
      actTd.appendChild(btn);
      tr.appendChild(actTd);
      archiveBody.appendChild(tr);
    });
  }

  function renderAll() {
    if (!examData) return;
    examTitle.textContent = ((examData.exam && examData.exam.title) || '국악기 수행평가') + ' · 성적 통계';
    var byNum = buildStudentRecords();
    populateFilters(byNum);
    renderScoringControls();
    renderGradeSummary(byNum);

    var filtered = filterRecords(byNum, selectedGrade, selectedClass);
    var sm = computeSummary(filtered);
    stCount.textContent = sm.submitted.length + ' / ' + sm.total;
    stRate.textContent = sm.total ? ('미응시 ' + sm.missing.length + '명') : '';
    stAvg.textContent = sm.avgScore !== null ? (sm.avgScore + '점') : '-';
    stCorrectAvg.textContent = sm.avgCorrect !== null ? ('평균 맞힌 개수 ' + sm.avgCorrect + '/' + totalItemsCount()) : '';
    stMinMax.textContent = sm.maxScore !== null ? (sm.maxScore + ' · ' + sm.minScore + '점') : '-';
    stReview.textContent = sm.review.length + '명';
    // 이탈 5회로 자동 제출된(조기 종료) 답안 수
    var early = filtered.filter(function (r) { return r.submitted && r.official && r.official.auto; });
    $('stEarly').textContent = early.length + '명';
    $('stEarlyNames').textContent = early.length ? early.map(function (r) { return r.num + ' ' + r.displayName; }).slice(0, 6).join(', ') + (early.length > 6 ? ' 외 ' + (early.length - 6) + '명' : '') : '이탈 5회 자동 제출';

    renderCharts(filtered, sm);
    renderTable(filtered);
    renderNeisList(byNum);
    renderArchive();
  }

  function fetchData() {
    if (!key) return;
    loadErr.hidden = true;
    lastSync.textContent = '불러오는 중…';
    var url = HUB + '?dash=' + encodeURIComponent(key) + '&format=json&exam=' + encodeURIComponent(EXAM_WS);
    fetch(url, { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok) {
          throw new Error((d && d.error) || '데이터를 불러오지 못했어요.');
        }
        examData = d;
        var now = new Date();
        var p = function (n) { return (n < 10 ? '0' : '') + n; };
        lastSync.textContent = '확인 ' + p(now.getHours()) + ':' + p(now.getMinutes()) + ':' + p(now.getSeconds());
        renderAll();
      })
      .catch(function (err) {
        var msg = err && err.message ? err.message : '허브에 연결하지 못했어요.';
        if (/키/.test(msg)) {
          returnToSetup(msg);
          return;
        }
        loadErr.hidden = false;
        loadErr.textContent = msg;
        lastSync.textContent = '불러오기 실패';
      });
  }

  function boot() {
    if (!key) {
      setupCard.hidden = false;
      appEl.hidden = true;
      headActions.hidden = true;
      return;
    }
    setupCard.hidden = true;
    appEl.hidden = false;
    headActions.hidden = false;
    fetchData();
  }

  saveKeyBtn.addEventListener('click', function () {
    var k = keyFromUrl(dashUrlInput.value);
    if (!k) {
      setupErr.textContent = '주소에서 dash= 뒤의 키를 찾지 못했어요. 현황판 주소 전체를 붙여 넣어 주세요.';
      return;
    }
    setupErr.textContent = '';
    key = k;
    store(KEY_STORE, k);
    boot();
  });

  dashUrlInput.addEventListener('input', function () { setupErr.textContent = ''; });
  forgetKeyBtn.addEventListener('click', function () {
    if (confirm('이 기기에서 현황판 키를 지울까요? (알림판 키도 함께 지워져요)')) {
      store(KEY_STORE, null);
      key = null;
      boot();
    }
  });
  refreshBtn.addEventListener('click', fetchData);

  gradeSel.addEventListener('change', function () {
    selectedGrade = gradeSel.value;
    selectedClass = '';
    renderAll();
  });
  classSel.addEventListener('change', function () {
    selectedClass = classSel.value;
    renderAll();
  });

  function updateScoringInputs() {
    var b = Number(baseInput.value);
    var p = Number(perInput.value);
    if (!Number.isFinite(b) || !Number.isFinite(p)) return;
    scoring = { base: b, per: p };
    store(SCORE_STORE, JSON.stringify(scoring));
    renderAll();
  }
  baseInput.addEventListener('input', updateScoringInputs);
  perInput.addEventListener('input', updateScoringInputs);
  resetScoreBtn.addEventListener('click', function () {
    scoring = null;
    store(SCORE_STORE, null);
    renderAll();
  });

  csvBtn.addEventListener('click', exportCsv);

  neisInput.addEventListener('change', function () {
    handleNeisUpload(neisInput.files);
    neisInput.value = '';
  });
  neisDrop.addEventListener('dragover', function (e) {
    e.preventDefault();
    neisDrop.classList.add('drag');
  });
  neisDrop.addEventListener('dragleave', function () {
    neisDrop.classList.remove('drag');
  });
  neisDrop.addEventListener('drop', function (e) {
    e.preventDefault();
    neisDrop.classList.remove('drag');
    handleNeisUpload(e.dataTransfer && e.dataTransfer.files);
  });

  neisClearBtn.addEventListener('click', function () {
    neisFiles = [];
    renderNeisList(buildStudentRecords());
  });
  neisAllBtn.addEventListener('click', function () {
    if (!neisFiles.length || !examData) return;
    var byNum = buildStudentRecords();
    var studentMap = buildNeisStudentMap(byNum);
    var maxPt = calcScore(totalItemsCount());
    var seq = Promise.resolve();
    var exported = 0;
    neisFiles.forEach(function (entry) {
      if (!entry.grade) return;
      var plan = window.NeisExcel.planNeisFill(entry.parsed, entry.grade, studentMap, maxPt);
      if (!plan.fills.length) return;
      var delay = exported > 0 ? 400 : 0;
      exported++;
      seq = seq.then(function () {
        if (!delay) return exportSingleNeis(entry, plan);
        return new Promise(function (resolve) { setTimeout(resolve, delay); })
          .then(function () { return exportSingleNeis(entry, plan); });
      });
    });
  });

  function closeDetailModal() {
    detailModal.hidden = true;
    detailNum = '';
    detailViewKey = '';
  }
  detailCloseBtn.addEventListener('click', closeDetailModal);
  detailModal.addEventListener('click', function (e) {
    if (e.target === detailModal) closeDetailModal();
  });
  resetCancelBtn.addEventListener('click', closeResetModal);
  resetModal.addEventListener('click', function (e) {
    if (e.target === resetModal) closeResetModal();
  });
  resetOkBtn.addEventListener('click', function () {
    if (resetBusy || !resetTarget || !key) return;
    var target = resetTarget;
    resetBusy = true;
    resetErr.textContent = '';
    resetOkBtn.disabled = true;
    resetCancelBtn.disabled = true;
    resetOkBtn.textContent = '초기화 중…';
    fetch(HUB, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ type: 'examReset', key: key, ws: EXAM_WS, num: target.num })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        resetBusy = false;
        resetOkBtn.disabled = false;
        resetCancelBtn.disabled = false;
        resetOkBtn.textContent = '초기화하기';
        if (!d || !d.ok) {
          var errMsg = (d && d.error) || '초기화에 실패했어요.';
          if (/키/.test(errMsg)) {
            resetModal.hidden = true;
            resetTarget = null;
            closeDetailModal();
            returnToSetup(errMsg);
            return;
          }
          resetErr.textContent = errMsg;
          return;
        }
        delete picks[target.num];
        store(PICK_STORE, JSON.stringify(picks));
        resetModal.hidden = true;
        resetTarget = null;
        if (!detailModal.hidden && detailNum === target.num) closeDetailModal();
        var subRemoved = (d.removed && d.removed.submit) || 0;
        showToast(target.num + ' ' + target.name + ' 학생을 재응시 초기화했어요. (제출 ' + subRemoved + '건 지움)');
        fetchData();
      })
      .catch(function (err) {
        resetBusy = false;
        resetOkBtn.disabled = false;
        resetCancelBtn.disabled = false;
        resetOkBtn.textContent = '초기화하기';
        resetErr.textContent = (err && err.message) || '허브에 연결하지 못했어요.';
      });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!resetModal.hidden) closeResetModal();
    else if (!detailModal.hidden) closeDetailModal();
  });

  boot();
})();
