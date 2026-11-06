"""从核准的十二款空车原画输出车身图集；挽马位置留给真实视频连续帧。"""
from pathlib import Path
from PIL import Image, ImageDraw
import json

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/art-reference/vehicle-era-front/v2'
OUTPUT = ROOT / 'assets/vehicle-eras'
TILE = 320


def wagon_body(image, copper):
    """保留车厢、木辕和连接点，用同一行的木板补齐挽马后方。"""
    mask = Image.new('L', image.size)
    outline = [(82,183),(87,171),(84,155),(83,147),(86,124),(88,101),
               (94,92),(106,95),(113,103),(138,101),(150,92),(163,97),
               (164,121),(167,137),(165,162),(166,173),(171,184),
               (164,197),(157,205),(155,238),(95,238),(94,204),(85,197)]
    if copper:
        outline = [(125+(x-125)*.94,239+(y-235)*.89) for x,y in outline]
    coords = [(round(x*TILE/250),round(y*TILE/250)) for x,y in outline]
    ImageDraw.Draw(mask).polygon(coords, fill=255)
    behind = Image.new('RGBA', image.size)
    top = round((156 if copper else 137)*TILE/250)
    sample = round((67 if copper else 64)*TILE/250)
    behind.paste(image.crop((sample,0,sample+1,top)).resize((TILE,top)),(0,0))
    image.paste(behind,(0,0),mask)


def build():
    """格子与车型的已发布顺序固定；游戏包只读取处理后的 WebP。"""
    atlas = Image.new('RGBA',(4*TILE,3*TILE))
    mounts = json.loads((SOURCE/'mounts.json').read_text(encoding='utf8'))['mounts']
    for index, mount in enumerate(mounts):
        with Image.open(SOURCE/'vehicles'/(mount['id']+'.png')) as raw:
            image = raw.convert('RGBA').resize((TILE,TILE),Image.Resampling.LANCZOS)
        if index in (2,3):
            wagon_body(image,index==3)
        atlas.paste(image,(index%4*TILE,index//4*TILE))
    OUTPUT.mkdir(exist_ok=True)
    atlas.save(OUTPUT/'front.webp',quality=94,method=6)


if __name__ == '__main__':
    build()
