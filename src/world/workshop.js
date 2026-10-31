// 工坊安排在西侧整备区；绘制、点击及树冠留白共用位置，不新增碰撞或写入存档。
import { TOWN_LAYOUT } from '../config/town-layout.js';
import { nearest } from './coordinates.js';
// 武器工坊及其泊位整体退入院内，门前候停区与横向主路之间留出草地。
export const WORKSHOP = {...TOWN_LAYOUT.weapons};
export const VEHICLE_WORKSHOP = {...TOWN_LAYOUT.garage};
// 小屋独立放在北门东侧，两座工坊在西侧；门前留出各自停车与步行空间。
export const RANGER_COTTAGE = {...TOWN_LAYOUT.cottage};
// 车库门洞与停车位共用几何；前轮在门槛以内，门前保留上下车空间。
export const GARAGE = Object.freeze({bayHalf:62,bayTop:-104,threshold:4,parkingY:-42,stopY:55});
// 点击主体及门牌使用同一世界范围，循环地图边缘取最近镜像。
export function workshopAt(point, site=WORKSHOP) {
  const p = nearest(site, point);
  return Math.abs(point.x - p.x) <= site.width / 2 && point.y >= p.y - site.height && point.y <= p.y + 20;
}
