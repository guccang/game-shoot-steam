import {TOWN_SHIFT_X} from '../config/town-layout.js';
// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { groundDetails } from '../world/ground-details.js';
import { consumeDrawSteps } from './draw-steps.js';
import { drawSeasonGround } from './season-ground.js';
import { drawNaturalGround } from './natural-terrain.js';
import { drawLandscapeGround } from './landscape-ground.js';
import { excludesNaturalScenery } from '../world/natural-terrain.js';
import { WORLD } from '../world/coordinates.js';
import { drawBiomeGroundSteps, drawGardenDetails } from './forest-art.js';
import { drawRiverGroundSteps } from './river.js';
import { isWaterScenery } from '../world/river-geometry.js';
import { pathDistance } from '../world/biomes.js';
import { oval, poly } from './primitives.js';
import { artSampleWeight } from './art-sample.js';
import { drawSceneryGround } from './scenery.js';
import { isBeachScenery } from '../world/scenery.js';

// 地形绘画沿用原始随机种子和图元，分块仅裁剪范围，不改变地图布局。

// 地面细节在边缘保留扩展区，跨块小花和草叶不会被漏画。
// 共用绘制与动作输入，风格差异由配置提供。
function inside(x, y, view, margin) {
  return (
    !view ||
    (x >= view.x - margin && x <= view.x + view.w + margin && y >= view.y - margin && y <= view.y + view.h + margin)
  );
}
// 共用绘制与动作输入，风格差异由配置提供。
export function paintGround(c, view = null, winter = false, season = 'summer') {
  consumeDrawSteps(paintGroundSteps(c, view, winter, season)); // 同步入口完整执行同一绘制序列。
}
// 共用绘制与动作输入，风格差异由配置提供。
export function* paintGroundSteps(c, view = null, winter = false, season = 'summer', sceneryMask = null) {
  c.fillStyle = '#bdd08c';
  c.fillRect(0, 0, WORLD.width, WORLD.height);
  yield* drawBiomeGroundSteps(c, view, winter, season);
  yield 'biome';
  yield* drawRiverGroundSteps(c, winter, view);
  yield 'river';
  drawLandscapeGround(c, view, undefined, winter, season);
  drawNaturalGround(c, view, winter);
  yield 'landscape';
  for (const { x, y, index: i } of groundDetails(view, 'grass')) {
    if (i % 128 === 0) yield;
    if (
      (winter && i % 35 !== 0) ||
      !inside(x, y, view, 8) ||
      isWaterScenery(x, y) ||
      isBeachScenery(x, y) ||
      excludesNaturalScenery(x, y) ||
      pathDistance(x, y) < 33
    )
      continue;
    if (
      style.groundArt.fineGrass
        ? artSampleWeight(x, y) > 0.2 && i % 5 !== 0
        : i % (artSampleWeight(x, y) > 0.2 ? 7 : 4) !== 0
    )
      continue;
    c.strokeStyle = style.groundArt.fineGrass ? (i % 3 ? '#8fa96a66' : '#eff0be7a') : '#80a565';
    c.lineWidth = style.groundArt.grassStrokeWidth;
    // 细节开关只控制局部绘制，保留共同分层与动作输入。
    if (!style.groundArt.fineGrass) {
      c.lineCap = 'round';
    }
    c.beginPath();
    c.moveTo(x - 3, y - 2);
    // 细节开关只控制局部绘制，保留共同分层与动作输入。
    if (!style.groundArt.fineGrass) {
      c.quadraticCurveTo(x - 2, y - 1, x - 2, y + 2);
      c.moveTo(x + 2, y + 2);
    }
    c.lineTo(style.groundArt.fineGrass ? x : x + 2, style.groundArt.fineGrass ? y + 2 : y - 4);
    // 细节开关只控制局部绘制，保留共同分层与动作输入。
    if (style.groundArt.fineGrass) {
      c.lineTo(x + 1, y - 5);
    }
    c.moveTo(style.groundArt.fineGrass ? x : x + 6, y + 2);
    // 细节开关只控制局部绘制，保留共同分层与动作输入。
    if (style.groundArt.fineGrass) {
      c.lineTo(x + 4, y - 1);
    } else {
      c.quadraticCurveTo(x + 6, y, x + 7, y - 1);
    }
    c.stroke();
  }
  for (const { x, y, index: i } of groundDetails(view, 'flowers')) {
    if (i % 64 === 0) yield;
    if (
      winter ||
      season === 'autumn' ||
      (season === 'summer' && i % 4 !== 0) ||
      (season === 'spring' && i % 2 !== 0) ||
      !inside(x, y, view, 8) ||
      isWaterScenery(x, y) ||
      isBeachScenery(x, y) ||
      excludesNaturalScenery(x, y) ||
      pathDistance(x, y) < 33
    )
      continue;
    if (artSampleWeight(x, y) > 0.2 && i % 4 !== 0) continue;
    if (i % 3 === 0) {
      oval(c, x, y, 3, 2, '#9bab77');
      oval(c, x - 1, y - 1, 2, 1, '#dbe0b0');
    } else {
      c.fillStyle = i % 2 ? '#f5eed1' : '#e6d095';
      for (let p = 0; p < 5; p++) {
        c.beginPath();
        c.arc(x + Math.cos(p * 1.26) * 2.3, y + Math.sin(p * 1.26) * 2.3, 1.8, 0, 7);
        c.fill();
      }
      oval(c, x, y, 1, 1, '#c69c50');
    }
  }
  drawGardenDetails(c, null, view, winter, season);
  yield 'garden';
  if (!winter) drawSeasonGround(c, view, season);
  yield 'season';
  c.save();
  if (sceneryMask) {
    c.beginPath();
    c.rect(0, 0, WORLD.width, WORLD.height);
    c.moveTo(sceneryMask.x + sceneryMask.radius, sceneryMask.y);
    c.arc(sceneryMask.x, sceneryMask.y, sceneryMask.radius, 0, Math.PI * 2);
    c.clip('evenodd');
  }
  drawSceneryGround(c);
  c.restore();
  for (const [x, y] of [
    // 小田路口的大石移到西侧草地，主路与田牌前保持空旷。
    [570+TOWN_SHIFT_X, 605],
    [1090+TOWN_SHIFT_X, 930],
    [1140, 520],
    // 工坊门前留给专属车位，原小石移到屋侧空地。
    [610+TOWN_SHIFT_X, 500],
    [1000+TOWN_SHIFT_X, 1060],
  ]) {
    oval(c, x, y, 23, 10, '#41583420');
    poly(
      c,
      [
        [x - 20, y],
        [x - 15, y - 22],
        [x + 3, y - 30],
        [x + 19, y - 13],
        [x + 17, y + 2],
      ],
      style.groundArt.paintGroundStepsColor,
      style.groundArt.paintGroundStepsColor2,
      style.groundArt.paintGroundStepsValue,
    );
    poly(
      c,
      [
        [x - 15, y - 22],
        [x + 3, y - 30],
        [x + 9, y - 12],
        [x - 3, y - 8],
      ],
      style.groundArt.paintGroundStepsColor3,
      null,
    );
  }
}
