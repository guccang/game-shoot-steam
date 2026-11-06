import { i18nText } from "../i18n/index.js";
// 视频抽帧主体图集：只绘制正面身体，手、枪、后坐和枪口仍由原绘制链处理。
const MANIFEST_URL = new URL('../../assets/cat-front/animations.json', import.meta.url);
import { HEROES } from '../config/heroes.js';
import { CAT_SCARVES } from '../config/cat-scarves.js';
import { drawCatEars } from './cat-breed-shapes.js';
import { drawTitleScarf } from './title-scarf.js';
import { CatCoatFrames } from './cat-coats.js';

// 根据动作自己的帧率取帧；减少动态时固定待机，时间完全来自战斗时钟。
export function catFrame(action, time, reduced = false) {
  const length = action.frames.length;
  return action.frames[reduced ? 0 : Math.floor(Math.max(0, time) * action.fps) % length];
}

// 检查图集边界和动作引用，损坏资源会整体回退到现有矢量小猫。
export function validateCatManifest(data) {
  if (data?.version !== 1 || data.facing !== 'front' || data.heroes?.length !== 2) throw Error(i18nText("rendering.cat-animation.36ee0fa72f"));
  for (const h of data.heroes) {
    if (!/^[\w-]+\.png$/.test(h.atlas) || !(h.pixelsPerUnit > 0) ||
        !(h.frameSize > 0) || !(h.columns > 0) || h.anchor?.length !== 2 || !h.anchor.every(Number.isFinite) ||
        h.frames?.length !== h.frameCount || h.frames.some(frame => frame.center?.length !== 2 || !frame.center.every(Number.isFinite))) throw Error(i18nText("rendering.cat-animation.2bddd2c965"));
    for (const name of ['idle', 'move']) {
      const a = h.actions?.[name];
      if (!(a?.fps > 0) || !a.frames?.length || a.frames.some(id => !Number.isInteger(id) || id < 0 || id >= h.frameCount))
        throw Error(i18nText("rendering.cat-animation.256e4762fa"));
      if (h.entries?.[name]?.length !== h.frameCount || h.entries[name].some(id => !a.frames.includes(id)))
        throw Error(i18nText("rendering.cat-animation.37f6ea7580"));
    }
  }
  return data;
}

export class CatSpriteAtlas {
  // 注入资源加载器方便无浏览器验证；默认仅加载本项目静态图集，不依赖视频服务在线。
  constructor(fetcher = (...args) => fetch(...args), imageFactory = () => new Image()) {
    this.fetcher = fetcher; this.imageFactory = imageFactory;
    this.status = 'idle'; this.images = []; this.manifest = null; this.promise = null;
    this.tracks = new WeakMap(); this.coats = new CatCoatFrames();
  }
  // 多个渲染器共用一次异步加载，失败不阻塞游戏且不循环请求。
  load() {
    if (this.promise) return this.promise;
    this.status = 'loading';
    this.promise = (async () => {
      try {
        const response = await this.fetcher(MANIFEST_URL);
        if (!response.ok) throw Error(i18nText("rendering.cat-animation.7fb555ccba"));
        const data = validateCatManifest(await response.json());
        const images = await Promise.all(data.heroes.map(h => new Promise((resolve, reject) => {
          const image = this.imageFactory();
          image.onload = () => {
            if (image.naturalWidth !== h.columns * h.frameSize || image.naturalHeight < Math.ceil(h.frameCount / h.columns) * h.frameSize)
              reject(Error(i18nText("rendering.cat-animation.377bf581e6")));
            else resolve(image);
          };
          image.onerror = () => reject(Error(i18nText("rendering.cat-animation.e10fcf1e90")));
          image.src = new URL(h.atlas, MANIFEST_URL).href;
        })));
        this.manifest = data; this.images = images; this.status = 'ready'; return true;
      } catch {
        this.status = 'failed'; this.images = []; return false;
      }
    })();
    return this.promise;
  }
  // 固定脚底锚点；切换时选择相近姿态并平滑消除位置差，始终只画一个主体。
  draw(c, hero, state, pose, reduced = false, gust = 0) {
    const breed = HEROES[hero];
    if (this.status !== 'ready' || !state || !breed || !this.manifest.heroes[breed.sprite]) return false;
    const h = this.manifest.heroes[breed.sprite], size = h.frameSize, image = this.images[breed.sprite];
    const name = !reduced && state.moveWeight > 0.5 ? 'move' : 'idle';
    const action = h.actions[name], time = name === 'idle' ? state.idleTime : state.moveTime;
    let tracks = this.tracks.get(state);
    if (!tracks) { tracks = []; this.tracks.set(state, tracks); }
    let track = tracks[hero];
    if (!track || track.hero !== hero || track.reduced !== reduced) {
      track = { hero, reduced, name, phase: 0, frame: catFrame(action, time, reduced), shiftX: 0, shiftY: 0, changedAt: state.idleTime };
      tracks[hero] = track;
    }
    if (track.name !== name) {
      const entry = h.entries[name][track.frame], from = h.frames[track.frame].center, to = h.frames[entry].center;
      const decay = Math.exp(-Math.max(0, state.idleTime - track.changedAt) * 24);
      track.shiftX = from[0] - to[0] + track.shiftX * decay;
      track.shiftY = from[1] - to[1] + track.shiftY * decay;
      track.phase = action.frames.indexOf(entry) / action.fps - time;
      track.changedAt = state.idleTime; track.name = name;
    }
    // 正偏移取模允许从匹配姿态开始循环，不因时间偏移为负而卡在首帧。
    const duration = action.frames.length / action.fps;
    const frame = catFrame(action, ((time + track.phase) % duration + duration) % duration, reduced);
    track.frame = frame;
    const decay = Math.exp(-Math.max(0, state.idleTime - track.changedAt) * 24);
    c.save(); c.translate(pose.bodyX, pose.bodyY + 13);
    const x = (-h.anchor[0] + track.shiftX * decay) / h.pixelsPerUnit,
      y = (-h.anchor[1] + track.shiftY * decay) / h.pixelsPerUnit, span = size / h.pixelsPerUnit;
    const separateEars = gust > .001 && !reduced;
    const body = this.coats.get(image, h, frame, breed, separateEars);
    const head=this.coats.heads.get(body);
    drawTitleScarf(c, reduced ? 0 : state.idleTime, reduced ? 0 : Math.max(gust, state.scarfLift ?? state.moveWeight),
      x+(head.x-25)/h.pixelsPerUnit,y+(head.neck+6)/h.pixelsPerUnit,CAT_SCARVES[breed.id]);
    // 复用不含耳朵的身体帧，连续风角不生成新的角色位图。
    if (separateEars) {
      c.save(); c.translate(x, y); c.scale(1 / h.pixelsPerUnit, 1 / h.pixelsPerUnit);
      drawCatEars(c, head, breed.id, gust);
      c.restore();
    }
    c.drawImage(body, 0, 0, size, size, x, y, span, span);
    c.restore(); return true;
  }
  // 返回实际解码尺寸；姿态过渡无需额外画布，用于手机内存诊断。
  stats() {
    return { status: this.status, pages: this.images.length,
      coatFrames: this.coats.frames.size,
      bytes: this.images.reduce((sum, image) => sum + image.naturalWidth * image.naturalHeight * 4, 0) + this.coats.bytes() };
  }
}

export const catSprites = new CatSpriteAtlas();
