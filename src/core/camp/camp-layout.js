import {overlapsCampPlaza} from '../../world/camp-plaza.js';
import {campDecorDefinition} from '../../config/camp-management.js';
import {LIVING_PLACES} from '../../config/living-world.js';
import {WORLD_BUILDINGS} from '../../config/world-buildings.js';
import {PARKING_SPOTS} from '../../config/parking.js';
import {campPlotAt,ownsCampPlot} from '../../config/camp-land.js';
// 布局草稿先检查占地和道路，保存成功后统一迁移全部正式锚点。
import {CAMP_BUILDINGS,normalizeCampLayout,campBuildingPosition} from '../../config/camp-layout.js';
import {layoutBuildings,ownedLayoutPoint,campLayoutRoads} from '../../world/camp-layout-roads.js';
import {activateCampLayout} from '../../world/camp-layout-bindings.js';
import {campBoundary} from '../../world/camp-boundary.js';
import {canInspectBuilding} from './building-entry.js';
import {bindEconomy,economyFor} from '../../config/economy.js';
import {capturePatrol} from '../battle/patrol-session.js';
import {worldDistance,nearest} from '../../world/coordinates.js';
// 门前、车道与正在使用的实体均不能被新建筑覆盖。
export function checkCampPlacement(game,layout,id){const base=CAMP_BUILDINGS.find(b=>b.id===id);if(!base)return '没有这座建筑。';const b=campBuildingPosition(layout,base);
 if(overlapsCampPlaza(b.x,b.y-b.height/2,b.width/2,b.height/2))return '请保留中央庆典广场。';
 if(!ownsCampPlot(game.progress,campPlotAt(base)?.id))return '请先购买这座建筑所在的土地。';
 const left=b.x-b.width/2-24,right=b.x+b.width/2+24,top=b.y-b.height-20,bottom=b.y+95;
 if(game.progress.campManagement?.items.some(i=>{if(i.x===null)return false;const d=campDecorDefinition(i.type);return left<i.x+d.width/2&&right>i.x-d.width/2&&top<i.y+d.depth/2&&bottom>i.y-d.height;}))return '请先收纳或移走这里的营地装饰。';
 for(let x=left;x<=right;x+=20)for(let y=top;y<=bottom;y+=20)if(!ownedLayoutPoint(game.progress,x,y,12))return '建筑和门前通道必须留在已购土地内。';
 for(const other of layoutBuildings(game.progress,layout)){if(other.id===id)continue;if(left<other.x+other.width/2+24&&right>other.x-other.width/2-24&&top<other.y+95&&bottom>other.y-other.height-20)return '与'+other.name+'或它的门前通道重叠。';}
 if(campBoundary(game.progress).gates.some(g=>Math.abs(g.x-b.x)<(g.horizontal?g.length/2+30:b.width/2+110)&&Math.abs(g.y-b.y)<(g.horizontal?b.height+100:g.length/2+30)))return '请给营门及拖挂转弯留下空间。';
 if((game.trees||[]).some(t=>{const p=nearest(t,b);return t.hp>0&&p.x>=left&&p.x<=right&&p.y>=top&&p.y<=bottom;}))return '这里有树木，请先清理或选择空地。';
 if(game.progress.farm?.plots?.some?.(plot=>{if(plot.mapId&&plot.mapId!=='forest')return false;const p=nearest(plot,b);return p.x>=left-20&&p.x<=right+20&&p.y>=top-20&&p.y<=bottom+20;}))return '请避开已有农田。';
 const player=game.player&&nearest(game.player,b);if(player&&player.x>=left&&player.x<=right&&player.y>=top&&player.y<=bottom)return '请先离开计划放置建筑的位置。';
 if((game.progress.campParking?.owned||[]).some(v=>{const p=nearest(v,b);return v.spot==null&&v.mapId==='forest'&&p.x>=left-30&&p.x<=right+30&&p.y>=top-30&&p.y<=bottom+30;}))return '这里停着载具，请先移走。';
 if((game.progress.vehicleService||[]).some(v=>{if(!v?.position||v.mapId!=='forest')return false;const p=nearest(v.position,b);return p.x>=left-30&&p.x<=right+30&&p.y>=top-30&&p.y<=bottom+30;}))return '这里有待修载具，请先移走。';
 if(Object.values(LIVING_PLACES).filter(s=>!['flowers','basket','warning','relay','kitchen','market'].includes(s.kind)).some(s=>{const p=nearest(s,b);return b.x-b.width/2<p.x+s.width/2&&b.x+b.width/2>p.x-s.width/2&&b.y-b.height<p.y+5&&b.y>p.y-19;}))return '请避开公共桌台。';
 const aliases={'vehicle':'garage','cat-home':'catHome','warehouse-depot':'warehouseDepot'};
 for(const fixed of WORLD_BUILDINGS.filter(f=>!CAMP_BUILDINGS.some(b=>b.id===(aliases[f.id]||f.id))))if(fixed.rects.some(([l,t,r,bt])=>left<fixed.x+r+20&&right>fixed.x+l-20&&top<fixed.y+bt+20&&bottom>fixed.y+t-20))return '请避开现有公共设施。';
 // 泊位随建筑搬迁，连同接近车道检查土地和邻屋，不能落到另一座建筑中。
 const current=campBuildingPosition(game.progress.campLayout,base),dx=b.x-current.x,dy=b.y-current.y;
 for(const spot of PARKING_SPOTS.filter(s=>(aliases[s.building]||s.building)===id)){const x=spot.x+dx,y=spot.y+dy;if(!ownedLayoutPoint(game.progress,x,y,50)||!ownedLayoutPoint(game.progress,x,spot.approachY+dy,40))return '附属停车位和进出车道超出了已购土地。';for(const other of layoutBuildings(game.progress,layout))if(other.id!==id&&x+50>other.x-other.width/2&&x-50<other.x+other.width/2&&y+50>other.y-other.height&&y-50<other.y+20)return '附属停车位与'+other.name+'重叠。';}
 return '';
}
// 活动、入屋、施工和拖挂期间不搬迁世界，避免截断正在执行的路线。
export function canPlanCamp(game){return canInspectBuilding(game)&&['playing','paused'].includes(game.state)&&!game.arrivalPending&&!game.progress.restoration?.build&&!game.progress.logistics?.tow&&!game.parking?.phase&&!(game.progress.vehicleService||[]).some(r=>r?.phase&&r.phase!=='wrecked');}
// 保存事务成功后才更新运行锚点，保留角色连续动作时钟。
export function saveCampLayout(game,draft,persist=game.restorationPersist){if(!canPlanCamp(game))return {ok:false,message:'请先结束施工、停车、牵引或当前活动，再规划营地。'};const layout=normalizeCampLayout(draft),previous=game.progress.campLayout||{positions:{}};
 for(const b of CAMP_BUILDINGS){const before=campBuildingPosition(previous,b),after=campBuildingPosition(layout,b);if(worldDistance(before,after)<1)continue;const error=checkCampPlacement(game,layout,b.id);if(error)return {ok:false,message:b.name+'：'+error};}
 const roads=campLayoutRoads(game.progress,layout);if(roads.unreachable.length)return {ok:false,message:'有建筑或营门无法连通，请留出更宽的通道。'};
 const next=bindEconomy(structuredClone(game.progress),economyFor(game.progress));next.campLayout=layout;const snapshot=Object.create(game);snapshot.progress=next;next.patrol=capturePatrol(snapshot);
 try{if(persist?.(next)!==true)return {ok:false,message:'布局未保存，建筑位置没有改变，请重试。'};}catch{return {ok:false,message:'布局未保存，建筑位置没有改变，请重试。'};}
 game.progress=next;activateCampLayout(next);game.sceneApproach=null;for(const actor of game.campActors?.values()||[]){actor.path=[];actor.action='rest';actor.stage=2;actor.remaining=0;}game.campRoutine=null;game.player.campProgress=next;return {ok:true,message:'布局已保存，建筑入口和连接道路已同步更新。'};
}
