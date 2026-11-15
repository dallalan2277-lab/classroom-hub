"""수업 화면 그림 변환 도구 (lesson-page-plus 스킬).

  python art.py webp <img폴더> <백업폴더> [이름 ...]
      img폴더의 png를 webp로 바꾸고(250KB 이하가 될 때까지 품질 80→50, 5씩),
      원본 png는 백업폴더로 옮긴다(저장소에 png를 남기지 않기 위해).
      이름을 주지 않으면 폴더의 모든 png.

  python art.py head <img폴더> <원본그림> <장id> <x0> <y0> <x1> <y1>
      원본그림(webp/png, img폴더 기준 또는 절대경로)의 상자 부분을 잘라
      1600x600 어두운 바탕(#14110e) 오른쪽 600x600에 왼쪽 페이드로 얹은
      head-<장id>.webp를 만든다(150KB 이하). 채도 0.8, 밝기 0.5.
"""
import os, sys, shutil
from PIL import Image, ImageEnhance

BG = (20, 17, 14)          # 먹색 #14110e
HEAD_W, HEAD_H = 1600, 600
ART = 600                  # 오른쪽 그림 칸
FADE = 260                 # 왼쪽 페이드 폭(px)


def save(im, path, limit_kb):
    q = 80
    while True:
        im.save(path, 'WEBP', quality=q, method=6)
        kb = os.path.getsize(path) / 1024
        if kb <= limit_kb or q <= 50:
            break
        q -= 5
    flag = '' if kb <= limit_kb else '  ** 용량 초과: 크기를 줄이거나 그림을 단순하게 **'
    print('%s %s %.0fKB q%d%s' % (os.path.basename(path), im.size, kb, q, flag))


def cmd_webp(d, backup, names):
    os.makedirs(backup, exist_ok=True)
    if not names:
        names = [f[:-4] for f in os.listdir(d) if f.lower().endswith('.png')]
    for n in names:
        p = os.path.join(d, n + '.png')
        if not os.path.exists(p):
            print('없음:', p)
            continue
        im = Image.open(p).convert('RGB')
        save(im, os.path.join(d, n + '.webp'), 250)
        shutil.move(p, os.path.join(backup, n + '.png'))


def fit(box, ratio):
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    if w / h > ratio:
        nw = int(h * ratio); x0 += (w - nw) // 2; x1 = x0 + nw
    else:
        nh = int(w / ratio); y0 += (h - nh) // 2; y1 = y0 + nh
    return (x0, y0, x1, y1)


def cmd_head(d, src, cid, box):
    sp = src if os.path.isabs(src) else os.path.join(d, src)
    im = Image.open(sp).convert('RGB')
    im = im.crop(fit(box, 1.0)).resize((ART, ART), Image.LANCZOS)
    im = ImageEnhance.Color(im).enhance(0.8)
    im = ImageEnhance.Brightness(im).enhance(0.5)
    canvas = Image.new('RGB', (HEAD_W, HEAD_H), BG)
    mask = Image.new('L', (ART, ART), 255)
    px = mask.load()
    for x in range(ART):
        a = min(1.0, x / float(FADE))
        for y in range(ART):
            px[x, y] = int(255 * a * a)
    canvas.paste(im, (HEAD_W - ART, 0), mask)
    save(canvas, os.path.join(d, 'head-' + cid + '.webp'), 150)


if __name__ == '__main__':
    a = sys.argv[1:]
    if len(a) >= 3 and a[0] == 'webp':
        cmd_webp(a[1], a[2], a[3:])
    elif len(a) == 8 and a[0] == 'head':
        cmd_head(a[1], a[2], a[3], tuple(int(v) for v in a[4:8]))
    else:
        print(__doc__)
        sys.exit(1)
