import {REPAIR_CENTER} from '../config/vehicle-repair.js';
// 生活道路、安全边界和设施底座共用几何，避免画面安全而弹道仍穿入。
import {LIVING_ROADS,LIVING_PLACES} from '../config/living-world.js';
import {nearest} from './coordinates.js';
import {FARM_SEED_SHOP} from '../config/farm.js';
import {settlementAt,settlementClearing} from './settlements.js';
// 点到线段距离用于道路留白、安全走廊与正式道路绘制。
export function livingRoadDistance(point){
  let best=Infinity;
  for(const road of LIVING_ROADS)for(let i=1;i<road.length;i++){
    const a=road[i-1],b=road[i],p=nearest(point,a),dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));
    best=Math.min(best,Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy));
  }return best;
}
// 纯位置查询可用于敌人出生过滤，不依赖界面或是否正在交谈。
export function livingSafePoint(point){return !!settlementAt(point);}
// 章节、秘境、消防事件保持既有战斗合同；生活保护只作用于正常森林。
export function livingForest(game){return game.mapId==='forest'&&!game.campDefense&&!game.workshopTrial&&!game.story&&!game.realm&&!game.fireActive&&!game.arrivalCinematic&&(!game.player?.arena||game.player.arena.terrain==='forest');}
// 设施目录是静态配置，碰撞热路径只复用实体列表，不逐采样创建数组或重复筛选装饰。
const collisionFacilities=[REPAIR_CENTER,FARM_SEED_SHOP,...Object.values(LIVING_PLACES)].filter(s=>!['flowers','basket','warning'].includes(s.kind));
// 基础地形加入底座碰撞；临时剧情场景仍可在设施旁绕行。
export function livingFacilityBlocked(x,y,radius){
  return collisionFacilities.some(s=>{
   const p=nearest({x,y},s),dx=Math.abs(p.x-s.x),dy=p.y-s.y;
   // 维修车库中央门洞可倒车入库；两侧墙柱和后墙仍阻挡通行。
   if(s===REPAIR_CENTER)return dx<s.width/2+radius&&dy<5+radius&&dy>-112-radius&&(dx>62-radius||dy<-104+radius);
   return dx<s.width/2+radius&&dy>-19-radius&&dy<5+radius;
  });
}
// 树冠完整退出工作点和生活走廊，保留两侧原有树林。
export function livingClearing(x,y){return settlementClearing(x,y)||livingRoadDistance({x,y})<92||Object.values(LIVING_PLACES).some(s=>Math.abs(x-s.x)<s.width/2+75&&y>s.y-s.height-30&&y<s.y+125);}

// 扫描弹道线段，禁止高速弹丸在一帧内穿过生活道路再伤害另一侧目标。
export function livingBoltBlocked(game,bolt,dt){
  if(!livingForest(game))return false;
  const dx=(bolt.vx||0)*dt,dy=(bolt.vy||0)*dt,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/12));
  for(let i=0;i<=steps;i++)if(livingSafePoint({x:bolt.x+dx*i/steps,y:bolt.y+dy*i/steps}))return true;
  return false;
}
