// 玩家看到的清缴轮次按已击败的 Boss 计算，不暴露累计刷怪批次或另存一份计数。
export function clearingRound(game){
 return Math.max(0,Math.floor(game.progress?.bosses??game.roundBosses??0))+1;
}
