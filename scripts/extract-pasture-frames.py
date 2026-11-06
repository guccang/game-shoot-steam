"""将两段真实蓝幕原片加工为固定脚底的图集；同一动物的所有帧只使用一次缩放和裁切。"""
from pathlib import Path
import hashlib
import json
import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/pasture'
SOURCE = ROOT / 'source/pasture'
FPS = 12
CELL = (192, 160)
ANCHOR = (96, 152)


def extract(animal):
    """顺序解码原片，按原始帧号取样并记录哈希，舍弃蓝幕噪点。"""
    path = SOURCE / (animal + '-front-v2.mp4')
    reader = cv2.VideoCapture(str(path))
    source_fps = reader.get(cv2.CAP_PROP_FPS)
    if abs(source_fps - 24) > .01:
        raise ValueError('预期 24 帧原片')
    images, source_frames = [], []
    frame = -1
    while True:
        ok, raw = reader.read()
        if not ok:
            break
        frame += 1
        if frame % 2:
            continue
        rgb = cv2.cvtColor(raw, cv2.COLOR_BGR2RGB)
        r, g, b = rgb.astype(np.int16).transpose(2, 0, 1)
        alpha = np.clip((62 - (b - np.maximum(r, g))) * 5, 0, 255).astype(np.uint8)
        count, labels, stats, _ = cv2.connectedComponentsWithStats((alpha > 16).astype(np.uint8))
        if count < 2:
            raise ValueError('原片出现空帧')
        largest = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
        alpha[labels != largest] = 0
        rgb[:, :, 2] = np.where(alpha < 255, np.minimum(b, np.maximum(r, g)), b)
        images.append(Image.fromarray(np.dstack((rgb, alpha))))
        source_frames.append(frame)
    reader.release()
    boxes = [im.getbbox() for im in images]
    x = (boxes[0][0] + boxes[0][2]) / 2
    ground = float(np.median([box[3] for box in boxes[:24]]))
    scale = min(88 / max(max(x-b[0], b[2]-x) for b in boxes),
                118 / max(ground-b[1] for b in boxes),
                7 / max(1, max(b[3]-ground for b in boxes)))
    # 在稳定步行区间内选一个首尾姿态接近的完整步态周期。
    samples = np.array([np.array(im.getchannel('A').resize((72,54)), dtype=np.float32) for im in images])
    _, start, length = min((np.mean(np.abs(samples[a]-samples[a+n])), a, n)
                           for a in range(50, 77) for n in range(8, 20))
    clips = {'idle': list(range(2,26)), 'walk':list(range(start,start+length))}
    ids = sorted(set(sum(clips.values(), [])))
    sheet = Image.new('RGBA', (8*CELL[0], ((len(ids)+7)//8)*CELL[1]))
    for idx, original in enumerate(ids):
        transformed = images[original].transform(CELL, Image.Transform.AFFINE,
                (1/scale,0,x-ANCHOR[0]/scale,0,1/scale,ground-ANCHOR[1]/scale),
                resample=Image.Resampling.BICUBIC)
        sheet.paste(transformed, (idx%8*CELL[0],idx//8*CELL[1]))
    # 切换片段时选取轮廓最接近的姿态，停步不跳到不相关的待机帧。
    transitions = {key:[int(np.argmin([np.mean(np.abs(samples[i]-samples[j]))
                                        for j in clip])) for i in ids]
                   for key,clip in clips.items()}
    sheet.save(OUT/(animal+'-front.webp'), quality=94, method=6)
    return dict(file=animal+'-front.webp',facing='front', columns=8, cell=CELL, anchor=ANCHOR, fps=FPS,
                **{key:[ids.index(i) for i in indices] for key,indices in clips.items()},
                transitions=transitions, sourceSha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                sourceFps=source_fps,sourceFrames=[source_frames[i] for i in ids])


if __name__ == '__main__':
    OUT.mkdir(exist_ok=True)
    manifest = {name:extract(name) for name in ('ox','sheep')}
    (OUT/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n',encoding='utf8')
