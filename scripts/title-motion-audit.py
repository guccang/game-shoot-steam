"""逐秒比较首页真实画面变化；需FFmpeg、NumPy及Pillow，结果仍需实机审美复核。"""
import json
import subprocess
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw


def inspect(path, output):
    """按八帧每秒读取源片，分别统计角色和环境，保存连续动作对照供人工复核。"""
    output.mkdir(parents=True, exist_ok=True)
    data = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path), '-vf',
        'fps=8,scale=360:640', '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'])
    frames = np.frombuffer(data, dtype=np.uint8).reshape(-1, 640, 360, 3)
    regions = {'cat': (125, 240, 235, 325), 'wheat': (5, 55, 155, 150),
        'tree': (85, 385, 165, 470), 'water': (335, 400, 360, 620),
        'scarf': (130, 268, 170, 288)}
    result = {'file': str(path), 'sampleFps': 8, 'frames': len(frames), 'regions': {}}
    for name, (left, top, right, bottom) in regions.items():
        pixels = frames[:, top:bottom, left:right].astype(np.int16)
        delta = np.abs(np.diff(pixels, axis=0)).mean(axis=3)
        # 每秒平均像素变化与明显变化面积分开记录，不用播放器时间代替素材运动。
        result['regions'][name] = [{'second': second, 'meanDelta': round(float(delta[second*8:(second+1)*8].mean()), 4),
            'changedPercent': round(float((delta[second*8:(second+1)*8] > 4).mean()*100), 4)}
            for second in range(len(delta)//8+1) if len(delta[second*8:(second+1)*8])]
    result['loopSeamMeanDelta'] = round(float(np.abs(frames[0].astype(np.int16)-frames[-1].astype(np.int16)).mean()), 4)
    (output/'motion.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    # 动作图只用于连续帧分析，运行资源不从这些截图拼接生成。
    sheet = Image.new('RGB', (5*220, 4*195), '#f5efd8')
    draw = ImageDraw.Draw(sheet)
    for i, frame in enumerate(frames[::4][:20]):
        tile = Image.fromarray(frame).crop((125, 240, 235, 325)).resize((220, 170))
        x, y = (i%5)*220, (i//5)*195
        sheet.paste(tile, (x, y+25)); draw.text((x+8, y+5), f'{i/2:.1f}s', fill='#294338')
    sheet.save(output/'cat-motion.jpg', quality=92)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    inspect(Path(sys.argv[1]), Path(sys.argv[2]))
