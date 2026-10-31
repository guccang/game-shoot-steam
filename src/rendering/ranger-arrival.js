// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { drawActionCountdown } from './action-countdown.js';
import { PLAYER_SCALE } from '../combat/recoil.js';
import { drawCat } from './characters.js';
import { drawScooterRear, drawScooterFront } from './scooter.js';
import { box, oval, poly } from './primitives.js';
import { RANGER } from '../config/ranger-arrival.js';
import { arrivalTarget, arrivalRiders, arrivalWorkshopObjective, workshopBuildView } from '../core/ranger-arrival.js';
import { WORKSHOP } from '../world/workshop.js';
import { nearest } from '../world/coordinates.js';

// 入职演出复用正式猫帧、武器及场景坐标，所有部件参加世界深度与昼夜合成。

// 老猫与玩家共用原比例和真实身体连续帧，帽子眼镜胡须独立附着。
// 共用绘制与动作输入，风格差异由配置提供。
export function drawOldRanger(c, x, y, animation, reduced = false, wave = false, pushing = false) {
  drawCat(c, x, y, 1, 0, 0.8, 0, 0, null, reduced ? 0.35 : 1, null, 0, false, false, animation, 0, null, 0, true);
  c.save();
  c.translate(x, y);
  c.scale(0.8, 0.8);
  if (!pushing) oval(c, -19, wave ? -24 + Math.sin(animation.idleTime * 5) * 2 : -6, 5, 4, '#d9e8db', '#365a47', 1.5);
  oval(c, 19, -6, 5, 4, '#d9e8db', '#365a47', 1.5);
  box(c, -19, -43, 38, 9, 5, '#749477', '#365a47', 2);
  box(c, -25, -36, 50, 4, 2, '#9bb480', '#365a47', 1.5);
  oval(c, -8, -24, 7, 6, '#e9edce44', '#486750', 1.5);
  oval(c, 8, -24, 7, 6, '#e9edce44', '#486750', 1.5);
  c.strokeStyle = '#486750';
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(-1, -24);
  c.lineTo(1, -24);
  c.stroke();
  poly(
    c,
    [
      [-3, -14],
      [-15, -11],
      [-6, -8],
      [0, -11],
      [6, -8],
      [15, -11],
      [3, -14],
    ],
    '#edf0d8',
    '#71816b',
    1,
  );
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
function drawBusStop(c, item, winter = 0) {
  c.save();
  c.translate(item.x, item.y);
  oval(c, 0, 8, 57, 11, '#30492b30');
  box(c, -47, -7, 94, 12, 4, '#bbc2a0', '#718672', 2);
  box(c, -40, -80, 6, 77, 2, style.rangerArrival.drawBusStopColor, '#795f3f', 2);
  box(c, 30, -80, 6, 77, 2, style.rangerArrival.drawBusStopColor, '#795f3f', 2);
  box(c, -34, -47, 60, 22, 3, '#d7bb80', '#795f3f', 2);
  box(c, -36, -25, 66, 8, 3, style.rangerArrival.drawBusStopColor, '#795f3f', 2);
  for (const x of [-27, 21]) box(c, x, -17, 5, 14, 1, '#795f3f');
  poly(
    c,
    [
      [-53, -77],
      [-35, -100],
      [31, -100],
      [48, -77],
    ],
    '#749477',
    '#365a47',
    2,
  );
  poly(
    c,
    [
      [-53, -77],
      [48, -77],
      [48, -69],
      [-53, -69],
    ],
    '#9cb77f',
    '#365a47',
    2,
  );
  if (winter > 0) {
    c.save();
    c.globalAlpha = winter;
    poly(
      c,
      [
        [-53, -77],
        [-35, -100],
        [31, -100],
        [48, -77],
        [31, -81],
        [-37, -81],
      ],
      '#eef1db',
      '#b7c9b9',
      1,
    );
    c.restore();
  }
  box(c, 51, -80, 4, 83, 1, '#718672', '#365a47', 1.5);
  box(c, 39, -95, 28, 30, 5, '#fff0be', '#365a47', 2);
  box(c, 45, -88, 16, 13, 3, '#9cb77f', '#365a47', 1.5);
  box(c, 47, -86, 12, 5, 1, '#eaf0d1');
  for (const x of [48, 58]) oval(c, x, -73, 2, 2, '#365a47');
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
function drawArrivalBus(c, item, game) {
  const a = game.progress.arrival,
    rolling = ['bus', 'wait', 'pickup', 'board'].includes(a.phase),
    phase = rolling ? a.elapsed * 18 : 0;
  c.save();
  c.translate(item.x, item.y);
  oval(c, 6, 8, 44, 57, '#30492b30');
  for (const x of [-34, 34])
    for (const y of [-41, 32]) {
      box(c, x - 4, y - 13, 8, 25, 4, '#365a47', '#284b39', 2);
      for (let i = 0; i < 3; i++) box(c, x - 3, y - 11 + ((i * 8 + phase) % 22), 6, 2, 1, '#9bac85');
    }
  box(c, -33, -91, 66, 142, 14, '#ecdc9c', '#365a47', 2.5);
  box(c, -29, -85, 58, 78, 10, '#9cb77f', '#365a47', 2);
  // 两侧连续车窗与车顶通风盖让长车厢区别于货车，窗格不烘焙进角色。
  for (const x of [-30, 23]) for (const y of [-74, -53, -32]) box(c, x, y, 7, 16, 2, '#a6c9bf', '#365a47', 1.2);
  box(c, -16, -72, 32, 19, 4, '#d4dfb4', '#879b78', 1.3);
  for (const y of [-66, -61]) box(c, -9, y, 18, 2, 1, '#9cb77f');
  box(c, -25, -1, 50, 30, 6, '#9cc7bd', '#365a47', 2);
  poly(
    c,
    [
      [-22, 1],
      [13, 1],
      [-14, 25],
      [-22, 25],
    ],
    '#dcead1',
  );
  box(c, -24, 36, 48, 9, 3, '#749477', '#365a47', 1.5);
  for (const x of [-22, 15]) box(c, x, 31, 8, 5, 2, '#fff4cb', '#879b78', 1);
  // 门页绕自身铰接打开，车体不变形；黑暗门口随玩家下车留在后方。
  const door =
    a.phase === 'alight' ? Math.min(1, a.elapsed / 0.15) : a.phase === 'wait' ? Math.max(0, 1 - a.elapsed / 0.15) : 0;
  box(c, -35, -17, 7, 34, 1, '#365a47');
  poly(
    c,
    [
      [-35, -17],
      [-35 - door * 15, -14],
      [-35 - door * 15, 16],
      [-35, 17],
    ],
    '#d8e4b3',
    '#365a47',
    1.5,
  );
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
function drawArrivalLetter(c, item, game, reduced) {
  const a = game.progress.arrival,
    s = game.arrivalScene,
    t = a.phase === 'handover' ? Math.min(1, a.elapsed / RANGER.handoverSeconds) : 1;
  const x = s.elder.x + (game.player.x + 14 - s.elder.x) * t,
    y = s.elder.y - 10 + (game.player.y - 15 - (s.elder.y - 10)) * t;
  const wind = reduced ? 0 : Math.sin(game.player.bodyAnimation.idleTime * 9);
  c.save();
  c.translate(x, y);
  box(c, -12, -9, 24, 17, 2, '#fff0be', '#365a47', 1.6);
  poly(
    c,
    [
      [-11, -8],
      [0, 1 + wind * 2],
      [11, -8],
    ],
    '#e6d49a',
    '#879b78',
    1,
  );
  oval(c, -13, 5, 4, 3, '#efd9ad', '#365a47', 1.2);
  oval(c, 13, 5, 4, 3, '#efd9ad', '#365a47', 1.2);
  if (!reduced && ['leave', 'watch'].includes(a.phase)) {
    c.strokeStyle = '#edf0d8';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(-58 + wind * 3, 15);
    c.quadraticCurveTo(-38, 7, -24, 12);
    c.moveTo(27, 25);
    c.quadraticCurveTo(40, 20, 57 + wind * 4, 22);
    c.stroke();
  }
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function arrivalObjects(game) {
  if (game.realm || game.story || game.mapId !== 'forest') return [];
  const objects = [{ ...RANGER.busStop, type: 'arrival-bus-stop' }],
    s = game.arrivalScene,
    a = game.progress.arrival;
  if (!a) return objects;
  if (s?.busVisible) objects.push({ ...s.bus, type: 'arrival-bus', depthOffset: -25 });
  if (s?.elderRiding) objects.push({ ...s.scooter, type: 'arrival-scooter', elderVehicle: true });
  const usingBay =
    game.vehicle.active &&
    game.parking?.id === RANGER.parkingId &&
    ['align', 'reverse', 'parked'].includes(game.parking.phase);
  if (a.keys && a.parked && !usingBay && !(game.vehicle.active && game.vehicle.index === RANGER.scooter))
    objects.push({ ...RANGER.parking, type: 'arrival-scooter' });
  if (s && ['handover', 'leave', 'watch'].includes(a.phase))
    objects.push({ ...game.player, type: 'arrival-letter', depthOffset: 3 });
  return objects;
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawArrivalObject(c, item, game, reduced = false, winter = 0) {
  if (item.type === 'arrival-bus-stop') {
    drawBusStop(c, item, winter);
    return;
  }
  if (item.type === 'arrival-bus') {
    drawArrivalBus(c, item, game);
    return;
  }
  if (item.type === 'arrival-letter') {
    drawArrivalLetter(c, item, game, reduced);
    return;
  }
  const s = item.elderVehicle ? game.arrivalScene : { wheelPhase: 0 },
    a = game.progress.arrival;
  c.save();
  const phase = reduced ? 0 : s.wheelPhase;
  c.save();
  c.translate(item.x, item.y);
  drawScooterRear(c, phase);
  c.restore();
  if (s.elderRiding) {
    const riders = arrivalRiders(item);
    // 从前到后为老人、完整玩家、低矮软坐垫；Canvas反向叠画，禁止裁成孤立猫头。
    if (s.riding)
      drawCat(
        c,
        riders.player.x,
        riders.player.y,
        game.progress.hero,
        0,
        PLAYER_SCALE,
        0,
        0,
        null,
        reduced ? 0.35 : 1,
        null,
        0,
        false,
        false,
        game.player.bodyAnimation,
        0,
        null,
        0,
        true,
      );
    drawOldRanger(c, riders.elder.x, riders.elder.y, s.elder.bodyAnimation, reduced, a.phase === 'leave');
  }
  c.save();
  c.translate(item.x, item.y);
  drawScooterFront(c, phase);
  if (s.elderRiding) for (const x of [-28, 28]) oval(c, x, -30, 4, 3, '#d9e8db', '#365a47', 1.4);
  // 飘带和分段气流随真实行驶方向朝后摆动，轮纹仍按累计路程推进。
  if (s.driving && !reduced) {
    const north = ['pickup', 'leave'].includes(a.phase),
      dy = north ? 1 : -1,
      t = a.elapsed;
    poly(
      c,
      [
        [9, -49],
        [23, -48 + Math.sin(t * 20) * 3],
        [40, -44 + Math.sin(t * 20 + 1) * 5],
        [28, -53],
        [12, -54],
      ],
      '#edbd63',
      '#879b78',
      1,
    );
    c.strokeStyle = '#f1ebc8';
    c.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const x = (i % 2 ? 1 : -1) * (38 + i * 3),
        y = dy * (20 + ((t * 130 + i * 21) % 58));
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x, y + dy * 19);
      c.stroke();
    }
  }
  c.restore();
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawArrivalGuidance(c, game, player) {
  // 工坊已由正式光点和终点标记接管，避免叠画旧的小箭头与虚线圈。
  if (arrivalWorkshopObjective(game)) return;
  const target = arrivalTarget(game);
  if (!target) return;
  const point = nearest(target, player),
    angle = Math.atan2(point.y - player.y, point.x - player.x);
  c.save();
  c.translate(player.x, player.y);
  c.rotate(angle);
  poly(
    c,
    [
      [42, -6],
      [53, 0],
      [42, 6],
    ],
    '#fff0b8',
    '#456b48',
    1.5,
  );
  c.restore();
  c.save();
  c.setLineDash([5, 4]);
  oval(c, point.x, point.y + 8, 28, 14, 'transparent', '#fff1be', 2);
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawWorkshopBuildCountdown(c, game, zoom = 1) {
  if (game.realm || game.story || game.mapId !== 'forest') return;
  const view = workshopBuildView(game);
  if (view.state !== 'rebuilding' && !view.success) return;
  const point = nearest(WORKSHOP, game.player),
    label = view.failed ? '保存待重试' : view.success ? '重建完成' : String(Math.max(1, view.seconds));
  c.save();
  c.translate(point.x, point.y - 133);
  c.scale(1 / zoom, 1 / zoom);
  drawActionCountdown(c, {
    progress: view.progress,
    label,
    icon: 'build',
    width: view.failed || view.success ? 120 : 68,
  });
  c.restore();
}
