"""首页宣传片生产：记录首尾帧请求，按原编号查询，禁止超时后重复提交。"""
import json,sys,subprocess,urllib.request,hashlib,os
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'assets/title/source/windy-v5'
CLIENT=Path(os.environ.get('GENERATE_CLIENT',r'C:\Users\zhengtingjun\Downloads\generate-service-skill(1)\generate-service\scripts\generate_client.py'))
REQUEST='vid-ztj-forest-title-20261023-v5'
PROMPT='''An atmospheric, warm and quietly adventurous 10-second seamless animated loop of this exact forest game scene. The little orange tabby stands happily in a fresh summer breeze. The GREEN SCARF STREAMING TO THE LEFT is the visual heart of this shot: preserve its visible length, plain shape, forest-green color and attachment from the reference, and let it ripple softly like light fabric throughout all ten seconds. Wind travels from screen right to screen left. Small waves travel along the scarf from the neck to its free tip, alternating a soft lift and dip; it stays extended in the breeze, never disappears, shrinks back into a neckerchief, grows longer, or switches sides. This should feel like the appealing windy moment in the reference brought continuously to life.
The same cozy wind makes the golden wheat tips roll in soft small waves, leafy branch tips and tree canopy edges gently sway with a slight delayed response, and fine ripples drift along the turquoise river. These separate movements form one coherent breeze. Keep the countryside quiet, lush and inviting, with generous still spaces between the animated foliage. No added storm, dust, dramatic particles or flashing effects.
The cat stays in the exact original middle location with planted feet, same orange stripes, same face and ear shape, same body scale and handheld grey equipment. Its expression is relaxed and contented: brief natural blinks, almost imperceptible breathing within its stable outline, soft tail swaying below the scarf. Scarf and tail remain clearly distinct and move with different timing. Do not bounce, stretch or scale the whole cat. The gun and feet remain grounded; no shooting, walking or new accessories.
Continuous motion is already underway on the first frame and remains underway on the last frame: no establishing still, no ending still, no freeze-frame holds, no slowing to rest. Use gentle periodic fabric/foliage rhythms over the full ten seconds. The reference is an IN-MOTION PHASE of the loop, not a resting pose. Both supplied boundary images show the scarf already extended. Match their anatomy, position, scarf length, scenery and colors exactly, while matching motion direction through the seam. Close the cycle naturally without a sudden reset. Every second must show a readable breeze and scarf movement, including the opening and closing seconds.
Fixed three-quarter overhead camera and composition, no pan or zoom or cuts. Preserve original flat hand-drawn storybook art with dark forest-green outlines, limited flat shading, botanical greens and warm cream yellow. Keep title and button safe areas clear. Preserve all buildings, terrain and props; keep ground, trunks and structures stationary. No whole-image warping or camera shake, no new characters, no extra limbs, no new words, UI, logo or watermark. The result must feel soft and alive rather than mechanically busy.'''

def client(*args):
    """使用已有服务客户端，失败保留原编号供恢复。"""
    r=subprocess.run([sys.executable,str(CLIENT),*args],capture_output=True,text=True,encoding='utf-8')
    if r.returncode: raise RuntimeError(r.stdout+r.stderr)
    return json.loads(r.stdout)

def submit():
    """先记录请求再提交，已有记录一律改用查询。"""
    SOURCE.mkdir(parents=True,exist_ok=True)
    # 本轮首尾必须采用已经迎风展开的围巾，缺失参考时禁止退回旧静止姿态。
    if not (SOURCE/'reference.png').exists(): raise FileNotFoundError('缺少已确认的迎风围巾参考，请按reference-origin.json提取')
    target=SOURCE/'request.json'
    if target.exists(): print('已有请求，请使用 collect');return
    models=client('models','--media','video');(SOURCE/'models.json').write_text(json.dumps({'video':{'seedance-2.5':models['video']['seedance-2.5']}},ensure_ascii=False,indent=2),encoding='utf-8')
    upload=client('upload','--kind','images','--file',str(SOURCE/'reference.png'))
    args=['video','--model','seedance-2.5','--first-frame',upload['url'],'--last-frame',upload['url'],'--prompt',PROMPT,'--duration','10','--resolution','720p','--ratio','adaptive','--no-audio','--no-wait','--request-id',REQUEST]
    preview=client(*args,'--dry-run')
    target.write_text(json.dumps(dict(request_id=REQUEST,prompt=PROMPT,reference_sha256=hashlib.sha256((SOURCE/'reference.png').read_bytes()).hexdigest(),preview=preview),ensure_ascii=False,indent=2),encoding='utf-8')
    data=client(*args);(SOURCE/'submit.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(data,ensure_ascii=False))

def collect():
    """查询原请求并保存原片，不把预览或旧视频作为新任务结果。"""
    data=client('status','--media','video','--request-id',REQUEST)
    (SOURCE/'status.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    video=data.get('output',{}).get('video',{})
    if video.get('url') and not (SOURCE/'original.mp4').exists(): urllib.request.urlretrieve(video['url'],SOURCE/'original.mp4')
    print(json.dumps(dict(status=data.get('status') or ('completed' if video.get('url') else 'unknown'),video=video,downloaded=(SOURCE/'original.mp4').exists()),ensure_ascii=False))

if __name__=='__main__':
    {'submit':submit,'collect':collect}[sys.argv[1]]()
