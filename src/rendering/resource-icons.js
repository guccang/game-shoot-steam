import {ERA_RESOURCES} from '../config/vehicle-eras.js';
import { i18nHtml, i18nText } from "../i18n/index.js";
// 资源美术共用矢量轮廓：DOM 输出 SVG，战场使用缓存 Path2D，无外部图片和字体图标依赖。
import { MATERIALS } from '../config/materials.js';

// 每层轮廓采用同一套深绿描边与柔和配色，缩小后仍保留不同剪影。
function shape(d, fill, stroke = '#46604a', width = 2.5) {
  return { d, fill, stroke, width };
}
export const RESOURCE_ART = {
  ...Object.fromEntries([['copper','#ca9367'],['iron','#9ba8a2'],['rareMetal','#a69bc8']].map(([key,color])=>[key,[shape('M5 39 16 23 40 16 58 28 51 43 23 50Z',color),shape('M7 39 23 43 54 29M23 43 23 49','none','#586353',2)]])),
  draftHorse:[shape('M15 53 18 32 26 20 25 8 34 17 42 11 42 23 53 38 48 45 34 42 30 54Z','#c39463'),shape('M24 27 17 32 21 19 26 17','#785a48'),shape('M38 30h2','none','#4e503d',3)],
  coins: [
    shape('M8 34A24 24 0 1 0 56 34A24 24 0 1 0 8 34', '#c59843'),
    shape('M8 28A24 24 0 1 0 56 28A24 24 0 1 0 8 28', '#f3cf6b'),
    shape('M14 28A18 18 0 1 0 50 28A18 18 0 1 0 14 28', '#e9b956', '#d5a24b', 2),
    shape('M32 14Q35 25 44 28Q35 31 32 42Q29 31 20 28Q29 25 32 14Z', '#9c7037', '#9c7037', 1),
    shape('M17 17Q21 12 27 11', 'none', '#fff0b7', 4),
  ],
  wood: [
    shape('M10 32 42 15Q53 12 58 23L59 37 26 53Z', '#8e704d'),
    shape('M7 25 39 9Q48 6 52 17L52 27 22 44Z', '#ac8757'),
    shape('M6 26Q13 19 22 28Q31 41 22 47Q12 51 6 39Q2 32 6 26Z', '#ecc58a'),
    shape('M11 29Q17 27 21 34Q26 42 19 43Q11 41 10 34', 'none', '#b58a56', 2),
    shape('M21 40 48 26Q57 22 60 33L60 40 33 57Z', '#ad8656'),
    shape('M20 41Q26 34 34 43Q42 54 34 58Q26 62 20 53Q16 46 20 41Z', '#f0cf95'),
    shape('M24 44Q29 41 33 48Q37 54 31 55Q24 52 24 47', 'none', '#ba8d58', 2),
    shape('M30 20 39 15M40 34 50 29', 'none', '#d2ac72', 3),
  ],
  parts: [
    shape('M25 6 39 6 41 15 48 19 57 17 62 29 55 35 54 43 59 50 48 59 40 53 32 54 26 61 14 55 16 46 11 39 3 37 4 23 13 21 18 15 18 8Z', '#8eaa91'),
    shape('M17 32A16 16 0 1 0 49 32A16 16 0 1 0 17 32', '#d7dec0'),
    shape('M25 32A8 8 0 1 0 41 32A8 8 0 1 0 25 32', '#526e5c'),
    shape('M23 12 34 11M9 27 12 26M48 48 51 46', 'none', '#e7edce', 3),
    shape('M40 40 53 37 60 46 56 57 44 60 36 51Z', '#dec783'),
    shape('M44 48 49 43 54 47 51 53 46 54Z', '#748a70', '#46604a', 2),
  ],
  crystal: [
    shape('M7 39 12 23 23 27 27 48 17 57Z', '#85bfc0'),
    shape('M42 27 54 20 61 37 49 55 38 45Z', '#79b1bb'),
    shape('M20 15 34 5 47 18 45 45 30 60 18 43Z', '#7ccdc8'),
    shape('M20 15 32 23 34 5 47 18 32 23 30 60 18 43Z', '#b7eee0', '#527c70', 1.8),
    shape('M32 23 47 18 45 45 30 60Z', '#5eaaa9', '#527c70', 1.8),
    shape('M24 18 24 32', 'none', '#f0fff0', 3),
    shape('M51 5 52 10 57 11 52 13 51 18 49 13 44 11 49 10Z', '#e5f4c8', 'none'),
  ],
  core: [
    shape('M32 5 53 17 58 40 43 58 20 58 6 40 11 17Z', '#c69a58'),
    shape('M32 11 48 21 52 38 40 51 23 51 12 38 16 21Z', '#f0d18d'),
    shape('M20 32A12 12 0 1 0 44 32A12 12 0 1 0 20 32', '#4e9c93'),
    shape('M32 20 39 30 32 44 25 30Z', '#a1e3c7', '#426c5d', 2),
    shape('M30 24 28 30', 'none', '#efffe0', 3),
    shape('M12 20 16 28M48 21 50 29M25 54 37 54', 'none', '#ffe8ab', 3),
    shape('M29 7 32 3 35 7 32 11Z', '#fff0af', '#6c7551', 1.5),
  ],
  bosses: [
    shape('M13 13Q32 6 51 13L49 38Q45 51 32 59Q19 51 15 38Z', '#8ba58a'),
    shape('M18 18Q32 12 46 18L44 37Q40 47 32 52Q24 47 20 37Z', '#d5dfb5'),
    shape('M20 25 27 30 32 19 37 30 44 25 41 40 23 40Z', '#e8be68'),
    shape('M26 44 38 44', 'none', '#6b8059', 3),
  ],
};

// 资源名称供屏幕阅读器、悬停提示和点击说明使用，避免仅靠颜色分辨。
export function resourceName(key) {
  return ERA_RESOURCES[key]?.name || MATERIALS[key]?.name || ({ coins: i18nText("balance.app.bbece6f829"), wood: i18nText("balance.app.30a9333b4f"), bosses: i18nText("balance.app.ba2b3bd76e") })[key] || '';
}

// 生成本地 SVG 图标；所有路径来自静态目录，没有用户输入或远程资源。
export function resourceIcon(key) {
  const shapes = RESOURCE_ART[key];
  if (!shapes) return '';
  return `<svg class="resource-art" data-resource-art="${key}" viewBox="0 0 64 64" role="img" aria-label="${resourceName(key)}"><title>${resourceName(key)}</title>${shapes.map(s =>
    `<path d="${s.d}" fill="${s.fill}" stroke="${s.stroke}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</svg>`;
}

// 可触摸的资源图标用于钱包与需求卡，数量放在按钮外，避免嵌套交互控件。
export function resourceButton(key) {
  return `<button class="resource-info-button" data-resource-info="${key}" title="${i18nHtml("rendering.resource-icons.7a3a2fe9b4", { p0: (resourceName(key)) })}" aria-label="${i18nHtml("rendering.resource-icons.342c359ab2", { p0: (resourceName(key)) })}">${resourceIcon(key)}</button>`;
}

// 价格紧凑展示为两个图标加数值，名称通过无障碍标签保留。
export function priceIcons(cost) {
  return `<span class="icon-price" aria-label="${i18nHtml("rendering.resource-icons.49a1bec1f5", { p0: (cost.coins), p1: (cost.wood) })}"><span>${resourceIcon('coins')}${cost.coins}</span><span>${resourceIcon('wood')}${cost.wood}</span></span>`;
}

const paths = new Map();
// 战场沿用相同轮廓；每种资源的 Path2D 只构建一次，不在每帧解析 SVG。
export function drawResourceIcon(c, key, x, y, size = 20) {
  if (!RESOURCE_ART[key]) return;
  if (!paths.has(key)) paths.set(key, RESOURCE_ART[key].map(s => ({ ...s, path: new Path2D(s.d) })));
  c.save();
  c.translate(x - size / 2, y - size / 2);
  c.scale(size / 64, size / 64);
  c.lineJoin = c.lineCap = 'round';
  for (const s of paths.get(key)) {
    if (s.fill !== 'none') { c.fillStyle = s.fill; c.fill(s.path); }
    if (s.stroke !== 'none') { c.strokeStyle = s.stroke; c.lineWidth = s.width; c.stroke(s.path); }
  }
  c.restore();
}
