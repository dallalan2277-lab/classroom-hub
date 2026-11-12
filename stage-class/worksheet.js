'use strict';
/* =========================================================
   음악극 탐험대 · 수업과 학습지 (stage-class)
   - 수업 장(章)마다 바로 뒤에 그 장의 학습지(stage/ 학습지와 같은 문항)를 끼워 넣어요.
   - 맨 끝 '제출하기'에서 빈칸·고르기를 채점해 학습지 허브로 보내요.
   - 학번·이름, 자리 비움 감지, 보내기, ?교사 모드는 공용 ../classroom.js 가 맡아요.
   이 파일은 content.js 다음, app.js 앞에 실행되어야 해요(장 목록을 먼저 고쳐 둠).
   ========================================================= */
(function(){
  var LC = window.lessonContent;
  var CR = window.Classroom || null;
  var TEACHER = !!(CR && CR.teacher), ONLINE = !!(CR && CR.online);
  var SHARE_URL = 'https://dallalan2277-lab.github.io/classroom-hub/stage-class/';
  document.body.classList.add(TEACHER ? 'is-teacher' : 'is-student');

  var esc = function(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  var norm = function(s){ return String(s||'').normalize('NFC').toLowerCase().replace(/[\s·・.,()\[\]「」『』'"‘’“”\-–—~!?]/g,''); };
  function hash(t){ var h=2166136261; for (var i=0;i<t.length;i++){ h^=t.charCodeAt(i); h=Math.imul(h,16777619)>>>0; } return h; }

  /* ---------- 1) 장 목록: 수업 장 → 그 장의 학습지 → … → 제출하기 ---------- */
  var base = LC.chapters.slice();
  var list = [];
  base.forEach(function(c){
    list.push(c);
    list.push({id:c.id+'-ws', name:c.name+' 학습지', sub:'✎ 빈칸 · 고르기', min:3, icon:'quiz', shortMin:2, ws:true});
  });
  list.push({id:'submit', name:'제출하기', sub:'채점하고 선생님께 보내기', min:2, icon:'flag', shortMin:2});
  LC.chapters.length = 0;
  list.forEach(function(c){ LC.chapters.push(c); });

  /* ---------- 2) 학습지 문항 (index.html 의 <template id="ws-parts">) ---------- */
  var tpl = document.getElementById('ws-parts');
  var parts = Array.prototype.map.call(tpl.content.querySelectorAll('section.w-part'), function(n){ return document.importNode(n, true); });
  var items = [];
  parts.forEach(function(part, pi){
    var pname = part.getAttribute('data-part'), n = 0;
    Array.prototype.forEach.call(part.querySelectorAll('.w-bk, select.w-pick, textarea.w-free, div.w-checks'), function(el){
      n++;
      var key = 'p'+(pi+1)+'-'+n, num = (pi+1)+'-'+(n<10?'0':'')+n;
      if (el.classList.contains('w-bk')){
        var acc = (el.getAttribute('data-a')||'').split('|'); el.removeAttribute('data-a');
        var inp = document.createElement('input');
        inp.id = key; inp.type = 'text'; inp.autocomplete = 'off'; inp.setAttribute('autocapitalize','off');
        inp.setAttribute('autocorrect','off'); inp.spellcheck = false; inp.setAttribute('aria-label', pname+' 빈칸 '+n);
        inp.style.width = Math.max(4.5, acc[0].length*1.15+2)+'em';
        el.appendChild(inp);
        items.push({key:key, label:pname+' '+num+' ('+acc[0]+')', type:'blank', el:inp, wrap:el, accept:acc, part:pi});
      } else if (el.tagName === 'SELECT'){
        var a = el.getAttribute('data-a'); el.removeAttribute('data-a'); el.id = key;
        el.innerHTML = '<option value="">선택</option>' + el.getAttribute('data-opts').split('|').map(function(o){ return '<option>'+esc(o)+'</option>'; }).join('');
        items.push({key:key, label:pname+' '+num+' ('+a+')', type:'pick', el:el, wrap:el, accept:[a], part:pi});
      } else if (el.classList.contains('w-checks')){
        // 여러 개 고르기 (채점 안 함)
        el.id = key;
        el.innerHTML = el.getAttribute('data-opts').split('|').map(function(o, oi){
          return '<label><input type="checkbox" id="'+key+'-'+oi+'" value="'+esc(o)+'"> '+esc(o)+'</label>'; }).join('');
        var boxes = Array.prototype.slice.call(el.querySelectorAll('input'));
        Object.defineProperty(el, 'value', {
          get: function(){ return boxes.filter(function(b){ return b.checked; }).map(function(b){ return b.value; }).join(', '); },
          set: function(v){ var on = String(v||'').split(', '); boxes.forEach(function(b){ b.checked = on.indexOf(b.value) > -1; }); }
        });
        Object.defineProperty(el, 'disabled', { set: function(d){ boxes.forEach(function(b){ b.disabled = d; }); } });
        items.push({key:key, label:pname+' '+num+' '+(el.getAttribute('data-label')||'고르기'), type:'free', el:el, part:pi});
      } else {
        el.id = key;
        items.push({key:key, label:pname+' '+num+' '+(el.getAttribute('data-label')||'서술'), type:'free', el:el, part:pi});
      }
    });
  });
  var graded = items.filter(function(i){ return i.type !== 'free'; });
  var filled = function(i){ return String(i.el.value).trim() !== ''; };

  // 장마다 맨 위 '보기' (빈칸 정답 낱말을 섞어서)
  var banks = [];
  parts.forEach(function(part, pi){
    var words = items.filter(function(i){ return i.type==='blank' && i.part===pi; }).map(function(i){ return i.accept[0]; });
    if (!words.length) return;
    words.sort(function(a,b){ return hash(a)%997 - hash(b)%997; });
    var box = document.createElement('div'); box.className = 'w-bank'; box.setAttribute('aria-label','보기 낱말');
    box.innerHTML = '<b>보기</b>' + words.map(function(w){ return '<span data-w="'+esc(norm(w))+'">'+esc(w)+'</span>'; }).join('');
    var head = part.querySelector('.w-part-head');
    if (head) head.insertAdjacentElement('afterend', box); else part.insertBefore(box, part.firstChild);
    banks.push({part:pi, box:box});
  });
  function markBank(){
    banks.forEach(function(b){
      var used = {};
      items.forEach(function(i){ if (i.type==='blank' && i.part===b.part){ var v = norm(i.el.value); if (v) used[v] = (used[v]||0)+1; } });
      Array.prototype.forEach.call(b.box.querySelectorAll('span'), function(sp){ var w = sp.getAttribute('data-w'), on = used[w] > 0; if (on) used[w]--; sp.classList.toggle('used', on); });
    });
  }

  // 영상: 누르면 이 화면 안에서 재생 (새 창 = 자리 비움이 되므로)
  parts.forEach(function(part){
    Array.prototype.forEach.call(part.querySelectorAll('.w-vid'), function(fig){
      var btn = fig.querySelector('.w-vid-play'); if (!btn) return;
      btn.addEventListener('click', function(){
        var f = document.createElement('iframe');
        f.src = 'https://www.youtube-nocookie.com/embed/' + fig.getAttribute('data-yt') + '?autoplay=1&rel=0&playsinline=1&modestbranding=1';
        f.title = btn.getAttribute('aria-label').replace(' 재생','');
        f.allow = 'autoplay; encrypted-media; picture-in-picture';
        f.referrerPolicy = 'strict-origin-when-cross-origin';
        f.setAttribute('allowfullscreen','');
        btn.replaceWith(f);
      });
    });
  });

  /* ---------- 3) 기록 (이 기기에만 저장. 교사 모드는 classroom.js 가 따로 보관) ---------- */
  var STORE = 'stage-class-ws-v1';
  var state = {};
  try { state = JSON.parse(localStorage.getItem(STORE)) || {}; } catch(e){ state = {}; }
  if (!state.answers || typeof state.answers !== 'object') state.answers = {};
  state.submits = state.submits || 0;
  function save(){ try { localStorage.setItem(STORE, JSON.stringify(state)); } catch(e){} }
  document.addEventListener('classroom:switch', function(){ try { localStorage.removeItem(STORE); } catch(e){} });

  items.forEach(function(it){
    if (state.answers[it.key] != null) it.el.value = state.answers[it.key];
    it.el.addEventListener('input', onEdit); it.el.addEventListener('change', onEdit);
  });
  function clearMark(it){
    if (!it.wrap) return;
    it.wrap.classList.remove('ok','no');
    var box = it.type==='blank' ? it.wrap : it.el.parentNode, f = box.querySelector('.w-fix'); if (f) f.remove();
  }
  function onEdit(){
    var id = this.id || (this.closest && this.closest('.w-checks') && this.closest('.w-checks').id);
    var it = items.filter(function(i){ return i.key === id; })[0]; if (!it) return;
    state.answers[it.key] = it.el.value;
    clearMark(it); save(); progress();
  }
  function setLocked(locked){ items.forEach(function(i){ i.el.disabled = locked; }); }
  setLocked(true);   // 학번·이름을 넣기 전에는 잠가 둬요
  if (CR) CR.ready.then(function(st){
    // 공용 기기: 다른 학생이면 이전 학생의 답을 지우고 새로 시작해요
    if (state.student && (state.student.id !== st.num || state.student.name !== st.name)){
      state = {answers:{}, submits:0};
      items.forEach(function(i){ i.el.value = ''; clearMark(i); });
    }
    state.student = {id:st.num, name:st.name}; save();
    setLocked(false); progress();
    if (current() === 'submit') paintSubmit();
  }); else setLocked(false);

  function grade(){
    var score = 0;
    graded.forEach(function(it){
      var v = norm(it.el.value);
      it.correct = v !== '' && it.accept.some(function(a){ return norm(a) === v; });
      if (it.correct) score++;
    });
    return score;
  }
  function showMarks(){
    graded.forEach(function(it){
      clearMark(it);
      it.wrap.classList.add(it.correct ? 'ok' : 'no');
      if (!it.correct){
        var box = it.type==='blank' ? it.wrap : it.el.parentNode;
        var s = document.createElement('span'); s.className = 'w-fix'; s.textContent = '정답: '+it.accept[0]; box.appendChild(s);
      }
    });
  }
  // 제출한 뒤 새로고침해도 맞고 틀린 표시를 다시 보여 줘요 (그 뒤에 고친 칸은 표시가 지워져요)
  if (state.marked){ grade(); showMarks(); }

  /* ---------- 4) 화면 그리기 (app.js 가 부름) ---------- */
  function current(){ return document.body.dataset.wsCurrent || ''; }
  function progress(){
    markBank();
    var p = document.getElementById('wsProg'); if (!p) return;
    var done = graded.filter(filled).length;
    p.textContent = '학습지 전체 빈칸·고르기 ' + done + ' / ' + graded.length + '개를 채웠어요. 쓴 답은 이 기기에 저장돼요.';
  }
  function html(id, intro, footer){
    if (id === 'submit'){
      return intro('', '학습지를 제출해요', '빈 곳이 없는지 확인하고 제출하세요. 제출하면 바로 채점되고, ' +
        (ONLINE ? '점수와 자리 비움 횟수가 선생님께 전송돼요.' : TEACHER ? '교사 모드에서는 채점만 하고 보내지 않아요.' : '연습 모드라서 선생님께 전송되지는 않아요.') +
        ' 틀린 칸을 고쳐서 다시 제출할 수도 있어요.', 2) +
        '<div class="ws-area"><div id="wsSubmit"></div></div>' + footer();
    }
    var pi = base.findIndex(function(c){ return c.id + '-ws' === id; });
    return intro('', esc(base[pi].name) + ' 학습지', '방금 배운 내용을 떠올리며 빈칸을 채우고 알맞은 것을 골라요. 위쪽 <b>보기</b>에서 낱말을 찾을 수 있어요. 채점은 맨 끝 <b>제출하기</b>에서 해요.', 3) +
      '<div class="ws-area"><div id="ws-mount"></div><p class="ws-prog" id="wsProg"></p></div>' + footer();
  }
  function mount(id){
    document.body.dataset.wsCurrent = id;
    if (/-ws$/.test(id)){
      var pi = base.findIndex(function(c){ return c.id + '-ws' === id; });
      var m = document.getElementById('ws-mount');
      if (m && parts[pi]) m.appendChild(parts[pi]);
      progress();
    }
    if (id === 'submit') paintSubmit();
    if (id === 'start') paintStartQR();
  }

  /* ---------- 5) 제출하기 ---------- */
  var sure = false, sending = false, sentMsg = {};
  function paintSubmit(){
    var box = document.getElementById('wsSubmit'); if (!box) return;
    var rows = base.map(function(c, pi){
      var g = graded.filter(function(i){ return i.part === pi; }); if (!g.length) return '';
      var d = g.filter(filled).length;
      return '<button class="ws-row' + (d === g.length ? ' done' : '') + '" data-go="' + c.id + '-ws"><b>' + esc(c.name) + ' 학습지</b><span>' + d + ' / ' + g.length + '</span></button>';
    }).join('');
    var empty = graded.filter(function(i){ return !filled(i); }).length;
    var result = '';
    if (state.submits){
      var wrong = graded.filter(function(i){ return !i.correct; });
      result = '<div class="ws-result">' +
        '<div class="ws-score"><b>' + (state.lastScore != null ? state.lastScore : grade()) + '</b><small>/ ' + graded.length + '점</small><span>' + state.submits + '번째 제출</span></div>' +
        (wrong.length ? '<h3>틀린 문항 · 학습지 페이지에서 고쳐서 다시 제출할 수 있어요</h3><ul class="ws-wrong">' + wrong.map(function(i){
          var c = base[i.part]; return '<li><button data-go="' + c.id + '-ws">' + esc(c.name) + '</button> 쓴 답: ' + esc(String(i.el.value).trim() || '(빈칸)') + ' → <b>' + esc(i.accept[0]) + '</b></li>'; }).join('') + '</ul>'
          : '<p class="ws-allok">모두 맞혔어요! 수고했어요.</p>') + '</div>';
    }
    box.innerHTML = (sentMsg.text ? '<p class="ws-sent ' + (sentMsg.cls||'') + '">' + esc(sentMsg.text) + '</p>' : '') +
      '<div class="ws-rows">' + rows + '</div>' +
      (empty ? '<p class="ws-hint">아직 ' + empty + '개가 비어 있어요. 비어 있어도 제출할 수 있지만 틀린 것으로 채점돼요.</p>' : '<p class="ws-hint">모든 빈칸과 고르기를 채웠어요.</p>') +
      '<button class="primary ws-submit" id="wsSubmitBtn"' + (sending ? ' disabled' : '') + '>' +
      (sending ? '보내는 중…' : sure ? '한 번 더 누르면 제출돼요' : state.submits ? '다시 제출하기' : '제출하고 채점하기') + '</button>' + result;
    var b = document.getElementById('wsSubmitBtn');
    b.onclick = function(){
      if (sending) return;
      if (!sure){ sure = true; paintSubmit(); return; }
      sure = false; doSubmit();
    };
  }
  function doSubmit(){
    var score = grade(); showMarks(); state.marked = true; state.lastScore = score; save();
    var answers = {}, wrong = [];
    items.forEach(function(it){
      answers[it.label] = String(it.el.value || '');
      if (it.type !== 'free' && !it.correct) wrong.push(it.label);
    });
    sending = true; sentMsg = {cls:'', text:'선생님께 보내는 중이에요…'}; paintSubmit();
    (CR ? CR.submit({score:score, total:graded.length, wrong:wrong, answers:answers}) : Promise.resolve({ok:true, offline:true})).then(function(r){
      if (r && r.ok === false) throw new Error(r.error || '저장 실패');
      state.submits++; save();
      sentMsg = r && r.teacher ? {cls:'', text:'교사 모드라서 기록은 보내지 않았어요. (채점 미리 보기)'}
        : r && r.offline ? {cls:'', text:'연습 모드라서 선생님께 전송되지는 않았어요.'}
        : {cls:'ok', text:'✓ 선생님께 제출되었어요. 수고했어요!'};
    }).catch(function(err){
      sentMsg = {cls:'fail', text:'⚠ 보내지 못했어요. ' + ((err && err.message) || '와이파이를 확인하고 다시 눌러 주세요.')};
    }).then(function(){ sending = false; paintSubmit(); });
  }

  /* ---------- 6) QR (첫 화면 위쪽 · 위쪽 '수업 QR' 버튼) ---------- */
  function drawQR(el, size){
    if (!el) return; el.innerHTML = '';
    if (window.QRCode) new QRCode(el, {text:SHARE_URL, width:size, height:size, colorDark:'#000000', colorLight:'#ffffff', correctLevel:QRCode.CorrectLevel.M});
    else el.textContent = 'QR 코드를 불러오지 못했어요. 주소를 칠판에 적어 주세요.';
  }
  function startQR(){
    return '<details class="ws-qr" id="wsQr"' + (TEACHER ? ' open' : '') + '><summary>📱 학생용 QR 코드 <small>휴대폰·태블릿 카메라로 비추면 이 수업 화면이 열려요</small></summary>' +
      '<div class="ws-qr-body"><div class="ws-qr-img" id="wsQrImg" aria-label="학생용 주소 QR 코드"></div><div class="ws-qr-side">' +
      '<p>학생은 QR 코드로 들어와 학번과 이름을 쓰고 시작해요. 화면을 벗어나면 자리 비움이 기록되고, 맨 끝 <b>제출하기</b>에서 점수가 선생님께 전송돼요.</p>' +
      '<code>' + esc(SHARE_URL) + '</code>' +
      '</div></div></details>';
  }
  function paintStartQR(){
    var d = document.getElementById('wsQr'); if (!d) return;
    var draw = function(){ if (d.open) drawQR(document.getElementById('wsQrImg'), 200); };
    d.addEventListener('toggle', draw); draw();
  }
  function drawModalQR(){ drawQR(document.getElementById('wsQrModal'), 400); }

  // 자리 비움 경고가 뜨면 열려 있던 창(영상 등)을 닫아 경고가 가려지지 않게 해요
  document.addEventListener('classroom:away', function(){
    var m = document.getElementById('modal');
    if (m && m.open){ m.close(); var c = document.getElementById('modal-content'); if (c) c.innerHTML = ''; }
  });

  /* ---------- 7) 교실 모드: 전체 화면(F11처럼 브라우저 창 없이) + 메뉴 접기 + 큰 글씨 ---------- */
  var cls = {on:false, openedSide:false, madeLarge:false};
  var clsBtn = document.createElement('button');
  clsBtn.className = 'tool-button class-mode'; clsBtn.type = 'button';
  clsBtn.setAttribute('aria-pressed', 'false'); clsBtn.title = '전체 화면 · 메뉴 접기 · 큰 글씨 (Esc로 끄기)';
  var paintCls = function(){ clsBtn.innerHTML = '<span aria-hidden="true">⛶</span><span class="tool-label">' + (cls.on ? '교실 모드 끄기' : '교실 모드') + '</span>'; clsBtn.setAttribute('aria-pressed', String(cls.on)); };
  paintCls();
  var actions = document.querySelector('.top-actions');
  if (actions) actions.insertBefore(clsBtn, actions.querySelector('.guide-button'));
  var press = function(sel){ var b = document.querySelector(sel); if (b) b.click(); };
  function setClass(on){
    if (on === cls.on) return;
    cls.on = on; paintCls();
    if (on){
      cls.openedSide = !document.body.classList.contains('sidebar-collapsed');
      if (cls.openedSide) press('[data-action=sidebar-toggle]');
      cls.madeLarge = !document.body.classList.contains('large');
      if (cls.madeLarge) press('[data-action=large]');
      try { var el = document.documentElement; if (!document.fullscreenElement && el.requestFullscreen){ var p = el.requestFullscreen(); if (p && p.catch) p.catch(function(){}); } } catch(e){}
    } else {
      if (cls.openedSide && document.body.classList.contains('sidebar-collapsed')) press('[data-action=sidebar-toggle]');
      if (cls.madeLarge && document.body.classList.contains('large')) press('[data-action=large]');
      try { if (document.fullscreenElement) document.exitFullscreen(); } catch(e){}
    }
  }
  clsBtn.addEventListener('click', function(){ setClass(!cls.on); });
  // Esc 등으로 전체 화면이 풀리면 교실 모드도 함께 꺼요
  document.addEventListener('fullscreenchange', function(){ if (!document.fullscreenElement && cls.on) setClass(false); });

  window.StageWS = {html:html, mount:mount, startQR:startQR, drawModalQR:drawModalQR, url:SHARE_URL};
})();
