import {campExpansionSite,CAMP_EXPANSION_DIRECTIONS} from '../../world/camp-expansion-site.js';
import {retiredMonsterCampIds} from '../../world/camp-retired-monsters.js';
// 扩建在候选存档中合并扣料，保存失败不改变余额、边界或原摆放。
import {campExpansionCost,CAMP_EXPANSION} from '../../config/camp-expansion.js';
import {campPlots,campArea,campExpansionPoint} from '../../config/camp-land.js';
import {workshopMaterialCount,spendWorkshopMaterials} from '../../progression/workshop/workshop-materials.js';
import {campPlanUnavailable} from './camp-layout.js';
import {bindEconomy,economyFor} from '../../config/economy.js';
import {recordEconomy} from '../../progression/economy/economy-ledger.js';
import {capturePatrol} from '../battle/patrol-session.js';
import {activateCampLayout} from '../../world/camp-layout-bindings.js';
// 预览读取真实背包、拥有载具和小屋库存，不把未拥有车辆算作材料。
export function campExpansionQuote(game,direction='north'){const p=game.progress,level=p.campLand.expansions||0,location=campExpansionSite(p,direction),cost=campExpansionCost(level),available=Object.fromEntries(Object.keys(cost).map(k=>[k,workshopMaterialCount(p,k)])),area=campArea(p),reason=campPlanUnavailable(game)||location.reason||(level>=CAMP_EXPANSION.maxLevel?'已达到世界边界允许的营地面积。':Object.keys(cost).some(k=>available[k]<cost[k])?'金币或材料不足。':'');return {level,cost,available,area,nextArea:area+CAMP_EXPANSION.area,direction,site:location.site,reason};}
// 确认绑定所显示报价的级数，避免双击或旧页面重复扣费。
export function expandCamp(game,expectedLevel,persist=game.restorationPersist,direction='north'){const quote=campExpansionQuote(game,direction);if(quote.level!==expectedLevel)return {ok:false,message:'扩建报价已更新，请重新确认。'};if(quote.reason)return {ok:false,message:quote.reason};const next=bindEconomy(structuredClone(game.progress),economyFor(game.progress));if(!spendWorkshopMaterials(next,quote.cost))return {ok:false,message:'材料不足，未扣费。'};next.campLand.baseTops??=Object.fromEntries(campPlots(game.progress).filter(p=>!p.id.startsWith('expansion-')).map(p=>[p.id,p.top]));next.campLand.additions=[...(next.campLand.additions||[]),quote.site];next.campLand.expansions=quote.level+1;recordEconomy(next,'expense','camp:expand:'+next.campLand.expansions,quote.cost);const snapshot=Object.create(game);snapshot.progress=next;next.patrol=capturePatrol(snapshot);try{if(persist?.(next)!==true)return {ok:false,message:'扩建未保存，金币和材料未扣除，请重试。'};}catch{return {ok:false,message:'扩建未保存，金币和材料未扣除，请重试。'};}game.progress=next;game.player.campProgress=next;const retired=retiredMonsterCampIds(next);game.enemies=(game.enemies||[]).filter(e=>!retired.has(e.monsterCamp));activateCampLayout(next);game.trees=(game.trees||[]).filter(t=>!campExpansionPoint(t,next,60));game.stumps=(game.stumps||[]).filter(t=>!campExpansionPoint(t,next,60));game.sceneApproach=null;game.onEvent?.('camp-expansion');return {ok:true,message:'营地向'+CAMP_EXPANSION_DIRECTIONS[direction]+'增加了'+CAMP_EXPANSION.area+'平方米，可摆放建筑和装饰。'};}
