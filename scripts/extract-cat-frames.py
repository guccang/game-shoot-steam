"""从真实生成视频抽取正面待机/移动图集，固定脚底与缩放，并记录每帧源时间。"""
import hashlib
import json
import math
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/cat-front'
REVIEW = ROOT / 'output/cat-front'
FPS = 24
SIZE = 160
COLUMNS = 8


def key_blue(bgr):
    """移除蓝幕并去除边缘蓝溢色，保留绿色服饰、暖色毛发及柔和透明边缘。"""
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB).astype(np.float32)
    r, g, b = rgb.transpose(2, 0, 1)
    alpha = np.clip((65 - (b - np.maximum(r, g))) / 45, 0, 1)
    mask = (alpha > 0.15).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    keep = np.zeros_like(mask)
    for label in range(1, count):
        if stats[label, cv2.CC_STAT_AREA] > 55:
            keep[labels == label] = 1
    alpha *= keep
    rgb[:, :, 2] = np.where(alpha < 0.98, np.minimum(b, np.maximum(r, g)), b)
    rgba = np.dstack((rgb.astype(np.uint8), (alpha * 255).astype(np.uint8)))
    rgba[rgba[:, :, 3] < 12] = 0
    return Image.fromarray(rgba)


def read_video(path):
    """按源时间采样 24 FPS；顺序解码避免逐帧随机 seek 引入关键帧误差。"""
    cap = cv2.VideoCapture(str(path))
    source_fps = cap.get(cv2.CAP_PROP_FPS)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if source_fps <= 0 or total < 2:
        raise ValueError(f'无法读取视频：{path}')
    wanted = {round(i * source_fps / FPS): i for i in range(math.floor(total / source_fps * FPS))}
    frames, records = [], []
    for index in range(total):
        ok, bgr = cap.read()
        if not ok:
            raise ValueError(f'解码失败：{index}')
        if index in wanted:
            frames.append(key_blue(bgr))
            records.append(dict(sourceFrame=index, sourceTime=index / source_fps))
    cap.release()
    return frames, records, source_fps


def choose_loop(frames, start, end, shortest, longest):
    """在动作稳定区间比较首尾姿态及速度，选择完整周期，不把启停片段当循环。"""
    small = np.array([np.asarray(im.resize((96, 96), Image.Resampling.BILINEAR), dtype=np.float32) / 255 for im in frames])
    # 透明背景颜色归零，只比较角色的预乘颜色与轮廓。
    small[:, :, :, :3] *= small[:, :, :, 3:4]
    best = None
    for a in range(round(start * FPS), round(end * FPS) - round(shortest * FPS)):
        for count in range(round(shortest * FPS), round(longest * FPS) + 1):
            b = a + count
            if b + 1 >= min(len(frames), round(end * FPS)):
                continue
            seam = float(np.mean(np.abs(small[a] - small[b])))
            velocity = float(np.mean(np.abs((small[a + 1] - small[a]) - (small[b] - small[b - 1]))))
            score = seam + velocity * 0.4
            if best is None or score < best[0]:
                best = (score, a, b, seam)
    if best is None:
        raise ValueError('没有足够帧组成循环')
    return list(range(best[1], best[2])), dict(start=best[1] / FPS, end=best[2] / FPS, endpointError=best[3])


def export_hero(hero):
    """每名角色只导出一张正面图集，所有动作共用裁切、缩放与固定脚底基线。"""
    video = OUT / f'source/cat-{hero}.mp4'
    frames, records, source_fps = read_video(video)
    idle, idle_qa = choose_loop(frames, 0.3, 2.9, 1.6, 2.35)
    move, move_qa = choose_loop(frames, 4.4, 8.8, 0.7, 1.25)
    selected = sorted(set(idle + move))
    boxes = [frames[i].getbbox() for i in selected]
    if any(box is None for box in boxes):
        raise ValueError('发现空白动作帧')
    ground = float(np.median([frames[i].getbbox()[3] for i in idle]))
    center = frames[0].width * 400 / 768
    extent = max(max(center - box[0], box[2] - center) for box in boxes)
    top = min(box[1] for box in boxes)
    bottom = max(box[3] for box in boxes)
    scale = min((SIZE - 16) / (extent * 2), (SIZE - 16) / (bottom - top))
    # 对所有帧使用同一 affine 变换，不能逐帧按最底部对齐而抹掉步伐起伏。
    anchor = [SIZE / 2, SIZE - 8 - (bottom - ground) * scale]
    packed, metadata, mapping = [], [], {}
    for source in selected:
        frame = frames[source].transform((SIZE, SIZE), Image.Transform.AFFINE,
            (1 / scale, 0, center - anchor[0] / scale, 0, 1 / scale, ground - anchor[1] / scale),
            resample=Image.Resampling.BICUBIC)
        box = frame.getbbox()
        if box is None or min(box[0], box[1]) < 3 or max(box[2], box[3]) > SIZE - 2:
            raise ValueError(f'主体被裁切：{hero}/{source}')
        mapping[source] = len(packed); packed.append(frame)
        metadata.append(dict(id=len(metadata), **records[source], sourceBounds=frames[source].getbbox(),
                             center=[(box[0] + box[2]) / 2, (box[1] + box[3]) / 2]))
    sheet = Image.new('RGBA', (COLUMNS * SIZE, math.ceil(len(packed) / COLUMNS) * SIZE))
    for i, frame in enumerate(packed):
        sheet.paste(frame, (i % COLUMNS * SIZE, i // COLUMNS * SIZE))
    filename = f'cat-{hero}-front.png'; sheet.save(OUT / filename, optimize=True)
    actions = {name: dict(fps=FPS, loop=True, frames=[mapping[i] for i in indices])
               for name, indices in [('idle', idle), ('move', move)]}
    # 每帧预先寻找另一动作中最接近的姿态，运行时单帧衔接，不叠出双重轮廓。
    samples = np.array([np.asarray(frame.resize((80, 80)), dtype=np.float32) / 255 for frame in packed])
    samples[:, :, :, :3] *= samples[:, :, :, 3:4]
    entries = {name: [min(action['frames'], key=lambda other: float(np.mean(np.abs(samples[index] - samples[other]))))
                      for index in range(len(packed))] for name, action in actions.items()}
    for name, action in actions.items():
        previews = []
        for index in action['frames']:
            bg = Image.new('RGBA', (SIZE, SIZE), '#b8cc98'); bg.alpha_composite(packed[index])
            previews.append(bg.convert('RGB').resize((320, 320)))
        previews[0].save(REVIEW / f'cat-{hero}-{name}.gif', save_all=True, append_images=previews[1:], duration=round(1000 / FPS), loop=0)
    contact = Image.new('RGB', (8 * SIZE, 4 * (SIZE + 22)), '#dce2cd')
    draw = ImageDraw.Draw(contact)
    for row, (name, action) in enumerate(actions.items()):
        for sample in range(16):
            index = action['frames'][sample * len(action['frames']) // 16]
            x, y = sample % 8 * SIZE, (row * 2 + sample // 8) * (SIZE + 22)
            contact.paste(packed[index], (x, y), packed[index]); draw.text((x + 4, y + SIZE), f'{name} {metadata[index]["sourceTime"]:.2f}s', fill='#253a30')
    contact.save(REVIEW / f'cat-{hero}-contact.png')
    status = json.loads((OUT / f'source/cat-{hero}-v2-status.json').read_text(encoding='utf-8'))
    return dict(hero=hero, atlas=filename, frameSize=SIZE, columns=COLUMNS, frameCount=len(packed), anchor=anchor,
        pixelsPerUnit=7 * frames[0].width / 768 * scale, actions=actions, frames=metadata, entries=entries,
        source=dict(file=f'source/cat-{hero}.mp4', sha256=hashlib.sha256(video.read_bytes()).hexdigest(),
                    fps=source_fps, width=frames[0].width, height=frames[0].height, url=status['output']['video']['url']),
        processing=dict(key='blue', scale=scale, fixedGround=ground, fixedCenter=center, idle=idle_qa, move=move_qa))


if __name__ == '__main__':
    REVIEW.mkdir(parents=True, exist_ok=True)
    manifest = dict(version=1, facing='front', heroes=[export_hero(hero) for hero in [0, 1]])
    (OUT / 'animations.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps([dict(hero=h['hero'], frameCount=h['frameCount'], actions={k: len(v['frames']) for k, v in h['actions'].items()}, qa=h['processing']) for h in manifest['heroes']], ensure_ascii=False, indent=2))
