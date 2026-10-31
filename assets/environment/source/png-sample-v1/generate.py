"""调用 game-engine 已配置的图片服务生成环境样品，保留真实请求和响应，不自动重提。"""
import json
import uuid
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
ENDPOINT = 'http://10.1.9.154:8091'


def save(name, value):
    """将生成依据存入源目录，运行包通过既有规则排除。"""
    (ROOT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')


def main():
    """先上传实机风格参考，再进行一次同步生图，失败保留请求标识。"""
    if (ROOT / 'request.json').exists():
        raise RuntimeError('已有提交记录，禁止自动重复生成；先检查原请求结果。')
    request_id = 'img-resourcegen-' + str(uuid.uuid4())
    boundary = '----ResourceGen' + uuid.uuid4().hex
    parts = (f'--{boundary}\r\nContent-Disposition: form-data; name="request_id"\r\n\r\n{request_id}\r\n'
             f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="reference.png"\r\nContent-Type: image/png\r\n\r\n').encode()
    body = parts + (ROOT / 'reference.png').read_bytes() + f'\r\n--{boundary}--\r\n'.encode()
    upload = Request(ENDPOINT + '/v1/uploads/images', data=body, headers={'Content-Type': 'multipart/form-data; boundary=' + boundary})
    with urlopen(upload, timeout=90) as response:
        reference = json.load(response)
    save('upload.json', reference)
    prompt = '''为手机游戏《森林巡游》重新设计一套12枚精致但简洁的二维森林绘本UI图标。参考图仅用于配色、深森林绿描边和有限平涂画风，不复制截图布局，不生成截图里的角色或文字。
输出一张原生透明PNG图标图集，严格4列3行，共12个图标。整张图宽高比4:3，12个正方形单元完全等大；每个图标在自己的单元中心，主体占格子宽高约68%，四周至少16%透明留白；所有图标互不接触，完全位于自己的格子内。没有网格线，没有底板，没有徽章圆框，没有地面投影，没有棋盘格，没有文字数字。
从左至右逐行的准确内容如下：
第一行四季：1春季，两片清晰嫩绿叶子的短芽枝，带一朵小粉白花苞；2夏季，一棵小巧的繁茂阔叶树，三团浓绿圆冠和短棕树干；3秋季，一片宽大的暖橙枫叶与一颗小橡果，边缘清楚；4冬季，一棵三层松树，每层覆盖奶油白积雪，深绿针叶露出。
第二行时段及晴天：5白昼，奶油金太阳升在两片低矮绿色草坡上方，明确有草坡；6黄昏，暖杏橙落日一半在横向地平线下，伴两条短金色天空线，无草坡；7夜晚，奶油黄色弯月伴两颗小四芒星，无云；8晴天，独立完整金色太阳与八条短圆润光芒，无草坡无地平线无云。
第三行天气：9阴天，两团重叠圆云，奶油灰前云与柔和灰绿后云；10下雨，一朵奶油灰圆云下面恰好三颗大蓝绿雨滴；11雷雨，一朵偏灰绿的云下面一个宽大的金黄色闪电，闪电占图标高度至少一半，无雨滴；12下雪，一个简洁清楚的六向雪花晶体，奶油蓝白内芯与深灰绿描边，无云。
统一粗细的森林绿轮廓 #315C43，奶油黄 #F4DCA0、高光 #FFF2CF，柔和绿与暖木色，左上微亮、右下仅一个平涂暗面。看起来像同一套高品质手绘游戏道具图标，边线平滑利落，色块饱满、轮廓鲜明。最终会缩小到26像素，禁止细碎纹理、密集细线、小脸、眼睛、写实、3D、金属高光、发光光晕、复杂渐变。12枚必须数量准确、位置准确、透明背景真实存在。'''
    payload = {'request_id': request_id, 'model': 'gpt-image-2.5', 'prompt': prompt,
               'image_inputs': [reference['url']], 'aspect_ratio': '4:3', 'image_size': '2K',
               'n': 1, 'output_format': 'png', 'response_format': 'url', 'background': 'transparent'}
    save('request.json', payload)
    print('已提交一次图片生成请求：' + request_id, flush=True)
    request = Request(ENDPOINT + '/v1/images/generations', data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json'})
    try:
        with urlopen(request, timeout=600) as response:
            result = json.load(response)
        save('response.json', result)
        with urlopen(result['data'][0]['url'], timeout=120) as response:
            (ROOT / 'atlas.source.png').write_bytes(response.read())
        print('原图已保存：' + str(ROOT / 'atlas.source.png'), flush=True)
    except Exception as error:
        save('failure.json', {'request_id': request_id, 'error': str(error)})
        raise


if __name__ == '__main__':
    main()
