// 寻路显示偏好独立于任务追踪与完成进度，新旧存档默认开启。
export function taskNavigationEnabled(game){return game.progress?.mainline?.navigationEnabled!==false;}
// 只切换可见指引，不放弃任务、不改变战斗目标；显式操作才保存偏好。
export function setTaskNavigationEnabled(game,enabled){
 const run=game.progress?.mainline;if(!run||taskNavigationEnabled(game)===enabled)return;
 run.navigationEnabled=enabled;game.onEvent?.('navigation-change');
}
// 自主点击只记录开关使用情况，不作为任务完成条件；保持玩家选择的开关状态。
export function toggleTaskNavigation(game){
 const run=game.progress?.mainline;
 if(run&&run.completed.length===0&&run.phase==='doing'&&game.state==='playing'&&!game.arrivalPending&&!game.story&&!game.realm)run.seen.navigation=1;
 setTaskNavigationEnabled(game,!taskNavigationEnabled(game));
}
