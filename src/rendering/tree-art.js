import {createRenderCanvas} from './canvas-recovery.js';
// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { releaseArtCache } from '../art-styles/cache.js';
import { seasonalLeafColor, drawSeasonCanopy } from './season-art.js';
import { nightColor } from './river.js';
import { drawSpeciesTree } from './tree-species.js';
import { drawSampleTree } from './tree-canopy.js';
import { SeasonAtlas } from './season-raster.js';

// 卡通树木图集：圆润轮廓、统一描边与三级平涂，和角色及怪物保持同一绘本风格。

const transitionAtlas = new SeasonAtlas();
const cache = new Map();
let activeSeason = null;
// 诊断只统计已生成图集，不触发预热，也不增加纹理内存。
// 共用绘制与动作输入，风格差异由配置提供。
export function treeAtlasStats() {
  const blended = transitionAtlas.stats();
  return { count: cache.size + blended.count, bytes: cache.size * 256 * 320 * 4 + blended.bytes };
}
// 图集保持原有脚底锚点与缓存规格，不改变碰撞、风摆和受击动画。
// 共用绘制与动作输入，风格差异由配置提供。
function buildSprite(paletteIndex, species, variant, night, winter, season) {
  const canvas = createRenderCanvas();
  canvas.width = 256;
  canvas.height = 320;
  const c = canvas.getContext('2d');
  c.scale(2, 2);
  c.translate(64, 145);
  const color = (hex) => {
    const leaf = seasonalLeafColor(hex, species, season);
    return night === true ? nightColor(leaf) : leaf;
  };
  if (['birch', 'willow', 'maple', 'cypress'].includes(species)) drawSpeciesTree(c, species, variant, color, winter);
  else drawSampleTree(c, paletteIndex, species === 'pine', variant, color, winter);
  drawSeasonCanopy(c, species, variant, season, (hex) => (night === true ? nightColor(hex) : hex));
  // 暖光图集只对已有树形着色，树冠外保持透明，避免矩形光斑。
  if (night === 'warm') {
    c.globalCompositeOperation = 'source-atop';
    const warmth = c.createLinearGradient(0, -130, 0, 5);
    warmth.addColorStop(0, '#ffce7910');
    warmth.addColorStop(0.65, '#ffce7960');
    warmth.addColorStop(1, '#ffe4a570');
    c.fillStyle = warmth;
    c.fillRect(-64, -145, 128, 160);
  }
  return canvas;
}

// 昼夜仅混合色板图像，不在每帧重新生成树冠。
// 共用绘制与动作输入，风格差异由配置提供。
export function drawTreeSprite(c, tree, night, warmth = 0, winter = false, season = 'original', transition = null) {
  if (!transition) transitionAtlas.clear();
  const next = winter ? 'winter' : season;
  // 只保留当前物候的树图集，连续随机切季不会常驻四倍解码内存。
  if (transition || activeSeason !== next) {
    for (const image of cache.values()) {
      image.width = 1;
      image.height = 1;
    }
    cache.clear();
    activeSeason = next;
  }
  const palette = Math.max(0, Math.min(3, tree.palette || 0)),
    species = tree.variant || 'round',
    variant = Math.abs(tree.id || 0) % (['round', 'pine'].includes(species) ? 6 : 2);
  // 昼夜与暖光分别复用静态端点，来源快照包含快速重定向前的叶色。
  const sprite = (lighting) => {
    const key = `${palette}:${species}:${variant}:${lighting}`;
    if (transition)
      return transitionAtlas.image(key, transition, (value) =>
        buildSprite(palette, species, variant, lighting, value === 'winter', value),
      );
    if (!cache.has(key)) cache.set(key, buildSprite(palette, species, variant, lighting, winter, next));
    return cache.get(key);
  };
  const alpha = c.globalAlpha;
  c.drawImage(sprite(false), -64, -145, 128, 160);
  if (night > 0) {
    c.globalAlpha = alpha * night;
    c.drawImage(sprite(true), -64, -145, 128, 160);
    c.globalAlpha = alpha;
  }
  if (warmth > 0.005) {
    c.globalAlpha = alpha * Math.min(0.85, warmth);
    c.drawImage(sprite('warm'), -64, -145, 128, 160);
    c.globalAlpha = alpha;
  }
}

// 切换风格时释放本风格派生位图，原始角色和图片不受影响。
// 共用绘制与动作输入，风格差异由配置提供。
export function clearArtStyleCache() {
  releaseArtCache(cache);
  transitionAtlas.clear();
  activeSeason = null;
}
