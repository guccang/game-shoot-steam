import {createRenderCanvas,canvasRecoveryRevision} from './canvas-recovery.js';
import { i18nText } from "../i18n/index.js";
// 品种毛色作用于真实视频的逐帧像素，局部头部造型单独处理，保留腿部运动与围巾。
import {drawPoliceOutfit} from './police-patrol.js';
import { shapeCatFrame } from './cat-breed-shapes.js';
const PALETTES = {
  tabby: [190, 200, 201], point: [239, 221, 188],
  bicolor: [245, 240, 224], black: [83, 94, 101],
};

// 只重着色原始暖色毛发；色块随每帧头部边界定位，不把静止贴片盖在动画上。
export function recolorCatFrame(pixels, size, coat) {
  const base = PALETTES[coat];
  if (!base) throw Error(i18nText("rendering.cat-coats.709363a235"));
  let top = size, right = 0;
  for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] > 160) {
    top = Math.min(top, Math.floor(i / 4 / size)); right = Math.max(right, i / 4 % size);
  }
  const center = right - size * 0.26;
  for (let i = 0; i < pixels.length; i += 4) {
    if (!pixels[i + 3]) continue;
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    const x = (i / 4 % size - center) / (size * 0.26), y = (Math.floor(i / 4 / size) - top) / (size * 0.44);
    const face = Math.abs(x) < 0.76 && y > 0.35 && y < 0.9;
    // 深色猫和重点色猫保留清晰眼口，原始眨眼帧的轮廓完全不变。
    if ((coat === 'black' || coat === 'point') && face && r < 135 && g < 115 && b < 100 && r > g) {
      const eye = y < 0.62 && Math.abs(x) > 0.14 && Math.abs(x) < 0.55;
      const ink = coat === 'black' ? eye ? [225, 190, 108] : [160, 174, 172] : eye ? [159, 200, 203] : [72, 64, 59];
      pixels[i] = ink[0]; pixels[i + 1] = ink[1]; pixels[i + 2] = ink[2]; continue;
    }
    if (!(r > 130 && r > g + 6 && g > b + 25)) continue;
    let color = base;
    const facePoint = (x / 0.93) ** 2 + ((y - 0.59) / 0.43) ** 2 < 1;
    if (coat === 'point' && ((y < 0.25 && Math.abs(x) > 0.55) || facePoint || y > 1.35 || x < -1)) color = [135, 117, 107];
    if (coat === 'bicolor' && y < 0.95 && (y < 0.22 || Math.abs(x) > Math.max(0.16, (y - 0.15) * 1.1))) color = [155, 147, 144];
    if (coat === 'tabby' && Math.abs(x) > 0.63 && Math.abs(x) < 0.98 && y > 0.4 && y < 0.85 && Math.floor(y * 18) % 3 === 0) color = [111, 129, 132];
    // 非虎斑品种消去源猫额头的橘色条纹，其余明暗仍继承真实帧。
    const foreheadStripe = coat !== 'tabby' && y > 0.16 && y < 0.38 && Math.abs(x) < 0.55 && r < 220;
    const shade = foreheadStripe ? 1 : Math.max(0.58, Math.min(1.08, (r * 0.3 + g * 0.59 + b * 0.11) / 212));
    for (let channel = 0; channel < 3; channel++) pixels[i + channel] = Math.min(255, Math.round(color[channel] * shade));
  }
}

// 最多缓存四十八个当前帧，各品种共用两张原图集，避免手机多解码四套完整图集。
export class CatCoatFrames {
  // 原始帧工作区只分配一次，成品仍受统一四十八帧缓存限制。
  constructor() { this.frames = new Map(); this.work = null; this.revision=canvasRecoveryRevision(); }
  // 释放失效帧和读回工作区；保留原始图集与角色动作，不制造空白的ready帧。
  clear() {
    for(const canvas of [...this.frames.values(),this.work])if(canvas){canvas.width=1;canvas.height=1;}
    this.frames.clear();this.work=null;this.revision=canvasRecoveryRevision();
  }
  // 按品种与源帧创建一次画布，重复绘制和静止状态不会重复处理像素。
  get(image, manifest, frame, breed) {
    if(this.revision!==canvasRecoveryRevision())this.clear();
    const key = `${manifest.atlas}:${breed.id}:${frame}`;
    if (this.frames.has(key)) {
      const cached = this.frames.get(key); this.frames.delete(key); this.frames.set(key, cached); return cached;
    }
    const size = manifest.frameSize, canvas = createRenderCanvas();
    canvas.width = canvas.height = size;
    this.work ||= createRenderCanvas();
    if (this.work.width !== size || this.work.height !== size) this.work.width = this.work.height = size;
    const work = this.work.getContext('2d', { willReadFrequently: true }), c = canvas.getContext('2d');
    work.clearRect(0, 0, size, size);
    work.drawImage(image, frame % manifest.columns * size, Math.floor(frame / manifest.columns) * size, size, size, 0, 0, size, size);
    const data = work.getImageData(0, 0, size, size), source = data.data.slice();
    if (breed.coat) recolorCatFrame(data.data, size, breed.coat);
    work.putImageData(data, 0, 0);
    const head=shapeCatFrame(c, source, this.work, size, breed.id);
    if(breed.id==='police')drawPoliceOutfit(c,head);
    if (this.frames.size >= 48) {const key=this.frames.keys().next().value,old=this.frames.get(key);old.width=old.height=1;this.frames.delete(key);}
    this.frames.set(key, canvas); return canvas;
  }
  // 诊断报告包括衍生帧内存，不能只报告原始 PNG 的解码尺寸。
  bytes() { return [...this.frames.values(), ...(this.work ? [this.work] : [])].reduce((sum, canvas) => sum + canvas.width * canvas.height * 4, 0); }
}
