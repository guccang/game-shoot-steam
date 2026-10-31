// 场景装饰只提供绘制锚点，不改变碰撞、采集奖励或存档中的世界实体。
import {TOWN_LAYOUT,TOWN_SIGNS,TOWN_SHIFT_X} from '../config/town-layout.js';
import { riverXAt, riverHalfWidth } from './river-geometry.js';
import { riverBeachWidth } from './natural-terrain.js';
import { WORKSHOP, VEHICLE_WORKSHOP, RANGER_COTTAGE } from './workshop.js';
import { canonical } from './coordinates.js';
import { LANDSCAPES, inLandscapeBeach } from './landscape-compositions.js';

// 沙湾向陆地缓缓展开，首尾收回原河岸，桥头和实际可通行水界保持原状。
export function beachWidth(y) {
  return Math.max(riverBeachWidth(y, -1), riverBeachWidth(y, 1));
}

// 草花避开沙地，麦田与沙滩纹理因此不会混成同一种地表。
export function isBeachScenery(x, y) {
  if (inLandscapeBeach(x,y)) return true;
  const p = canonical({ x, y }), side = p.x < riverXAt(p.y) ? -1 : 1, width = riverBeachWidth(p.y, side);
  return width > 0 && Math.abs(p.x - riverXAt(p.y)) < riverHalfWidth(p.y, side) + 5 + width;
}

export const COTTAGES = [
  { type: 'scenery', kind: 'cottage', ...RANGER_COTTAGE, size: 1 },
  { type: 'scenery', kind: 'cottage', x: WORKSHOP.x, y: WORKSHOP.y, size: WORKSHOP.scale, workshop: true },
  { type:'scenery',kind:'garage',x:VEHICLE_WORKSHOP.x,y:VEHICLE_WORKSHOP.y,width:VEHICLE_WORKSHOP.width,height:VEHICLE_WORKSHOP.height,size:1,workshop:'vehicle' },
];
export const WHEAT_FIELDS = [
  { x: 865+TOWN_SHIFT_X, y: 610, width: 208, rows: 7 },
  { x: 1450, y: 620, width: 154, rows: 6 },
  { x: 2410, y: 1240, width: 202, rows: 8 },
];
// 装饰只沿屋侧、田后和草场外缘成组摆放；田前、屋门与桥头之间保留开放通路。
export const CAMP_PROPS = [
  { kind: 'fence', x: 795+TOWN_SHIFT_X, y: 563, size: 0.9 },
  { kind: 'fence', x: 885+TOWN_SHIFT_X, y: 567, size: 0.9 },
  { kind: 'fence', x: VEHICLE_WORKSHOP.x+88, y: VEHICLE_WORKSHOP.y+48, size: 0.88 },
  { kind: 'fence', x: 235+TOWN_SHIFT_X, y: 1160, size: 0.85 },
  { kind: 'logs', x: WORKSHOP.x+90, y: WORKSHOP.y-20, size: 0.9 },
  { kind: 'logs', x: 515+TOWN_SHIFT_X, y: 860, size: 0.85 },
  { kind: 'logs', x: RANGER_COTTAGE.x+90, y: RANGER_COTTAGE.y+20, size: 0.8 },
  // 田牌旁石堆退到主路西侧，与大石成组，不占道路或田地入口。
  { kind: 'stones', x: 615+TOWN_SHIFT_X, y: 590, size: 0.75 },
  { kind: 'stones', x: 1100+TOWN_SHIFT_X, y: 678, size: 0.7 },
  { kind: 'stones', x: 1040+TOWN_SHIFT_X, y: 1120, size: 0.8 },
  { kind: 'flowers', x: 749+TOWN_SHIFT_X, y: 685, size: 0.9 },
  { kind: 'flowers', x: WORKSHOP.x+120, y: WORKSHOP.y+15, size: 1 },
  { kind: 'flowers', x: 1144+TOWN_SHIFT_X, y: 651, size: 0.85 },
  { kind: 'flowers', x: 745+TOWN_SHIFT_X, y: 1105, size: 0.8 },
  { kind: 'flowers', x: 875+TOWN_SHIFT_X, y: 1220, size: 0.9 },
  { kind: 'flowers', x: RANGER_COTTAGE.x+70, y: RANGER_COTTAGE.y+45, size: 0.8 },
].map(prop => ({ type: 'scenery', ...prop }));
// 麦田逐行参与脚底排序，角色进入田内时仅被前排麦穗遮住下半身。
export const SCENERY = [
  ...LANDSCAPES.props,
  ...COTTAGES,
  ...CAMP_PROPS,
  { type: 'scenery', kind: 'tent', ...TOWN_LAYOUT.tent, size: 1 },
  ...TOWN_SIGNS,
  // 第一片麦田由玩家亲手开垦，跳过静态装饰作物。
  ...WHEAT_FIELDS.flatMap((field, fieldIndex) =>
    Array.from({ length: fieldIndex===0?0:field.rows }, (_, row) => ({
      type: 'scenery', kind: 'wheat', x: field.x + (row % 2 ? 3 : -2),
      y: field.y + row * 12, width: field.width - (row === 0 || row === field.rows - 1 ? 16 : 0),
      row, fieldIndex,
    }))),
];
