import {canUseWarehouse} from './warehouse.js';
import {personalFleet} from './vehicle-repair.js';
import {MONSTER_CAMPS,CAMP_CHARACTERS,campSignSite,campCharacterSite,campCacheSite} from '../config/monster-camps.js';
import {monsterCampsAvailable} from './monster-camps.js';
import {arrivalWorkReady} from './ranger-arrival.js';
import {RANGER} from '../config/ranger-arrival.js';
import {TOWN_RESTORATIONS,facilityOpen} from '../config/town-restoration.js';
import {entryFacility,restorationStatus} from './town-restoration.js';
// 附近交互统一选取最近目标，只返回点击意图，不在帧更新中执行。
import {BUILDING_ENTRIES,BUILDING_ENTRY} from '../config/building-entries.js';
import {canInspectBuilding} from './building-entry.js';
import {COTTAGE} from '../config/cottage.js';
import {interiorLayout} from '../config/workshop-interiors.js';
import {canRequestParking,nearestParkingSpot} from './parking.js';
import {canRequestFireParking} from './fire-rescue.js';
import {worldDistance} from '../world/coordinates.js';
import {farmMode} from './farm.js';
import {nearbyStoryPost} from './story-posts.js';
import {CAMP_GATES} from '../config/camp-defense.js';

// 每次读取和点击都实时计算；距离、活动或房间变化后旧按钮不能执行。
export function nearbyInteraction(game){
 // 种田时收起建筑头顶入口及其镜头留白；切回战斗或退出农具后自然恢复。
 if(farmMode(game))return null;
 if(game.state!=='playing'||game.arrivalCinematic||game.mainlineSpeech||game.progress.restoration?.build)return null;
 // 返回本章接取点时明确显示退出入口，章节装备和其他活动入口仍保持隔离。
 if(game.story){const post=nearbyStoryPost(game);return post?{id:'post-'+post.id,type:'post',key:post.id,label:'管理章节任务',detail:'暂离或取消当前任务',presentation:'task-entry'}:null;}
 // 入职工坊保留手动入口，正常靠近由任务更新自动开工。
 if(game.arrivalPending){
  const a=game.progress.arrival;
  if(a?.phase==='repair'&&a.keys&&!game.arrivalError&&arrivalWorkReady(game))return {id:'arrival-repair',type:'arrival-repair',label:'修复武器工坊',detail:'消耗 '+RANGER.repairWood+' 木头 · 靠近自动修复'};
 }
 if(canRequestFireParking(game))return {id:'fire-parking',type:'fire-parking',label:'消防车入库'};
 const room=game.cottage;
 if(room){
  if(room.sleep||room.restOpen)return null;
  const layout=interiorLayout(room),p=game.player;
  if(Math.hypot(p.x-layout.exit.x,p.y-layout.exit.y)<=layout.exitRadius)return null;
  if(!room.floor&&(!room.kind||room.kind==='cottage')&&Math.hypot(p.x-COTTAGE.bed.x,p.y-COTTAGE.bed.y)<=COTTAGE.bedRadius)return {id:'rest',type:'rest',label:'休息一下'};
  // 售货员使用自身唯一点击区，避免附近按钮盖住角色。
  return null;
 }
 // 仓库在室外直接打开格子存取，驾驶时也无需下车入屋。
 if(canUseWarehouse(game))return {id:'warehouse',type:'warehouse',label:'打开仓库',detail:'格子存取 · 拖拽物品',presentation:'task-entry'};
 if(canRequestParking(game))return {id:'parking-'+nearestParkingSpot(game).id,type:'parking',label:'停车入位'};
 const entries=[];
 if(personalFleet(game)){
  for(const [hull,r] of (game.progress.vehicleService||[]).entries())if(r?.phase==='wrecked'&&r.mapId===game.mapId&&worldDistance(game.player,r.position)<=120)entries.push({...r.position,id:'wreck-'+hull,type:'vehicle-wreck',hull,label:'查看损坏载具',detail:'已报废 · 需要维修',distance:worldDistance(game.player,r.position)});
 }
 // 外围故事绑定真实木牌；营内居民和冷灰堆继续使用自己的现场位置。
 if(monsterCampsAvailable(game))for(const c of MONSTER_CAMPS){if(c.mapId!==game.mapId)continue;
  const npc=CAMP_CHARACTERS.find(n=>n.camp===c.id),cache=CAMP_CHARACTERS.some(n=>n.destination===c.id&&game.progress.monsterCamps.clues.includes(n.id));
  for(const site of [campSignSite(c),...(npc?[campCharacterSite(c)]:[]),...(cache?[campCacheSite(c)]:[])]){const distance=worldDistance(game.player,site),character=site.id.endsWith('character'),sign=site.id.endsWith('sign');if(distance<=90)entries.push({...site,id:site.id,type:'monster-camp',key:c.id,presentation:sign?'camp-sign':null,label:site.id.endsWith('cache')?'查看冷灰堆':character?'和'+npc.name+'聊聊':'阅读营地木牌',detail:character?'友善居民':c.name,distance});}
 }
 if(canInspectBuilding(game))for(const e of BUILDING_ENTRIES){
  if(e.type==='realm'&&['fire','tower'].includes(e.key))continue;
  // 兽潮导航在站牌附近结束，提示范围覆盖抵达误差，同时遵守营门的实际进入距离。
  const gate=e.type==='gate'&&CAMP_GATES.find(g=>g.id===e.key),distance=worldDistance(game.player,e);
  if(gate?worldDistance(game.player,gate)<=160:distance<=(e.radius??BUILDING_ENTRY.radius))entries.push({...e,label:e.type==='realm'?'查看入口':gate?'怪潮站牌':e.type==='clearing'?'查看清缴委托':'查看告示',detail:gate?'打开怪潮页面':'',presentation:gate?'task-entry':null,distance});
 }
 // 修复提示覆盖真实修复区及门前预告范围，骑乘时同样可查看资源；自选建筑需在修复页确认。
 if(!game.story&&!game.realm&&!game.fireActive&&!game.campDefense&&!game.boss&&!game.livingBattle&&!game.workshopTrial)for(const f of TOWN_RESTORATIONS){
  const s=restorationStatus(game,f.id),distance=worldDistance(game.player,s.facility.site);
  if((f.extra||!s.ready)&&(s.near||distance<=155))entries.push({id:'restore-'+f.id,type:'restoration',key:f.id,label:s.ready?'查看'+f.name:'修复'+f.name,distance});
 }
 const entry=entries.sort((a,b)=>a.distance-b.distance)[0];if(!entry)return null;
 const id=entryFacility(entry),f=TOWN_RESTORATIONS.find(f=>f.id===id),status=f&&restorationStatus(game,id);
 return f&&!facilityOpen(game.progress,id)?{...entry,type:'restoration',key:id,label:'修复'+f.name,
  detail:'木头 '+status.wood.progress+' · '+status.wood.hint}:entry;
}
