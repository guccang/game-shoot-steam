import {drawBiomeDumpling} from './biome-dumplings.js';
import {createRenderCanvas} from './canvas-recovery.js';
// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { releaseArtCache } from '../art-styles/cache.js';
import { drawMonsterDeath } from './monster-death.js';
import { dumplingPose } from '../combat/dumpling-motion.js';
import { drawDumplingBody } from './dumpling-body.js';
import { poly } from './primitives.js';
import { monsterHitProfile } from '../config/monster-hit-reactions.js';
import { monsterHitPose } from './monster-hit-reactions.js';
import { ARMORED } from '../config/armored-enemies.js';
import { drawArmoredMonster } from './armored-enemies.js';
import { drawEmberMonster } from './fire-rescue.js';
import { RANGED_ENEMIES } from '../config/ranged-enemies.js';
import { drawRangedMonster } from './ranged-enemies.js';
import { BIOMES } from '../world/biomes.js';
import { paintFlyingMonster } from './flying-monster.js';

// 沿用 game-slg 的帧清单、24 FPS 独立时钟、脚底锚点与图集裁切；图集由本地矢量预绘制。

export const MONSTER_ATLAS = {
  size: 96,
  anchor: [48, 72],
  fps: 24,
  clips: {
    idle: { row: 0, count: 8, loop: true },
    roll: { row: 1, count: 8, loop: true },
    recover: { row: 2, count: 6, loop: false },
    burst: { row: 3, count: 8, loop: false },
  },
};
const cache = new Map();
// 共用绘制与动作输入，风格差异由配置提供。
export function monsterFrame(clip, elapsed) {
  const spec = MONSTER_ATLAS.clips[clip] || MONSTER_ATLAS.clips.idle;
  const frame = spec.loop
    ? Math.floor(Math.max(0, elapsed) * 24) % spec.count
    : Math.min(spec.count - 1, Math.floor(Math.max(0, elapsed) * 24));
  return { x: frame * 96, y: spec.row * 96, w: 96, h: 96, index: frame };
}
// 共用绘制与动作输入，风格差异由配置提供。
function paintFrame(c, zone, rank, clip, index, count, species) {
  const t = index / (count - 1),
    wave = Math.sin((index / count) * Math.PI * 2);
  if (clip === 'burst') {
    c.globalAlpha = 1 - t;
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4,
        r = 8 + t * 29;
      c.save();
      c.translate(Math.cos(a) * r, -18 + Math.sin(a) * r * 0.7);
      c.rotate(a + t * 3);
      c.fillStyle = i % 3 ? zone.monster : zone.accent;
      c.fillRect(-5, -4, 10 - (i % 3), 8);
      c.restore();
    }
    return;
  }
  if (species === 'leaf-bat') {
    paintFlyingMonster(c, zone, rank, clip, index, count);
    return;
  }
  c.translate(0, clip === 'idle' ? wave * 1.2 : 0);
  const squash = clip === 'roll' ? wave * 0.18 : clip === 'recover' ? (1 - t) * 0.23 : wave * 0.025;
  c.scale(1 + squash, 1 - squash);
  const motion = slimeDeformation(clip, index, count);
  c.beginPath();
  c.moveTo(-22, 0);
  c.bezierCurveTo(-29 + motion.left, -18, -13 + motion.crest, -40, motion.crest, -38);
  c.bezierCurveTo(17 + motion.crest, -40, 29 + motion.right, -16, 23, 0);
  c.bezierCurveTo(16, 10, -18, 9, -22, 0);
  c.fillStyle = zone.monster;
  c.fill();
  c.strokeStyle = style.monsterAtlas.paintFrame_strokeStyleColor;
  c.lineWidth = style.monsterAtlas.paintFrame_lineWidthValue;
  c.stroke();
  c.fillStyle = zone.accent;
  c.beginPath();
  c.ellipse(-6 + motion.crest * 0.65, -26 + motion.face, 9, 4, -0.4, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = style.monsterAtlas.paintFrame_fillStyleColor;
  for (const x of [-7, 8]) {
    c.beginPath();
    c.ellipse(x + motion.crest * 0.3, -13 + motion.face, 2.2, clip === 'roll' ? 1.4 : 3, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.strokeStyle = style.monsterAtlas.paintFrame_fillStyleColor;
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(-2 + motion.crest * 0.3, -8 + motion.face);
  c.quadraticCurveTo(1, -4 + motion.face, 5 + motion.crest * 0.3, -8 + motion.face);
  c.stroke();
  if (rank > 0) {
    c.save();
    c.translate(motion.crest * 0.75, motion.face * 0.35);
    c.rotate(motion.crest * 0.012);
    c.fillStyle = rank === 2 ? '#c4aa63' : '#587963';
    c.beginPath();
    c.moveTo(-22, -29);
    c.lineTo(-17, -44);
    c.lineTo(-6, -38);
    c.lineTo(1, -47);
    c.lineTo(10, -38);
    c.lineTo(21, -43);
    c.lineTo(22, -29);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
  }
  if (rank === 2) {
    c.strokeStyle = '#ebcf85';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(-21, -2);
    c.quadraticCurveTo(0, 10, 22, -2);
    c.stroke();
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
export function slimeDeformation(clip, index, count) {
  const progress = index / Math.max(1, count - 1);
  const phase = (index / count) * Math.PI * 2;
  const amplitude = clip === 'roll' ? 3.8 : clip === 'recover' ? (1 - progress) * 5 : 0.65;
  return {
    left: Math.sin(phase) * amplitude,
    right: Math.sin(phase + Math.PI * 0.65) * amplitude,
    crest: Math.sin(phase - Math.PI * 0.4) * amplitude,
    face: Math.sin(phase - Math.PI * 0.8) * amplitude * 0.45,
  };
}
// 共用绘制与动作输入，风格差异由配置提供。
export function getMonsterAtlas(biome = 'meadow', rank = 0, profiler = null, species = 'slime') {
  const key = biome + ':' + rank + ':' + species;
  if (cache.has(key)) return cache.get(key);
  const started = profiler?.enabled ? profiler.now() : 0;
  const zone = BIOMES.find((b) => b.id === biome) || BIOMES[0],
    canvas = createRenderCanvas();
  canvas.width = 768;
  canvas.height = 384;
  const c = canvas.getContext('2d');
  for (const [clip, spec] of Object.entries(MONSTER_ATLAS.clips))
    for (let frame = 0; frame < spec.count; frame++) {
      c.save();
      c.translate(frame * 96 + 48, spec.row * 96 + 72);
      paintFrame(c, zone, rank, clip, frame, spec.count, species);
      c.restore();
    }
  cache.set(key, canvas);
  if (profiler?.enabled)
    profiler.event('monster-atlas-build', {
      key,
      ms: profiler.now() - started,
      width: canvas.width,
      height: canvas.height,
    });
  return canvas;
}
// 共用绘制与动作输入，风格差异由配置提供。
export function monsterAtlasStats() {
  return { count: cache.size, bytes: cache.size * 768 * 384 * 4 };
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawMonsterSprite(c, enemy, time, reduced = false, profiler = null) {
  if (drawMonsterDeath(c, enemy, reduced)) return;
  if (enemy.species === ARMORED.id) return drawArmoredMonster(c, enemy, time, reduced);
  if (enemy.ember) return drawEmberMonster(c, enemy, time, reduced);
  if (RANGED_ENEMIES[enemy.species]) return drawRangedMonster(c, enemy, time, reduced);
  const round = monsterHitProfile(enemy).roll,
    hit = monsterHitPose(enemy, reduced),
    rolling = enemy.knockTime > 0,
    deathAge = (enemy.duration || 0.6) - enemy.life,
    bursting = enemy.burst && deathAge >= (enemy.burstDelay || 0),
    clip = bursting
      ? 'burst'
      : rolling
        ? 'roll'
        : (round ? Math.abs(enemy.rollAngle || 0) > 0.1 : hit.strength > 0.025)
          ? 'recover'
          : 'idle';
  const clock = bursting
    ? ((deathAge - (enemy.burstDelay || 0)) / ((enemy.duration || 0.6) - (enemy.burstDelay || 0))) * 0.33
    : clip === 'idle'
      ? time + (enemy.phase || 0)
      : !round && clip === 'recover'
        ? ((1 - hit.strength) * 5) / 24
        : enemy.reactionTime || 0;
  const frame = monsterFrame(clip, reduced ? 0 : clock);
  const zone = BIOMES.find((b) => b.id === enemy.biome) || BIOMES[0];
  c.save();
  c.translate(0, -(reduced ? 0 : enemy.z || 0) - 14);
  if (!reduced && round && (!bursting || enemy.burstDelay)) c.rotate(enemy.rollAngle || 0);
  if (enemy.burst) c.globalAlpha *= Math.min(1, enemy.life / 0.2);
  if (enemy.flash) c.globalAlpha = 0.7;
  if (bursting) {
    const atlas = getMonsterAtlas(enemy.biome, enemy.rank || 0, profiler, enemy.species);
    c.drawImage(atlas, frame.x, frame.y, 96, 96, -48, -58, 96, 96);
  } else {
    c.translate(0, 14);
    const pose = dumplingPose(enemy, reduced);
    if(enemy.dumplingVariant)drawBiomeDumpling(c,enemy,pose,reduced);
    else if (enemy.species === 'leaf-bat')
      paintFlyingMonster(c, zone, enemy.rank || 0, clip, frame.index, MONSTER_ATLAS.clips[clip].count, pose,{x:enemy.campLookX,y:enemy.campLookY});
    else drawPlainDumpling(c, enemy, zone, pose);
  }
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
function drawPlainDumpling(c, enemy, zone, pose) {
  const body = drawDumplingBody(c, { width: 23, height: 38, color: zone.monster, accent: zone.accent, pose,lookX:enemy.campLookX||0,lookY:enemy.campLookY||0 });
  if (enemy.rank > 0) {
    c.save();
    c.translate(pose.sway * 0.7, body.top + 38);
    poly(
      c,
      [
        [-22, -29],
        [-17, -44],
        [-6, -38],
        [1, -47],
        [10, -38],
        [21, -43],
        [22, -29],
      ],
      enemy.rank === 2 ? '#c4aa63' : '#587963',
      '#44594d',
      2,
    );
    c.restore();
  }
  if (enemy.rank === 2) {
    c.beginPath();
    c.moveTo(-body.width * 0.9, body.bottom - 2);
    c.quadraticCurveTo(0, body.bottom + 6, body.width * 0.9, body.bottom - 2);
    c.strokeStyle = '#ebcf85';
    c.lineWidth = 3;
    c.stroke();
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
export function clearArtStyleCache() {
  releaseArtCache(cache);
}
