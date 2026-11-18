"""로컬 시험용 가짜 허브: 받은 신호를 그대로 기록하고 /log 로 보여 준다."""
import json, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
LOG = []
FAIL = [0]  # 남은 실패 횟수: /fail?n=2 로 다음 신호 2개를 '잠시 후' 오류로 돌려줘요(재전송 시험용)
FAKE = {'ok': True, 'today': '', 'now': '', 'nowFull': '', 'rows': []}
class H(BaseHTTPRequestHandler):
    def _send(self, obj, code=200):
        b = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code); self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*'); self.end_headers(); self.wfile.write(b)
    def do_POST(self):
        n = int(self.headers.get('Content-Length') or 0); raw = self.rfile.read(n).decode('utf-8')
        if self.path.startswith('/fake'):
            FAKE.update(json.loads(raw)); return self._send({'ok': True})
        if FAIL[0] > 0:
            FAIL[0] -= 1; LOG.append({'failed': json.loads(raw)}); return self._send({'ok': False, 'error': '요청이 몰렸어요. 잠시 후 다시 보내 주세요.'})
        try: LOG.append(json.loads(raw)); self._send({'ok': True})
        except Exception as e: self._send({'ok': False, 'error': str(e)})
    def do_GET(self):
        if 'format=json' in self.path: self._send(FAKE)
        elif self.path.startswith('/log'): self._send(LOG)
        elif self.path.startswith('/clear'): LOG.clear(); self._send({'ok': True})
        elif self.path.startswith('/fail'): FAIL[0] = int((self.path.split('n=') + ['1'])[1] or 1); self._send({'ok': True, 'fail': FAIL[0]})
        else: self._send({'ok': True})
    def log_message(self, *a): pass
ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1]) if len(sys.argv) > 1 else 8768), H).serve_forever()
