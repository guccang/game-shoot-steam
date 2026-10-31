import {REPAIR_CENTER} from '../config/vehicle-repair.js';
import {TOWN_LAYOUT,TOWN_SHIFT_X} from '../config/town-layout.js';
import {FARM_DELIVERY,FARM_SEED_SHOP} from '../config/farm.js';
import {TreeSpacingIndex} from './forest-expansion.js';
import {PARKING_SPOTS} from '../config/parking.js';
import {BOSS_CLEARING} from '../config/settlements.js';
import {RIVER_DOCKS} from '../config/river-crossing.js';
import {livingClearing} from './living-spaces.js';
import {RANGER} from '../config/ranger-arrival.js';
import {STORY_POSTS} from '../config/story-posts.js';
// 营地疏林规则：为活动空地和地标保留树冠空间，外围仍保留可采集的成组树林。
import { canonical, worldDistance, nearest } from './coordinates.js';
import { COTTAGES, WHEAT_FIELDS, SCENERY } from './scenery.js';
// 快递站与小屋共用树冠净空，列表只创建一次，避免逐棵树分配。
const CLEARING_BUILDINGS=[REPAIR_CENTER,...COTTAGES,FARM_DELIVERY,FARM_SEED_SHOP];
import { riverBeachWidth, excludesNaturalScenery } from './natural-terrain.js';
import { riverXAt, riverHalfWidth } from './river-geometry.js';
import { coversRealmEntrance } from './realm-entrances.js';
import { coversLandscape } from './landscape-compositions.js';

// 树群退到生活区边缘、工坊侧后和东岸；任务广场与南侧门前不布树。
export const CAMP_EDGE_TREES = [
  {x:580+TOWN_SHIFT_X,y:300,size:.82},{x:580+TOWN_SHIFT_X,y:1180,size:.72},
  {x:1460,y:860,size:.94},{x:1420,y:960,size:.76},
];
// 固定采集树与随机树采用相同的车位树冠净空，避免布局迁移后树梢压住车位。
export function parkingClearing(x,y){
 return PARKING_SPOTS.some(s=>{const p=nearest({x,y},s);return p.x+56>s.x-65&&p.x-56<s.x+65&&p.y+12>s.y-55&&p.y-140<s.approachY+45;});
}

// 局部构图只接管营地到桥头的树位；外围密林与其他区域保持原生成规则。
export function inCampComposition(x, y) {
  ({ x, y } = canonical({ x, y }));
  const b=TOWN_LAYOUT.bounds;
  const p=nearest({x,y},{x:(b.left+b.right)/2,y:1000});
  return (p.x>b.left-40&&p.x<b.right+40&&p.y>b.top&&p.y<2040+90)||(x>1090&&x<1540&&y>360&&y<1190);
}

// 以树冠包围范围检查地标留白，避免树根虽在外侧、前景树冠却压住整个地标。
export function coversScenery(x, y) {
  ({ x, y } = canonical({ x, y }));
  if(livingClearing(x,y)||worldDistance({x,y},BOSS_CLEARING)<180)return true;
  // 渡口平台、船形路牌和岸边入口留出完整树冠净空。
  if(RIVER_DOCKS.some(d=>Math.abs(x-d.x)<115&&y>d.y-100&&y<d.y+170))return true;
  // 配置新增林间任务点时同时保留建筑前与屋顶的树冠空间。
  if(STORY_POSTS.some(p=>p.mapId==='forest'&&Math.abs(x-p.x)<125&&y>p.y-135&&y<p.y+175))return true;
  if (coversRealmEntrance(x, y)) return true;
  if (coversLandscape(x, y)) return true;
  if (excludesNaturalScenery(x, y, true)) return true;
  const left = x - 56, right = x + 56, top = y - 140, bottom = y + 12;
  // 车位与倒车通道保留完整树冠净空，不让树梢盖住倒计时或车轮。
  if(parkingClearing(x,y))return true;
  // 公交站整座棚顶和候车地面保留树冠净空。
  const bus=nearest(RANGER.busStop,{x,y});
  if(right>bus.x-60&&left<bus.x+75&&bottom>bus.y-105&&top<bus.y+35)return true;
  for (const source of CLEARING_BUILDINGS) {
    const house={...source,...nearest(source,{x,y})};
    if (right > house.x - (house.width/2 || 80 * house.size) - 20 && left < house.x + (house.width/2 || 80 * house.size) + 20 &&
        bottom > house.y - (house.height || 140 * house.size) - 15 && top < house.y + 50) return true;
  }
  for (const field of WHEAT_FIELDS) {
    if (right > field.x - field.width / 2 - 24 && left < field.x + field.width / 2 + 24 &&
        bottom > field.y - 45 && top < field.y + (field.rows - 1) * 12 + 30) return true;
  }
  const tent = SCENERY.find(item => item.kind === 'tent');
  if (right > tent.x - 90 && left < tent.x + 100 && bottom > tent.y - 85 && top < tent.y + 35)
    return true;
  // 检查树冠上、中、下三个高度，沙湾转弯处同样留出沿岸步行的带状空间。
  for (const sy of [y - 120, y - 60, y]) {
    const width = riverBeachWidth(sy, x < riverXAt(sy) ? -1 : 1);
    if (width > 5 && Math.abs(x - riverXAt(sy)) < riverHalfWidth(sy, x < riverXAt(sy) ? -1 : 1) + 5 + width + 85) return true;
  }
  return false;
}

// 距营地与地标越近，树间距越大；远处密林沿用原来的五十二单位间距。
function treeSpacing(tree) {
  const { x, y } = nearest(tree,TOWN_LAYOUT.spawn);
  const camp = Math.hypot((x - 920-TOWN_SHIFT_X) / 660, (y - 760) / 650);
  let spacing = 52 + 88 * Math.max(0, Math.min(1, (1.3 - camp) / 0.55));
  for (const field of WHEAT_FIELDS) {
    const distance = Math.hypot((x - field.x) / (field.width / 2 + 200),
      (y - field.y - field.rows * 6) / 280);
    spacing = Math.max(spacing, 52 + 68 * Math.max(0, 1 - distance / 1.4));
  }
  return spacing;
}

// 只疏除原始布局中的树，不重新随机撒点；区域外的树位、树种和采集属性保持稳定。
export function thinSceneryTrees(trees) {
  const kept = [], spacingIndex = new TreeSpacingIndex();
  for (const tree of trees) {
    if (coversScenery(tree.x, tree.y) || inCampComposition(tree.x, tree.y)) continue;
    // 南侧树冠也退出活动区，让营地、麦田前方与桥头形成连续的开阔草场。
    if (Math.hypot((nearest(tree,TOWN_LAYOUT.spawn).x - TOWN_LAYOUT.spawn.x) / 245, (tree.y - 830) / 240) < 1) continue;
    const spacing = treeSpacing(tree);
    if (CAMP_EDGE_TREES.some(edge => worldDistance(tree, edge) < 135)) continue;
    if (!spacingIndex.accepts(tree,spacing)) continue;
    spacingIndex.add(tree,spacing);
    kept.push({ ...tree, spacing });
  }
  return kept.map(({ spacing, ...tree }) => tree);
}
