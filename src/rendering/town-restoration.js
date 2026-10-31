// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import {
  TOWN_RESTORATIONS,
  facilityOpen,
  RESTORATION_FLIGHT,
  RESTORATION_SECONDS,
} from '../config/town-restoration.js';
import { WORKSHOP } from '../world/workshop.js';
import { RANGER } from '../config/ranger-arrival.js';
import { nearest } from '../world/coordinates.js';
import { restorationLocation } from '../world/restoration-area.js';
import { riderPosition } from '../config/vehicle-rider.js';
import { box, oval, poly } from './primitives.js';
import { drawWorldSign } from './world-signs.js';
import { canvasFont } from './text-style.js';
import { drawFootballScoreboard } from './football-scoreboard.js';
import { drawRaceScoreboard } from './race-scoreboard.js';
import { drawActionCountdown } from './action-countdown.js';

// 未修复建筑保留旧屋结构；坐标、碰撞和脚底排序沿用原场景。

// 关联原实体，不在废墟下面叠画完整建筑；已解锁时交还原绘制器。
// 共用绘制与动作输入，风格差异由配置提供。
export function restorationForObject(item) {
  let id = null;
  if (item.type === 'scenery' && item.kind === 'garage') id = 'garage';
  else if (item.type === 'scenery' && item.kind === 'cottage' && !item.workshop) id = 'cottage';
  else if (item.type === 'realm-entrance') id = item.mode;
  else if (item.type === 'story-post')
    id = item.clearing ? 'clearing' : item.id === 'monster-neighbors' ? 'neighbors' : 'story';
  else if (item.type === 'camp-defense' && item.kind === 'marker') id = 'defense';
  else if (
    item.type === 'living-facility' &&
    ['camp', 'relay', 'kitchen', 'pottery', 'roost', 'market', 'flowers'].includes(item.id)
  )
    id = item.id === 'camp' ? 'story' : 'neighbors';
  else if (item.type === 'restoration-extra') id = item.id;
  const f = TOWN_RESTORATIONS.find((f) => f.id === id);
  return f
    ? {
        ...f,
        x: item.x,
        y: item.y,
        width: item.width || f.width,
        height: item.height || f.height,
        secondary: item.type === 'living-facility',
        extra: item.type === 'restoration-extra',
      }
    : null;
}
// 共用绘制与动作输入，风格差异由配置提供。
export function restorationObjects(game) {
  return game.mapId === 'forest' && !game.story && !game.realm
    ? TOWN_RESTORATIONS.filter((f) => f.extra).map((f) => ({ ...f, type: 'restoration-extra' }))
    : [];
}
// 共用绘制与动作输入，风格差异由配置提供。
export function restorationBuildingVisible(game, id) {
  if (game.story || game.realm || facilityOpen(game.progress, id)) return true;
  const build = game.progress.restoration?.build;
  return build?.id === id && (build.elapsed - RESTORATION_FLIGHT) / (RESTORATION_SECONDS - RESTORATION_FLIGHT) > 0.48;
}
// 共用绘制与动作输入，风格差异由配置提供。
function drawWeatheredHouse(c, w, h, garage, night) {
  const ink = '#46614c',
    wall = night ? '#959b7e' : '#c9c6a0',
    side = night ? '#718671' : '#98a686',
    wood = night ? '#a39372' : '#c6ac7e',
    roof = night ? '#688372' : '#8c9e79',
    roofLight = night ? '#869781' : '#acb48a';
  box(
    c,
    -w * 0.46,
    -8,
    w * 0.92,
    15,
    4,
    night ? '#7d8b77' : '#a9b097',
    ink,
    style.townRestoration.drawWeatheredHouseValue,
  );
  poly(
    c,
    [
      [-w * 0.44, -h * 0.61],
      [w * 0.31, -h * 0.59],
      [w * 0.44, -h * 0.51],
      [w * 0.44, -6],
      [w * 0.31, 1],
      [-w * 0.44, -4],
    ],
    wall,
    ink,
    style.townRestoration.drawWeatheredHouseValue,
  );
  poly(
    c,
    [
      [w * 0.31, -h * 0.59],
      [w * 0.44, -h * 0.51],
      [w * 0.44, -6],
      [w * 0.31, 1],
    ],
    side,
    ink,
    1.7,
  );
  box(c, -w * 0.43, -h * 0.56, w * 0.74, h * 0.06, 1, '#64775c35');
  if (garage) {
    box(
      c,
      -w * 0.28,
      -h * 0.47,
      w * 0.54,
      h * 0.43,
      3,
      night ? '#71816c' : '#a6ad87',
      ink,
      style.townRestoration.drawWeatheredHouseValue,
    );
    for (let row = 1; row < 5; row++) box(c, -w * 0.27, -h * 0.47 + row * h * 0.08, w * 0.52, 2, 0, '#687e665c');
    poly(
      c,
      [
        [-w * 0.28, -h * 0.2],
        [w * 0.24, -h * 0.31],
        [w * 0.25, -h * 0.25],
        [-w * 0.27, -h * 0.14],
      ],
      wood,
      ink,
      1.5,
    );
    box(c, -w * 0.39, -h * 0.42, w * 0.07, h * 0.16, 2, side, ink, 1.5);
  } else {
    box(
      c,
      -w * 0.1,
      -h * 0.41,
      w * 0.25,
      h * 0.39,
      3,
      night ? '#5d7666' : '#81967b',
      ink,
      style.townRestoration.drawWeatheredHouseValue,
    );
    box(c, -w * 0.08, -h * 0.39, w * 0.03, h * 0.35, 1, wood);
    poly(
      c,
      [
        [-w * 0.12, -h * 0.19],
        [w * 0.16, -h * 0.29],
        [w * 0.17, -h * 0.23],
        [-w * 0.11, -h * 0.13],
      ],
      wood,
      ink,
      1.5,
    );
    box(c, -w * 0.36, -h * 0.42, w * 0.19, h * 0.18, 3, wood, ink, 1.7);
    box(c, -w * 0.33, -h * 0.39, w * 0.13, h * 0.12, 1, night ? '#607d75' : '#94b4a3');
    box(c, -w * 0.275, -h * 0.4, 3, h * 0.14, 0, wood);
  }
  const peak = garage ? -0.86 : -0.95;
  poly(
    c,
    [
      [-w * 0.51, -h * 0.59],
      [-w * 0.32, h * peak],
      [w * 0.28, h * (peak + 0.04)],
      [w * 0.51, -h * 0.56],
      [w * 0.35, -h * 0.57],
      [w * 0.32, -h * 0.62],
      [w * 0.27, -h * 0.6],
      [w * 0.26, -h * 0.56],
    ],
    roof,
    ink,
    2.3,
  );
  poly(
    c,
    [
      [-w * 0.51, -h * 0.59],
      [-w * 0.32, h * peak],
      [-w * 0.07, h * (peak + 0.015)],
      [-w * 0.19, -h * 0.58],
    ],
    roofLight,
  );
  c.strokeStyle = '#637b5c';
  c.lineWidth = 1.4;
  for (let row = 1; row <= 2; row++) {
    const t = row / 3,
      y = h * (peak + (-0.58 - peak) * t);
    c.beginPath();
    c.moveTo(-w * (0.32 + 0.18 * t), y);
    c.lineTo(w * (0.28 + 0.2 * t), y + h * 0.03);
    c.stroke();
  }
  box(c, -w * 0.51, -h * 0.59, w * 0.77, h * 0.045, 2, wood, ink, 1.5);
  poly(
    c,
    [
      [w * 0.35, -h * 0.57],
      [w * 0.51, -h * 0.56],
      [w * 0.51, -h * 0.52],
      [w * 0.35, -h * 0.53],
    ],
    wood,
    ink,
    1.5,
  );
  poly(
    c,
    [
      [w * 0.12, -h * 0.79],
      [w * 0.23, -h * 0.77],
      [w * 0.25, -h * 0.69],
      [w * 0.16, -h * 0.71],
    ],
    '#6a775e',
    ink,
    1.2,
  );
  c.strokeStyle = wood;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(w * 0.16, -h * 0.77);
  c.lineTo(w * 0.19, -h * 0.72);
  c.stroke();
  c.strokeStyle = '#7e8b6f';
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(w * 0.23, -h * 0.44);
  c.lineTo(w * 0.19, -h * 0.35);
  c.lineTo(w * 0.24, -h * 0.29);
  c.stroke();
  oval(c, -w * 0.35, -5, w * 0.08, 4, '#7e956d');
  oval(c, w * 0.3, -4, w * 0.055, 3, '#7e956d');
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawRestorationObject(c, item, game, night = 0, player = null) {
  if (game.story || game.realm) return false;
  const f = restorationForObject(item);
  if (!f) return false;
  const ready = facilityOpen(game.progress, f.id);
  if (ready && !f.extra) return false;
  if (restorationBuildingVisible(game, f.id) && !f.extra) {
    return false;
  }
  const ink = '#3e5d49',
    wood = night > 0.5 ? '#8c8d70' : '#bba775',
    light = night > 0.5 ? '#afad88' : '#dfc99a',
    stone = night > 0.5 ? '#7c8a79' : '#a5af96';
  c.save();
  c.translate(item.x, item.y);
  if (player && player.y < item.y && Math.abs(player.x - item.x) < f.width / 2 && item.y - player.y < f.height)
    c.globalAlpha = 0.6;
  const w = f.secondary ? Math.min(110, f.width) : f.width,
    h = f.secondary ? Math.min(90, f.height) : f.height;
  oval(c, 0, 4, w * 0.46, 8, '#29423536');
  if (f.shape === 'board' || f.extra || f.secondary) {
    if (ready) {
      // 修好的新站牌恢复直立支柱与完整牌面，移除断板和地面残木。
      for (const x of [-31, 25]) box(c, x, -65, 7, 66, 2, wood, ink, style.townRestoration.drawWeatheredHouseValue);
      if (f.id === 'football') {
        // 足球统计复用共用牌面与当前描边，保留主线新增的实时计分显示。
        box(c, -56, -70, 112, 46, 3, '#e6d7a4', ink, style.townRestoration.drawWeatheredHouseValue);
        drawFootballScoreboard(c, game.progress.realms.records.football);
      } else if (f.id === 'race') {
        // 三行赛跑纪录沿用站牌配色和脚底锚点，结算后由下一帧直接更新。
        box(c, -56, -83, 112, 62, 3, '#e6d7a4', ink, style.townRestoration.drawWeatheredHouseValue);
        drawRaceScoreboard(c, game.progress.realms.records.race);
      } else box(c, -40, -62, 80, 38, 3, '#e6d7a4', ink, style.townRestoration.drawWeatheredHouseValue);
    } else {
      poly(
        c,
        [
          [-35, 0],
          [-29, -67],
          [-21, -65],
          [-27, 0],
        ],
        wood,
        ink,
        style.townRestoration.drawWeatheredHouseValue,
      );
      poly(
        c,
        [
          [29, 0],
          [23, -43],
          [27, -50],
          [34, -42],
          [37, 0],
        ],
        wood,
        ink,
        style.townRestoration.drawWeatheredHouseValue,
      );
      poly(
        c,
        [
          [-43, -63],
          [22, -59],
          [13, -48],
          [20, -42],
          [-40, -43],
        ],
        light,
        ink,
        style.townRestoration.drawWeatheredHouseValue,
      );
      poly(
        c,
        [
          [-18, -30],
          [37, -22],
          [36, -13],
          [-20, -21],
        ],
        wood,
        ink,
        1.8,
      );
      poly(
        c,
        [
          [16, -4],
          [42, -10],
          [45, -4],
          [19, 2],
        ],
        wood,
        ink,
        1.5,
      );
    }
  } else if (f.shape === 'arch') {
    for (const x of [-42, 34]) {
      box(c, x, -62, 18, 64, 3, stone, ink, style.townRestoration.drawWeatheredHouseValue);
      poly(
        c,
        [
          [x, -62],
          [x + 4, -77],
          [x + 10, -65],
          [x + 15, -72],
          [x + 18, -62],
        ],
        light,
        ink,
        style.townRestoration.drawWeatheredHouseValue,
      );
    }
    poly(
      c,
      [
        [-20, -3],
        [-3, -22],
        [13, -17],
        [25, -3],
      ],
      stone,
      ink,
      style.townRestoration.drawWeatheredHouseValue,
    );
  } else if (f.shape === 'tower' || f.shape === 'altar') {
    const levels = f.shape === 'tower' ? 3 : 1;
    for (let i = 0; i < levels; i++) {
      const y = -i * 29;
      poly(
        c,
        [
          [-w * 0.37, y],
          [w * 0.31, y + 3],
          [w * 0.4, y - 9],
          [w * 0.38, y - 30],
          [w * 0.2, y - 23],
          [w * 0.07, y - 36],
          [-w * 0.1, y - 23],
          [-w * 0.37, y - 29],
        ],
        i % 2 ? light : stone,
        ink,
        style.townRestoration.drawWeatheredHouseValue,
      );
    }
    box(c, -13, -35, 22, 30, 7, '#526953', ink, style.townRestoration.drawWeatheredHouseValue);
  } else {
    drawWeatheredHouse(c, w, h, f.shape === 'garage', night > 0.5);
  }
  if (!f.secondary) drawWorldSign(c, f.name, 0, 5);
  c.restore();
  return true;
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawRestorationScaffold(c, item, game, night = 0) {
  const f = restorationForObject(item),
    b = game.progress.restoration?.build;
  if (!f || f.secondary || b?.id !== f.id || b.elapsed < RESTORATION_FLIGHT) return;
  const p = Math.min(1, (b.elapsed - RESTORATION_FLIGHT) / (RESTORATION_SECONDS - RESTORATION_FLIGHT)),
    w = f.width * 0.48,
    h = f.height * 0.8,
    ink = '#3e5d49';
  c.save();
  c.translate(item.x, item.y);
  for (const x of [-w, w]) box(c, x, -h, 4, h + 6, 1, '#baa477', ink, 1.3);
  for (let i = 0; i < 4; i++) {
    const t = Math.max(0, Math.min(1, p * 4 - i));
    if (!t) continue;
    box(c, -w, -h + (i * h) / 4 - 10 * (1 - t), w * 2, 4, 1, '#dfc99a', ink, 1.2);
  }
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function restorationTransferSamples(from, target, height, elapsed, duration, reduced = false) {
  if (elapsed <= 0 || elapsed >= duration) return [];
  const samples = [],
    cycle = 0.84;
  for (let i = 0; i < 6; i++) {
    const age = elapsed - (i * cycle) / 6;
    if (age <= 0) continue;
    const t = (age % cycle) / cycle,
      lane = ((i % 3) - 1) * 6;
    samples.push({
      x: reduced ? target.x + lane : from.x + (target.x + lane - from.x) * t,
      y: reduced
        ? target.y - height * 0.35
        : from.y - 26 + (target.y - height * 0.35 - from.y + 26) * t - Math.sin(t * Math.PI) * (30 + (i % 2) * 6),
      alpha: Math.min(1, t / 0.12, (1 - t) / 0.16),
      angle: reduced ? 0 : Math.sin(t * Math.PI) * (i % 2 ? 0.18 : -0.18),
    });
  }
  return samples;
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawRestorationTransfer(c, game, reduced = false, zoom = 1) {
  const b = game.progress.restoration?.build,
    a = game.progress.arrival;
  const initial = a?.phase === 'repairing';
  if (!b && !initial) return;
  const config = initial
    ? { x: WORKSHOP.x, y: WORKSHOP.y, height: 135, name: '武器工坊' }
    : TOWN_RESTORATIONS.find((f) => f.id === b.id);
  const f = config && restorationLocation(config, initial ? game.player : b);
  if (!f) return;
  const elapsed = initial ? a.elapsed : b.elapsed,
    from = riderPosition(game.player, game.vehicle),
    target = nearest(f, from),
    duration = initial ? RANGER.rebuildSeconds + RESTORATION_FLIGHT : RESTORATION_SECONDS;
  for (const wood of restorationTransferSamples(from, target, f.height, elapsed, duration, reduced)) {
    c.save();
    c.translate(wood.x, wood.y);
    c.rotate(wood.angle);
    c.globalAlpha *= wood.alpha;
    box(c, -10, -4, 20, 8, 3, '#d8b879', '#41634b', 1.5);
    oval(c, -7, 0, 2.5, 3, '#f0d69b', '#8f845a', 1);
    c.restore();
  }
  c.save();
  // 圆环固定屏幕尺寸，横条按实际倍率上移，广角下也不相互遮挡。
  c.translate(target.x, target.y - f.height - Math.max(18, 17 / zoom + 7));
  box(c, -47, -7, 94, 6, 3, '#48634d');
  box(c, -46, -6, 92 * Math.min(1, elapsed / duration), 4, 2, '#e4cc83');
  c.font = canvasFont(11, 700);
  c.fillStyle = '#fff1c4';
  c.strokeStyle = style.townRestoration.drawRestorationTransfer_strokeStyleColor;
  c.lineWidth = 3;
  c.textAlign = 'center';
  const text =
    game.restorationError || game.arrivalError ? '保存重试中' : elapsed < RESTORATION_FLIGHT ? '木料送达中' : '修复中';
  c.strokeText(text, 0, -13);
  c.fillText(text, 0, -13);
  c.restore();
}
// 后续设施共用武器工坊的锤子圆环，倒计时只读正式施工状态。
export function drawRestorationBuildCountdown(c,game,zoom=1){
 const build=game.progress.restoration?.build;
 if(!build||game.realm||game.story||game.cottage||game.mapId!=='forest'||game.progress.arrival?.phase==='repairing')return;
 const config=TOWN_RESTORATIONS.find(f=>f.id===build.id);if(!config)return;
 const site=nearest(restorationLocation(config,build),game.player),failed=!!game.restorationError;
 const progress=Math.max(0,Math.min(1,(build.elapsed-RESTORATION_FLIGHT)/(RESTORATION_SECONDS-RESTORATION_FLIGHT)));
 c.save();c.translate(site.x,site.y-config.height+2);c.scale(1/zoom,1/zoom);
 drawActionCountdown(c,{progress,label:failed?'保存待重试':Math.max(1,Math.ceil(RESTORATION_SECONDS-build.elapsed)),icon:'build',width:failed?120:68});
 c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawRestorationArea(c, site, player) {
  const area = site.repairArea,
    p = nearest(area, player);
  c.save();
  c.beginPath();
  c.roundRect(p.x - area.width / 2, p.y - area.height / 2, area.width, area.height, area.radius);
  c.fillStyle = '#f3df9220';
  c.fill();
  c.setLineDash([8, 7]);
  c.lineWidth = 2;
  c.strokeStyle = '#fff1b9b8';
  c.stroke();
  c.setLineDash([]);
  // 修复区只保留范围轮廓，点击由房屋上的统一猫爪提示。
  c.restore();
}
