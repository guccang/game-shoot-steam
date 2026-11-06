// 野外驯牛使用现有农田存档和牧栏所有权；刷新、切图和重试共用同一笔奖励。
import {GRAZING_SITES,FORAGE_ID,PEN_OX} from '../config/pasture.js';
import {itemDefinition} from '../config/items.js';
import {catLoad} from '../progression/load-weight.js';
import {validateProgress} from '../progression/progress.js';
import {farmLandReason} from '../world/farm-land.js';
import {worldDistance} from '../world/coordinates.js';
import {canUseFarm,commitFarm,farmInteractionBlocked} from './farm.js';

const meadows=new WeakMap();
// 每个游戏日更换觅食地；已有田、设施或树挡住时跳到下一处。绘制和命中共享落点。
export function wildPastureObjects(game){
 if(game.mapId!=='forest'||game.cottage||game.story||game.realm||game.workshopTrial||game.fireActive||game.campDefense||game.arrivalCinematic||game.livingPreview)return [];
 const farm=game.progress.farm,day=game.progress.living.calendar.day;
 const tick=Math.floor(game.time||0);
 let meadow=meadows.get(farm);
 if(!meadow||meadow.day!==day||meadow.tick!==tick){
  const objects=[];
  for(let i=0;i<GRAZING_SITES.length;i++){
   const id=(day+i)%GRAZING_SITES.length,point=GRAZING_SITES[id];
   const ox={...point,mapId:'forest',type:'wild-ox',id};
   const grass={...ox,type:'sweet-grass',x:ox.x-100,y:ox.y+35};
   if(farmLandReason(game,ox)||farmLandReason(game,grass))continue;
   if(!farm.oxPlow)objects.push(ox);
   if(farm.forageDay!==day)objects.push(grass);
   break;
  }
  meadow={day,tick,objects};
  meadows.set(farm,meadow);
 }
 return meadow.objects;
}

// 只有在目标跟前主动采集或喂食才结算，写盘成功后才撤下草丛或野牛。
export function interactWildPasture(game,type,id){
 const site=wildPastureObjects(game).find(s=>s.type===type&&s.id===id);
 if(!site||!canUseFarm(game)||game.player.hp<=0||game.farmWork||farmInteractionBlocked(game)||worldDistance(game.player,site)>95)return {ok:false,message:'请在安全时下车，走到跟前再交互。'};
 const next=validateProgress(structuredClone(game.progress)),farm=next.farm;
 if(type==='sweet-grass'){
  const item=itemDefinition(FORAGE_ID),load=catLoad(game);
  if(farm.forageDay===next.living.calendar.day||farm.forage>=999||Math.round((load.weight+item.mass)*1e6)/1e6>=load.capacity)return {ok:false,message:'背包装不下这束甜穗草，整理后再来采。'};
  farm.forage++;
  farm.forageDay=next.living.calendar.day;
  return commitFarm(game,next,{action:'forage',message:'采到一束甜穗草。'+item.use});
 }
 if(farm.oxPlow)return {ok:false,message:'营地已经有一头耕牛了。'};
 if(!farm.forage)return {ok:false,message:'野牛嗅了嗅你的手。去旁边摘一束金黄穗头的甜穗草吧。'};
 farm.forage--;farm.oxPlow=true;farm.oxSite={...PEN_OX};
 return commitFarm(game,next,{action:'tame-ox',message:'野牛吃下甜穗草，认你了！已领回营地牧栏，去栏里牵它就能犁地。'});
}
