"""로컬 시험용 가짜 허브: 받은 신호를 그대로 기록하고 /log 와 exam JSON 을 돌려준다."""
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import re
import sys
from urllib.parse import parse_qs, urlparse

LOG = []
TIMES = []
ARCHIVE = []
RESETS = {}
FAIL = [0]  # 남은 실패 횟수: /fail?n=2 로 다음 신호 2개를 '잠시 후' 오류로 돌려줘요(재전송 시험용)
FAKE = {'ok': True, 'today': '', 'now': '', 'nowFull': '', 'rows': [], 'roster': []}

FALLBACK_EXAM_KEYS = {
    'gugak-exam': {
        'title': '국악기 수행평가',
        'base': 10,
        'per': 1,
        'items': [],
    }
}


def load_exam_keys():
    if '--fake-exam' in sys.argv[1:]:
        return FALLBACK_EXAM_KEYS
    key_path = Path(__file__).resolve().parent.parent / 'hub' / 'ExamKey.gs'
    if not key_path.is_file():
        return FALLBACK_EXAM_KEYS
    try:
        text = key_path.read_text(encoding='utf-8')
        m = re.search(r'EXAM_KEYS\s*=\s*(\{[\s\S]*\})\s*;?\s*$', text)
        if m:
            return json.loads(m.group(1))
    except Exception:
        pass
    return FALLBACK_EXAM_KEYS


def norm_answer(val):
    s = re.sub(r'\s', '', str(val or ''))
    s = re.sub(r'^["\'“”‘’.]+|["\'“”‘’.]+$', '', s)
    return s.lower()


def grade_exam(exam, answers):
    per_item = {}
    correct = 0
    for item in exam.get('items', []):
        code = item['code']
        ans = norm_answer(answers.get('q:' + code, ''))
        accepted = [item['answer']] + list(item.get('also') or [])
        ok = bool(ans) and any(ans == norm_answer(a) for a in accepted)
        per_item[code] = ok
        if ok:
            correct += 1
    return correct, per_item


def build_exam_data(ws):
    exam_keys = load_exam_keys()
    exam = exam_keys.get(ws)
    if not exam:
        return {'ok': False, 'error': '시험 정답표를 찾지 못했어요.'}

    rows = []
    sessions = {}
    status_by_person = {}

    for idx, entry in enumerate(LOG):
        if entry.get('ws') != ws:
            continue
        etype = entry.get('type')
        if etype == 'reset':
            continue
        num = str(entry.get('num', ''))
        name = str(entry.get('name', ''))
        sid = str(entry.get('sid', ''))
        if sid:
            sessions.setdefault(num, [])
            if sid not in sessions[num]:
                sessions[num].append(sid)

        person_key = (num, name)
        prev = status_by_person.get(person_key)
        if etype == 'submit':
            state = '제출함'
        elif prev and prev['state'] == '제출함' and etype in ('away', 'back'):
            state = '제출함'
        elif etype == 'away':
            state = '자리 비움'
        else:
            state = '풀이 중'
        status_by_person[person_key] = {
            'num': num,
            'name': name,
            'state': state,
            'away': int(entry.get('away') or 0),
            'sid': sid,
        }

        if etype == 'submit':
            d = entry.get('data') or {}
            stored = d.get('answers') or {}
            q_answers = {k: v for k, v in stored.items() if str(k).startswith('q:')}
            correct, per_item = grade_exam(exam, q_answers)
            rows.append({
                'time': TIMES[idx] if idx < len(TIMES) else datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'num': num,
                'name': name,
                'correct': correct,
                'total': len(exam.get('items', [])),
                'away': int(entry.get('away') or 0),
                'minutes': int(d.get('minutes') or 0),
                'attempt': int(d.get('attempt') or 1),
                'sid': sid,
                'auto': stored.get('_auto') == '1',
                'answers': q_answers,
                'perItem': per_item,
            })

    status = []
    for st in status_by_person.values():
        st_copy = dict(st)
        st_copy['sessions'] = sessions.get(st['num'], [])
        status.append(st_copy)

    archive_rows = []
    for item in ARCHIVE:
        if item.get('ws') != ws:
            continue
        st = item.get('status', '제출')
        correct = item.get('correct')
        total = item.get('total', len(exam.get('items', [])))
        if st == '제출':
            q_answers = {k: v for k, v in (item.get('answers') or {}).items() if str(k).startswith('q:')}
            correct, _ = grade_exam(exam, q_answers)
            total = len(exam.get('items', []))
        archive_rows.append({
            'time': item['time'],
            'num': item['num'],
            'name': item['name'],
            'correct': correct,
            'total': total,
            'away': int(item.get('away') or 0),
            'auto': bool(item.get('auto')),
            'sid': item.get('sid', ''),
            'status': st,
        })

    return {
        'ok': True,
        'exam': {
            'ws': ws,
            'title': exam.get('title', ws),
            'base': exam.get('base', 10),
            'per': exam.get('per', 1),
            'items': [{'code': it['code'], 'answer': it['answer']} for it in exam.get('items', [])],
        },
        'rows': rows,
        'status': status,
        'sessions': sessions,
        'archive': archive_rows,
        'roster': FAKE.get('roster', []),
        'today': datetime.now().strftime('%Y-%m-%d'),
    }


def is_dup_exam_submit(entry):
    if entry.get('type') != 'submit':
        return False
    ws = entry.get('ws')
    if ws not in load_exam_keys():
        return False
    attempt = int((entry.get('data') or {}).get('attempt') or 1)
    for prev in LOG:
        if (
            prev.get('type') == 'submit'
            and prev.get('ws') == ws
            and prev.get('num') == entry.get('num')
            and prev.get('name') == entry.get('name')
            and prev.get('sid') == entry.get('sid')
            and int((prev.get('data') or {}).get('attempt') or 1) == attempt
        ):
            return True
    return False


class H(BaseHTTPRequestHandler):
    def _send(self, obj, code=200):
        b = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(b)

    def do_POST(self):
        n = int(self.headers.get('Content-Length') or 0)
        raw = self.rfile.read(n).decode('utf-8')
        if self.path.startswith('/fake'):
            FAKE.update(json.loads(raw))
            return self._send({'ok': True})
        if FAIL[0] > 0:
            FAIL[0] -= 1
            LOG.append({'failed': json.loads(raw)})
            TIMES.append(datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
            return self._send({'ok': False, 'error': '요청이 몰렸어요. 잠시 후 다시 보내 주세요.'})
        try:
            entry = json.loads(raw)
            etype = entry.get('type')
            if etype == 'examReset':
                if not str(entry.get('key') or '').strip():
                    return self._send({'ok': False, 'error': '현황판 키가 올바르지 않아요.'})
                ws = str(entry.get('ws') or '').strip()
                num = str(entry.get('num') or '').strip()
                if ws not in load_exam_keys():
                    return self._send({'ok': False, 'error': '시험 학습지를 찾지 못했어요.'})
                if not num:
                    return self._send({'ok': False, 'error': '학번 형식이 올바르지 않아요.'})
                kept_log = []
                kept_times = []
                removed_sub = 0
                removed_log = 0
                removed_people = set()
                for i, item in enumerate(LOG):
                    t_str = TIMES[i] if i < len(TIMES) else ''
                    if item.get('ws') == ws and str(item.get('num', '')) == num:
                        if item.get('type') != 'reset':
                            removed_log += 1
                            if item.get('type') == 'submit':
                                removed_sub += 1
                            removed_people.add((str(item.get('num', '')), str(item.get('name', ''))))
                    else:
                        kept_log.append(item)
                        kept_times.append(t_str)
                LOG[:] = kept_log
                TIMES[:] = kept_times
                now_local = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                reset_at = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
                RESETS[(ws, num)] = reset_at
                LOG.append({'ws': ws, 'num': num, 'name': '(선생님)', 'type': 'reset', 'away': 0, 'sid': ''})
                TIMES.append(now_local)
                ARCHIVE.append({
                    'time': now_local, 'ws': ws, 'num': num, 'name': '(선생님)',
                    'correct': None, 'total': None, 'away': 0, 'auto': False, 'sid': '', 'status': '재응시 초기화',
                })
                return self._send({
                    'ok': True,
                    'removed': {'submit': removed_sub, 'log': removed_log, 'status': len(removed_people)},
                    'resetAt': reset_at,
                })
            if etype == 'examRestore':
                if not str(entry.get('key') or '').strip():
                    return self._send({'ok': False, 'error': '현황판 키가 올바르지 않아요.'})
                ws = str(entry.get('ws') or '').strip()
                sid = str(entry.get('sid') or '').strip()
                t_str = str(entry.get('time') or '').strip()
                exam = load_exam_keys().get(ws)
                if not exam:
                    return self._send({'ok': False, 'error': '시험 학습지를 찾지 못했어요.'})
                hit = next((a for a in ARCHIVE if a.get('ws') == ws and a.get('sid') == sid and a.get('time') == t_str and a.get('status') == '제출'), None)
                if not hit:
                    return self._send({'ok': False, 'error': '보관함에서 해당 제출을 찾지 못했어요.'})
                dup = any(
                    LOG[i].get('type') == 'submit' and LOG[i].get('ws') == ws and LOG[i].get('sid') == sid and (TIMES[i] if i < len(TIMES) else '') == t_str
                    for i in range(len(LOG))
                )
                if dup:
                    return self._send({'ok': True, 'dup': True, 'restored': False})
                LOG.append({
                    'v': 1, 'ws': ws, 'type': 'submit', 'sid': sid,
                    'num': hit['num'], 'name': hit['name'], 'away': hit.get('away', 0),
                    'data': {
                        'minutes': hit.get('minutes', 0),
                        'attempt': hit.get('attempt', 1),
                        'answers': hit.get('answers') or {},
                    },
                })
                TIMES.append(t_str)
                return self._send({'ok': True, 'restored': True})
            if is_dup_exam_submit(entry):
                return self._send({'ok': True, 'dup': True})
            now_local = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            LOG.append(entry)
            TIMES.append(now_local)
            if etype == 'submit' and entry.get('ws') in load_exam_keys():
                d = entry.get('data') or {}
                stored = d.get('answers') or {}
                ARCHIVE.append({
                    'time': now_local,
                    'ws': entry.get('ws'),
                    'num': str(entry.get('num', '')),
                    'name': str(entry.get('name', '')),
                    'away': int(entry.get('away') or 0),
                    'minutes': int(d.get('minutes') or 0),
                    'attempt': int(d.get('attempt') or 1),
                    'auto': stored.get('_auto') == '1',
                    'answers': stored,
                    'sid': str(entry.get('sid', '')),
                    'status': '제출',
                })
            self._send({'ok': True})
        except Exception as e:
            self._send({'ok': False, 'error': str(e)})

    def do_GET(self):
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)
        if 'examstate' in qs:
            ws = qs['examstate'][0].strip()
            num = qs.get('num', [''])[0].strip()
            return self._send({'ok': True, 'resetAt': RESETS.get((ws, num), '')})
        if qs.get('format', [''])[0] == 'json' and 'exam' in qs:
            if not qs.get('dash', [''])[0]:
                return self._send({'ok': False, 'error': '현황판 키가 올바르지 않아요.'})
            return self._send(build_exam_data(qs['exam'][0]))
        if 'format=json' in self.path:
            self._send(FAKE)
        elif parsed.path.startswith('/log'):
            self._send(LOG)
        elif parsed.path.startswith('/clear'):
            LOG.clear()
            TIMES.clear()
            ARCHIVE.clear()
            RESETS.clear()
            self._send({'ok': True})
        elif parsed.path.startswith('/fail'):
            FAIL[0] = int((self.path.split('n=') + ['1'])[1] or 1)
            self._send({'ok': True, 'fail': FAIL[0]})
        else:
            self._send({'ok': True})

    def log_message(self, *a):
        pass


ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1]) if len(sys.argv) > 1 else 8768), H).serve_forever()
