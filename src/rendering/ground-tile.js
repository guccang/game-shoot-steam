import {createRenderCanvas} from './canvas-recovery.js';
// 完整地块的可中断构建器：图元、昼夜矩阵和季节权重均复用正式入口。
import { WORLD } from '../world/coordinates.js';
import { paintGroundSteps } from './ground-art.js';
import { paintJiuzhaigouSteps } from './jiuzhaigou.js';
import { prepareSeasonGroundSteps } from './season-ground.js';
import { nightTextureSteps } from './river.js';
import { releaseRaster } from './season-raster.js';
export const GROUND_PAD = 2;

// 未完成任务仅持有自己的画布，取消时不得释放已投入显示的旧纹理。
export function* buildGroundTile(spec, mapId, season, transition, old = null, night = 1, owned = new Set(), sceneryMask = null) {
  const tile = { day: null, night: null, fromDay: null, fromNight: null, ...old };
  let complete = false;
  // 每个周期边缘镜像沿用相同裁切与绘制顺序，只在内部步骤之间暂停。
  function* build(partSeason) {
    const canvas = createRenderCanvas(); owned.add(canvas);
    canvas.width = spec.w + GROUND_PAD * 2; canvas.height = spec.h + GROUND_PAD * 2;
    const c = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
    c.translate(GROUND_PAD - spec.x, GROUND_PAD - spec.y);
    const shifts = [[0, 0]];
    for (const dx of [-WORLD.width, 0, WORLD.width]) for (const dy of [-WORLD.height, 0, WORLD.height]) {
      if (!dx && !dy) continue;
      const x = spec.x - dx, y = spec.y - dy;
      if (x + spec.w + GROUND_PAD <= 0 || x - GROUND_PAD >= WORLD.width ||
          y + spec.h + GROUND_PAD <= 0 || y - GROUND_PAD >= WORLD.height) continue;
      shifts.push([dx, dy]);
    }
    for (const [dx, dy] of shifts) {
      c.save(); c.translate(dx, dy); c.beginPath(); c.rect(0, 0, WORLD.width, WORLD.height); c.clip();
      const view = { x: spec.x - dx - GROUND_PAD, y: spec.y - dy - GROUND_PAD, w: canvas.width, h: canvas.height };
      const painter = mapId === 'jiuzhaigou' ? paintJiuzhaigouSteps(c, view)
        : paintGroundSteps(c, view, partSeason === 'winter', partSeason, sceneryMask);
      for (const phase of painter) {
        // 一像素只读触发本批栅格化，避免 Canvas 延迟队列在夜色首次读回时集中结算。
        c.getImageData(0, 0, 1, 1); yield phase;
      }
      c.getImageData(0, 0, 1, 1);
      c.restore(); yield;
    }
    return canvas;
  }
  try {
    if (mapId !== 'jiuzhaigou') yield* prepareSeasonGroundSteps();
    if (!tile.day) tile.day = yield* build(season);
    if (transition?.active && !tile.fromDay) {
      const layers = Object.entries(transition.from).filter(([, weight]) => weight > 0);
      if (layers.length === 1 && layers[0][1] === 1) tile.fromDay = yield* build(layers[0][0]);
      else for (const [partSeason, weight] of layers) {
        const image = yield* build(partSeason);
        if (!tile.fromDay) {
          tile.fromDay = createRenderCanvas(); owned.add(tile.fromDay);
          tile.fromDay.width = image.width; tile.fromDay.height = image.height;
        }
        const c = tile.fromDay.getContext('2d'); c.globalCompositeOperation = 'lighter'; c.globalAlpha = weight;
        c.drawImage(image, 0, 0); releaseRaster(image); owned.delete(image); yield;
      }
    }
    if (night > 0 && !tile.night) { tile.night = yield* nightTextureSteps(tile.day, owned); owned.add(tile.night); }
    if (night > 0 && tile.fromDay && !tile.fromNight) { tile.fromNight = yield* nightTextureSteps(tile.fromDay, owned); owned.add(tile.fromNight); }
    complete = true; return tile;
  } finally {
    if (!complete) for (const canvas of owned) releaseRaster(canvas);
  }
}
