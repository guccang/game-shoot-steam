import {drawBuildingArchitecture} from './building-architecture.js';
import {createRenderCanvas,watchRenderCanvas} from './canvas-recovery.js';
import { onArtStyleChange } from '../art-styles/state.js';
// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { releaseArtCache } from '../art-styles/cache.js';
import { LIVING_PLACES, MAIN_LIVING_RESULTS } from '../config/living-world.js';
import { livingForest } from '../world/living-spaces.js';
import { calendarView } from '../world/living-calendar.js';
import { nearest, worldDistance, visibleBodies } from '../world/coordinates.js';
import { box, oval, poly } from './primitives.js';
import { canvasFont } from './text-style.js';
import { catSprites } from './cat-animation.js';
import { drawSlime } from './enemies.js';
import { drawNewBoss } from './bosses.js';

// 生活设施与常驻居民使用正式Canvas层级；主体、劳动部件和地面分别绘制。

let EDGE = style.livingWorld.materialColor;
const facilityCache = new Map(),
  CACHE_LIMIT = 18;
// 共用绘制与动作输入，风格差异由配置提供。
export function livingRenderBudget() {
  return {
    entries: facilityCache.size,
    bytes: facilityCache.size * 320 * 320 * 4,
    maxBytes: CACHE_LIMIT * 320 * 320 * 4,
  };
}
// 共用绘制与动作输入，风格差异由配置提供。
export function clearLivingRenderCache() {
  facilityCache.clear();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawLivingGround(c, game, night, view) {
  if (!livingForest(game)) return;
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (const p of visibleBodies(Object.values(LIVING_PLACES), view, 100))
    oval(c, p.x, p.y + 10, p.width * 0.65, 30, night > 0.5 ? '#7a8879' : style.livingWorld.drawLivingGroundColor);
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function livingObjects(game) {
  if (!livingForest(game)) return [];
  const q = game.progress.living.requests,
    calendar = calendarView(game.progress.living.calendar);
  return [
    ...Object.entries(LIVING_PLACES)
      .filter(([id]) => id !== 'basket' || q['neighbors-lunch'].stage === 1)
      .map(([id, p]) => ({
        ...p,
        id,
        type: 'living-facility',
        results: MAIN_LIVING_RESULTS.filter((r) => r.place === id && game.progress.story.chapters[r.id]?.completed).map(
          (r) => r.kind,
        ),
        restored: game.progress.story.chapters['sunleaf-01']?.completed || q['neighbors-night'].completed,
        washed: q['neighbors-lunch'].completed||game.progress.story.chapters['equipment-water']?.completed,
        pots: q['neighbors-market'].completed,
        market:
          (calendar.market && q['neighbors-market'].completed) ||
          (q['neighbors-market'].stage >= 2 && !q['neighbors-market'].completed),
      })),
    ...[...(game.livingActors?.values() || [])].filter((r) => r.hero !== game.progress.hero),
  ];
}
// 共用绘制与动作输入，风格差异由配置提供。
function bowl(c, x, y, flowers = false) {
  poly(
    c,
    [
      [x - 10, y - 5],
      [x + 10, y - 5],
      [x + 7, y + 5],
      [x - 7, y + 5],
    ],
    '#bd9870',
    EDGE,
    1.5,
  );
  oval(c, x, y - 5, 10, 3, '#e4c996', EDGE, 1.5);
  if (flowers) {
    for (const dx of [-5, 3]) {
      c.strokeStyle = EDGE;
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x, y - 5);
      c.lineTo(x + dx, y - 22);
      c.stroke();
      oval(c, x + dx, y - 22, 5, 4, '#e8e0bb', EDGE, 1);
    }
    oval(c, x, y + 1, 1.5, 1.5, EDGE);
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
function shelter(c, width, height, wood, roof) {
  for (const x of [-width / 2 + 9, width / 2 - 9])
    box(c, x - 4, -height + 18, 8, height - 18, 2, wood, EDGE, style.livingWorld.shelterValue);
  poly(
    c,
    [
      [-width / 2 - 5, -height + 20],
      [0, -height - 2],
      [width / 2 + 5, -height + 20],
      [width / 2 - 4, -height + 30],
      [-width / 2 + 4, -height + 30],
    ],
    roof,
    EDGE,
    style.livingWorld.shelterValue2,
  );
}
// 共用绘制与动作输入，风格差异由配置提供。
function lamp(c, x, y, lit) {
  box(c, x - 4, y - 8, 8, 25, 2, '#a58c61', EDGE, 1.5);
  box(c, x - 8, y - 24, 16, 18, 4, lit ? '#f1dc91' : '#8a9c79', EDGE, style.livingWorld.shelterValue);
  if (lit) oval(c, x, y - 16, 4, 6, '#fff0bb');
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawLivingObject(c, item, game, night, reduced) {
  if (item.type === 'living-resident') {
    drawResident(c, item, game, night, reduced);
    return;
  }
  const key = [
    item.kind,
    night > 0.5,
    item.restored,
    item.washed,
    item.pots,
    item.market,
    (item.results || []).join(','),
  ].join(':');
  let atlas = facilityCache.get(key);
  if (!atlas) {
    atlas =
      typeof OffscreenCanvas === 'function'
        ? watchRenderCanvas(new OffscreenCanvas(320, 320))
        : Object.assign(createRenderCanvas(), { width: 320, height: 320 });
    const context = atlas.getContext('2d');
    context.scale(2, 2);
    drawFacility(context, { ...item, x: 80, y: 130 }, night);
    if (facilityCache.size >= CACHE_LIMIT) facilityCache.delete(facilityCache.keys().next().value);
    facilityCache.set(key, atlas);
  }
  c.drawImage(atlas, item.x - 80, item.y - 130, 160, 160);
}
// 共用绘制与动作输入，风格差异由配置提供。
function drawFacility(c, item, night) {
  if(['kitchen','relay'].includes(item.kind)){c.save();c.translate(item.x,item.y);drawBuildingArchitecture(c,item.kind,false,night);c.restore();return;}
  c.save();
  c.translate(item.x, item.y);
  const wood = night > 0.5 ? '#938260' : '#bc9b6c',
    cream = night > 0.5 ? '#bdc2a2' : '#f1e4bb',
    roof = night > 0.5 ? '#527362' : '#7b9b69';
  oval(c, 4, 7, item.width * 0.5, 12, '#29423530');
  if (item.kind === 'kitchen') {
    shelter(c, 140, 92, wood, roof);
    box(c, -55, -30, 110, 30, 5, wood, EDGE, style.livingWorld.shelterValue);
    box(c, -49, -36, 98, 10, 3, cream, EDGE, style.livingWorld.shelterValue);
    box(c, -40, -27, 27, 22, 4, '#667763', EDGE, style.livingWorld.shelterValue);
    oval(c, -27, -36, 17, 8, '#73816c', EDGE, style.livingWorld.shelterValue);
    oval(c, -27, -39, 14, 5, '#bec58b', EDGE, 1.5);
    box(c, 10, -34, 34, 12, 4, '#749a8c', EDGE, style.livingWorld.shelterValue);
    for (let i = 0; i < (item.washed ? 3 : 1); i++) bowl(c, 37 - i * 2, -40 - i * 7);
  } else if (item.kind === 'pottery') {
    for (const x of [-42, 32]) box(c, x, -24, 9, 27, 2, wood, EDGE, style.livingWorld.shelterValue);
    box(c, -52, -36, 104, 14, 4, cream, EDGE, style.livingWorld.shelterValue);
    bowl(c, -25, -40);
    bowl(c, 8, -40, item.pots);
    oval(c, 36, -39, 9, 5, '#ae8764', EDGE, 1.5);
  } else if (item.kind === 'roost') {
    box(c, -8, -102, 16, 107, 5, wood, EDGE, style.livingWorld.shelterValue);
    poly(
      c,
      [
        [-46, -70],
        [45, -76],
        [47, -63],
        [-43, -58],
      ],
      wood,
      EDGE,
      style.livingWorld.shelterValue,
    );
    poly(
      c,
      [
        [-49, -95],
        [4, -116],
        [52, -94],
        [47, -82],
        [-44, -82],
      ],
      roof,
      EDGE,
      style.livingWorld.shelterValue2,
    );
    box(c, -35, -73, 29, 12, 4, cream, EDGE, 1.5);
    lamp(c, 26, -35, night > 0.5);
    if (item.pots) {
      bowl(c, -27, -7, true);
      bowl(c, 26, -2, true);
    }
  } else if (item.kind === 'relay') {
    shelter(c, 104, 100, wood, roof);
    box(c, -42, -37, 84, 36, 5, wood, EDGE, style.livingWorld.shelterValue);
    box(c, -35, -43, 45, 25, 3, cream, EDGE, 1.5);
    for (let i = 0; i < 3; i++) box(c, -29, -37 + i * 6, item.restored ? 30 : 16, 2, 1, EDGE);
    lamp(c, 30, -48, item.restored || night > 0.5);
  } else if (item.kind === 'letters') {
    for (const x of [-38, 30]) box(c, x, -23, 8, 28, 2, wood, EDGE, style.livingWorld.shelterValue);
    box(c, -45, -33, 90, 13, 4, cream, EDGE, style.livingWorld.shelterValue);
    for (const x of [-24, 0, 22]) {
      box(c, x - 9, -40, 18, 9, 1, '#fff0c9', EDGE, 1);
      poly(
        c,
        [
          [x - 9, -40],
          [x, -34],
          [x + 9, -40],
        ],
        cream,
        EDGE,
        1,
      );
    }
    box(c, -30, -3, 60, 7, 3, wood, EDGE, style.livingWorld.shelterValue);
    lamp(c, 45, -35, night > 0.5);
  } else if (item.kind === 'market') {
    shelter(c, 120, 65, wood, roof);
    box(c, -50, -28, 100, 28, 4, wood, EDGE, style.livingWorld.shelterValue);
    box(c, -54, -34, 108, 9, 3, cream, EDGE, style.livingWorld.shelterValue);
    if (item.market) {
      bowl(c, -30, -40, true);
      bowl(c, 0, -40);
      lamp(c, 30, -31, true);
    } else {
      box(c, -39, -22, 32, 20, 3, '#8c9e78', EDGE, style.livingWorld.shelterValue);
      box(c, 7, -25, 31, 23, 3, '#aab78c', EDGE, style.livingWorld.shelterValue);
    }
  } else if (item.kind === 'flowers') {
    for (const x of [-24, 0, 24]) {
      bowl(c, x, 0);
      if (night > 0.5) bowl(c, x, 0, true);
    }
  } else if (item.kind === 'basket') {
    box(c, -19, -18, 38, 20, 5, wood, EDGE, style.livingWorld.shelterValue);
    for (const x of [-12, 0, 12]) oval(c, x, -19, 6, 6, '#b3c27e', EDGE, 1);
    c.beginPath();
    c.arc(0, -18, 16, Math.PI, 0);
    c.strokeStyle = EDGE;
    c.lineWidth = 3;
    c.stroke();
  } else {
    box(c, -4, -44, 8, 49, 2, wood, EDGE, style.livingWorld.shelterValue);
    poly(
      c,
      [
        [0, -61],
        [26, -29],
        [-26, -29],
      ],
      '#d8b77c',
      EDGE,
      style.livingWorld.shelterValue,
    );
    box(c, -2, -50, 4, 11, 1, EDGE);
    oval(c, 0, -34, 2, 2, EDGE);
  }
  // 回信之外保留照料和合乘记录，复用纸张、木牌材质及现有设施缓存上限。
  if(item.results?.includes('water-record')||item.results?.includes('ride-record')){box(c,24,-30,24,29,3,cream,EDGE,1.5);for(let i=0;i<3;i++)box(c,29,-24+i*7,14,2,1,EDGE);}
  if (item.results?.includes('supply')) {
    box(c, -42, -55, 23, 20, 3, roof, EDGE, 1.5);
    box(c, -33, -55, 4, 20, 1, cream);
  }
  if (item.results?.includes('timber'))
    for (let i = 0; i < 3; i++) {
      box(c, -36 + i * 13, -19, 10, 16, 3, wood, EDGE, 1);
      oval(c, -31 + i * 13, -19, 5, 3, cream, EDGE, 1);
    }
  if (item.results?.includes('tools')) {
    box(c, -24, -15, 38, 13, 3, '#7c9381', EDGE, 1.5);
    box(c, -11, -20, 12, 6, 2, wood, EDGE, 1);
  }
  if (item.results?.includes('beacon')) lamp(c, -37, -50, true);
  if (item.results?.includes('radio')) {
    box(c, 12, -58, 29, 23, 4, roof, EDGE, 1.5);
    box(c, 16, -53, 15, 9, 2, cream, EDGE, 1);
    box(c, 35, -71, 2, 15, 1, EDGE);
    oval(c, 35, -43, 2, 2, cream);
  }
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
function drawResident(c, r, game, night, reduced) {
  c.save();
  c.translate(r.x, r.y - (r.elevation || 0));
  const time = reduced ? 0 : r.clock;
  if (Number.isInteger(r.hero)) {
    c.save();
    c.scale(0.7, 0.7);
    if (!catSprites.draw(c, r.hero, r.motion, { bodyX: 0, bodyY: 0 }, reduced)) throw Error('常驻居民猫猫图集未就绪');
    c.restore();
  } else {
    const entity = { ...r.appearance, x: 0, y: 0, phase: 0, hp: 1, maxHp: 1, radius: 17 };
    c.save();
    if (entity.type === 'boss') {
      c.scale(0.65, 0.65);
      drawNewBoss(c, entity, time, reduced);
    } else drawSlime(c, entity, time, reduced);
    c.restore();
  }
  if (!r.moving && !['rest', 'walk', 'flowers', 'shelter'].includes(r.action)) {
    const phase = reduced ? 0 : Math.sin(time * 3.8),
      x = 19 + phase * 4,
      y = -13 + Math.cos(time * 3.8) * 3;
    // 两只手分别接触碗沿与工具柄，身体不被整体旋转或拉伸。
    oval(c, -19, -14, 5, 4, '#e8d9b1', EDGE, 1.3);
    oval(c, x, y, 5, 4, '#e8d9b1', EDGE, 1.3);
    if (['wash', 'eat', 'cook', 'pottery', 'market'].includes(r.action)) {
      bowl(c, 0, -9);
      if (r.action === 'wash') {
        oval(c, 0, -12, 8, 2, '#8fbcc2');
        oval(c, phase * 5, -16, 2, 2, '#dce8dc');
      }
      if (r.action === 'cook' || r.action === 'pottery') {
        c.strokeStyle = EDGE;
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(phase * 5, -15);
        c.stroke();
      }
    } else if (['repair', 'watch', 'handover'].includes(r.action)) {
      lamp(c, 0, -4, night > 0.5);
      box(c, x - 2, y - 12, 4, 13, 1, '#aa8b61', EDGE, 1);
      box(c, x - 7, y - 15, 14, 5, 1, '#9aa99a', EDGE, 1);
    } else {
      box(c, -12, -17, 24, 13, 2, '#f1e6bd', EDGE, 1);
      c.strokeStyle = EDGE;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(-12, -17);
      c.lineTo(0, -10);
      c.lineTo(12, -17);
      c.stroke();
    }
  }
  if (worldDistance(r, game.player) < 100) {
    c.font = canvasFont(11);
    c.textAlign = 'center';
    c.fillStyle = night > 0.5 ? '#f3e8bf' : EDGE;
    c.fillText(r.name, 0, 19);
  }
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function clearArtStyleCache() {
  releaseArtCache(facilityCache);
}

// 同步共享模块顶层的材质常量，后续绘制立即使用新配置。
onArtStyleChange(() => {
  EDGE = style.livingWorld.materialColor;
});
