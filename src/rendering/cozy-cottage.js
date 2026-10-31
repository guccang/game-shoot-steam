// 小屋共用解码与绘制流程，风格目录仅存放图片和尺寸清单。
import { drawCottageWindowLight, drawCottageRoofSnow } from './cottage-art.js';
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
// 两套图片共用门槛锚点，不能以备用图掩盖资源缺失。
export function drawCozyCottage(c) {
  const id = artStyle(),
    image = images.get(id);
  if (!image) throw Error('温馨小屋图片尚未加载，不能绘制场景。');
  c.drawImage(image, ...manifests[id].logicalBounds);
}
// 窗光继续跟随正式昼夜图集。
export function drawCozyCottageWarmth(c) {
  drawCottageWindowLight(c);
}
// 积雪继续跟随正式季节图集。
export function drawCozyCottageSnow(c) {
  drawCottageRoofSnow(c);
}
