import {FIRE_STATION} from '../config/fire-station-layout.js';
// 森林秘境地标共用坐标与触控范围；不写入存档，不改变道路和地形碰撞。
import {TOWN_LAYOUT} from '../config/town-layout.js';
import { nearest } from './coordinates.js';

// 三处挑战入口统一迁入南侧庭院；与任务广场、生活区分开，门前支路互通。
export const REALM_ENTRANCES = [
  { type: 'realm-entrance', mode: 'tower', ...TOWN_LAYOUT.tower, width: 112, height: 166 },
  { type: 'realm-entrance', mode: 'rogue', ...TOWN_LAYOUT.rogue, width: 126, height: 126 },
  { type:'realm-entrance',mode:'fire',...FIRE_STATION },
  { type: 'realm-entrance', mode: 'guardian', ...TOWN_LAYOUT.guardian, width: 132, height: 128 },
];

// 秘境内复用正式高塔轮廓，放在落点左侧，为角色和载具保留前方活动空间。
export function towerRealmLandmark(arena) {
  return { ...REALM_ENTRANCES[0], x: arena.x - 110, y: arena.y + 35 };
}

// 使用最近周期镜像命中建筑主体，缩放与屏幕坐标转换由界面层负责。
export function realmEntranceAt(point) {
  return [...REALM_ENTRANCES].reverse().find(entry => {
    const p = nearest(entry, point), dx = point.x - p.x, dy = point.y - p.y;
    return Math.abs(dx) <= entry.width / 2 && dy >= -entry.height && dy <= 16;
  }) || null;
}

// 为完整树冠与门前小径留白，入口附近不补种新树，不挤占营地中央活动区。
export function coversRealmEntrance(x, y) {
  return REALM_ENTRANCES.some(entry => {
    const p = nearest(entry, { x, y });
    return x + 56 > p.x - entry.width / 2 - 24 && x - 56 < p.x + entry.width / 2 + 24 &&
      y + 12 > p.y - entry.height - 20 && y - 140 < p.y + 80;
  });
}
