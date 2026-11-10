import {clearWorldNavigation} from './world-navigation.js';
import {stopWaystationTravel} from './navigation-control.js';
import {gameSource} from '../game-source.js';
// 寻路显示偏好独立于任务追踪与完成进度，新旧存档默认开启。
export function taskNavigationEnabled(game){game=gameSource(game);return !game.waystationTravel&&game.progress?.mainline?.navigationEnabled!==false;}
// 开启任务导航先停止驿站；关闭只停路线，不放弃任务或改变战斗目标。
export function setTaskNavigationEnabled(game,enabled,{silent=false}={}){
 game=gameSource(game);const run=game.progress?.mainline;if(!run)return;
 // 关闭同时撤销回家、找邻居等临时访问，任务卡不能留下已取消的目的地。
 if(!enabled)clearWorldNavigation(game);
 const replacing=enabled&&!!game.waystationTravel;
 if(replacing)stopWaystationTravel(game,'');
 if((run.navigationEnabled!==false)===enabled&&!replacing)return;
 run.navigationEnabled=enabled;game.onEvent?.('navigation-change',{silent});
}
// 自主点击只记录开关使用情况，不作为任务完成条件；保持玩家选择的开关状态。
export function toggleTaskNavigation(game){
 const run=game.progress?.mainline;
 if(run&&run.completed.length===0&&run.phase==='doing'&&game.state==='playing'&&!game.arrivalPending&&!game.story&&!game.realm)run.seen.navigation=1;
 setTaskNavigationEnabled(game,!taskNavigationEnabled(game));
}
