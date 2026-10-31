"""按实际透明像素提取各格PNG，等比缩小并输出可复核清单；不重绘图案。"""
from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import json, hashlib
ROOT=Path(__file__).resolve().parent
OUT=ROOT.parents[1]
GROUPS=json.loads((ROOT/'catalog.json').read_text(encoding='utf-8'))
def main():
    """每格保留全透明边距，原始图和像素裁切依据留存。"""
    entries=[]
    for batch,group in enumerate(GROUPS,1):
        source=ROOT/f'batch-{batch:02}'/'atlas.source.png'
        if not source.exists():raise RuntimeError(f'缺少原图：{source}')
        im=Image.open(source).convert('RGBA')
        assert im.getchannel('A').getextrema()==(0,255),(source,'不是原生透明图')
        columns=1 if len(group)==1 else 2 if len(group)==4 else 4
        rows=len(group)//columns
        for i,(id,name,subject) in enumerate(group):
            # 初稿额外生成的锤子和背包未被现有控件使用，只留源图，不进入运行包。
            if id in ['tool-hammer','backpack']:continue
            x,y=i%columns,i//columns
            # 原图部分主体跨越数学等分线，按人工复核的行间透明带裁切，避免混入邻格碎片。
            row_edges={1:[0,386,704,1086],4:[0,370,704,1086],5:[0,386,740,1086],6:[0,380,742,1086]}.get(batch,[round(j*im.height/rows) for j in range(rows+1)])
            cell=(round(x*im.width/columns),row_edges[y],round((x+1)*im.width/columns),row_edges[y+1])
            tile=im.crop(cell);bounds=tile.getchannel('A').point(lambda a:255 if a>=24 else 0).getbbox()
            assert bounds,(id,'空图')
            cropped=tile.crop(bounds);cropped.thumbnail((112,112),Image.Resampling.LANCZOS)
            final=Image.new('RGBA',(128,128));final.alpha_composite(cropped,((128-cropped.width)//2,(128-cropped.height)//2))
            path=OUT/f'{id}.png';final.save(path,optimize=True)
            entries.append(dict(id=id,name=name,path=f'assets/ui/{id}.png',width=128,height=128,anchor=[64,64],batch=batch,cell=cell,contentBounds=bounds,bytes=path.stat().st_size,sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    manifest=dict(version='png-v1',provider='game-engine/generate-service',submittedModel='gpt-image-2.5',reportedModel=None,icons=entries,totalBytes=sum(e['bytes'] for e in entries),decodedBytes=len(entries)*128*128*4)
    (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',17)
    for start in range(0,len(entries),48):
        items=entries[start:start+48]
        sheet=Image.new('RGB',(960,80+((len(items)+7)//8)*154),'#f6f1dc');d=ImageDraw.Draw(sheet)
        d.text((24,18),f'森林巡游 · PNG界面图标 {start+1}–{start+len(items)}',font=font,fill='#315c43')
        for i,e in enumerate(items):
            x=(i%8)*120;y=70+(i//8)*154
            pic=Image.open(OUT/(e['id']+'.png'));pic.thumbnail((86,86),Image.Resampling.LANCZOS)
            sheet.paste(pic,(x+(120-pic.width)//2,y),pic)
            d.text((x+7,y+90),e['name'],font=font,fill='#315c43')
            d.rectangle((x+4,y+116,x+115,y+149),fill='#244c40')
            tiny=Image.open(OUT/(e['id']+'.png'));tiny.thumbnail((26,26),Image.Resampling.LANCZOS);sheet.paste(tiny,(x+28,y+119),tiny);sheet.paste(tiny,(x+70,y+119),tiny)
        dest=ROOT.parents[3]/'docs/art-reference'/f'ui-png-sheet-{start//48+1}.png';sheet.save(dest)
    print(json.dumps({k:manifest[k] for k in ['totalBytes','decodedBytes']}))
if __name__=='__main__':main()

