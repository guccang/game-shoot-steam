// 仓库自动收货与收成结算共用提示去重，状态仍由各自事务持有。
export function warehouseNotice(game,state,message){
 if(state.notice===message)return;
 state.notice=message;game.float(game.player.x,game.player.y-45,message,'#f5d9a0');
}
