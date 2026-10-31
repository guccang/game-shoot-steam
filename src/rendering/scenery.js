import {createRenderCanvas} from './canvas-recovery.js';
// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { releaseArtCache } from '../art-styles/cache.js';
import { drawCozyCottage, drawCozyCottageWarmth } from './cozy-cottage.js';
import { drawTownGround, drawTownSign } from './town-layout.js';
import { TOWN_LAYOUT,TOWN_SHIFT_X } from '../config/town-layout.js';
import {WORLD} from '../world/coordinates.js';
import { drawGarage, drawGarageGround } from './garage.js';
import { mixRaster } from './season-raster.js';
import { drawWeaponWorkshop, drawWeaponWorkshopConstruction } from './weapon-workshop-building.js';
import { drawScenerySnow, winterPlant } from './winter-art.js';
import { box, oval, poly } from './primitives.js';
import { nightTexture } from './river.js';
import { COTTAGES, WHEAT_FIELDS, SCENERY, CAMP_PROPS } from '../world/scenery.js';
import { CAMP_PROP_SIZES, drawCampProp } from './camp-props.js';
import { LANDSCAPES } from '../world/landscape-compositions.js';
import { REALM_ENTRANCES } from '../world/realm-entrances.js';
import { drawRealmEntrance, drawRealmEntranceGround } from './realm-entrances.js';

// 建筑和麦田的静态图集；地面底座与可遮挡实体分离，细节只在首次使用时绘制。

const atlas = new Map();
// 共用绘制与动作输入，风格差异由配置提供。
export function drawSceneryGround(c) {
  drawTownGround(c);
  // 屋前浅土色小径接上主路，踏石有疏有密；麦田正面保持开放，不围成封闭院落。
  c.save();
  c.lineCap = 'round';
  c.beginPath();
  c.translate(TOWN_SHIFT_X,0);
  c.moveTo(1008, 598);
  c.bezierCurveTo(1012, 642, 1030, 662, 1021, 705);
  c.lineWidth = 29;
  c.strokeStyle = '#c1bf8740';
  c.stroke();
  c.lineWidth = 19;
  c.strokeStyle = '#d7cf9b70';
  c.stroke();
  for (const [x, y, size] of [
    [1017, 647, 1],
    [1023, 669, 0.88],
    [1024, 689, 0.72],
  ])
    poly(
      c,
      [
        [x - 11 * size, y],
        [x - 5 * size, y - 5],
        [x + 10 * size, y - 3],
        [x + 12 * size, y + 3],
        [x - 4 * size, y + 5],
      ],
      '#cdd0ad',
      '#a3ad86',
      1,
    );
  c.restore();
  for (const field of WHEAT_FIELDS) {
    // 玩家田区由实景种植绘制，不能提前烘焙成静态耕地。
    if (field === WHEAT_FIELDS[0]) continue;
    const left = field.x - field.width / 2,
      height = (field.rows - 1) * 12;
    box(c, left + 6, field.y - 2, field.width + 5, height + 23, 14, '#34533e1c');
    box(c, left + 3, field.y, field.width + 3, height + 17, 10, '#34533e2b');
    box(c, left - 5, field.y - 9, field.width + 10, height + 21, 10, '#b18a45');
    box(c, left - 5, field.y - 13, field.width + 10, height + 18, 10, '#d8b66a');
    box(c, left, field.y - 10, field.width, height + 9, 7, '#9c8349');
    // 田埂亮顶与短小的土层断面落在原有占地内，前沿接触影紧贴麦根。
    box(c, left + 1, field.y + height + 4, field.width - 2, 5, 2, '#edc975');
    box(c, left + 5, field.y + height + 1, field.width - 10, 3, 1, '#846a3c');
    for (let x = left + 14; x < left + field.width - 9; x += 23) {
      poly(
        c,
        [
          [x, field.y + height + 10],
          [x + 3, field.y + height + 10],
          [x + 5, field.y + height + 6],
          [x + 2, field.y + height + 6],
        ],
        '#987741',
        null,
      );
    }
    for (let row = 0; row < field.rows; row++) {
      c.fillStyle = '#b99a50';
      c.fillRect(left + 3, field.y + row * 12 - 5, field.width - 6, 5);
    }
  }
  // 西侧建筑底座跨越循环边缘时，两端地块都烘焙相同的接地细节。
  for (const house of COTTAGES) for(const dx of house.x<150?[0,WORLD.width]:[0]) {
    c.save();
    c.translate(house.x+dx, house.y);
    c.scale(house.size, house.size);
    if (house.kind === 'garage') {
      drawGarageGround(c);
      c.restore();
      continue;
    }
    // 小屋石基在y=0落地，窄接触影贴住墙根；不再复用悬在屋下的大椭圆。
    if (house.kind === 'cottage' && !house.workshop) {
      poly(
        c,
        [
          [-57, -4],
          [61, -15],
          [77, -1],
          [63, 13],
          [-41, 10],
        ],
        '#284f3a25',
        null,
      );
      poly(
        c,
        [
          [-58, -3],
          [33, 0],
          [64, -13],
          [64, -7],
          [33, 7],
          [-58, 4],
        ],
        '#2f493b38',
        null,
      );
      for (const [x, y, rx, ry] of [
        [0, 17, 11, 5],
        [-5, 34, 12, 6],
        [1, 52, 10, 5],
      ])
        oval(c, x, y, rx, ry, '#c5c5a3', '#939e7e', 1);
      c.restore();
      continue;
    }
    poly(
      c,
      [
        [-59, -6],
        [60, -14],
        [88, 15],
        [74, 30],
        [-36, 20],
      ],
      '#284f3a16',
      null,
    );
    poly(
      c,
      [
        [-57, -5],
        [60, -12],
        [81, 15],
        [64, 23],
        [-39, 15],
      ],
      '#284f3a25',
      null,
    );
    oval(c, 4, 5, 63, 12, '#2f493b35');
    oval(c, 2, 3, 54, 6, '#2f493b2c');
    for (let i = 0; i < 4; i++) oval(c, -10 + i * 4, 23 + i * 15, 12, 7, i % 2 ? '#d4d2b2' : '#b9bfa1', '#8f9e7b', 1);
    c.restore();
  }
  oval(c, TOWN_LAYOUT.tent.x + 10, TOWN_LAYOUT.tent.y + 6, 55, 16, '#284f3a38');
  // 景物投影留在缓存地面层，角色绕到前方时不会被影子涂黑。
  for (const prop of [...CAMP_PROPS, ...LANDSCAPES.props]) {
    c.save();
    c.translate(prop.x, prop.y);
    c.scale(prop.size, prop.size);
    if (prop.kind === 'fence') {
      poly(
        c,
        [
          [-47, 2],
          [47, 5],
          [58, 14],
          [-37, 11],
        ],
        '#31523e20',
        null,
      );
      for (const x of [-42, 0, 42]) oval(c, x + 2, 3, 7, 3, '#31523e32');
    } else {
      const width = prop.kind === 'logs' ? 31 : prop.kind === 'stones' ? 29 : 21;
      oval(c, 5, 4, width, 7, '#31523e26');
    }
    c.restore();
  }
}
// 共用的局部造型辅助函数。
// 共用绘制与动作输入，风格差异由配置提供。
function grain(c, x, y, side, fill) {
  c.beginPath();
  c.moveTo(x, y + 2);
  c.quadraticCurveTo(x + side * 5, y + 1, x + side * 4, y - 4);
  c.quadraticCurveTo(x, y - 3, x, y + 2);
  c.fillStyle = fill;
  c.fill();
}
// 共用绘制与动作输入，风格差异由配置提供。
function wheat(c, item, winter) {
  if (style.scenery.fineWheat) {
    const width = item.width,
      phase = item.row % 3;
    // 不规则的叶簇轮廓代替直条色带；小缺口可露出角色的鞋与后排茎秆。
    c.beginPath();
    c.moveTo(-width / 2 - 2, 0);
    c.lineTo(-width / 2 - 2, -17);
    for (let x = -width / 2; x < width / 2; x += 12)
      c.quadraticCurveTo(x + 4, -26 - Math.sin(x * 0.11 + phase) * 2, Math.min(x + 12, width / 2 + 2), -20);
    c.lineTo(width / 2 + 2, 0);
    for (let x = width / 2; x > -width / 2; x -= 10) c.quadraticCurveTo(x - 3, -3, Math.max(x - 10, -width / 2 - 2), 0);
    c.closePath();
    c.fillStyle = '#cca643';
    c.fill();
    c.save();
    c.clip();
    // 连续的大金色面在稀疏穗粒后托底，手机缩小时仍能辨认麦田而非碎点。
    for (let x = -width / 2 - 6; x < width / 2 + 12; x += 17) {
      const y = -22 + Math.sin(x * 0.09 + phase) * 2;
      oval(c, x, y, 14, 10, '#e5bf52');
      oval(c, x - 3, y - 4, 10, 6, winter ? '#e8eacf' : '#f3d36d');
    }
    c.restore();
    for (let i = 0; i <= width / 7; i++) {
      const x = -width / 2 + i * 7 + Math.sin(i * 2.3 + phase) * 2.2,
        height = 21.5 + Math.sin(i * 2.4 + phase * 1.8) * 4.5;
      c.strokeStyle = i % 3 ? '#b58b32' : '#e1ba55';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(x, 1);
      c.quadraticCurveTo(x - 2, -12, x + 1, -height);
      c.stroke();
      c.strokeStyle = '#f5d578';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(x + 1, -height - 4);
      c.lineTo(x + 1, -height + 6);
      c.stroke();
      if (i % 2 === 0) {
        poly(
          c,
          [
            [x, -4],
            [x - 5, -13],
            [x - 1, -11],
            [x + 1, -5],
          ],
          '#eac15b',
          null,
        );
        poly(
          c,
          [
            [x + 1, -7],
            [x + 6, -15],
            [x + 5, -9],
          ],
          '#a97f2f',
          null,
        );
      }
      for (let ear = 0; ear < 3; ear++) {
        const y = -height + ear * 4;
        grain(c, x + 1, y, -1, winter && ear === 0 ? '#f1f4df' : ear === 0 && i % 3 === 0 ? '#ffe59b' : '#f1cf6c');
        grain(c, x + 1, y - 1, 1, ear === 2 ? '#cba13e' : '#e9bc50');
      }
    }
  } else {
    const width = item.width,
      count = Math.ceil(width / 32),
      step = width / count;
    // 间行只露短茎，避免七层深轮廓叠成密集格子；实体及脚底排序仍逐行保留。
    if (item.row % 2) {
      for (let i = 0; i < count; i++) {
        const x = -width / 2 + (i + 0.5) * step;
        poly(
          c,
          [
            [x - 12, 3],
            [x - 15, -10],
            [x - 4, -4],
            [x, -15],
            [x + 5, -3],
            [x + 13, -9],
            [x + 11, 3],
          ],
          winter ? '#e7e6c2' : '#e7b955',
          null,
        );
      }
      return;
    }
    for (let i = 0; i < count; i++) {
      const x = -width / 2 + (i + 0.5) * step,
        h = 23 + Math.sin(i * 2.4) * 2,
        r = step * 0.53;
      c.beginPath();
      c.moveTo(x - r, 3);
      c.lineTo(x - r, -h + 12);
      c.quadraticCurveTo(x - r - 2, -h - 3, x - 6, -h + 1);
      c.quadraticCurveTo(x - 2, -h - 11, x + 3, -h + 1);
      c.quadraticCurveTo(x + r + 3, -h - 8, x + r, -h + 8);
      c.quadraticCurveTo(x + r - 1, -3, x + 7, 3);
      c.lineTo(x - 6, 3);
      c.quadraticCurveTo(x - r, -4, x - r, -h + 12);
      c.closePath();
      c.fillStyle = winter ? '#e7e6c2' : '#f6ca64';
      c.fill();
      c.strokeStyle = '#946938';
      c.lineWidth = 2.8;
      c.lineJoin = 'round';
      c.stroke();
      c.beginPath();
      c.moveTo(x, 2);
      c.quadraticCurveTo(x + 1, -4, x, -9);
      c.strokeStyle = '#c49a4c';
      c.lineWidth = 2.2;
      c.lineCap = 'round';
      c.stroke();
    }
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
function tent(c) {
  poly(
    c,
    [
      [-48, 0],
      [0, -65],
      [47, -57],
      [68, 5],
      [20, 10],
    ],
    '#b49a59',
    '#6a6e46',
    2,
  );
  poly(
    c,
    [
      [-48, 0],
      [0, -65],
      [26, 7],
    ],
    '#efcf83',
    '#6a6e46',
    2,
  );
  poly(
    c,
    [
      [3, -59],
      [47, -57],
      [68, 5],
      [53, 3],
    ],
    '#9c854e',
    null,
  );
  poly(
    c,
    [
      [-48, 0],
      [0, -65],
      [-8, -38],
      [-38, 2],
    ],
    '#f6dfa0',
    null,
  );
  poly(
    c,
    [
      [-27, 1],
      [0, -45],
      [16, 5],
    ],
    '#5b704e',
    '#8e804f',
    2,
  );
  c.strokeStyle = '#f8dfa1';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(0, -65);
  c.lineTo(26, 7);
  c.stroke();
}
// 共用绘制与动作输入，风格差异由配置提供。
function sprite(item, winter) {
  // 图集键与宽穗/短茎的两行周期一致，避免另一行命中错误造型。
  const key =
    `${winter}:` +
    (item.kind === 'wheat'
      ? `wheat:${item.width}:${item.row % style.scenery.wheatRowPeriod}`
      : item.kind +
        (item.workshop
          ? ':workshop:' +
            item.workshop +
            ':' +
            (item.workshopState === 'ruined' || item.workshopState === 'rebuilding' ? 'ruined' : 'ready')
          : ''));
  if (atlas.has(key)) return atlas.get(key);
  const propSize = CAMP_PROP_SIZES[item.kind];
  const width = item.kind === 'wheat' ? item.width + 24 : propSize?.[0] || (item.kind === 'garage' ? 240 : 180);
  const height = item.kind === 'wheat' ? 48 : propSize?.[1] || (item.kind === 'garage' ? 200 : 164);
  const canvas = createRenderCanvas();
  canvas.width = width * 2;
  canvas.height = height * 2;
  const c = canvas.getContext('2d');
  c.scale(2, 2);
  c.translate(width / 2, height - 16);
  if (item.kind === 'wheat') wheat(c, item, winter);
  else if (item.kind === 'cottage') {
    if (item.workshop)
      drawWeaponWorkshop(c, item.workshopState === 'ruined' || item.workshopState === 'rebuilding', winter);
    else drawCozyCottage(c, winter);
  } else if (item.kind === 'garage') drawGarage(c, winter);
  else if (item.kind === 'tent') tent(c);
  else if (winter && item.kind === 'flowers') winterPlant(c);
  else drawCampProp(c, item.kind);
  if (winter && !item.workshop) drawScenerySnow(c, item);
  const entry = { day: canvas, night: null, width, height };
  atlas.set(key, entry);
  return entry;
}
// 共用绘制与动作输入，风格差异由配置提供。
function buildingOpacity(item, player) {
  if (!player || player.flying || !['cottage', 'garage', 'tent'].includes(item.kind)) return 1;
  const size = item.size || 1,
    x = (player.x - item.x) / size,
    y = (player.y - item.y) / size;
  const bounds =
    item.kind === 'garage' ? [-120, 120, -175] : item.kind === 'cottage' ? [-80, 82, -140] : [-62, 80, -80];
  const overlap = Math.max(0, Math.min(1, (x - bounds[0]) / 18, (bounds[1] - x) / 18, (y - bounds[2]) / 18, -y / 12));
  return 1 - 0.45 * overlap * overlap * (3 - 2 * overlap);
}
// 共用绘制与动作输入，风格差异由配置提供。
function sceneryNight(entry, item) {
  const canvas = nightTexture(entry.day);
  if (item.kind === 'cottage' && !item.workshop) {
    const context = canvas.getContext('2d');
    context.save();
    context.scale(2, 2);
    context.translate(entry.width / 2, entry.height - 16);
    drawCozyCottageWarmth(context);
    context.restore();
  }
  return canvas;
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawScenery(c, item, night = 0, player = null, winter = false) {
  if (item.kind === 'district-sign') {
    drawTownSign(c, item, night);
    return;
  }
  const snow = Number(winter),
    frozen = snow >= 1;
  const entry = sprite(item, frozen),
    size = item.size || 1;
  const other = snow > 0 && snow < 1 ? sprite(item, true) : null;
  // 雪层先在透明材质内混合，再统一应用前景透显。
  const image = (dark) => {
    if (dark) {
      entry.night ||= sceneryNight(entry, item);
      if (other) other.night ||= sceneryNight(other, item);
    }
    const key = dark ? 'night' : 'day';
    return other ? mixRaster(entry[key], other[key], snow) : entry[key];
  };
  c.save();
  c.translate(item.x, item.y);
  c.scale(size, size);
  c.globalAlpha *= buildingOpacity(item, player);
  const alpha = c.globalAlpha;
  if (night < 1) {
    // 屋后透显的总不透明度不随昼夜切换叠加变深，始终保留角色可见性。
    c.globalAlpha = (alpha * (1 - night)) / (1 - alpha * night);
    c.drawImage(image(false), -entry.width / 2, 16 - entry.height, entry.width, entry.height);
  }
  if (night > 0) {
    entry.night ||= sceneryNight(entry, item);
    c.globalAlpha = alpha * night;
    c.drawImage(image(true), -entry.width / 2, 16 - entry.height, entry.width, entry.height);
  }
  if (item.workshopState === 'rebuilding') {
    c.globalAlpha = alpha;
    drawWeaponWorkshopConstruction(c, item.rebuildProgress, night, snow, item.reducedMotion);
  }
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawSceneryMap(c, winter = false) {
  // 全图预览与游戏世界一样显示越过西边界的建筑和摆件。
  for (const item of [...SCENERY].sort((a, b) => a.y - b.y)) for(const dx of item.x<180?[0,WORLD.width]:[0]) drawScenery(c, {...item,x:item.x+dx}, 0, null, winter);
  for (const item of REALM_ENTRANCES) {
    for(const dx of item.x<180?[0,WORLD.width]:[0]){const p={...item,x:item.x+dx};drawRealmEntranceGround(c, p);drawRealmEntrance(c, p);}
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
export function sceneryAtlasStats() {
  let bytes = 0;
  for (const entry of atlas.values()) bytes += entry.day.width * entry.day.height * 4 * (entry.night ? 2 : 1);
  return { count: atlas.size, bytes };
}
// 共用绘制与动作输入，风格差异由配置提供。
export function clearArtStyleCache() {
  releaseArtCache(atlas);
}
