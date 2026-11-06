// 住宿名册按获得顺序保存稳定角色索引；一楼为起居层，二楼为初始猫卧室。
export function residentRoster(heroes,saved){
 const eligible=index=>Number.isInteger(index)&&index>0&&index<heroes.length&&heroes[index]>0;
 const existing=Array.isArray(saved)?saved.filter(eligible):[];
 return [0,...new Set([...existing,...heroes.map((_,i)=>i).filter(eligible)])];
}
// 第 n 个住户占用实际第 n+2 楼；房门、对话与绘制共用这个归属。
export function roomResident(progress,floor){
 return floor>0?progress.residentCats?.[floor-1]:undefined;
}
// 家具只能放在 y=480 以上，房间南侧靠西的住户和聊天落点常年可达。
export const RESIDENT_SPOT=Object.freeze({x:125,y:506});
export const RESIDENT_VISITOR=Object.freeze({x:181,y:506});
