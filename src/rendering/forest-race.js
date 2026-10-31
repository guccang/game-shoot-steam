// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { RACE, RACE_TURN, racePoint } from '../config/forest-race.js';
import { box, oval, poly, outline } from './primitives.js';
import { drawCat } from './characters.js';
import { raceFeatures } from '../config/forest-race-track.js';
import { drawRaceTrackGround, drawRaceBale } from './forest-race-track.js';
import { PLAYER_SCALE } from '../combat/recoil.js';

// 森林运动会的跑道、旗标与选手共用正式程序绘制，不生成等级或昼夜图集。

const COLORS = ['#90a875', '#c6a25e', '#8aa9b0'];
// 共用绘制与动作输入，风格差异由配置提供。
function flag(c, x, y, n, active, time) {
  oval(c, x + 2, y + 2, 9, 4, '#315c4330');
  box(c, x - 2, y - 44, 4, 44, 1, '#a67f4c', outline, 1.5);
  poly(
    c,
    [
      [x + 1, y - 43],
      [x + 24, y - 40 + Math.sin(time * 2 + n) * 1.5],
      [x + 20, y - 25],
      [x + 1, y - 28],
    ],
    active ? '#f4dca0' : '#90a875',
    outline,
    1.5,
  );
  c.fillStyle = outline;
  c.font = 'bold 11px sans-serif';
  c.textAlign = 'center';
  c.fillText(String(n), x + 11, y - 31);
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawRaceGround(c, r, time = 0, reduced = false) {
  const a = r.arena;
  c.save();
  oval(c, a.x, a.y, a.radius + 85, a.radius + 60, '#a8bc84');
  c.beginPath();
  c.ellipse(a.x, a.y, RACE.rx, RACE.ry, 0, 0, RACE_TURN);
  c.strokeStyle = '#b99462';
  c.lineWidth = RACE.halfWidth * 2 + 9;
  c.stroke();
  c.strokeStyle = '#dcc28c';
  c.lineWidth = RACE.halfWidth * 2;
  c.stroke();
  for (const side of [-1, 1]) {
    c.beginPath();
    c.ellipse(a.x, a.y, RACE.rx + side * RACE.halfWidth, RACE.ry + side * RACE.halfWidth, 0, 0, RACE_TURN);
    c.strokeStyle = '#fff0c6';
    c.lineWidth = 3;
    c.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const angle = Math.PI / 2 + (i * RACE_TURN) / 8,
      p = racePoint(angle, a),
      outer = racePoint(angle, a, RACE.halfWidth + 22);
    const active = i === r.nextGate % 8;
    flag(c, outer.x, outer.y, i || 8, active, reduced ? 0 : time);
    c.save();
    c.translate(p.x, p.y);
    c.rotate(Math.atan2(RACE.ry * Math.cos(angle), -RACE.rx * Math.sin(angle)));
    poly(
      c,
      [
        [-10, -7],
        [0, 0],
        [-10, 7],
        [0, 7],
        [10, 0],
        [0, -7],
      ],
      active ? '#fff1b5' : '#f3e5b8',
    );
    c.restore();
    if (active) {
      c.beginPath();
      c.ellipse(p.x, p.y, 27, 18, 0, 0, RACE_TURN);
      c.strokeStyle = style.forestRace.drawRaceGround_strokeStyleColor;
      c.lineWidth = 3;
      c.setLineDash([5, 5]);
      c.stroke();
      c.setLineDash([]);
    }
  }
  drawRaceTrackGround(c, r, time, reduced);
  const start = racePoint(Math.PI / 2, a);
  for (let y = -RACE.halfWidth; y < RACE.halfWidth; y += 12)
    for (let x = -12; x < 12; x += 12)
      box(
        c,
        start.x + x,
        start.y + y,
        12,
        12,
        0,
        ((y + RACE.halfWidth) / 12 + (x + 12) / 12) % 2 ? style.forestRace.drawRaceGround_strokeStyleColor : '#f8edc6',
      );
  box(c, a.x - 100, a.y - 21, 200, 42, 12, '#e8e6bf', outline, 2);
  c.fillStyle = outline;
  c.font = 'bold 19px sans-serif';
  c.textAlign = 'center';
  c.fillText('森林运动会', a.x, a.y + 5);
  c.font = '13px sans-serif';
  c.fillText('沿箭头 · 跑两圈', a.x, a.y + 31);
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawRaceRunner(c, n, reduced = false) {
  drawCat(
    c,
    n.x,
    n.y,
    n.hero,
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
    n.bodyAnimation,
    0,
    null,
    0,
    true,
  );
  box(c, n.x - 7, n.y - 18, 14, 12, 3, COLORS[n.index], outline, 1);
  c.fillStyle = '#fff3cb';
  c.font = 'bold 9px sans-serif';
  c.textAlign = 'center';
  c.fillText(String(n.index + 2), n.x, n.y - 9);
  const swing = reduced ? 0 : Math.sin(n.bodyAnimation.moveTime * 12) * 4 * n.bodyAnimation.moveWeight;
  oval(c, n.x - 13, n.y - 13 + swing, 4, 5, '#ead7ae', outline, 1);
  oval(c, n.x + 13, n.y - 13 - swing, 4, 5, '#ead7ae', outline, 1);
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawRaceCard(c) {
  const w = c.canvas.width,
    h = c.canvas.height;
  c.clearRect(0, 0, w, h);
  c.save();
  c.translate(w / 2, h / 2);
  c.scale(w / 760, h / 560);
  const r = { arena: { x: 0, y: 0, radius: 390 }, nextGate: 1 };
  drawRaceGround(c, r, 0, true);
  for (const f of raceFeatures(r.arena)) if (f.kind === 'bale') drawRaceBale(c, f);
  for (let i = 0; i < 3; i++) {
    const p = racePoint(Math.PI / 2 + 0.2 - i * 0.16, r.arena, i * 18 - 18);
    drawRaceRunner(
      c,
      {
        ...p,
        index: i,
        hero: RACE.rivals[i].hero,
        bodyAnimation: { idleTime: 0, moveTime: 0.2 + i * 0.15, moveWeight: 1 },
      },
      false,
    );
  }
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawRaceMap(c, r, player) {
  c.clearRect(0, 0, 120, 90);
  c.save();
  c.translate(60, 45);
  c.scale(0.16, 0.16);
  c.beginPath();
  c.ellipse(0, 0, RACE.rx, RACE.ry, 0, 0, RACE_TURN);
  c.strokeStyle = style.forestRace.drawRaceMap_strokeStyleColor;
  c.lineWidth = 32;
  c.stroke();
  for (const f of r.features || raceFeatures(r.arena)) {
    const x = f.x - r.arena.x,
      y = f.y - r.arena.y;
    if (f.kind === 'boost')
      poly(
        c,
        [
          [x - 12, y - 12],
          [x + 14, y],
          [x - 12, y + 12],
        ],
        '#bdd29a',
        outline,
        3,
      );
    else if (f.kind === 'bale') box(c, x - 10, y - 10, 20, 20, 3, style.forestRace.drawRaceMap_strokeStyleColor);
  }
  const next = racePoint(Math.PI / 2 + ((r.nextGate % 8) * RACE_TURN) / 8, { x: 0, y: 0 });
  oval(c, next.x, next.y, 18, 18, null, style.forestRace.drawRaceGround_strokeStyleColor, 7);
  for (const n of r.rivals) oval(c, n.x - r.arena.x, n.y - r.arena.y, 13, 13, COLORS[n.index], outline, 3);
  oval(c, player.x - r.arena.x, player.y - r.arena.y, 18, 18, '#f4dca0', outline, 5);
  c.restore();
}
