import {ownsCampPoint,campPlotAt} from './camp-land.js';
import {isCampaignTask} from './mainline-pacing.js';
import {FIRE_STATION} from './fire-station-layout.js';
// 小镇修复目录：主线前置、费用、功能和实体坐标共用配置，不以时间强制解锁。
import content from './content/mainline.json' with {type:'json'};
import {currentMainlineTask} from './mainline.js';
import {TOWN_LAYOUT as T} from './town-layout.js';
import {BUILDING_ENTRIES} from './building-entries.js';
import {COTTAGE} from './cottage.js';
import {WORKSHOP_INTERIORS} from './workshop-interiors.js';
import {CAMP_GATES} from './camp-defense.js';
import {RESTORATION_SECONDS} from './building-repair-timing.js';
export {RESTORATION_SECONDS,RESTORATION_FLIGHT} from './building-repair-timing.js';
// 从现有正式入口取修复落点，避免另存一套导航坐标。
const at=id=>BUILDING_ENTRIES.find(e=>e.id===id);
// 守备台实体在门柱旁，引导落点向营地内退；西、北门共用一次修复记录。
const defenseLocations=CAMP_GATES.map(g=>{
 const x=g.x-g.ny*108,y=g.y+g.nx*108;
 return {x,y,site:{id:'repair-gate-'+g.id,x:x-g.nx*75,y:y-g.ny*55+24,mapId:'forest'}};
});
// 找种改走野外营地，告示牌留到首轮清缴任务前修复。
export const TOWN_RESTORATIONS=[
 // 新营业设施使用原房门和施工事务，不另造一套建造系统。
 ...['outdoor','ammo','cat-home','furniture','construction','repair','refinery','factory','seWorkshop'].map(id=>{const room=WORKSHOP_INTERIORS[id];return {before:null,wood:['refinery','factory'].includes(id)?180:60,shape:'house',...room.site,id,name:room.name,site:room.door,benefit:'建成后开放'+room.name+'服务',minute:'自主建设'};}),
 {id:'clearing',name:'清缴告示牌',before:'first-patrol',wood:40,shape:'board',...T.clearing,site:at('clearing'),benefit:'接取清缴，挑战五批怪物与领主',minute:'1–3分钟'},
 {id:'cottage',name:'巡林小屋',before:'pistol-upgrade',wood:80,shape:'house',...T.cottage,width:140,height:150,site:COTTAGE.door,benefit:'进屋休息，恢复猫猫全部生命',minute:'3–5分钟'},
 {id:'story',name:'回信驿',before:'first-letter',wood:100,shape:'board',...T.story,site:at('post-sunleaf-post'),benefit:'接取森林来信与故事委托',minute:'10–15分钟'},
 {id:'garage',name:'载具工坊',before:'first-vehicle',wood:160,shape:'garage',...T.garage,width:220,height:175,site:WORKSHOP_INTERIORS.vehicle.door,benefit:'购买、升级和整备载具；赠送车辆拿到即可驾驶',minute:'15–20分钟'},
 {name:'营门守备台',before:'pine-patrol',wood:120,shape:'board',...defenseLocations.find(p=>p.site.id==='repair-gate-left'),id:'defense',locations:defenseLocations,benefit:'修复全营守备联络，开启营门防守',minute:'20–25分钟'},
 {id:'neighbors',name:'邻里委托板',before:'neighbors',wood:120,shape:'board',...T.neighborsPost,site:at('post-monster-neighbors'),benefit:'修好邻里公共设施，接取居民委托',minute:'25–30分钟'},
 {id:'rogue',name:'远征光门',before:'expedition',wood:180,shape:'arch',...T.rogue,site:at('realm-rogue'),benefit:'选择陌生装备，开启随机远征',minute:'30–40分钟'},
 {id:'race',name:'林间赛道站',before:'road-trial',wood:100,shape:'board',...T.race,site:{x:T.race.x,y:T.race.y+30},extra:true,benefit:'开启林间赛跑',minute:'40分钟后'},
 {id:'tower',name:'时空塔',before:'tower',wood:220,shape:'tower',...T.tower,width:112,height:166,site:at('realm-tower'),benefit:'使用自己的装备逐层挑战',minute:'40–50分钟'},
 {id:'guardian',name:'守护祭坛',before:'guardian',wood:220,shape:'altar',...T.guardian,width:132,height:128,site:at('realm-guardian'),benefit:'建造防御，守护林间女神',minute:'50–60分钟'},
 {id:'travel',name:'远行驿站',before:'other-map',wood:160,shape:'board',...T.travel,site:{x:T.travel.x,y:T.travel.y+30},extra:true,benefit:'解锁九寨沟地图旅行',minute:'60分钟后'},
 {id:'fire',name:'森林消防站',before:'fire-duty',wood:240,shape:'garage',...FIRE_STATION,site:at('realm-fire'),benefit:'接警、驾驶消防车并扑灭林火',minute:'60分钟后'},
 {id:'football',name:'林间球场站',before:'football-day',wood:100,shape:'board',...T.football,site:{x:T.football.x,y:T.football.y+30},extra:true,benefit:'开启团子足球',minute:'60分钟后'}
].map(f=>({...f,plotId:campPlotAt(f)?.id,width:f.width||110,height:f.height||100,site:{...f.site,mapId:'forest'},order:content.tasks.findIndex(t=>t.id===f.before)})).sort((a,b)=>a.order-b.order);
// 缺少新字段也视为未修复，不迁移旧存档权限。
export function freshRestoration(){return {version:1,repaired:[],cottageRested:false,gathered:Object.fromEntries(TOWN_RESTORATIONS.map(f=>[f.id,0])),build:null};}
// 仅恢复有效修复记录和有限的采集量。
export function validateRestoration(raw){
 const repaired=TOWN_RESTORATIONS.filter(f=>raw?.repaired?.includes(f.id)).map(f=>f.id),b=raw?.build;
 const valid=b&&TOWN_RESTORATIONS.some(f=>f.id===b.id)&&!repaired.includes(b.id)&&Number.isFinite(b.x)&&Number.isFinite(b.y);
 return {version:1,repaired,cottageRested:repaired.includes('cottage')&&raw?.cottageRested===true,gathered:Object.fromEntries(TOWN_RESTORATIONS.map(f=>[f.id,Math.min(f.wood,Math.max(0,Math.floor(Number(raw?.gathered?.[f.id])||0)))])),
 build:valid?{id:b.id,elapsed:Math.max(0,Math.min(RESTORATION_SECONDS,Number(b.elapsed)||0)),x:b.x,y:b.y}:null};
}

// 武器工坊沿用入职修复；随身地图、背包和设置不属于建筑功能。
export function facilityOpen(progress,id){
 const sites=progress?.campLand?.sites;
 if((sites?.[({'cat-home':'catHome',defense:'defense-top'}[id]||id)]||(id==='defense'&&sites?.['defense-left']))&&progress.restoration?.repaired.includes(id))return true;
 const plotSite=TOWN_RESTORATIONS.find(f=>f.id===id);if(plotSite&&!(plotSite.locations||[plotSite]).some(site=>ownsCampPoint(progress,site)))return false;
 if(id==='weapons')return !progress?.arrival||['craft','crafting','complete'].includes(progress.arrival.phase);
 return !TOWN_RESTORATIONS.some(f=>f.id===id)||!!progress?.restoration?.repaired.includes(id);
}
// 任务重排后按当前任务位置依次修复，不用完成条数推断建筑权限。
export function pendingRestoration(progress){
 // 提前修复施工期间显示正在修的建筑，完工后再恢复当前主线的未修复设施。
 const building=TOWN_RESTORATIONS.find(f=>f.id===progress?.restoration?.build?.id&&!facilityOpen(progress,f.id));if(building)return building;
 const run=progress?.mainline,task=currentMainlineTask(run);

 // 仅当前主动任务需要的设施是前置，自选玩法的建筑不再串成必修链。
 if(run?.trackingPaused)return null;
 return TOWN_RESTORATIONS.find(f=>!facilityOpen(progress,f.id)&&f.before===task?.id&&(!f.extra||!isCampaignTask(task)))||null;
}
// 所有入口共用同一锁定原因。
export function facilityReason(progress,id){const f=TOWN_RESTORATIONS.find(f=>f.id===id);return facilityOpen(progress,id)?'':f&&!ownsCampPoint(progress,f)?'在大地图选择'+f.name+'，点击空地建造。':f?'带上'+f.wood+'木头，靠近修复'+f.name+'后即可使用，可提前修复。':'先修复武器工坊。';}
// 角色培养共用武器工坊，炮塔整备共用载具工坊。
export function workshopFacility(kind){return ['vehicle','turret'].includes(kind)?'garage':'weapons';}
