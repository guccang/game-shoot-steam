import {ownsCampPoint,campPlotAt} from '../../config/camp-land.js';
import {spendConstructionWood} from '../../progression/economy/resource-wallet.js';
import {bossCombatActive} from '../battle/boss-engagement.js';
import {repairWoodStatus} from '../inventory/wood-task-status.js';
// 修复任务靠近自动投料，自选建筑由界面确认；持久化成功才扣料和开放功能。
import {TOWN_RESTORATIONS,pendingRestoration,facilityOpen,RESTORATION_SECONDS} from '../../config/town-restoration.js';
import {currentMainlineTask} from '../../config/mainline.js';
import {worldDistance} from '../../world/coordinates.js';
import {restorationLocation,restorationArea,inRestorationArea} from '../../world/restoration-area.js';
import {arrivalPending,arrivalCinematic} from '../../config/ranger-arrival.js';
import {validateProgress} from '../../progression/progress.js';
import {bindEconomy,economyFor} from '../../config/economy.js';
import {recordEconomy} from '../../progression/economy/economy-ledger.js';
import {capturePatrol} from '../battle/patrol-session.js';
import {startRestoredTask} from '../../progression/camp/restoration-task.js';
// 保留当前任务的真实伐木记录，仅作统计；修复材料不限获得来源。
export function recordRestorationWood(game,wood){
 const f=pendingRestoration(game.progress);
 if(!f||arrivalPending(game.progress)||game.story||game.realm||game.fireActive||game.campDefense)return;
 const r=game.progress.restoration;r.gathered[f.id]=Math.min(f.wood,(r.gathered[f.id]||0)+Math.max(0,wood));
}
// 距离、钱包和活动状态每次靠近时重算，不要求重复伐木。
export function restorationStatus(game,id){
 const config=TOWN_RESTORATIONS.find(f=>f.id===id);if(!config)return null;
 const f=restorationLocation(config,game.player),area=restorationArea(f);
 const gathered=game.progress.restoration?.gathered[f.id]||0,ready=facilityOpen(game.progress,id),active=!arrivalCinematic(game.progress);
 const near=game.mapId==='forest'&&!game.cottage&&inRestorationArea(game.player,area);
 const landOwned=ownsCampPoint(game.progress,f),plot=campPlotAt(f);
 const wood=repairWoodStatus(game,f.wood),enough=game.progress.restoration?.build?.id===id||wood.ready;
 const safe=!game.story&&!game.realm&&!game.fireActive&&!game.campDefense&&!bossCombatActive(game)&&!game.livingBattle&&!game.workshopTrial&&['playing','paused'].includes(game.state);
 const taskRequired=!arrivalPending(game.progress)&&!!currentMainlineTask(game.progress.mainline)&&pendingRestoration(game.progress)?.id===id;
 return {facility:f,area,gathered,wood,ready,active,near,enough,landOwned,plot,taskRequired,canRepair:landOwned&&!ready&&!game.progress.restoration?.build&&active&&near&&enough&&safe};
}
// 点击待修建筑时登记设施身份，采集数量和下一步从现有库存读取。
export function trackRestoration(game,id){
 if(!TOWN_RESTORATIONS.some(f=>f.id===id)||facilityOpen(game.progress,id))return false;
 const tracking=game.progress.taskTracking;
 if(tracking?.kind==='restoration'&&tracking.id===id)return true;
 const next=bindEconomy(structuredClone(game.progress),economyFor(game.progress));
 next.taskTracking={kind:'restoration',id};
 const snapshot=Object.create(game);snapshot.progress=next;next.patrol=capturePatrol(snapshot);
 try{if(game.restorationPersist?.(next)!==true)return false;}catch{return false;}
 game.progress=next;game.mainlineSpeech=null;return true;
}
// 主线、地图和修复页共用真实树木与门前落点。
export function restorationObjective(game,task,pending=pendingRestoration(game.progress)){
 if(!pending||arrivalPending(game.progress)||game.cottage||game.story||game.realm||game.fireActive||game.campDefense)return null;
 const s=restorationStatus(game,pending.id),f=s.facility,build=game.progress.restoration?.build?.id===f.id,gather=!build&&!s.enough;
 task??={id:'restore-'+f.id,title:'建设'+f.name};
 if(!s.landOwned)return {task,restoration:f.id,key:'land-'+s.plot.id,phase:'doing',navigation:true,site:{...s.plot.sign,mapId:'forest'},label:'购买'+s.plot.name+' · '+s.plot.coins+' 金币',hint:'在营地管理或大地图购买地块，即可开放'+f.name+'。'};
 if(gather&&s.wood.destination){const d=s.wood.destination;return {task,restoration:f.id,key:(d.kind==='store'?'store-wood-':'retrieve-wood-')+f.id,phase:'doing',navigation:true,site:d.site,label:(d.kind==='store'?'运回木材':'取回木材')+' '+s.wood.gatherProgress+' · '+f.name,hint:d.label+' · '+s.wood.breakdown};}
 let tree=null,distance=Infinity;
 if(gather)for(const t of game.trees){const d=worldDistance(game.player,t);if(t.hp>0&&d<distance){tree=t;distance=d;}}
 return {task,restoration:f.id,key:'restore-'+f.id,phase:'doing',navigation:true,site:{...(tree||f.site),mapId:'forest',...(!gather&&!build?{repairArea:s.area}:{})},
 label:build?'正在修复'+f.name:gather?'采集木头 '+s.wood.gatherProgress+' · 修复'+f.name:'木材已齐 · 前往修复'+f.name,
 hint:game.restorationError|| (gather?'木头 '+s.wood.gatherProgress+' · '+s.wood.hint+' · '+s.wood.breakdown:(s.taskRequired?'靠近修复区自动开工':'到修复区点击修复')+' · '+f.benefit)};
}
// 材料、账本和修复状态一次提交；失败不扣钱、不改变外观，可原地重试。
export function repairFacility(game,id,persist=game.restorationPersist){
 const s=restorationStatus(game,id);
 if(!s?.canRepair)return {ok:false,message:s?.ready?'这里已经修好了。':s&&!s.landOwned?'请先购买'+s.plot.name+'。':!s?.active?'请等待当前过场结束，再修复这里。':!s?.enough?s.wood.hint:!s?.near?'请靠近设施的修复区，步行或骑乘到达后点击修复。':'请先结束当前活动，再点击修复。'};
 const next=validateProgress(structuredClone(game.progress));spendConstructionWood(next,s.facility.wood);next.restoration.build={id,elapsed:0,x:game.player.x,y:game.player.y};
 recordEconomy(next,'expense','town:repair:'+id,{wood:s.facility.wood});
 const snapshot=Object.create(game);snapshot.progress=next;next.patrol=capturePatrol(snapshot);
 let saved=false;try{saved=(persist?.(next)??false)===true;}catch{}
 if(!saved)return {ok:false,message:'修复进度未保存，木头未扣除，请重试。'};
 game.progress=next;game.restorationError='';game.restorationRetry=0;game.mainlineSpeech=null;game.onEvent('restoration-start',{name:s.facility.name});
 return {ok:true,message:'已投入 '+s.facility.wood+' 木头，开始修复'+s.facility.name+'。'};
}
// 房间、告示、守备台和玩法都映射到唯一设施。
export function entryFacility(entry){
 if(entry.type==='room'||entry.type==='workshop')return entry.key==='vehicle'?'garage':entry.key;
 if(entry.type==='realm')return entry.key;
 if(entry.type==='post')return entry.key==='monster-neighbors'?'neighbors':'story';
 if(entry.type==='gate')return 'defense';
 return entry.type==='clearing'&&!entry.camp?'clearing':entry.type==='restoration'?entry.key:null;
}

// 当前修复任务抵达后自动开工，其余建筑保留手动确认；暂停、离线不补跑。
export function updateRestoration(game,dt){
 if(game.state!=='playing'||arrivalCinematic(game.progress)||game.cottage||game.story||game.realm||game.fireActive||game.campDefense)return;
 game.restorationRetry=Math.max(0,(game.restorationRetry||0)-dt);if(game.restorationRetry)return;
 const build=game.progress.restoration?.build;
 if(!build){
  const f=pendingRestoration(game.progress),s=f&&restorationStatus(game,f.id);
  if(s?.taskRequired&&s.canRepair){
   const result=repairFacility(game,f.id);
   if(!result.ok){game.restorationError=result.message;game.restorationRetry=1;}
  }
  return;
 }
 // 与首次工坊一致容忍浮点累计误差，三秒所在帧即完成。
 build.elapsed=Math.min(RESTORATION_SECONDS,build.elapsed+dt);if(build.elapsed+1e-9<RESTORATION_SECONDS)return;
 const next=validateProgress(structuredClone(game.progress));next.restoration.repaired.push(build.id);next.restoration.build=null;
 if(next.taskTracking?.kind==='restoration'&&next.taskTracking.id===build.id)next.taskTracking=null;
 const startedTask=startRestoredTask(next,build.id);
 const snapshot=Object.create(game);snapshot.progress=next;next.patrol=capturePatrol(snapshot);
 let saved=false;try{saved=game.restorationPersist?.(next)===true;}catch{}
 if(!saved){game.restorationError='修复进度未保存，正在重试。';game.restorationRetry=1;return;}
 game.progress=next;game.restorationError='';game.mainlineSpeech=null;
 game.onEvent('restoration-complete',{name:TOWN_RESTORATIONS.find(f=>f.id===build.id).name,taskTitle:startedTask?.title});
}
