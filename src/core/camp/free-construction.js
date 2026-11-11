// 自由建设在落点一次性结算资源、建筑功能与存档，流程由现场和大地图共用。
import {CAMP_BUILDINGS,campBuildingPosition} from '../../config/camp-layout.js';
import {CAMP_PLOTS,campPlotAt,ownsCampPlot,insideCampLand} from '../../config/camp-land.js';
import {TOWN_RESTORATIONS,facilityOpen} from '../../config/town-restoration.js';
import {campProgress} from '../../progression/camp/camp-level.js';
import {spendWorkshopMaterials,workshopMaterialCount} from '../../progression/workshop/workshop-materials.js';
import {recordEconomy} from '../../progression/economy/economy-ledger.js';
import {bindEconomy,economyFor} from '../../config/economy.js';
import {nearest} from '../../world/coordinates.js';
import {isNaturalBlocked} from '../../world/natural-terrain.js';
import {isWaterBlocked} from '../../world/river-geometry.js';
import {activateCampLayout} from '../../world/camp-layout-bindings.js';
import {canInspectBuilding} from './building-entry.js';
import {capturePatrol} from '../battle/patrol-session.js';
import {startRestoredTask} from '../../progression/camp/restoration-task.js';
import {WORLD_BUILDINGS} from '../../config/world-buildings.js';

const levels={services:2,gardens:2,industry:3,'river-yard':3,'factory-yard':4,'se-yard':5};
const repairs={catHome:'cat-home','defense-top':'defense','defense-left':'defense'};
export const CAMP_CONSTRUCTION=CAMP_BUILDINGS.filter(b=>!['weapons','north'].includes(b.id)).map(b=>{
 const plot=CAMP_PLOTS.find(p=>p.id===(b.plotId||campPlotAt(b)?.id));
 return {...b,plot:plot?.id,repair:repairs[b.id]||b.id,level:levels[plot?.id]||1,cost:{coins:plot?.coins||8,wood:plot?.wood||16}};
}).concat([true,false].map(horizontal=>({id:horizontal?'fence-h':'fence-v',name:horizontal?'横向木栅栏':'纵向木栅栏',horizontal,width:horizontal?60:8,height:horizontal?8:60,level:1,cost:{wood:4,coins:0}})));

// 老存档原本已开放的设施照常使用；栅栏可以反复建造。
function isBuilt(progress,b){
 if(b.horizontal!==undefined)return false;
 if(progress.campLand?.sites?.[b.id])return true;
 return ownsCampPlot(progress,b.plot)&&(!TOWN_RESTORATIONS.some(f=>f.id===b.repair)||facilityOpen(progress,b.repair));
}
// 选址和提交共用等级、地契和材料报价。
export function constructionState(progress,b){
 return {landOpen:!b.plot||ownsCampPlot(progress,b.plot),built:isBuilt(progress,b),level:campProgress(progress).tier,enough:Object.entries(b.cost).every(([key,n])=>workshopMaterialCount(progress,key)>=n)};
}
// 以脚底为锚点，环形世界两端的建筑用最近镜像检查占地。
function occupied(game,b,at){
 const fence=b.horizontal!==undefined;
 const top=fence?-b.height/2:-b.height,bottom=fence?b.height/2:8;
 if(!insideCampLand(game.progress,at.x-b.width/2,at.y+top,at.x+b.width/2,at.y+bottom))return '请在已解锁的营地范围内建设，整个占地都需位于营地内。';
 const overlaps=(site,left,right,t,bottomEdge)=>{
  const q=nearest(site,at);return q.x+right>at.x-b.width/2&&q.x+left<at.x+b.width/2&&q.y+bottomEdge>at.y+top&&q.y+t<at.y+bottom;
 };
 if(overlaps(game.player,-10,10,-10,10))return '请点角色身旁的空地。';
 if(game.progress.farm?.plots?.some(p=>(!p.mapId||p.mapId==='forest')&&overlaps(p,-20,20,-20,20)))return '此处已有农田。';
 if(game.progress.campParking?.owned?.some(v=>v.spot==null&&v.mapId==='forest'&&overlaps(v,-30,30,-30,30)))return '此处停有载具。';
 for(const building of CAMP_BUILDINGS){
  if(building.id===b.id)continue;
  const def=CAMP_CONSTRUCTION.find(c=>c.id===building.id);
  if(def&&!isBuilt(game.progress,def))continue;
  if(overlaps(campBuildingPosition(game.progress.campLayout,building),-building.width/2,building.width/2,-building.height,10))return '此处已有建筑。';
 }
 for(const f of game.progress.campLand.fences||[]){
  const w=f.horizontal?30:4,h=f.horizontal?4:30;
  if(overlaps(f,-w,w,-h,h))return '此处已有栅栏。';
 }
 if(WORLD_BUILDINGS.some(site=>site.regional&&site.rects.some(r=>overlaps(site,r[0],r[2],r[1],r[3]))))return '此处已有营地建筑。';
 for(const x of [-b.width/2,0,b.width/2])for(const y of [top,(top+bottom)/2,bottom]){
  if(isWaterBlocked(at.x+x,at.y+y,4)||isNaturalBlocked(at.x+x,at.y+y,4))return '请选择陆地上的空地。';
 }
 if(game.trees?.some(t=>t.hp>0&&overlaps(t,-8,8,-8,8)))return '此处有树，伐木后即可建设。';
 return '';
}
// 点地时重新校验，候选存档被接受后才更新当前世界和碰撞。
export function buildCampAt(game,id,point,persist=game.restorationPersist){
 const b=CAMP_CONSTRUCTION.find(c=>c.id===id);
 if(!b||!canInspectBuilding(game)||!['playing','paused'].includes(game.state)||!Number.isFinite(point?.x)||!Number.isFinite(point?.y))return {ok:false,message:'当前无法建设。'};
 const state=constructionState(game.progress,b);
 if(state.built)return {ok:false,message:b.name+'已建成。'};
 if(!state.landOpen)return {ok:false,message:'请先扩建对应地块，解锁这座建筑。'};
 if(state.level<b.level)return {ok:false,message:'营地达到 '+b.level+' 级后开放。'};
 if(!state.enough)return {ok:false,message:'金币或木材不足。'};
 const snapped={x:Math.round(point.x/20)*20,y:Math.round(point.y/20)*20},at=nearest(snapped,{x:0,y:0}),reason=occupied(game,b,at);
 if(reason)return {ok:false,message:reason};
 const next=bindEconomy(structuredClone(game.progress),economyFor(game.progress));
 if(!spendWorkshopMaterials(next,b.cost))return {ok:false,message:'金币或木材不足。'};
 if(b.horizontal!==undefined)(next.campLand.fences??=[]).push({...at,horizontal:b.horizontal});
 else{
  (next.campLand.sites??={})[id]={...at,width:b.width,height:b.height};
  next.campLayout.positions[id]=at;
  if(TOWN_RESTORATIONS.some(f=>f.id===b.repair)&&!next.restoration.repaired.includes(b.repair)){
   next.restoration.repaired.push(b.repair);
   if(next.restoration.build?.id===b.repair)next.restoration.build=null;
   if(next.taskTracking?.kind==='restoration'&&next.taskTracking.id===b.repair)next.taskTracking=null;
   startRestoredTask(next,b.repair);
  }
 }
 recordEconomy(next,'expense','camp:build:'+id,b.cost);
 const snapshot=Object.create(game);snapshot.progress=next;next.patrol=capturePatrol(snapshot);
 try{if(persist?.(next)!==true)return {ok:false,message:'保存失败，资源未扣除。'};}catch{return {ok:false,message:'保存失败，资源未扣除。'};}
 game.progress=next;game.player.campProgress=next;activateCampLayout(next);
 return {ok:true,message:'已建成'+b.name+'。'};
}
