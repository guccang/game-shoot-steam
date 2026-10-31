// 首次发现按身体与画面的交集判定，不要求整只怪物进入屏幕；数值使用世界单位。
export const AUTO_AIM_VIEW=Object.freeze({
 headroom:18,
 // 野猪正式身体从脚底向上约 103，横向约 57，留少量动作余量，不计血条和预警。
 boar:Object.freeze({halfWidth:60,above:110,below:18}),
});
