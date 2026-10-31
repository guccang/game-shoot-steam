// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { ART_SAMPLE, artSampleWeight } from './art-sample.js';
import { pathDistance, terrainNoise } from '../world/biomes.js';
import { isWaterScenery } from '../world/river-geometry.js';

// 营地样板的草甸大色面只在背景缓存构建时绘制，不增加逐帧细节遍历。

// 不规则草甸边界以连续曲线围合，大色块分出林荫、开阔草地和田边，不铺棋盘纹理。
// 共用绘制与动作输入，风格差异由配置提供。
export function meadowPatch(c, x, y, rx, ry, fill) {
  c.save();
  c.translate(x, y);
  c.scale(rx, ry);
  c.beginPath();
  c.moveTo(-1, -0.12);
  c.bezierCurveTo(-1.1, -0.6, -0.55, -0.98, -0.16, -0.8);
  c.bezierCurveTo(0.24, -1.08, 0.66, -0.74, 0.79, -0.43);
  c.bezierCurveTo(1.15, -0.29, 0.94, 0.34, 0.64, 0.49);
  c.bezierCurveTo(0.39, 0.98, -0.08, 0.83, -0.37, 0.67);
  c.bezierCurveTo(-0.87, 0.86, -1.15, 0.34, -1, -0.12);
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawTerrainPatches(c, view) {
  const patches = style.sampleGround.drawTerrainPatchesValue;
  for (const [x, y, rx, ry, fill] of patches) {
    if (
      view &&
      (x + rx * 1.2 < view.x ||
        x - rx * 1.2 > view.x + view.w ||
        y + ry * 1.2 < view.y ||
        y - ry * 1.2 > view.y + view.h)
    )
      continue;
    meadowPatch(c, x, y + 5, rx + 3, ry + 2, '#65995f38');
    meadowPatch(c, x, y, rx, ry, fill);
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawSampleMeadow(c, view) {
  const { x, y, rx, ry } = ART_SAMPLE;
  if (view && (view.x > x + rx || view.x + view.w < x - rx || view.y > y + ry || view.y + view.h < y - ry)) return;
  c.save();
  c.translate(x, y);
  c.scale(1, ry / rx);
  const light = c.createRadialGradient(0, 0, rx * 0.25, 0, 0, rx);
  light.addColorStop(0, style.sampleGround.drawSampleMeadowColor);
  light.addColorStop(0.65, style.sampleGround.drawSampleMeadowColor2);
  light.addColorStop(1, style.sampleGround.drawSampleMeadowColor3);
  c.fillStyle = light;
  c.fillRect(-rx, -rx, rx * 2, rx * 2);
  c.restore();
  for (let i = 0; i < style.sampleGround.drawSampleMeadowValue; i++) {
    const px = x - rx + terrainNoise(i, 321) * rx * 2;
    const py = y - ry + terrainNoise(i, 129) * ry * 2;
    const weight = artSampleWeight(px, py);
    if (weight < 0.1 || isWaterScenery(px, py) || pathDistance(px, py) < 58) continue;
    if (view && (px < view.x - 65 || px > view.x + view.w + 65 || py < view.y - 25 || py > view.y + view.h + 25))
      continue;
    c.save();
    c.globalAlpha = weight * 0.22;
    c.fillStyle = i % 3 ? '#62a075' : '#c5dc98';
    c.beginPath();
    c.ellipse(px, py, 22 + (i % 4) * 10, 7 + (i % 3) * 3, -0.25, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
}
