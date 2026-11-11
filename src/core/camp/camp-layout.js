import {relocateRetiredGateSpots} from '../../progression/vehicles/camp-parking.js';
import {clearGateParkingTrees} from '../../world/forest-clearings.js';
import {relocatePastureAnimals} from './camp-layout-pasture.js';
import {PATHS} from '../../world/paths.js';
import {roadFootprintDistance} from '../../world/road-footprint.js';
import {RANGER} from '../../config/ranger-arrival.js';
import {campPlacementPoint} from '../../world/camp-placement-area.js';
import {campFixedFacilities} from '../../world/camp-layout-facilities.js';
import {relocateLayoutService} from './camp-layout-service.js';
import {overlapsCampPlaza} from '../../world/camp-plaza.js';
import {campLayoutDecorConflicts} from '../../world/camp-layout-decor.js';
import {PARKING_SPOTS} from '../../config/parking.js';
import {campPlotAt,ownsCampPlot,insideCampLand} from '../../config/camp-land.js';
// 布局草稿先检查占地和道路，保存成功后统一迁移全部正式锚点。
import {CAMP_BUILDINGS,normalizeCampLayout,campBuildingPosition,campLayoutFootprints,campFenceFootprints} from '../../config/camp-layout.js';
import {layoutBuildings,campLayoutRoads} from '../../world/camp-layout-roads.js';
import {activateCampLayout} from '../../world/camp-layout-bindings.js';
import {campBoundary,campBoundaryBlocked} from '../../world/camp-boundary.js';
import {canInspectBuilding} from './building-entry.js';
import {bindEconomy,economyFor} from '../../config/economy.js';
import {capturePatrol} from '../battle/patrol-session.js';
import {worldDistance,nearest} from '../../world/coordinates.js';
// 门前、车道与正在使用的实体均不能被新建筑覆盖。
export function checkCampPlacement(game,layout,id){const base=CAMP_BUILDINGS.find(b=>b.id===id);if(!base)return '没有这座建筑。';const b=campBuildingPosition(layout,base),sign=b.placementKind==='sign',boundary=campBoundary(game.progress,layout);
 if(id!=='plaza'&&(b.parking||sign?campLayoutFootprints(b).some(r=>overlapsCampPlaza((r.left+r.right)/2,(r.top+r.bottom)/2,(r.right-r.left)/2,(r.bottom-r.top)/2,game.progress)):overlapsCampPlaza(b.x,b.y-b.height/2,b.width/2,b.height/2,game.progress)))return '请保留中央庆典广场。';
 // 外围公共道路和公交站保留原位，不能被新屋体覆盖。
 const land=campPlotAt(b,game.progress);if(!sign&&(!land||!ownsCampPlot(game.progress,land.id))){const center={x:b.x,y:b.y-b.height/2};if(PATHS.some(path=>path.some((point,i)=>i&&roadFootprintDistance(path[i-1],point,nearest(center,path[i-1]),b.width/2,b.height/2)<28))||[RANGER.busStop,RANGER.bus].some(site=>{const p=nearest(site,b);return Math.abs(p.x-b.x)<b.width/2+85&&p.y+45>b.y-b.height&&p.y-150<b.y;}))return '请避开营地外的公共道路和公交站。';}
 // 围栏独立检查真实屋体与入口；道路根据新位置重建，不要求侧面留一条宽车道。
 if(!sign&&campFenceFootprints(b).some(({left,right,top,bottom})=>boundary.objects.some(f=>f.type==='settlement-fence'&&(f.horizontal?left<f.x+f.length/2&&right>f.x-f.length/2&&top<f.y+5&&bottom>f.y-5:left<f.x+5&&right>f.x-5&&top<f.y+f.length/2&&bottom>f.y-f.length/2))))return '请勿让建筑横跨围栏。';
 // 停车场东侧弯道与入口计入占地，防止搬到房屋、树木或土地外。
 for(const {left,right,top,bottom} of campLayoutFootprints(b)){
 if(!insideCampLand(game.progress,left,top,right,bottom))return '请将建筑和门前通道放在已解锁的营地范围内。';
 for(let x=left;x<=right;x+=20)for(let y=top;y<=bottom;y+=20)if(!campPlacementPoint(game.progress,x,y,sign?0:12)&&!(sign&&boundary.gates.some(g=>g.settlement==='sunleaf'&&(g.horizontal?Math.abs(x-g.x)<=g.length/2-24&&Math.abs(y-g.y)<=48:Math.abs(y-g.y)<=g.length/2-24&&Math.abs(x-g.x)<=48))))return '请让建筑和门前通道落在干地上。';

 for(const other of layoutBuildings(game.progress,layout)){if(other.id===id)continue;if(campLayoutFootprints(other).some(r=>left<r.right&&right>r.left&&top<r.bottom&&bottom>r.top))return '与'+other.name+'或它的门前通道重叠。';}
 if(!sign&&boundary.gates.some(g=>Math.abs(g.x-b.x)<(g.horizontal?g.length/2+30:b.width/2+110)&&Math.abs(g.y-b.y)<(g.horizontal?b.height+100:g.length/2+30)))return '请给营门及拖挂转弯留下空间。';
 // 可通行站牌允许放在门洞，只保护真实围栏底座，不套用房屋转弯缓冲。
 if(sign&&campBoundaryBlocked(b.x,b.y,12,{...game.progress,campLayout:layout}))return '请避开实际围栏和门柱。';
 if((game.trees||[]).some(t=>{const p=nearest(t,b);return t.hp>0&&p.x>=left&&p.x<=right&&p.y>=top&&p.y<=bottom;}))return '这里有树木，请先清理或选择空地。';
 if(game.progress.farm?.plots?.some?.(plot=>{if(plot.mapId&&plot.mapId!=='forest')return false;const p=nearest(plot,b);return p.x>=left-20&&p.x<=right+20&&p.y>=top-20&&p.y<=bottom+20;}))return '请避开已有农田。';
 const player=game.player&&nearest(game.player,b);if(player&&player.x>=left&&player.x<=right&&player.y>=top&&player.y<=bottom)return '请先离开计划放置建筑的位置。';
 if((game.progress.campParking?.owned||[]).some(v=>{const p=nearest(v,b);return v.spot==null&&v.mapId==='forest'&&p.x>=left-30&&p.x<=right+30&&p.y>=top-30&&p.y<=bottom+30;}))return '这里停着载具，请先移走。';
 if(PARKING_SPOTS.some(s=>(s.building==='annex'||s.lotId)&&left<s.x+50&&right>s.x-50&&top<s.approachY+20&&bottom>s.y-48))return '请保留公共停车位及进出车道。';
 for(const fixed of campFixedFacilities(game.progress)){const p=nearest(fixed,b),overlap=fixed.publicTable?(b.parking||sign?left<p.x+fixed.width/2&&right>p.x-fixed.width/2&&top<p.y+5&&bottom>p.y-19:b.x-b.width/2<p.x+fixed.width/2&&b.x+b.width/2>p.x-fixed.width/2&&b.y-b.height<p.y+5&&b.y>p.y-19):fixed.rects.some(([l,t,r,bt])=>left<fixed.x+r+20&&right>fixed.x+l-20&&top<fixed.y+bt+20&&bottom>fixed.y+t-20);if(overlap)return '请避开'+fixed.name+'（公共设施）。';}
 }
 const aliases={'vehicle':'garage','cat-home':'catHome','warehouse-depot':'warehouseDepot'};
 // 泊位随建筑搬迁，连同接近车道检查土地和邻屋，不能落到另一座建筑中。
 const current=campBuildingPosition(game.progress.campLayout,base),dx=b.x-current.x,dy=b.y-current.y;
 for(const spot of PARKING_SPOTS.filter(s=>(aliases[s.building]||s.building)===id)){const x=spot.x+dx,y=spot.y+dy;if(!campPlacementPoint(game.progress,x,y,50)||!campPlacementPoint(game.progress,x,spot.approachY+dy,40))return '请将附属停车位和进出车道放在干地上。';for(const other of layoutBuildings(game.progress,layout))if(other.id!==id&&x+50>other.x-other.width/2&&x-50<other.x+other.width/2&&y+50>other.y-other.height&&y-50<other.y+20)return '附属停车位与'+other.name+'重叠。';}
 return '';
}
// 活动、入屋、施工和拖挂期间不搬迁世界，避免截断正在执行的路线。
export function campPlanUnavailable(game){
 if(!canInspectBuilding(game)||!['playing','paused'].includes(game.state)||game.arrivalPending)return '请先结束当前活动并回到地面营地，再调整布局。';
 if(game.progress.restoration?.build)return '建筑正在施工，请等待本次施工完成后再调整布局。';
 if(game.progress.logistics?.tow)return '正在牵引载具，请先解除牵引后再调整布局。';
 if(game.parking?.phase==='parked')return '载具仍停在车位中，请先下车或驶离车位，再调整布局。';
 if(game.parking?.phase)return '正在停车或驶离车位，请结束停车操作后再调整布局。';
 return '';
}
// 后台救援、维修及等待交付不限制规划，仍保护玩家正在执行的操作。
export function canPlanCamp(game){return !campPlanUnavailable(game);}
// 保存事务成功后才更新运行锚点，保留角色连续动作时钟。
export function saveCampLayout(game,draft,persist=game.restorationPersist){if(!canPlanCamp(game))return {ok:false,message:campPlanUnavailable(game)};const layout=normalizeCampLayout(draft),previous=game.progress.campLayout||{positions:{}};
 for(const b of CAMP_BUILDINGS){const before=campBuildingPosition(previous,b),after=campBuildingPosition(layout,b);if(worldDistance(before,after)<1)continue;const error=checkCampPlacement(game,layout,b.id);if(error)return {ok:false,message:b.name+'：'+error};}
 // 关闭原门口前保护正在穿门的角色和车辆，避免保存后被新围栏夹住。
 if(JSON.stringify(layout.gates||{})!==JSON.stringify(previous.gates||{})){const nextBoundary={...game.progress,campLayout:layout};for(const actor of [game.player,...(game.progress.campParking?.owned||[])])if(actor&&(!actor.mapId||actor.mapId==='forest')&&!campBoundaryBlocked(actor.x,actor.y,30,game.progress)&&campBoundaryBlocked(actor.x,actor.y,30,nextBoundary))return {ok:false,message:'请先将猫猫和载具移离原门口，再调整大门。'};}
 // 大门沿原围栏调整，入口内侧不得覆盖建筑、农田或停放车辆。
 for(const gate of campBoundary(game.progress,layout).gates){if(!gate.id||layout.gates?.[gate.id]===previous.gates?.[gate.id])continue;const inset={x:gate.x+(gate.side==='left'?60:gate.side==='right'?-60:0),y:gate.y+(gate.side==='top'?60:gate.side==='bottom'?-60:0)},halfX=gate.horizontal?gate.length/2:65,halfY=gate.horizontal?65:gate.length/2;
 if(layoutBuildings(game.progress,layout).some(b=>!b.passable&&campLayoutFootprints(b).some(r=>r.left<inset.x+halfX&&r.right>inset.x-halfX&&r.top<inset.y+halfY&&r.bottom>inset.y-halfY)))return {ok:false,message:'大门前有建筑或车道，请换一个位置。'};
 if([...(game.progress.farm?.plots||[]),...(game.progress.campParking?.owned||[]).filter(v=>v.spot==null)].some(p=>{const q=nearest(p,inset);return (!p.mapId||p.mapId==='forest')&&Math.abs(q.x-inset.x)<halfX+30&&Math.abs(q.y-inset.y)<halfY+30;}))return {ok:false,message:'请避开门前农田或停放载具。'};
 }
 const roads=campLayoutRoads(game.progress,layout,{ignoreDecor:true});if(roads.unreachable.length)return {ok:false,message:'有建筑或营门无法连通，请留出更宽的通道。'};
 const next=bindEconomy(structuredClone(game.progress),economyFor(game.progress));next.campLayout=layout;for(const [id,site] of Object.entries(next.campLand?.sites||{})){const base=CAMP_BUILDINGS.find(b=>b.id===id);if(base){const position=campBuildingPosition(layout,base);site.x=position.x;site.y=position.y;}}relocateRetiredGateSpots(next);const pastureMoved=relocatePastureAnimals(game,next);const serviceError=relocateLayoutService(game,next);if(serviceError)return {ok:false,message:serviceError};const reclaimed=campLayoutDecorConflicts(game.progress,layout,roads),ids=new Set(reclaimed);for(const item of next.campManagement?.items||[])if(ids.has(item.uid))item.x=item.y=null;const snapshot=Object.create(game);snapshot.progress=next;next.patrol=capturePatrol(snapshot);
 try{if(persist?.(next)!==true)return {ok:false,message:'布局未保存，建筑位置没有改变，请重试。'};}catch{return {ok:false,message:'布局未保存，建筑位置没有改变，请重试。'};}
 game.progress=next;activateCampLayout(next);clearGateParkingTrees(game);if(pastureMoved&&game.oxArrival?.returning)game.oxArrival=null;game.sceneApproach=null;for(const actor of game.campActors?.values()||[]){actor.path=[];actor.action='rest';actor.stage=2;actor.remaining=0;}game.campRoutine=null;for(const actor of game.livingActors?.values()||[]){actor.path=[];actor.goal=null;}game.player.campProgress=next;return {ok:true,reclaimed,message:reclaimed.length?`布局已保存，${reclaimed.length} 件冲突装饰已回收到「我的装饰」，可再次摆放。`:'布局已保存，建筑入口和连接道路已同步更新。'};
}
