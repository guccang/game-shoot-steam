import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
// 敌人入场选点：普通波次和领主援军近处接敌，保留通用视野外落点；共用循环地图与障碍校验。
import { nearest, worldDistance, WORLD, canonical } from '../world/coordinates.js';
import {riverXAt,riverHalfWidth,isWaterBlocked} from '../world/river-geometry.js';
import {livingForest,livingSafePoint} from '../world/living-spaces.js';
import { drySpawn } from '../physics/motion.js';
import { terrainBlocked,terrainLineClear } from '../physics/terrain-navigation.js';

// 渲染层提供相对角色的实际视口；未绘制时使用保守广角，保持逻辑可独立运行。
export function arrivalView(game) {
  const v = game.arrivalView;
  if (v && v.width === game.viewport?.width && v.height === game.viewport?.height) return v;
  const w = (game.viewport?.width || 800) / 0.6, h = (game.viewport?.height || 900) / 0.6;
  return { left: -w / 2, right: w / 2, top: -h / 2, bottom: h / 2 };
}

// 先尝试屏幕四周，再校验最近镜像；找不到安全点时延后补兵，绝不降级成贴身出生。
export function findArrivalSpot(game, ordinal = game.waveSpawned) {
  const view = arrivalView(game), start = Math.floor(game.random() * 4);
  for (let i = 0; i < GAMEPLAY_VALUES.arrival.outerAttempts; i++) {
    const side = (start + i) % 4,
      t = 0.1 + ((game.random() + Math.floor(i / 4) * 0.618 + ordinal * 0.381) % 1) * 0.8,
      margin = GAMEPLAY_VALUES.arrival.outerMargin + Math.floor(i / 4) * GAMEPLAY_VALUES.arrival.marginStep;
    let x = view.left + (view.right - view.left) * t,
      y = view.top + (view.bottom - view.top) * t;
    if (side === 0) x = view.left - margin;
    if (side === 1) x = view.right + margin;
    if (side === 2) y = view.top - margin;
    if (side === 3) y = view.bottom + margin;
    const spot = nearest(drySpawn({ mapId: game.mapId, x: game.player.x + x, y: game.player.y + y }), game.player);
    if(livingForest(game)&&livingSafePoint(spot))continue;
    x = spot.x - game.player.x; y = spot.y - game.player.y;
    if (Math.hypot(x, y) < GAMEPLAY_VALUES.arrival.playerDistance || terrainBlocked(spot.x, spot.y, GAMEPLAY_VALUES.arrival.collisionRadius, game.mapId)) continue;
    if (x > view.left - GAMEPLAY_VALUES.arrival.viewPadding && x < view.right + GAMEPLAY_VALUES.arrival.viewPadding &&
        y > view.top - GAMEPLAY_VALUES.arrival.viewPadding && y < view.bottom + GAMEPLAY_VALUES.arrival.viewPadding) continue;
    if (game.trees.some(t => t.hp > 0 && worldDistance(t, spot) < t.radius + GAMEPLAY_VALUES.arrival.treePadding)) continue;
    if (game.enemies.some(e => e.hp > 0 && worldDistance(e, spot) < e.radius + GAMEPLAY_VALUES.arrival.enemyPadding)) continue;
    return spot;
  }
  return null;
}

// 回收距离随视口扩大，避免外围新兵刚出生就被当作远处单位反复回收。
export function arrivalRecycleRadius(game) {
  const v = arrivalView(game);
  return Math.min(Math.hypot(WORLD.width / 2, WORLD.height / 2),
    Math.max(GAMEPLAY_VALUES.arrival.minRecycleRadius, Math.hypot(Math.max(Math.abs(v.left), Math.abs(v.right)),
      Math.max(Math.abs(v.top), Math.abs(v.bottom))) + GAMEPLAY_VALUES.arrival.recycleViewPadding));
}

// 近距离落点与镜头无关；校验整条接敌路线，避免隔河或隔山刷出最后一只。
export function findNearbyArrivalSpot(game,ordinal,range){
 const grouped=Number.isFinite(range.angle),start=grouped?range.angle:game.random()*Math.PI*2,origin={...game.player,mapId:game.mapId};
 for(let i=0;i<GAMEPLAY_VALUES.arrival.nearAttempts;i++){
  // 同一小队沿一个扇区接近；仍逐只校验障碍、距离和间距，失败不消耗名额。
  const angle=grouped?start+(((i*.618+ordinal*.381)%1)-.5)*range.spread:start+i*2.399963+ordinal*.381,distance=range.minDistance+(range.maxDistance-range.minDistance)*((i*.618+game.random())%1);
  const spot=nearest(drySpawn({mapId:game.mapId,x:origin.x+Math.cos(angle)*distance,y:origin.y+Math.sin(angle)*distance}),origin),d=worldDistance(spot,origin);
  // 在干地修正之后留出河岸缓冲；桥面也不作为贴水出生点，瀑布仍按真实水界检查。
  if(game.mapId==='forest'&&range.riverClearance>0){
   const p=canonical(spot),dx=p.x-riverXAt(p.y);
   if(Math.abs(dx)<riverHalfWidth(p.y,dx<0?-1:1)+range.riverClearance||isWaterBlocked(p.x,p.y,range.riverClearance))continue;
  }
  if(d<range.minDistance||d>range.maxDistance||livingForest(game)&&livingSafePoint(spot)||terrainBlocked(spot.x,spot.y,GAMEPLAY_VALUES.arrival.collisionRadius,game.mapId))continue;
  if(!game.player.flying&&!terrainLineClear(origin,spot,GAMEPLAY_VALUES.arrival.pathRadius))continue;
  if(game.trees.some(t=>t.hp>0&&worldDistance(t,spot)<t.radius+GAMEPLAY_VALUES.arrival.treePadding)||game.enemies.some(e=>e.hp>0&&worldDistance(e,spot)<e.radius+GAMEPLAY_VALUES.arrival.nearEnemyPadding))continue;
  return spot;
 }
 return null;
}
