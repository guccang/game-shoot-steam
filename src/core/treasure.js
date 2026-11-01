// 探索事务集中验证距离、线索、唯一奖励和货舱载重；界面不能绕过实际权限。
import {TREASURE_SITES,TREASURE_PARTS,DETECTOR} from '../config/treasure.js';
import {learnTreasureClue} from '../progression/treasure.js';
import {validateProgress} from '../progression/progress.js';
import {personalFleet} from './vehicle-repair.js';
import {canInspectBuilding} from './building-entry.js';
import {capturePatrol} from './patrol-session.js';
import {worldDistance,canonical} from '../world/coordinates.js';
import {catLoad,vehicleLoad} from '../progression/load-weight.js';
import {cargoAccessible} from './cargo.js';
import {vehicleLocations} from './vehicle-location.js';
import {createVehicle} from '../combat/vehicle.js';
import {VEHICLE_WORKSHOP} from '../world/workshop.js';
// 永久进度的修改先生成候选快照，保存失败不改变奖励、金币或运行时载具。
function commit(game,mutate,message){const next=validateProgress(structuredClone(game.progress)),snapshot=Object.create(game);snapshot.progress=next;next.patrol=capturePatrol(snapshot);const error=mutate(next);if(error)return {ok:false,message:error};let saved=false;try{saved=game.livingPersist?.(next)===true;}catch{}if(!saved)return {ok:false,message:'保存失败，寻宝进度和物品未改变，请重试。'};game.progress=next;return {ok:true,message};}
// 探测仅在自由大世界进行，屋内与临时战斗不能远程挖取物品。
export function treasureAvailable(game){return personalFleet(game)&&canInspectBuilding(game)&&!game.arrivalPending&&!game.progress.restoration?.build&&game.player.hp>0&&['playing','paused'].includes(game.state);}
// 实际与邻居交谈才留下新线索，通讯录目录和导航查询本身不会发放。
export function hearTreasureRumor(game,resident){const site=TREASURE_SITES.find(s=>s.resident===resident&&!game.progress.treasure.clues.includes(s.id));if(!site||!treasureAvailable(game))return null;return commit(game,p=>{learnTreasureClue(p,site);},`${site.speaker}：${site.clue}（已记入手机寻宝）`);}
// 任务回应与线索同一事务提交，读取对话不会预先领取任何奖励。
export function taskTreasureRumor(p,request,step){const site=TREASURE_SITES.find(s=>s.request===request&&s.step===step);if(!site||!learnTreasureClue(p,site))return '';return ` ${site.speaker}又想起：${site.clue}（已记入手机寻宝）`;}
// 探测器从补给铺购买，工具永久保留，满载前必须先腾出空间。
export function buyDetector(game){if(!personalFleet(game)||game.cottage?.kind!=='ammo'||!['playing','paused'].includes(game.state)||game.player.hp<=0)return {ok:false,message:'请到弹药补给铺柜台购买探测器。'};if(game.progress.treasure.detector)return {ok:false,message:'已经拥有金属探测器，无需重复购买。'};if(catLoad(game).weight+DETECTOR.mass>=catLoad(game).capacity)return {ok:false,message:'背包空间不足，探测器重1.2千克，请先清理背包。'};return commit(game,p=>{if(p.coins<DETECTOR.price)return '金币不足，需要180金币。';p.coins-=DETECTOR.price;p.treasure.detector=true;},'已获得金属探测器，可在手机寻宝页面开启探测。');}
// 只感知已听过线索且未领取的点，按环绕世界距离选择最近信号。
export function detectorSignal(game){if(!treasureAvailable(game)||!game.progress.treasure.detector||!game.detectorActive)return null;const t=game.progress.treasure,sites=TREASURE_SITES.filter(s=>t.clues.includes(s.id)&&!t.recovered.includes(s.id)).map(site=>({site,distance:worldDistance(game.player,site)})).sort((a,b)=>a.distance-b.distance),hit=sites[0];return hit&&hit.distance<=DETECTOR.radius?{...hit,strength:Math.max(1,Math.round((1-hit.distance/DETECTOR.radius)*100)),dig:hit.distance<=DETECTOR.digRadius}:{site:null,strength:0,dig:false};}
// 挖掘不随机换点。部件先出土留在现场，满载时可稍后带车回来取。
export function excavateTreasure(game,id){const signal=detectorSignal(game),site=TREASURE_SITES.find(s=>s.id===id);if(!site||!signal?.dig||signal.site.id!==id)return {ok:false,message:'开启探测器，靠近线索中的强信号位置再挖掘。'};if(game.progress.treasure.found.includes(id))return {ok:false,message:'已经挖出这件遗物，请选择货舱装载。'};
 const result=commit(game,p=>{p.treasure.found.push(id);if(site.kind==='vehicle'){if(p.vehicleHulls[site.index])return '已经拥有此唯一车体。';p.vehicleHulls[site.index]=1;p.vehicleLoadouts[site.index]=null;p.vehicleService[site.index]={hp:0,phase:'wrecked',mapId:site.mapId,position:canonical(site)};p.treasure.recovered.push(id);}},site.kind==='vehicle'?'发现一辆报废坦克！已标记到手机载具定位，可呼叫救援或自行牵引回厂。':'部件已经出土，仍留在现场。把有足够载重的载具开到旁边装载。');
 if(result.ok&&site.kind==='vehicle'){const v=createVehicle(game.progress,game.maxHp(),site.index);v.hp=0;v.active=false;game.vehicles[site.index]=v;}return result;
}
// 装载前检查车体可访问与完整载荷，不强迫玩家接受无法移动的超载状态。
export function collectTreasurePart(game,id,hull){const s=TREASURE_SITES.find(s=>s.id===id),t=game.progress.treasure;if(!treasureAvailable(game)||!s||s.kind==='vehicle'||!t.found.includes(id)||t.recovered.includes(id)||worldDistance(game.player,s)>100)return {ok:false,message:'请到已挖出的部件旁装载，奖励不能重复领取。'};if(!Number.isInteger(hull)||!cargoAccessible(game,hull)||game.progress.vehicleService[hull]?.phase)return {ok:false,message:'请将完好的载具开到部件旁。'};const part=TREASURE_PARTS.find(p=>p.kind===s.kind&&p.index===s.index),load=vehicleLoad(game,hull,{driver:true});if(load.payload+part.mass>=load.capacity)return {ok:false,message:`载荷不足，部件重${part.mass}千克，装车后将满载。请卸货或换载重更大的车；部件会留在原地。`};return commit(game,p=>{p.treasure.recovered.push(id);p.treasure.parts[part.id]={place:'cargo',hull};if(part.kind==='gun')p.vehicleWeapons[part.index]=1;},`${part.name}已装入货舱，增加${part.mass}千克载荷。请运到载具工坊换装。`);}
// 室内按门外位置校验运输车辆，不能从远处货舱直接拿取探索部件。
export function treasureWorkshopCargo(game,hull){const origin=game.cottage?.outside||game.player,site=vehicleLocations(game).find(v=>v.hull===hull);return personalFleet(game)&&['playing','paused'].includes(game.state)&&game.player.hp>0&&(game.cottage?.kind==='vehicle'||!game.cottage&&game.mapId==='forest'&&worldDistance(game.player,VEHICLE_WORKSHOP)<180)&&site?.mapId==='forest'&&worldDistance(site,origin)<=240&&!game.progress.vehicleService[hull]?.phase;}
// 未装部件可运入工坊保管，再装到另一辆在场车；保管不占车辆载荷。
export function transferTreasurePart(game,key,hull,toWorkshop){const part=TREASURE_PARTS.find(p=>p.id===key),r=game.progress.treasure.parts[key];if(!part||!r||!treasureWorkshopCargo(game,hull))return {ok:false,message:'请把运输车辆停到载具工坊附近后办理部件装卸。'};if(toWorkshop?(r.place!=='cargo'||r.hull!==hull):r.place!=='workshop')return {ok:false,message:'部件位置已经改变，请刷新查看。'};if(!toWorkshop){const load=vehicleLoad(game,hull,{driver:true});if(load.payload+part.mass>=load.capacity)return {ok:false,message:'装入后载荷将满，请先清理货舱。'};}return commit(game,p=>{p.treasure.parts[key]=toWorkshop?{place:'workshop'}:{place:'cargo',hull};},`${part.name}已${toWorkshop?'存入工坊，载具已减负':'装入货舱并计入载荷'}。`);}
// 换装只接受工坊库存或现场车辆上的实物，已安装部件也要先开车到场。
export function treasurePartReason(game,key,hull){const r=game.progress.treasure.parts[key];if(!r)return '尚未探索获得该部件。';if(r.place==='workshop')return '';if(r.place==='installed'&&r.hull===hull)return '';return treasureWorkshopCargo(game,r.hull)?'':'请把装有该部件的载具开到工坊。';}
