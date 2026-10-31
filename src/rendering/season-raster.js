import {createRenderCanvas} from './canvas-recovery.js';
// 只混合环境材质位图；预乘透明度相加避免树冠和雪层在中点变透明。
let scratch = null;
// 显式释放过期像素，避免快速切季等待垃圾回收而累积大画布。
export function releaseRaster(canvas) { if (canvas) { canvas.width = 1; canvas.height = 1; } }
// 按季节权重烘焙一个来源快照，临时端点逐张释放，不保留四季副本。
export function weightedRaster(weights, build) {
  const layers = Object.entries(weights).filter(([, weight]) => weight > 0);
  if (layers.length === 1 && layers[0][1] === 1) return build(layers[0][0]);
  let result = null;
  for (const [season, weight] of layers) {
    if (weight <= 0) continue;
    const image = build(season);
    if (!result) { result = createRenderCanvas(); result.width = image.width; result.height = image.height; }
    const c = result.getContext('2d'); c.globalCompositeOperation = 'lighter'; c.globalAlpha = weight;
    c.drawImage(image, 0, 0); releaseRaster(image);
  }
  return result;
}
// 共用一张工作画布，结果必须立即绘制；两端透明区域保持相同的脚底锚点。
export function mixRaster(from, to, progress) {
  if (!from || progress >= 1) return to;
  if (progress <= 0) return from;
  scratch ||= createRenderCanvas();
  if (scratch.width !== to.width || scratch.height !== to.height) { scratch.width = to.width; scratch.height = to.height; }
  const c = scratch.getContext('2d'); c.clearRect(0, 0, scratch.width, scratch.height);
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1 - progress; c.drawImage(from, 0, 0);
  c.globalCompositeOperation = 'lighter'; c.globalAlpha = progress; c.drawImage(to, 0, 0);
  return scratch;
}
// 工作像素计入诊断，稳定季节释放临时合成画布。
export function seasonRasterStats(release = false) {
  if (release) { releaseRaster(scratch); scratch = null; }
  return { bytes: scratch ? scratch.width * scratch.height * 4 : 0 };
}
export class SeasonAtlas {
  // 树木按现有造型与昼夜缓存，仅在过渡期间增加一个来源快照。
  constructor() { this.entries = new Map(); this.revision = null; this.target = null; }
  // 换目标释放上一轮；过渡结束保留目标纹理并释放来源，避免结束时重烘焙。
  sync(state) {
    if (this.revision !== state.revision || this.target !== state.target || this.source !== state.from) {
      this.clear(); this.revision = state.revision; this.target = state.target; this.source = state.from; this.active = true;
    }
    if (!state.active && this.active) for (const entry of this.entries.values()) { releaseRaster(entry.from); entry.from = null; }
    this.active = state.active;
  }
  // 每个造型只烘焙一次；后续帧仅对两张现成位图做颜色和雪量混合。
  image(key, state, build) {
    this.sync(state);
    let entry = this.entries.get(key);
    if (!entry) {
      entry = { to: build(state.target), from: state.active ? weightedRaster(state.from, build) : null };
      this.entries.set(key, entry);
    }
    return mixRaster(entry.from, entry.to, state.progress);
  }
  // 地图切换或结束检查可主动回收本图集全部画布。
  clear() { for (const e of this.entries.values()) { releaseRaster(e.from); releaseRaster(e.to); } this.entries.clear(); }
  // 包含来源快照，不能把过渡期间的内存漏报为单季。
  stats() {
    let bytes = 0;
    for (const e of this.entries.values()) for (const image of [e.from, e.to]) if (image) bytes += image.width * image.height * 4;
    return { count: this.entries.size, bytes };
  }
}
