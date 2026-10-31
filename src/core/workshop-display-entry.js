// 室内展品点击只返回打开意图，交易、升级和暂停继续交给正式工坊页面。

// 距离从展品底座外缘计算，支持柜前及两侧靠近，不扩大实体碰撞。
export function workshopDisplayDistance(player,item){
 return Math.hypot(Math.max(0,Math.abs(player.x-item.x)-item.width/2),Math.max(0,Math.abs(player.y-item.y)-item.height/2));
}
// 保留展品点击接口，清理旧版候停数据。
export function latchWorkshopDisplayEntry(game,item){
 if(!game.cottage)return;
 game.cottage.displayEntry=null;game.cottage.displayEntryLatch={id:item.id,index:item.index};
}
// 清除旧版候停数据；展品只能由玩家主动点击查看。
export function updateWorkshopDisplayEntry(game){if(game.cottage){game.cottage.displayEntry=null;game.cottage.displayEntryLatch=null;}return null;}
