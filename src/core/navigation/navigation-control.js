// 导航切换共用停止入口，撤销自动行进时同时清除速度，避免旧路线继续驱动角色。
export function stopWaystationTravel(game,message='已停止驿站导航。'){
 game.waystationTravel=null;game.waystationMessage=message;game.player.vx=game.player.vy=0;
}
