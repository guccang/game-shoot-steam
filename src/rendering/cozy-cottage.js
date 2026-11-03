// 小屋共用解码与绘制流程，风格目录仅存放图片和尺寸清单。
import {drawBuildingArchitecture} from './building-architecture.js';
import {homeExterior} from '../config/home-construction.js';
import {box,poly} from './primitives.js';
import { artStyle, ART_STYLES } from '../art-styles/state.js';
import classic from '../../assets/art-styles/classic/cozy-cottage/manifest.json' with { type: 'json' };
import clear from '../../assets/art-styles/clear/cozy-cottage/manifest.json' with { type: 'json' };
const manifests = { classic, clear },
  images = new Map(),
  pending = new Map();
// 先预载目标风格，失败时保留当前图片并允许重试。
export function loadCozyCottage(id = artStyle()) {
  if (!ART_STYLES.some((style) => style.id === id)) throw Error('未知美术风格');
  if (!pending.has(id))
    pending.set(
      id,
      (async () => {
        const image = new Image(),
          manifest = manifests[id];
        image.src = new URL(`../../assets/art-styles/${id}/cozy-cottage/cottage.png`, import.meta.url).href;
        try {
          await image.decode();
        } catch (cause) {
          throw new Error('温馨小屋图片加载失败，请刷新重试。', { cause });
        }
        if (
          image.naturalWidth !== manifest.width ||
          image.naturalHeight !== manifest.height ||
          image.naturalWidth > 512 ||
          image.naturalHeight > 512
        )
          throw Error('温馨小屋图片尺寸不符合资源预算。');
        images.set(id, image);
      })().catch((error) => {
        pending.delete(id);
        throw error;
      }),
    );
  return pending.get(id);
}
// 状态仅统计当前风格使用的正式图片。
export function cozyCottageStatus() {
  const image = images.get(artStyle());
  return {
    ready: !!image,
    width: image?.naturalWidth || 0,
    height: image?.naturalHeight || 0,
    decodedBytes: image ? image.naturalWidth * image.naturalHeight * 4 : 0,
  };
}
// 预载资源状态保持兼容；新木石立面采用正式程序几何，不改变门槛锚点。
export function drawCozyCottage(c, winter=false, floors=2) {
  const id = artStyle(),
    image = images.get(id);
  if (!image) throw Error('温馨小屋图片尚未加载，不能绘制场景。');
  drawBuildingArchitecture(c,'cottage',false,0,homeExterior({floors}).rows);
}
// 窗光继续跟随正式昼夜图集。
export function drawCozyCottageWarmth(c, floors=2) {
  const {rows,lift}=homeExterior({floors});
  for(const x of [-52,21])box(c,x,-54,22,27,2,'#f2d88f','#607d61',1.2);
  // 新楼层的暖光仅填窗格，窗框和十字窗棂继续可辨。
  for(let row=0;row<rows;row++)for(const x of [-52,22])for(const dx of [1,12])for(const dy of [1,10])box(c,x+dx,-135*.63-row*32-25+dy,9,6,0,'#f2d88f');
  if(lift)for(const dx of [1,11])for(const dy of [1,10])box(c,-10+dx,-135*.63-lift-27+dy,8,6,0,'#f2d88f');
}
// 积雪继续跟随正式季节图集。
export function drawCozyCottageSnow(c, floors=2) {
  c.save();c.translate(0,-homeExterior({floors}).lift);
  poly(c,[[-71,-87],[-10,-136],[62,-111],[67,-102],[-9,-127],[-63,-84]],'#edf1dc','#c3d0b7',1.2);
  c.restore();
}
