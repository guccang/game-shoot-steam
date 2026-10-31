// 总览使用正式绘制器离线导出的底图，手机不再遍历整张世界生成缩略图。
import {artStyle} from '../art-styles/state.js';
export const MAP_PREVIEW_LIMIT = 2;
export const MAP_PREVIEW_VERSION = '2026-10-29-town-west';

// 网络读取与解码异步完成；缺失或尺寸错误明确失败，不回退到阻塞式绘制。
async function loadPreview({ mapId, season }, signal) {
  const url = new URL(`../../assets/art-styles/${artStyle()}/map-preview/${mapId}-${season}.png?v=${MAP_PREVIEW_VERSION}`, import.meta.url);
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`地图底图加载失败：${response.status}`);
  const image = await createImageBitmap(await response.blob());
  if (image.width !== 720 || image.height !== 560) { image.close(); throw new Error('地图底图尺寸错误'); }
  return image;
}

// 只保留最近两张解码图；取消后的异步结果也会释放，避免快速换季累积内存。
export class MapPreviewCache {
  constructor({ load = loadPreview } = {}) {
    this.load = load; this.entries = new Map(); this.work = null; this.failure = null;
    this.builds = this.hits = 0; this.changed = false;
  }
  // 森林按季节缓存，湖谷不因森林换季重新加载。请求不会同步执行任何绘制。
  request(width, height, { mapId = 'forest', season = 'summer', retry = false } = {}) {
    season = mapId === 'jiuzhaigou' ? 'summer' : ['spring', 'autumn', 'winter'].includes(season) ? season : 'summer';
    const key = `${mapId}:${season}`, cached = this.entries.get(key);
    if (this.work && this.work.key !== key) this.cancel();
    if (this.failure && (this.failure.key !== key || retry)) this.failure = null;
    if (cached) { this.entries.delete(key); this.entries.set(key, cached); return cached; }
    if (this.work?.key !== key && !this.failure) {
      const work = { key, controller: new AbortController() }; this.work = work;
      this.load({ mapId, season }, work.controller.signal).then(image => {
        if (this.work !== work) { image.close(); return; }
        this.entries.set(key, image); this.work = null; this.builds++; this.changed = true;
        while (this.entries.size > MAP_PREVIEW_LIMIT) {
          const oldest = this.entries.keys().next().value;
          this.entries.get(oldest).close(); this.entries.delete(oldest);
        }
      }).catch(error => {
        if (this.work !== work) return;
        this.work = null; this.failure = { key, message: String(error.message || error) }; this.changed = true;
      });
    }
    return null;
  }
  // 底图只贴一次，实时玩家和任务标记仍由地图面板随后绘制。
  draw(c, width, height, options) {
    const image = this.request(width, height, options);
    if (!image) return false;
    c.drawImage(image, 0, 0, width, height); this.hits++; return true;
  }
  // 主循环只消费完成通知，完全不承担地图生成工作。
  advance() { const changed = this.changed; this.changed = false; return changed; }
  // 中止网络请求；已经进入解码的结果通过任务身份检查释放。
  cancel() { this.work?.controller.abort(); this.work = null; }
  // 应用退出时主动释放已解码底图和未完成任务。
  dispose() {
    this.cancel(); for (const image of this.entries.values()) image.close();
    this.entries.clear(); this.failure = null; this.changed = false;
  }
  // 保留日志字段供开图对比；builds表示成功加载的底图数，不再是运行时生成次数。
  stats() {
    return { count: this.entries.size, limit: MAP_PREVIEW_LIMIT, builds: this.builds, hits: this.hits,
      pending: !!this.work, error: this.failure?.message || null,
      bytes: [...this.entries.values()].reduce((sum, c) => sum + c.width * c.height * 4, 0),
      pendingBytes: this.work ? 720 * 560 * 4 : 0 };
  }
}
