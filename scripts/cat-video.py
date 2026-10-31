"""沿用 char-animation 的首帧生视频流程，保存请求与原片，避免重复提交计费。"""
import argparse
import json
import os
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/cat-front/source'
CLIENT = Path(os.environ.get('GENERATE_CLIENT', r'C:\Users\zhengtingjun\Downloads\generate-service-skill(1)\generate-service\scripts\generate_client.py'))
PROMPT = '''Animate exactly the supplied cartoon cat body as a game sprite. Preserve its simple flat 2D colors, thick brown outlines, face, scarf, tail, proportions and any hat exactly. The cat must ALWAYS face straight FRONT toward the camera, never rotate or turn its head, even when walking. Fixed orthographic camera, fixed scale, fixed framing, entire character always visible. Stay centered in place at the initial feet baseline. Background stays perfectly flat pure BLUE #0000FF, no floor, no shadows, no scenery, no camera movement, no text, no motion blur. This is a BODY-ONLY animation layer: absolutely NO arms, NO hands, NO additional limbs, NO gun, NO weapon, NO props. Keep two short feet and the tail from the reference.
One continuous 10-second take. 0-3 seconds: quiet idle, soft breathing, one natural blink, tiny tail sway, feet planted. 3-4 seconds: gently start walking in place. 4-9 seconds: continuous gentle front-facing WALK IN PLACE, two short feet alternating small steps with smooth weight transfer, subtle body bounce, light scarf and tail follow-through. A readable repeated walk cycle about one second long. Feet must alternate forward and backward in perspective, no sideways travel, no turning, no running, no jumping. 9-10 seconds: settle back into the original idle. All movements should be soft, restrained, cozy and fluid. Keep the body stable for separate game-controlled hands. Match the first frame style precisely, do not redesign the cat or add realistic fur.'''


def client(*args):
    """调用已有客户端并只返回结构化结果，失败立即停止，不自动重新提交。"""
    result = subprocess.run([sys.executable, str(CLIENT), *args], capture_output=True, text=True, encoding='utf-8')
    if result.returncode:
        raise RuntimeError(result.stdout + result.stderr)
    return json.loads(result.stdout)


def submit(hero):
    """每只猫使用稳定请求编号；已有记录必须查询，不能创建重复的付费任务。"""
    target = SOURCE / f'cat-{hero}-v2-request.json'
    if target.exists():
        print(f'cat-{hero}: 已有请求记录，请 collect')
        return
    upload = client('upload', '--kind', 'images', '--file', str(SOURCE / f'cat-{hero}-reference.png'))
    request_id = f'vid-ztj-forest-cat-front-20261021-{hero}-v2'
    args = ['video', '--model', 'seedance-2.5', '--first-frame', upload['url'], '--prompt', PROMPT,
            '--duration', '10', '--resolution', '720p', '--ratio', 'adaptive', '--no-audio', '--no-wait', '--request-id', request_id]
    preview = client(*args, '--dry-run')
    target.write_text(json.dumps(dict(request_id=request_id, reference_url=upload['url'], prompt=PROMPT,
                                     preview=preview, status='submission_pending'), ensure_ascii=False, indent=2), encoding='utf-8')
    data = client(*args)
    (SOURCE / f'cat-{hero}-v2-submit.json').write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(dict(hero=hero, request_id=request_id, result=data), ensure_ascii=False))


def collect(hero):
    """查询既有任务并下载原视频，供重新抽帧和查验源时间；保留服务出处。"""
    request = json.loads((SOURCE / f'cat-{hero}-v2-request.json').read_text(encoding='utf-8'))
    data = client('status', '--media', 'video', '--request-id', request['request_id'])
    (SOURCE / f'cat-{hero}-v2-status.json').write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    video = data.get('output', {}).get('video', {})
    destination = SOURCE / f'cat-{hero}.mp4'
    if video.get('url') and not destination.exists():
        urllib.request.urlretrieve(video['url'], destination)
    print(json.dumps(dict(hero=hero, status=data.get('status') or ('completed' if video.get('url') else 'unknown'), downloaded=destination.exists(), video=video), ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['submit', 'collect'])
    parser.add_argument('--hero', type=int, choices=[0, 1])
    options = parser.parse_args()
    for number in [options.hero] if options.hero is not None else [0, 1]:
        (submit if options.action == 'submit' else collect)(number)
