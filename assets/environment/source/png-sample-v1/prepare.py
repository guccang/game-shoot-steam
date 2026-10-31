"""按人工看图定位裁切模型原图，保留原生透明通道；不重画或伪造生成内容。"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

SOURCE = Path(__file__).resolve().parent
ASSETS = SOURCE.parent.parent
PROJECT = ASSETS.parent.parent
# 坐标来自1448×1086原生图像的实际内容，不按模型未严格遵守的网格硬切。
REGIONS = [
    ('season-spring', '春', (65, 70, 348, 382)),
    ('season-summer', '夏', (395, 55, 705, 380)),
    ('season-autumn', '秋', (745, 60, 1073, 385)),
    ('season-winter', '冬', (1115, 60, 1410, 385)),
    ('time-day', '白昼', (30, 405, 355, 697)),
    ('time-dusk', '黄昏', (400, 465, 708, 692)),
    ('time-night', '夜晚', (775, 425, 1067, 693)),
    ('weather-sun', '晴', (1105, 398, 1417, 702)),
    ('weather-cloud', '阴', (20, 775, 362, 1015)),
    ('weather-rain', '雨', (402, 717, 708, 1031)),
    ('weather-thunder', '雷', (757, 715, 1062, 1042)),
    ('weather-snow', '雪', (1115, 717, 1415, 1033)),
]


def main():
    """检查透明来源、等比导出96px图标并制作真实尺寸与放大对照。"""
    original = Image.open(SOURCE / 'atlas.source.png')
    if original.size != (1448, 1086) or original.mode != 'RGBA':
        raise RuntimeError('原图规格改变，必须重新人工定位，不能套用旧裁切坐标。')
    alpha = original.getchannel('A')
    if alpha.getextrema() != (0, 255):
        raise RuntimeError('原图没有合格的透明背景和实心主体。')
    manifest = {'说明': '环境PNG首组样品；仅静态插画，圆环与交互由正式UI控制。',
                'version': 1, 'designCriterion': 'environment-png-sample',
                'model': 'gpt-image-2.5', 'sourceSize': list(original.size),
                'source': 'source/png-sample-v1/atlas.source.png', 'icons': []}
    board = Image.new('RGB', (960, 820), '#f6f2df')
    draw = ImageDraw.Draw(board)
    font = ImageFont.truetype(str(PROJECT / 'assets/fonts/HYQiHei_75S.ttf'), 21)
    small = ImageFont.truetype(str(PROJECT / 'assets/fonts/HYQiHei_75S.ttf'), 15)
    draw.text((30, 20), '森林巡游 · 环境图标 PNG 样品', font=font, fill='#315c43')
    draw.text((30, 53), '上方为放大预览；下方为实际 26 / 28 / 32 像素，浅底与夜景底对照。', font=small, fill='#58785d')
    for index, (key, label, region) in enumerate(REGIONS):
        crop = original.crop(region)
        bounds = crop.getchannel('A').point(lambda value: 255 if value > 32 else 0).getbbox()
        if not bounds:
            raise RuntimeError('空裁片：' + key)
        crop = crop.crop(bounds)
        crop.thumbnail((86, 86), Image.Resampling.LANCZOS)
        result = Image.new('RGBA', (96, 96))
        offset = ((96-crop.width)//2, (96-crop.height)//2)
        result.paste(crop, offset)
        destination = ASSETS / (key + '.png')
        result.save(destination, optimize=True)
        manifest['icons'].append({'id': key, 'name': label, 'file': key+'.png',
                                  'width': 96, 'height': 96, 'anchor': [48,48],
                                  'sourceRect': list(region), 'trimRect': list(bounds),
                                  'bytes': destination.stat().st_size})
        x, y = 30+(index%4)*235, 100+(index//4)*235
        board.paste(result.resize((112,112), Image.Resampling.LANCZOS), (x+45,y), result.resize((112,112), Image.Resampling.LANCZOS))
        draw.text((x+87, y+115), label, font=font, fill='#315c43')
        draw.rounded_rectangle((x,y+150,x+208,y+218), radius=10, fill='#294b43')
        for size, dx in [(26,12),(28,79),(32,145)]:
            icon = result.resize((size,size), Image.Resampling.LANCZOS)
            draw.rounded_rectangle((x+dx-4,y+149,x+dx+size+4,y+187), radius=6, fill='#fffced')
            board.paste(icon, (x+dx,y+153), icon)
            board.paste(icon, (x+dx,y+187), icon)
    manifest['totalBytes'] = sum(icon['bytes'] for icon in manifest['icons'])
    manifest['decodedBytes'] = 12*96*96*4
    (ASSETS / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    board.save(PROJECT / 'docs/art-reference/environment-png-sample.png', optimize=True)
    print(json.dumps({'count': 12, 'totalBytes': manifest['totalBytes'], 'decodedBytes': manifest['decodedBytes']}))


if __name__ == '__main__':
    main()
