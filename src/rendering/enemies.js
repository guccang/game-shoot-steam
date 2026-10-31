import {monsterDeathPose} from '../config/monster-death.js';
import {campResidentHead} from '../config/camp-residents.js';
import {isDumpling} from '../combat/dumpling-motion.js';
import {dumplingSizeName} from '../config/monster-families.js';
import { ARMORED } from '../config/armored-enemies.js';
import { canvasFont } from './text-style.js';
import { i18nText } from "../i18n/index.js";
import { RANGED_ENEMIES } from '../config/ranged-enemies.js';
import { drawRangedWarning } from './ranged-enemies.js';
// 怪物、领主、受击形变与攻击预警的画布表现。
import { drawNewBoss } from './bosses.js';
import {drawBossSkillCue} from './boss-skills.js';
import { applyBossImpact } from './boss-impact.js';
import { clamp } from '../core/math.js';
import { attackProfile, PLAYER_RADIUS } from '../combat/enemy-attack.js';
import { drawMonsterSprite } from './monster-atlas.js';
import { box, oval, poly, outline } from './primitives.js';
// 绘制软团怪与戴叶子帽的精英怪。
export function drawSlime(c, e, time, reduced = false, profiler = null, deferHealthBar = false) {
  const armored=e.species===ARMORED.id,exploding=e.burst&&monsterDeathPose(e,reduced).active;
  const attack = e.assault,
    phase = attack?.phase || 'chase',
    profile = attackProfile(e);
  const progress = phase === 'chase' ? 0 : clamp(attack.elapsed / profile[phase], 0, 1);
  const charging = phase === 'windup' && e.hp > 0,
    lunging = phase === 'lunge';
  c.save();
  c.translate(e.x, e.y);
  const bob = !exploding && !isDumpling(e) && !armored && !RANGED_ENEMIES[e.species] && phase === 'chase' && !reduced ? Math.sin(time * 4 + e.phase) * 2 : 0;
  const s = armored || RANGED_ENEMIES[e.species] ? 1 : e.tough ? 1.16 : 0.92;
  c.scale(s, s);
  // 身体爆开后落地影同步淡去，不在飞散叶片下残留完整身体影子。
  c.save();if(exploding)c.globalAlpha*=1-monsterDeathPose(e,reduced).t;
  oval(c, 0, 4, e.flying ? 17 : 23, e.flying ? 5 : 8, e.flying ? '#40452c18' : '#40452c25');c.restore();
  c.translate(0, bob);
  // 蓄力下蹲、扑击拉伸、回位落地都围绕脚底绘制，低动态模式只保留颜色预警。
  if (!exploding && !reduced && attack && !armored && !RANGED_ENEMIES[e.species]) {
    if (charging) {
      c.translate(-attack.dirX * progress * 4, -attack.dirY * progress * 2);
      c.scale(1 + progress * 0.2, 1 - progress * 0.27);
    } else if (lunging) {
      c.translate(0, -Math.sin(progress * Math.PI) * 7);
      c.rotate(attack.dirX * 0.14);
      c.scale(1 + Math.abs(attack.dirX) * 0.17, 1 + Math.abs(attack.dirY) * 0.13);
    } else if (phase === 'returning') {
      c.translate(0, -Math.sin(progress * Math.PI) * 3);
      c.scale(1 + Math.sin(progress * Math.PI) * 0.09, 1 - Math.sin(progress * Math.PI) * 0.09);
    }
  }
  // 爆裂使用世界弹道方向，不能再叠加受击身体的旋转；延迟爆裂之前仍保留翻滚。
  if(!exploding&&!armored&&!isDumpling(e))applyImpact(c, e, reduced);
  drawMonsterSprite(c, e, time, reduced, profiler);
  // 冰冻罩只属于活体，死亡残影不再留下白圈与冰刺；爆裂动画仍照常绘制。
  if (e.hp > 0 && !e.burst && e.chill > 0) {
    oval(c, 0, -13, 22, 18, '#b8ecff44', '#d5f7ff', 1.5);
    for (const x of [-15, 0, 15])
      poly(
        c,
        [
          [x - 3, 2],
          [x, -7],
          [x + 4, 2],
        ],
        '#d8f8ff',
        '#8abacb',
        1,
      );
  }
  c.restore();
  if(!deferHealthBar)drawEnemyHealthBar(c,e);
  if (e.level && !e.burst) {
    c.save();
    c.font = canvasFont(10);
    c.textAlign = 'center';
    c.strokeStyle = '#fff9e5';
    c.lineWidth = 3;
    const label = armored ? `Lv.${e.level} ${ARMORED.name}` : RANGED_ENEMIES[e.species]
      ? i18nText("rendering.enemyLevel", { p0: e.level, p1: RANGED_ENEMIES[e.species].name })
      : `Lv.${e.level} ${e.flying?'叶翼飞团':dumplingSizeName(e.rank)}`;
    c.strokeText(label, e.x, e.y + 19);
    c.fillStyle = e.rank === 2 ? '#986b36' : '#3a5745';
    c.fillText(label, e.x, e.y + 19);
    c.restore();
  }
  if (charging) {
    c.save();
    c.font = canvasFont(19);
    c.textAlign = 'center';
    c.strokeStyle = '#fff4d9';
    c.lineWidth = 3;
    c.strokeText('!', e.x, e.y - (armored?103:56));
    c.fillStyle = '#b64e42';
    c.fillText('!', e.x, e.y - (armored?103:56));
    c.restore();
  }
}
// 地面胶囊预警显示玩家中心需要避开的完整扫掠区域，路径从前摇开始固定。
export function drawEnemyWarning(c, enemy) {
  if (RANGED_ENEMIES[enemy.species]) return drawRangedWarning(c, enemy);
  const a = enemy.assault;
  if (!a || !['windup', 'lunge', 'returning'].includes(a.phase) || enemy.hp <= 0) return;
  const returning = a.phase === 'returning',
    progress = a.elapsed / attackProfile(enemy)[a.phase];
  c.save();
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(a.originX, a.originY);
  c.lineTo(a.endX, a.endY);
  c.strokeStyle = returning ? '#738b6960' : '#ce655329';
  c.lineWidth = returning ? 2 : (enemy.radius + PLAYER_RADIUS) * 2;
  if (returning) c.setLineDash([3, 5]);
  c.stroke();
  c.setLineDash([]);
  if (!returning) {
    c.strokeStyle = '#b957487d';
    c.lineWidth = 1.5;
    c.stroke();
    c.save();
    c.translate(a.endX, a.endY);
    c.rotate(Math.atan2(a.dirY, a.dirX));
    poly(
      c,
      [
        [-10, -6],
        [0, 0],
        [-10, 6],
        [-7, 0],
      ],
      '#c05b49',
      null,
    );
    c.restore();
    c.beginPath();
    c.arc(
      a.originX,
      a.originY,
      enemy.radius + 8,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * (a.phase === 'windup' ? progress : 1),
    );
    c.strokeStyle = '#bf5b45';
    c.lineWidth = 2.5;
    c.stroke();
  }
  c.restore();
}
// 领主为苔藓覆盖的森林巨兽，枝角与体型区别于普通怪物。
export function drawBoss(c, b, time, reduced = false) {
  if (b.kind && b.kind !== 'moss') return drawNewBoss(c, b, time, reduced);
  c.save();
  c.translate(b.x, b.y);
  oval(c, 0, 10, 63, 22, '#334b3030');
  c.translate(0, Math.sin(time * 2) * 2 - (reduced ? 0 : b.z || 0));
  if (!reduced) c.rotate(Math.sin(b.rollAngle || 0) * 0.16);
  if (b.heavyHit > 0) applyBossImpact(c, b, reduced);
  else applyImpact(c, b, reduced, 0.45);
  for (const side of [-1, 1]) {
    c.save();
    c.scale(side, 1);
    box(c, 29, -27, 23, 40, 10, '#667553', outline, 3);
    poly(
      c,
      [
        [30, -78],
        [46, -114],
        [56, -120],
        [53, -102],
        [67, -105],
        [58, -89],
        [43, -69],
      ],
      '#b5a16b',
      outline,
      3,
    );
    c.restore();
  }
  oval(c, 0, -34, 48, 54, b.flash ? '#ebefc8' : '#829366', outline, 3.5);
  oval(c, 0, -15, 28, 31, '#b7bc88', '#6d8058');
  box(c, -42, -86, 84, 63, 22, b.flash ? '#edf1c8' : '#91a374', outline, 3);
  poly(
    c,
    [
      [-43, -77],
      [-35, -98],
      [-20, -94],
      [-10, -105],
      [3, -96],
      [18, -102],
      [27, -90],
      [42, -88],
      [38, -73],
      [20, -79],
      [8, -71],
      [-9, -80],
      [-24, -71],
    ],
    '#577c53',
    outline,
    2.3,
  );
  c.strokeStyle = '#3d4c39';
  c.lineWidth = 4;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-24, -63);
  c.lineTo(-10, -59);
  c.moveTo(24, -63);
  c.lineTo(10, -59);
  c.stroke();
  oval(c, -16, -53, 4, 5, '#edca78');
  oval(c, 16, -53, 4, 5, '#edca78');
  box(c, -15, -41, 30, 9, 4, '#47523c');
  poly(
    c,
    [
      [-11, -42],
      [-5, -42],
      [-8, -34],
    ],
    '#f4e5b1',
    null,
  );
  poly(
    c,
    [
      [11, -42],
      [5, -42],
      [8, -34],
    ],
    '#f4e5b1',
    null,
  );
  for (const x of [-29, 25]) {
    box(c, x - 12, 0, 25, 14, 6, '#7d8e60', outline, 2.5);
  }
  if (b.chill > 0) {
    oval(c, 0, -36, 49, 55, '#a7e9ff35');
    for (const x of [-32, 0, 32])
      poly(
        c,
        [
          [x - 6, 8],
          [x - 4, -12],
          [x + 4, -20],
          [x + 7, 5],
        ],
        '#bdefff',
        '#78bfd4',
        1,
      );
  }
  c.restore();
  drawBossSkillCue(c,b);
}
// 波次栏头像复用领主原画，固定姿态与构图，不驱动战斗动画。
export function drawBossIcon(canvas, kind) {
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.save();
  c.translate(canvas.width / 2, canvas.height * 0.81);
  const scale = Math.min(canvas.width / 180, canvas.height / 180);
  c.scale(scale, scale);
  drawBoss(c, { kind, x: 0, y: 0 }, 0, true);
  c.restore();
}
// 休养使用实际生命进度；血条高于各兵种预警，满血与死亡不留下空底框。
export function enemyHealthBarView(e){
 if(!(e.hp>0&&e.hp<e.maxHp)||e.burst||e.campNpc)return null;
 const healing=!!e.monsterCamp&&(e.campState==='idle'||e.campState==='alert'),armored=e.species===ARMORED.id;
 return {x:e.x,y:e.y-(healing?campResidentHead(e)+10:armored?88:48),width:armored?42:healing?36:30,height:healing?6:5,fraction:e.hp/e.maxHp,color:healing?'#a9d68b':'#a58aba'};
}
// 细描边血条保持在复杂背景上可读，休养条略加高以适配手机缩放。
export function drawEnemyHealthBar(c,e){
 const bar=enemyHealthBarView(e);
 if(bar)healthBar(c,bar.x,bar.y,bar.width,bar.fraction,bar.color,bar.height);
}
// 血条底框和填充在同一层完成，避免满血时留下旧底框。
function healthBar(c, x, y, width, fraction, color, height=5) {
  box(c, x - width / 2, y, width, height, 2, '#41553ac9');
  box(c, x - width / 2 + 1, y + 1, (width - 2) * clamp(fraction, 0, 1), height-2, 1, color);
}
// 身体沿来弹方向短促偏移并压扁回正，碰撞位置与脚底阴影保持不变。
function applyImpact(c, target, reduced, strength = 1) {
  if (reduced || !target.flash) return;
  const power = clamp(target.flash / 0.13, 0, 1) * strength;
  c.translate((target.hitX || 0) * power * 5, (target.hitY || 0) * power * 3);
  c.scale(1 + power * 0.12, 1 - power * 0.12);
}
