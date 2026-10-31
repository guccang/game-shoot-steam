"""通过game-engine图片服务按目录生成，保留原生Alpha和每批完整来源；已有请求禁止自动重提。"""
import json, uuid, sys
from pathlib import Path
from urllib.request import Request, urlopen
from concurrent.futures import ThreadPoolExecutor
ROOT=Path(__file__).resolve().parent
ENDPOINT='http://10.1.9.154:8091'
GROUPS=json.loads((ROOT/'catalog.json').read_text(encoding='utf-8'))

def save(folder,name,value):
    """请求记录仅放源目录，不进入运行包。"""
    (folder/name).write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8')

def generate(index):
    """每张图集只提交一次，失败明确保存而不偷换模型或重复计费。"""
    folder=ROOT/f'batch-{index+1:02}'
    folder.mkdir(exist_ok=True)
    if (folder/'request.json').exists():
        print(f'第{index+1}批已有记录，跳过',flush=True)
        return
    request_id='img-resourcegen-'+str(uuid.uuid4())
    boundary='----ResourceGen'+uuid.uuid4().hex
    header=(f'--{boundary}\r\nContent-Disposition: form-data; name="request_id"\r\n\r\n{request_id}\r\n'
            f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="reference.png"\r\nContent-Type: image/png\r\n\r\n').encode()
    body=header+(ROOT/'reference.png').read_bytes()+f'\r\n--{boundary}--\r\n'.encode()
    with urlopen(Request(ENDPOINT+'/v1/uploads/images',data=body,headers={'Content-Type':'multipart/form-data; boundary='+boundary}),timeout=120) as response:
        reference=json.load(response)
    save(folder,'upload.json',reference)
    items=GROUPS[index]
    prompt=f"""为手机游戏《森林巡游》设计一张统一UI透明图标图集。输入参考是已批准的同系列图标，只借鉴森林绿描边、奶油高光、有限平涂、圆润形体和柔和配色，不复制参考图中的标签和背景。
严格{1 if len(items)==1 else 2 if len(items)==4 else 4}列{1 if len(items)==1 else 2 if len(items)==4 else len(items)//4}行共{len(items)}枚图标，等大正方形单元，每个图标中心位于各单元正中心，完整位于自己的格内，占单元宽高约65%，四边至少17%透明空隙。不要底板，不要网格，不要框线，不要棋盘格，不要文字数字水印。必须原生透明背景。每个格子只有指定的完整主体，没有其他漂浮碎屑。
按从左至右逐行顺序生成：
"""+'\n'.join(f'{i+1}. {name}：{subject}。' for i,(_,name,subject) in enumerate(items))+"""
统一森林绿轮廓#315C43，奶油黄#F4DCA0，高光#FFF2CF，绿金暖木色与低饱和辅助色。左上受光，右下只一个平涂暗面；外轮廓较粗，细节少而准确，缩小24像素仍清楚。主体平滑利落，没有发光、重渐变、写实、3D、文字、小装饰点。猫和领主只做头像，保留指定种类，不改成其他游戏人物。工具武器侧面轻斜，载具三分之四正面，导航符号朝上。圆环、文字、数字、按钮底板均由程序绘制，不要烘焙。"""
    payload={'request_id':request_id,'model':'gpt-image-2.5','prompt':prompt,'image_inputs':[reference['url']],'aspect_ratio':'4:3' if len(items)==12 else '1:1' if len(items)<=4 else '2:1','image_size':'2K','n':1,'output_format':'png','response_format':'url','background':'transparent'}
    save(folder,'request.json',payload)
    print(f'第{index+1}批提交：{request_id}',flush=True)
    try:
        with urlopen(Request(ENDPOINT+'/v1/images/generations',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'}),timeout=900) as response:
            result=json.load(response)
        save(folder,'response.json',result)
        with urlopen(result['data'][0]['url'],timeout=120) as response:
            (folder/'atlas.source.png').write_bytes(response.read())
        print(f'第{index+1}批原图保存完成',flush=True)
    except Exception as error:
        save(folder,'failure.json',{'request_id':request_id,'error':str(error)})
        raise

if __name__=='__main__':
    with ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(generate,range(len(GROUPS))))

