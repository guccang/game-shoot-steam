// 地下景观石柱的可破坏实体；外围岩床不进入本模块。
import {mineCell,mineKey,MINE_DIRECTIONS,MINING} from '../../config/mining.js';
import {mineTerrain,mineInsideBounds,MINE_ROCK} from '../../config/mine-ecology.js';
import {mineLandscapeAnchor} from '../../world/mine-surface.js';
import {mineEntrancePlatform} from '../../world/mine-entrances.js';
import {currentMineLayer} from './mine-layers.js';
import {mineFreightReward} from './mine-transactions.js';
import {mineLineClear} from '../../physics/mine-motion.js';
import {productionDigSeconds} from '../../config/farm-production.js';
// 与正式绘制器采用相同显隐条件，已移除、施工覆盖及层边界外不会产生幽灵资源。
export function mineRockSite(layer,cell){
 const key=mineKey(cell),t=mineTerrain(cell,layer);
 if(t.biome.id!=='stalagmite'||!t.prop||t.safe||t.water||!t.natural||mineEntrancePlatform(cell,layer)||layer.rails[key]||layer.decor[key]||(layer.harvested[key]||0)>layer.age)return null;
 const point=mineLandscapeAnchor(cell,t.hash,layer);if(!mineInsideBounds(layer,point.x,point.y))return null;
 return {key,cell,...point,biome:t.biome};
}
// 临时受伤记录以层号和再生代次隔离；读档恢复完整耐久，已破坏状态仍保存在正式存档。
export function mineRockDamage(game,key){
 const layer=currentMineLayer(game),state=game.cottage.rockDamage?.[(game.cottage.depth||1)+':'+key];
 return state?.cycle===(layer.harvested[key]||0)?state:null;
}
// 伤害命中只结算当前真实实体，死亡事务失败保留最后一格耐久供重试。
export function hitMineRock(game,target,damage){
 if(game.cottage?.kind!=='mine'||game.state!=='playing'||game.fishing||(target.depth&&target.depth!==(game.cottage.depth||1))||!(damage>0)||!Number.isFinite(damage))return false;
 const layer=currentMineLayer(game),cell=target.cell||Object.fromEntries(target.key.split(',').map((v,i)=>[i?'y':'x',Number(v)])),site=mineRockSite(layer,cell);
 if(!site)return false;
 const room=game.cottage,states=room.rockDamage??={},id=(room.depth||1)+':'+site.key,old=mineRockDamage(game,site.key),hp=(old?.hp??MINE_ROCK.hp)-damage;
 if(Object.keys(states).length>=64&&!states[id])delete states[Object.keys(states)[0]];
 states[id]={hp:Math.max(1,hp),cycle:layer.harvested[site.key]||0,hit:layer.age};
 if(hp>0)return true;
 const result=mineFreightReward(game,site.biome.yield,(m,p,l)=>{l.dug[site.key]=true;l.harvested[site.key]=l.age+site.biome.regrow;p.production.minedOre+=site.biome.yield;},'山体已敲碎',{cell:site.cell,cycle:layer.harvested[site.key]||0});
 if(result.ok)delete states[id];return result.ok;
}
// 邻近实体最多扫描十五格见方，稳定位置300毫秒复用候选，避免逐帧扫整层。
export function mineRockTargets(game){
 const room=game.cottage,l=currentMineLayer(game),center=mineCell(game.player),tag=(room.depth||1)+':'+l.seed+':'+mineKey(center);
 if(!room.rockScan||room.rockScan.tag!==tag||l.age>=room.rockScan.until){
  const targets=[];
  for(let y=center.y-7;y<=center.y+7;y++)for(let x=center.x-7;x<=center.x+7;x++){
   const site=mineRockSite(l,{x,y});if(!site)continue;
   const target={...site,depth:room.depth||1,id:-((x+200)*1000+y+200),type:'tree',mineRock:true,radius:24,maxHp:MINE_ROCK.hp};
   Object.defineProperty(target,'hp',{enumerable:true,get:()=>mineRockSite(currentMineLayer(game),site.cell)?mineRockDamage(game,site.key)?.hp??MINE_ROCK.hp:0});
   targets.push(target);
  }
  room.rockScan={tag,until:l.age+.3,targets};
 }
 return room.rockScan.targets;
}
// 推动矿镐朝向附近石柱时停步敲击；松手即停，三次有效敲击破坏完整石柱。
export function workMineRock(game,dt,moving){
 const room=game.cottage;
 if(!moving||room.tool!=='pick'||!room.autoDig||room.ride||game.vehicle.active||game.fishing){room.rockWork=null;return false;}
 const p=game.player,d=MINE_DIRECTIONS[room.direction],target=mineRockTargets(game).filter(t=>t.hp>0&&Math.hypot(t.x-p.x,t.y-p.y)<=MINE_ROCK.pickReach&&(t.x-p.x)*d.x+(t.y-p.y)*d.y>=-8&&mineLineClear(game,p,t)).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
 if(!target){room.rockWork=null;return false;}
 if(room.rockWork?.key!==target.key)room.rockWork={key:target.key,elapsed:0};
 room.rockWork.elapsed+=dt;room.dig={...room.rockWork,landscape:true};
 if(room.rockWork.elapsed>=productionDigSeconds(game.progress,MINING.digSeconds)){
  room.rockWork.elapsed=0;if(!hitMineRock(game,target,MINE_ROCK.pickDamage)){room.tool=null;room.autoDig=false;room.rockWork=null;}room.dig=null;
 }
 return true;
}
