import {clearingObjective} from './clearing-guide.js';
import {taskNavigationEnabled,setTaskNavigationEnabled} from './task-navigation.js';
import {gameSource} from './game-source.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
// 导航意图与任务进度分离：默认展示任务路线，手动关闭后不因任务推进自动恢复。
import {trackedLivingRequest} from './task-tracking.js';
import {mainlineObjective} from './mainline-manager.js';
import {clearingCombatActive} from './living-safety.js';
import {livingForest} from '../world/living-spaces.js';
import {worldDistance} from '../world/coordinates.js';
import {CLEARING_POST} from '../config/clearing.js';
import {isClearingSite} from '../progression/clearing-site.js';
import {arrivalWorkshopObjective} from './ranger-arrival.js';
const intents=new WeakMap();
// 诊断只读取临时目标，不调用会消费意图或影响优先级的正式导航入口。
export function worldNavigationDiagnostics(game){const intent=intents.get(gameSource(game));return {enabled:taskNavigationEnabled(game),intent:intent?{label:intent.label,direct:intent.direct,site:{id:intent.site.id,mapId:intent.site.mapId,x:intent.site.x,y:intent.site.y}}:null};}
// 活动结束时撤销旧的临时目的地，保留玩家手动关闭寻路的偏好。
export function clearWorldNavigation(game){intents.delete(gameSource(game));}
// 在任务详情中主动出发时恢复寻路并清除临时访问路线，正文阅读不调用此入口。
export function requestMainlineNavigation(game){game.progress.mainline.trackingPaused=false;game.progress.taskTracking={kind:'mainline'};setTaskNavigationEnabled(game,true);intents.delete(gameSource(game));}
// 场景主动点击可临时覆盖教学导航；旧菜单意图保持原优先级，抵达后让位给任务提示。
export function requestWorldNavigation(game,site,label,{direct=false,action=null,arrivalRadius=GAMEPLAY_VALUES.mainline.visitRadius}={}){setTaskNavigationEnabled(game,true);if(isClearingSite(site)){intents.delete(game);return;}intents.set(game,{site:{...site,mapId:site.mapId||'forest'},label,direct,action,arrivalRadius:Number.isFinite(arrivalRadius)&&arrivalRadius>0?arrivalRadius:GAMEPLAY_VALUES.mainline.visitRadius});}
// 地面光点与终点遵守显示开关；关闭寻路不能丢失任务卡正在展示的目标。
export function worldNavigationObjective(game){
 game=gameSource(game);
 if(!taskNavigationEnabled(game))return null;
 return worldTaskObjective(game);
}
// 任务卡与点击操作共用目标优先级，独立于路点显隐；抵达后仍正常清理临时访问。
export function worldTaskObjective(game){
 game=gameSource(game);
 // 投料后已到达门前，隐藏终点徽记，让木料飞行与局部施工保持清晰。
 if(game.progress?.restoration?.build||game.progress?.arrival?.phase==='repairing')return null;
 // 入职尚未进入生活模式，但修复和制枪已是可自由赶路的正式任务。
 const arrival=arrivalWorkshopObjective(game);if(arrival)return arrival;
 if(game.mainlineSpeech)return null;
 // 湖岸等操作目标使用自己的有效距离，不能在操作尚不可用时按通用访问半径撤销导航。
 const intent=intents.get(game),visitRadius=intent?.arrivalRadius??GAMEPLAY_VALUES.mainline.visitRadius;
 if(!livingForest(game)){if(game.mapId==='jiuzhaigou'&&!game.realm&&!game.story&&intent?.direct&&intent.site.mapId===game.mapId&&worldDistance(game.player,intent.site)>visitRadius)return {task:{id:'visit',title:intent.label},key:'visit',phase:'travel',site:intent.site,label:intent.label};if(intent?.site.mapId===game.mapId&&worldDistance(game.player,intent.site)<=visitRadius)intents.delete(game);return null;}
 // 战斗 HUD 出现后仍引向场内站牌；只压住无关路线，临时访问意图继续保留。
 if(clearingCombatActive(game)){const clearing=clearingObjective(game);return clearing.navigation?{task:{id:'boss-clearing',title:'Boss 清缴任务'},phase:'travel',...clearing}:null;}
 const o=mainlineObjective(game);
 // 找种任务从出发到交付都使用自己的目标，旧清缴任务不能将路线拉回清缴场。
 const seedTask=o?.task.gardening?.kind==='drop';
 if(seedTask&&o.navigation&&!intent?.direct)return o;
 // 自选提前修复的导航优先于主线修复，普通任务追踪仍保留原顺序。
 if((o?.restoration||o?.cottageRest)&&!intent?.direct)return o;
 if(o?.clearingStage&&o.phase==='doing'&&!intent?.direct&&!(intent?.site?.id===CLEARING_POST.id&&game.progress.living.patrolActive))return o.navigation?o:null;
 // 离开清缴区域后继续指向本轮站牌，不能恢复战斗前残留的普通访问路线。
 // 主动点选的目的地、回告示牌管理和正在追踪的邻里委托仍保留各自优先级。
 if(game.progress?.living?.patrolActive&&!intent?.direct&&intent?.site?.id!==CLEARING_POST.id&&!trackedLivingRequest(game)){
  const clearing=clearingObjective(game);
  return clearing.navigation?{task:{id:'boss-clearing',title:'Boss 清缴任务'},phase:'travel',...clearing}:null;
 }
 if(intent?.site){
  const resident=game.livingActors?.get(intent.site.id);if(resident)Object.assign(intent.site,{x:resident.x,y:resident.y});
  if(game.mapId!==intent.site.mapId||worldDistance(game.player,intent.site)>visitRadius)return {task:{id:'visit',title:intent.label},key:'visit',phase:'travel',site:intent.site,label:intent.label,action:intent.action};
  intents.delete(game);
 }
 if(trackedLivingRequest(game))return null;

 // 非主线清缴也使用同一站牌终点，进入战斗范围不视作抵达。
 if(game.progress?.living?.patrolActive){const clearing=clearingObjective(game);if(clearing.navigation)return {task:{id:'boss-clearing',title:'Boss 清缴任务'},phase:'travel',...clearing};}
 if(o&&o.phase!=='doing')return o;
 if(o&&o.navigation!==false)return o;
 return null;
}
