"""로컬 시험용 가짜 허브: 받은 신호를 그대로 기록하고 /log 로 보여 준다."""
import json, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
LOG = []
class H(BaseHTTPRequestHandler):
    def _send(self, obj, code=200):
        b = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code); self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*'); self.end_headers(); self.wfile.write(b)
    def do_POST(self):
        n = int(self.headers.get('Content-Length') or 0); raw = self.rfile.read(n).decode('utf-8')
        try: LOG.append(json.loads(raw)); self._send({'ok': True})
        except Exception as e: self._send({'ok': False, 'error': str(e)})
    def do_GET(self):
        if self.path.startswith('/log'): self._send(LOG)
        elif self.path.startswith('/clear'): LOG.clear(); self._send({'ok': True})
        else: self._send({'ok': True})
    def log_message(self, *a): pass
ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1]) if len(sys.argv) > 1 else 8768), H).serve_forever()
