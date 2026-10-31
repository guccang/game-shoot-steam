import {createRenderCanvas} from './canvas-recovery.js';
import {releaseArtCache} from '../art-styles/cache.js';
// 天气图集沿用怪物序列帧技术：本地预绘制、固定锚点、24 FPS 裁切，不在每帧生成电弧。
import { LIGHTNING_CLIP } from '../world/storm.js';
import { weatherNoise } from '../world/precipitation.js';
export const LIGHTNING_ATLAS = {
  width: 192,
  height: 336,
  columns: 6,
  variants: 3,
  anchor: [96, 309],
};
const lightningCache = new Map();
let rainCache;

// 浏览器恢复后重新生成雷电与雨滴图集，不继续引用已被清空的像素存储。
export function clearWeatherAtlas(){
 releaseArtCache(lightningCache);releaseArtCache(rainCache);rainCache=null;
}

// 创建透明离屏画布，模块导入时不访问 DOM。
function canvas(width, height) {
  const result = createRenderCanvas();
  result.width = width;
  result.height = height;
  return result;
}

// 固定种子生成主干与分叉，所有帧沿同一条放电通道生长，避免逐帧随机抖动。
function boltPaths(variant) {
  const main = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    main.push([
      128 +
        Math.sin(t * 9 + variant) * 27 * Math.sin(t * Math.PI) +
        (weatherNoise(i + variant * 71) - 0.5) * 39 * Math.sin(t * Math.PI),
      10 + t * 402,
    ]);
  }
  const paths = [{ points: main, width: 2, start: 0 }];
  for (const i of [4, 7, 10, 13, 16]) {
    const sign = (i + variant) % 2 ? 1 : -1,
      points = [main[i]];
    for (let j = 1; j <= 5; j++)
      points.push([
        main[i][0] +
          sign * j * (9 + weatherNoise(i + variant) * 5) +
          (weatherNoise(i * 17 + j) - 0.5) * 15,
        main[i][1] + j * 10 + weatherNoise(i + j) * 16,
      ]);
    paths.push({ points, width: 0.9, start: i / 20 });
    // 二级细叉形成树枝状放电，沿主分支延迟显现。
    paths.push({
      points: [
        points[2],
        [points[2][0] - sign * 12, points[2][1] + 15],
        [points[2][0] - sign * 9, points[2][1] + 26],
        [points[2][0] - sign * 22, points[2][1] + 43],
      ],
      width: 0.45,
      start: Math.min(0.9, i / 20 + 0.1),
    });
  }
  return paths;
}

// 三层描边形成散射光晕、蓝紫电离层和白色高亮芯，能量消退使用同一帧清单。
function paintBolt(c, paths, frame) {
  const energy = [
    0.08, 0.16, 0.3, 0.52, 0.82, 1, 0.95, 0.88, 0.77, 0.65, 0.53, 0.42, 0.32, 0.24, 0.17, 0.1, 0.04,
    0,
  ][frame];
  const growth = Math.min(1, (frame + 1) / 5);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.globalCompositeOperation = 'lighter';
  for (const path of paths) {
    if (growth < path.start) continue;
    const visible = Math.max(
      2,
      Math.ceil(path.points.length * Math.min(1, (growth - path.start) / (1 - path.start))),
    );
    for (const [width, color, alpha, blur] of [
      [12, '#596bff', 0.24, 18],
      [3.5, '#8ebcff', 0.6, 7],
      [1, '#f9fdff', 1, 2],
    ]) {
      c.strokeStyle = color;
      c.shadowColor = color;
      c.shadowBlur = blur;
      c.globalAlpha = energy * alpha;
      c.lineWidth = path.width * width;
      c.beginPath();
      path.points.slice(0, visible).forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.stroke();
    }
  }
  c.shadowBlur = 0;
  if (growth === 1 && energy > 0) {
    c.globalAlpha = energy * 0.8;
    const glow = c.createRadialGradient(128, 412, 0, 128, 412, 32);
    glow.addColorStop(0, '#fffbe5');
    glow.addColorStop(0.2, '#c4ddff');
    glow.addColorStop(1, '#789aff00');
    c.fillStyle = glow;
    c.fillRect(96, 380, 64, 64);
  }
}

// 最多缓存三种形状；一次生成 18 帧，约 14 MiB 总像素内存，不随闪电次数增长。
export function getLightningAtlas(variant = 0) {
  const key =
    ((variant % LIGHTNING_ATLAS.variants) + LIGHTNING_ATLAS.variants) % LIGHTNING_ATLAS.variants;
  if (lightningCache.has(key)) return lightningCache.get(key);
  const { width, height, columns } = LIGHTNING_ATLAS;
  const atlas = canvas(width * columns, height * Math.ceil(LIGHTNING_CLIP.frames / columns));
  const c = atlas.getContext('2d'),
    paths = boltPaths(key);
  for (let frame = 0; frame < LIGHTNING_CLIP.frames; frame++) {
    c.save();
    c.translate((frame % columns) * width, Math.floor(frame / columns) * height);
    c.beginPath();
    c.rect(0, 0, width, height);
    c.clip();
    c.scale(0.75, 0.75);
    paintBolt(c, paths, frame);
    c.restore();
  }
  lightningCache.set(key, atlas);
  return atlas;
}

// 雨滴尾迹与八帧水花复用小图集，透明渐变让雨丝有亮头、细尾和景深。
export function getRainAtlas() {
  if (rainCache) return rainCache;
  const streak = canvas(12, 96),
    c = streak.getContext('2d');
  const gradient = c.createLinearGradient(0, 0, 0, 96);
  gradient.addColorStop(0, '#c0dcff00');
  gradient.addColorStop(0.7, '#cce2f08a');
  gradient.addColorStop(1, '#f4fbffd9');
  c.fillStyle = gradient;
  c.beginPath();
  c.moveTo(6, 0);
  c.lineTo(7.4, 89);
  c.quadraticCurveTo(6, 101, 4.6, 89);
  c.closePath();
  c.fill();
  const splash = canvas(64 * 8, 40 * 2),
    s = splash.getContext('2d');
  for (let row = 0; row < 2; row++)
    for (let frame = 0; frame < 8; frame++) {
      const t = frame / 8;
      s.save();
      s.translate(frame * 64 + 32, row * 40 + 28);
      s.strokeStyle = `rgba(213,237,244,${(1 - t) * 0.75})`;
      s.lineWidth = 1;
      if (row === 0) {
        s.beginPath();
        s.ellipse(0, 0, 3 + t * 25, 1 + t * 7, 0, 0, Math.PI * 2);
        s.stroke();
      }
      for (let j = 0; j < 5; j++) {
        const dx = (j - 2) * (2 + t * 8),
          dy = -Math.sin(t * Math.PI) * (8 + (j % 2) * 6);
        s.beginPath();
        s.moveTo(dx, dy);
        s.lineTo(dx * 1.06, dy + 2.2);
        s.stroke();
      }
      s.restore();
    }
  rainCache = { streak, splash };
  return rainCache;
}
