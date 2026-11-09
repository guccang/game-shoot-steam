import { mixRaster, releaseRaster } from './season-raster.js';
import { MapPreviewCache } from './map-preview-cache.js';
// 地面采用有上限的按需分块缓存；循环边界复用同一地图块，夜色按需生成。
import { WORLD } from '../world/coordinates.js';
import { buildGroundTile, GROUND_PAD as PAD } from './ground-tile.js';
import { drawAlignedTile } from './tile-blit.js';
export const GROUND_TILE_SIZE = 384;
// 多保留最近走过的地块供折返复用；64块昼夜RGBA约74MiB，季节过渡另含来源层。
export const GROUND_CACHE_LIMIT = 64;
// 四周各预热一屏（包括斜角），最多使用现有64块容量，不额外扩大常驻像素上限。
export const GROUND_WARM_LIMIT = 64;
// 手机每季最多保留24块，昼夜像素约28MiB；缩放拉远时仍优先容纳全部可见块。
export const MOBILE_GROUND_CACHE_LIMIT = 24;
// 触摸设备及窄屏使用移动预算，纯逻辑测试和宽屏保持原有上限。
export function groundCacheLimit(){return globalThis.matchMedia?.('(pointer: coarse), (max-width: 600px)').matches?MOBILE_GROUND_CACHE_LIMIT:GROUND_CACHE_LIMIT;}

// 返回可见周期镜像的块坐标，地图尾块使用实际尺寸，避免循环接缝错位。
export function groundTiles(view) {
  const result = [];
  for (let wy = Math.floor(view.y / WORLD.height); wy <= Math.floor((view.y + view.h) / WORLD.height); wy++)
    for (let wx = Math.floor(view.x / WORLD.width); wx <= Math.floor((view.x + view.w) / WORLD.width); wx++) {
      const ox = wx * WORLD.width, oy = wy * WORLD.height;
      const left = Math.max(0, Math.floor((view.x - ox) / GROUND_TILE_SIZE));
      const right = Math.min(Math.ceil(WORLD.width / GROUND_TILE_SIZE) - 1,
        Math.floor((view.x + view.w - ox) / GROUND_TILE_SIZE));
      const top = Math.max(0, Math.floor((view.y - oy) / GROUND_TILE_SIZE));
      const bottom = Math.min(Math.ceil(WORLD.height / GROUND_TILE_SIZE) - 1,
        Math.floor((view.y + view.h - oy) / GROUND_TILE_SIZE));
      for (let row = top; row <= bottom; row++)
        for (let col = left; col <= right; col++) {
          const x = col * GROUND_TILE_SIZE, y = row * GROUND_TILE_SIZE;
          result.push({ key: `${col}:${row}`, x, y, ox, oy,
            w: Math.min(GROUND_TILE_SIZE, WORLD.width - x),
            h: Math.min(GROUND_TILE_SIZE, WORLD.height - y) });
        }
    }
  return result;
}

// 预热覆盖一个屏幕的移动距离；近景也至少保留一圈地块，环面边缘仍由原选块器去重。
export function groundWarmView(view) {
  const x = Math.max(GROUND_TILE_SIZE, view.w), y = Math.max(GROUND_TILE_SIZE, view.h);
  return { x: view.x - x, y: view.y - y, w: view.w + x * 2, h: view.h + y * 2 };
}

// 释放被淘汰画布的像素存储，不等待浏览器回收离屏位图。
function release(tile) {
  for (const canvas of [tile.day, tile.night, tile.fromDay, tile.fromNight])
    if (canvas) { canvas.width = 1; canvas.height = 1; }
}

export class GroundCache {
  // 构造时不创建整图或预热远处地形，先保证手机尽快进入首帧。
  constructor(mapId = 'forest', cacheLimit = groundCacheLimit()) {
    this.mapId = mapId;
    this.winter = false;
    this.season = 'summer';
    this.tiles = new Map();
    this.builds = 0;
    this.hits = 0;
    this.baseLimit = cacheLimit;this.limit = cacheLimit;
    this.pending = [];
    this.work = null;
    this.warmBuilds = this.syncMisses = this.slices = this.maxSliceMs = 0;
    this.missReasons = {}; this.missSamples = []; this.removed = new Map();
    this.buildMs = this.completedWork = this.maxWorkMs = 0;
    this.lastInvalidation = null;
    this.mapPreview = new MapPreviewCache();
  }
  // 设施搬迁后释放包含旧庭院的分块，下次绘制使用新的正式锚点。
  invalidateCampLayout(){this.noteInvalidation('camp-layout');this.cancelWarmup();for(const tile of this.tiles.values())release(tile);this.tiles.clear();}
  // 地图切换立即释放旧分块，避免两张地图共用坐标键或累积像素内存。
  setMap(mapId = 'forest') {
    if (this.mapId === mapId) return;
    this.removed.clear(); this.noteInvalidation('map');
    this.cancelWarmup();
    for (const tile of this.tiles.values()) release(tile);
    this.tiles.clear();
    this.mapId = mapId;
  }
  // 消防清场与旧建筑地面投影共用遮罩；切换才释放缓存，不保留第二套地图纹理。
  setSceneryMask(arena = null) {
    const key=arena?`${arena.x}:${arena.y}:${arena.radius}`:'';
    if(key===(this.sceneryMaskKey||''))return;
    this.noteInvalidation('scenery-mask');
    this.cancelWarmup();for(const tile of this.tiles.values())release(tile);this.tiles.clear();
    this.sceneryMaskKey=key;this.sceneryMask=arena?{x:arena.x,y:arena.y,radius:arena.radius+220}:null;
  }
  // 季节只改变森林表现；过渡期间保留来源快照，结束立即释放来源像素。
  setSeason(season, transition = null) {
    const next = this.mapId === 'jiuzhaigou' ? 'summer' : ['spring','autumn','winter'].includes(season) ? season : 'summer';
    const winter = next === 'winter';
    const state = this.mapId === 'jiuzhaigou' ? null : transition;
    const revision = state?.revision ?? null;
    if (next === this.season && revision === (this.transition?.revision ?? null) && state?.from === this.transition?.from) {
      if (this.transition?.active && !state?.active) this.cancelWarmup();
      this.transition = state;
      if (!state?.active) for (const tile of this.tiles.values()) {
        releaseRaster(tile.fromDay); releaseRaster(tile.fromNight); tile.fromDay = tile.fromNight = null;
      }
      return;
    }
    this.transition = state;
    this.noteInvalidation('season');
    this.cancelWarmup();
    for (const tile of this.tiles.values()) release(tile);
    this.tiles.clear();
    this.winter = winter;
    this.season = next;
  }
  // 取消未完成任务并释放其私有画布，不触碰当前已发布的纹理。
  cancelWarmup() {
    this.work?.steps.return(); this.work = null; this.pending = []; this.lastView = null; this.direction = null;
  }
  // 有界记录已释放块的直接原因，后续报告区分换季、地图、淘汰和夜景未就绪。
  noteRemoved(key, reason) {
    this.removed.delete(key); this.removed.set(key, reason);
    if (this.removed.size > 256) this.removed.delete(this.removed.keys().next().value);
  }
  // 只记录真正存在的旧块；首次访问的新块不会被误判为换季清空。
  noteInvalidation(reason) {
    this.lastInvalidation = { reason, at: performance.now(), count: this.tiles.size };
    for (const key of this.tiles.keys()) this.noteRemoved(key, reason);
  }
  // 累计实际执行耗时，不把分帧之间等待下一次RAF的时间算作构建CPU耗时。
  completeWork(work) {
    const ms = work.ms || 0;
    this.completedWork++; this.buildMs += ms; this.maxWorkMs = Math.max(this.maxWorkMs, ms);
  }
  // 新任务始终独占一块工作画布；完整绘制结束后才原子替换正式缓存。
  startWork(spec, night = 1) {
    const surfaces = new Set();
    this.work = { spec, night, surfaces, ms: 0, steps: buildGroundTile(spec, this.mapId, this.season,
      this.transition, this.tiles.get(spec.key), night, surfaces, this.sceneryMask) };
  }
  // 发布时沿用来源层生命周期；季节过渡已结束就立即释放多余来源纹理。
  publish(tile, spec) {
    if (!this.transition?.active) {
      releaseRaster(tile.fromDay); releaseRaster(tile.fromNight); tile.fromDay = tile.fromNight = null;
    }
    if (!this.tiles.has(spec.key)) this.builds++;
    this.removed.delete(spec.key);
    this.tiles.delete(spec.key); this.tiles.set(spec.key, tile);
  }
  // 同步需求继续同一未完成任务；不可用半成品、空白或低分辨率纹理遮掩未命中。
  get(spec, night) {
    let tile = this.tiles.get(spec.key);
    if (!tile || night > 0 && !tile.night) {
      this.syncMisses++;
      const reason = tile ? 'night' : this.removed.get(spec.key) || 'cold';
      const sample = { at: performance.now(), key: spec.key, mapId: this.mapId, season: this.season,
        reason, preparing: this.work?.spec.key === spec.key, night: night > 0, ms: 0 };
      this.missReasons[reason] = (this.missReasons[reason] || 0) + 1;
      // 临时补建可见块时保留其他块的预热进度，避免每次转向都丢弃已完成的工作。
      const suspended = this.work?.spec.key !== spec.key ? this.work : null;
      if (this.work?.spec.key !== spec.key) this.startWork(spec, night);
      const work = this.work, start = performance.now();
      try {
        let result; do { result = work.steps.next(); } while (!result.done);
        sample.ms = performance.now() - start; work.ms = (work.ms || 0) + sample.ms;
        this.completeWork(work); tile = result.value; this.publish(tile, spec);
      } finally {
        this.work = suspended;
        this.missSamples.push(sample); if (this.missSamples.length > 40) this.missSamples.shift();
      }
      // 预热任务可能只请求白天，但同步调用已经需要夜色。
      if (night > 0 && !tile.night) return this.get(spec, night);
    } else this.hits++;
    this.tiles.delete(spec.key); this.tiles.set(spec.key, tile);
    return tile;
  }
  // 将可见缺块放最前，再按距离和方向准备四周一屏；超广角仍限制远处预热量。
  prepare(view, night = 1) {
    this.requiredNight = night > 0;
    const visible = groundTiles(view), seen = new Set(), desired = [];
    this.limit = Math.max(this.baseLimit, new Set(visible.map(spec => spec.key)).size);
    const warmLimit = this.limit;
    const dx = this.lastView ? view.x - this.lastView.x : 0, dy = this.lastView ? view.y - this.lastView.y : 0;
    if (Math.hypot(dx, dy) > .01 && Math.hypot(dx, dy) < GROUND_TILE_SIZE) {
      const length = Math.hypot(dx, dy); this.direction = { x: dx / length, y: dy / length };
    }
    this.lastView = { x: view.x, y: view.y };
    const leadX = (this.direction?.x || 0) * GROUND_TILE_SIZE, leadY = (this.direction?.y || 0) * GROUND_TILE_SIZE;
    // 先按离视野的距离排序，再偏向镜头运动前方；右/下边不再被固定行优先队列饿死。
    const distance = spec => {
      const x = spec.x + spec.ox, y = spec.y + spec.oy;
      const gapX = Math.max(view.x - x - spec.w, x - view.x - view.w, 0);
      const gapY = Math.max(view.y - y - spec.h, y - view.y - view.h, 0);
      const aheadX = x + spec.w / 2 - view.x - view.w / 2;
      const aheadY = y + spec.h / 2 - view.y - view.h / 2;
      return Math.hypot(gapX, gapY) - (aheadX * leadX + aheadY * leadY) / Math.max(view.w, view.h);
    };
    const halo = groundTiles(groundWarmView(view));
    halo.sort((a, b) => distance(a) - distance(b));
    const candidates = visible.concat(halo);
    for (const spec of candidates) {
      if (seen.has(spec.key)) continue;
      seen.add(spec.key); desired.push(spec);
      if (desired.length >= warmLimit) break;
    }
    this.desired = new Set(desired.map(spec => spec.key));
    this.warmCoverage = { requested: new Set(candidates.map(spec => spec.key)).size, selected: desired.length,
      dayBytes: desired.reduce((sum, spec) => sum + (spec.w + PAD * 2) * (spec.h + PAD * 2) * 4, 0) };
    if (this.work && !this.desired.has(this.work.spec.key)) { this.work.steps.return(); this.work = null; }
    // 白天先铺完相邻块，再补夜色，避免新路面等待当前看不见的夜景读回。
    // 夜间仍完整构建昼夜两层，初次入场的默认行为也保持不变。
    const missing = desired.filter(spec => !this.tiles.get(spec.key)?.night && spec.key !== this.work?.spec.key);
    this.pending = night > 0 ? missing.map(spec => ({...spec, night:1})) : [
      ...missing.filter(spec => !this.tiles.has(spec.key)).map(spec => ({...spec, night:0})),
      ...missing.filter(spec => this.tiles.has(spec.key)).map(spec => ({...spec, night:1})),
    ];
    this.trim();
  }
  // 优先淘汰视野和预热圈之外的旧块；不会为预热牺牲当前可见纹理。
  trim() {
    while (this.tiles.size > this.limit) {
      const key = [...this.tiles.keys()].find(key => !this.desired?.has(key)) ?? this.tiles.keys().next().value;
      this.noteRemoved(key, 'evicted');
      release(this.tiles.get(key)); this.tiles.delete(key);
    }
  }
  // 当前光照所需的新地块不能一直等忙帧的剩余预算；额外夜色则继续只用空余时间。
  needsWarmup() {
    const needed = spec => { const tile = this.tiles.get(spec.key); return !tile || this.requiredNight && !tile.night; };
    return !!(this.work && needed(this.work.spec)) || this.pending.some(needed);
  }
  // 在调用者给出的时间预算内推进若干步骤；不可分割的一步允许小幅超支并如实记录。
  advance(budget = 2, now = () => performance.now(), maxSteps = 256) {
    if (!(budget > 0)) return;
    const start = now(); let count = 0;
    while (count < maxSteps && now() - start < budget) {
      if (!this.work) {
        const spec = this.pending.shift(); if (!spec) break;
        const night = spec.night ?? 1, tile = this.tiles.get(spec.key);
        if (tile && (!night || tile.night)) continue;
        this.startWork(spec, night);
      }
      const work = this.work, stepStart = performance.now();
      const result = work.steps.next(); work.ms = (work.ms || 0) + performance.now() - stepStart; count++;
      if (result.done) {
        this.completeWork(work);
        this.publish(result.value, this.work.spec); this.work = null; this.warmBuilds++; this.trim();
      }
    }
    if (count) { this.slices++; this.maxSliceMs = Math.max(this.maxSliceMs, now() - start); }
  }
  // 首次入场只等可见块的完整昼夜纹理，周围块继续在后续空余帧预热。
  ready(view) { return groundTiles(view).every(spec => this.tiles.get(spec.key)?.night); }
  // 加载进度只计算可见块已发布的昼夜纹理，不计远处后台预热或半成品画布。
  readiness(view){
    const keys=new Set(groundTiles(view).map(spec=>spec.key));let done=0;
    for(const key of keys){const tile=this.tiles.get(key);done+=Number(!!tile?.day)+Number(!!tile?.night);}
    return keys.size?done/(keys.size*2):1;
  }
  // 离开应用时释放缓存与未完成任务，重挂载不会留下离屏纹理。
  dispose() { this.cancelWarmup(); for (const tile of this.tiles.values()) release(tile); this.tiles.clear(); this.mapPreview.dispose(); }
  // 仅绘制视野内块，不把全地图纹理作为 CanvasPattern 每帧提交。
  draw(c, view, night) {
    const specs = groundTiles(view);
    // 广角至少容纳当前可见块，避免每帧淘汰又重建；上限不超过单张循环地图。
    this.limit = Math.max(GROUND_CACHE_LIMIT, new Set(specs.map(spec => spec.key)).size);
    for (const spec of specs) {
      const tile = this.get(spec, night);
      const progress = this.transition?.progress ?? 1;
      c.globalAlpha = 1;
      drawAlignedTile(c, night >= 1 ? mixRaster(tile.fromNight,tile.night,progress) : mixRaster(tile.fromDay,tile.day,progress), PAD,
        spec.x + spec.ox, spec.y + spec.oy, spec.w, spec.h);
      if (night > 0 && night < 1) {
        c.globalAlpha = night;
        drawAlignedTile(c, mixRaster(tile.fromNight,tile.night,progress), PAD, spec.x + spec.ox, spec.y + spec.oy, spec.w, spec.h);
      }
    }
    c.globalAlpha = 1;
    this.prepare(view, night);
  }
  // 总览参数独立传入，打开地图不能清空战场地块或重置正在进行的季节过渡。
  drawMap(c, width, height, options = { mapId: this.mapId, season: this.season }) {
    return this.mapPreview.draw(c, width, height, options);
  }
  // 返回缓存实际像素大小及命中情况，供手机报告对比。
  stats() {
    let bytes = 0;
    for (const tile of this.tiles.values())
      for (const canvas of [tile.day, tile.night, tile.fromDay, tile.fromNight])
        if (canvas) bytes += canvas.width * canvas.height * 4;
    const pendingBytes = [...(this.work?.surfaces || [])].reduce((sum, c) => sum + c.width * c.height * 4, 0);
    return { mapPreview: this.mapPreview.stats(), pendingBytes, pending: this.pending.length + Number(!!this.work), warmBuilds: this.warmBuilds,
      warmCoverage: this.warmCoverage, missReasons: { ...this.missReasons }, missSamples: this.missSamples.map(sample => ({ ...sample })),
      lastInvalidation: this.lastInvalidation, buildMs: this.buildMs, completedWork: this.completedWork, maxWorkMs: this.maxWorkMs,
      syncMisses: this.syncMisses, slices: this.slices, maxSliceMs: this.maxSliceMs, season: this.season, winter: this.winter, count: this.tiles.size, limit: this.limit, bytes, builds: this.builds, hits: this.hits };
  }
}
