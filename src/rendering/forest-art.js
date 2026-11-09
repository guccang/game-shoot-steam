import {plant} from './forest-floor-plants.js';
import {drawCanopyShadow} from './scene-depth.js';
// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { consumeDrawSteps } from './draw-steps.js';
import { excludesNaturalScenery } from '../world/natural-terrain.js';
import { isWaterScenery, BRIDGE } from '../world/river-geometry.js';
import { pathDistance, FOREST_BIOME_ANCHORS, terrainNoise, biomeAt } from '../world/biomes.js';
import { drawSoftRoadsSteps } from './road-art.js';
import { treeSway } from '../physics/motion.js';
import { drawTreeSprite } from './tree-art.js';
import { WORLD } from '../world/coordinates.js';
import { inCampComposition } from '../world/forest-clearings.js';
import { artSampleWeight } from './art-sample.js';
import { drawSampleMeadow, drawTerrainPatches } from './sample-ground.js';
import { nightColor } from './river.js';
import { drawWinterMeadow, snowDrift } from './winter-art.js';
import {drawHabitatGround} from './habitat-ground.js';
import { isBeachScenery } from '../world/scenery.js';

// 参考 game-slg 的花园美术：暖木、冷石、层叠树冠与成簇植物，保持二维矢量资产独立。

// 椭圆色块用于树冠簇、苔藓与环境阴影。
// 共用绘制与动作输入，风格差异由配置提供。
function ellipse(c, x, y, rx, ry, fill) {
  c.fillStyle = fill;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawForestShadow(c, tree, night = 0, winter = false, season = 'summer') {
  c.save();
  c.translate(tree.x, tree.y);
  c.scale(tree.size, tree.size);
  // 雪根与落叶沿连续昼夜权重混色，切换到夜晚不会在中点跳色。
  const color = (hex) => nightColor(hex, night);
  if (winter) {
    c.save();
    c.globalAlpha *= Number(winter);
    snowDrift(c, -6, 4, 29, 8, color);
    c.restore();
  }
  c.restore();
  drawCanopyShadow(c,tree,night);
}
// 共用绘制与动作输入，风格差异由配置提供。
export function campCanopyAlpha(tree, player) {
  if (!player || (!tree.woodland && !inCampComposition(tree.x, tree.y))) return 1;
  const size = tree.size || 1,
    dx = Math.abs(player.x - tree.x);
  const depth = tree.y - player.y;
  const horizontal = Math.max(0, Math.min(1, (65 * size - dx) / 22));
  const vertical = Math.max(0, Math.min(1, (depth + 8) / 20, (145 * size - depth) / 25));
  return 1 - 0.68 * horizontal * vertical;
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawForestTree(
  c,
  tree,
  time,
  night,
  reduced,
  warmth = 0,
  player = null,
  winter = false,
  season = 'summer',
  transition = null,
  gust = 0,
) {
  c.save();
  c.globalAlpha *= campCanopyAlpha(tree, player);
  c.translate(tree.x, tree.y);
  c.scale(tree.size, tree.size);
  c.rotate(reduced ? 0 : treeSway(tree, time));
  // 以树根为原点逐高偏移，树顶承风，接地位置稳定。
  if (gust && !reduced) c.transform(1, 0, gust * .115, 1, 0, 0);
  drawTreeSprite(c, tree, night, warmth, winter, season, transition);
  if (tree.flash) {
    c.globalAlpha = (tree.flash / 0.13) * 0.45;
    ellipse(c, 0, -60, 22, 28, '#fff2c8');
  }
  c.restore();
  if (tree.hp < tree.maxHp) {
    c.fillStyle = '#425c3b';
    c.fillRect(tree.x - 19, tree.y - 124 * tree.size, 38, 4);
    c.fillStyle = '#b9cf79';
    c.fillRect(tree.x - 18, tree.y - 124 * tree.size + 1, 36 * Math.max(0, tree.hp / tree.maxHp), 2);
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawGardenDetails(c, rand, view = null, winter = false, season = 'summer') {
  // 每片林下只使用本地植物，沿林缘成簇分布，主路保持干净。
  for (const zone of FOREST_BIOME_ANCHORS)
    for (let group = 0; group < (winter ? 0 : style.forestArt.gardenSpacing); group++) {
      const a = group * 2.399,
        r = 100 + terrainNoise(group, zone.level) * 520,
        cx = zone.x + Math.cos(a) * r,
        cy = zone.y + Math.sin(a) * r;
      for (let n = 0; n < 2; n++) {
        const x = cx + Math.cos(n * 2.4) * n * 9,
          y = cy + Math.sin(n * 2.4) * n * 7;
        if (view && (x < view.x - 35 || x > view.x + view.w + 35 || y < view.y - 35 || y > view.y + view.h + 35))
          continue;
        if (biomeAt(x, y).id !== zone.id) continue;
        if (artSampleWeight(x, y) > 0.2 && n > 0) continue;
        if (!excludesNaturalScenery(x, y) && !isWaterScenery(x, y) && !isBeachScenery(x, y) && pathDistance(x, y) > 35)
          plant(
            c,
            x,
            y,
            season === 'summer' ? 0 : season === 'autumn' ? 1 : zone.id === 'meadow' ? 2 : zone.id === 'amber' ? 1 : 0,
            0.7 + terrainNoise(x, y) * 0.4,
          );
      }
    }
  for (const side of [-1, 1])
    for (let i = 0; i < 3; i++) {
      const x = side < 0 ? BRIDGE.x - 16 - i * 22 : BRIDGE.x + BRIDGE.width + 16 + i * 22;
      ellipse(c, x, BRIDGE.y + BRIDGE.height / 2, 11, 7, '#d4d0ac');
    }
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawBiomeGround(c, view = null, winter = false, season = 'summer') {
  consumeDrawSteps(drawBiomeGroundSteps(c, view, winter, season)); // 同步预览执行同一绘制序列。
}
// 共用绘制与动作输入，风格差异由配置提供。
export function* drawBiomeGroundSteps(c, view = null, winter = false, season = 'summer') {
  c.fillStyle = style.forestArt.grass;
  c.fillRect(0, 0, WORLD.width, WORLD.height);
  if(!winter)drawHabitatGround(c,false);
  for (const zone of FOREST_BIOME_ANCHORS)
    for (const ox of [-WORLD.width, 0, WORLD.width])
      for (const oy of [-WORLD.height, 0, WORLD.height]) {
        const x = zone.x + ox,
          y = zone.y + oy;
        if (
          view &&
          (x + 1300 < view.x || x - 1300 > view.x + view.w || y + 1300 < view.y || y - 1300 > view.y + view.h)
        )
          continue;
        const g = c.createRadialGradient(x, y, 60, x, y, 1300);
        g.addColorStop(0, style.forestArt.softGroundOverlay ? zone.color : zone.color + '60');
        g.addColorStop(1, zone.color + '00');
        c.fillStyle = g;
        c.fillRect(x - 1300, y - 1300, 2600, 2600);
        yield;
      }
  drawSampleMeadow(c, view);
  yield;
  drawTerrainPatches(c, view);
  yield;
  if (!winter && ['spring', 'summer', 'autumn'].includes(season)) {
    // 季节只轻染底色，保留草甸与林下的明暗差，不用大面积浅色覆盖压平地形。
    c.fillStyle = season === 'spring' ? '#c9e3a020' : season === 'summer' ? style.forestArt.groundGlaze : '#dfb96b38';
    c.fillRect(0, 0, WORLD.width, WORLD.height);
  }
  if (winter) {drawWinterMeadow(c, view);drawHabitatGround(c,true);}
  yield;
  yield* drawSoftRoadsSteps(c, view);
}
