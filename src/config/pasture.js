// 营地东侧默认牧栏，北侧中央留门；场景向北时世界纵坐标减小。
export const PASTURE_BASE=Object.freeze({mapId:'forest',x:990,y:880,halfWidth:130,halfHeight:52,gate:104,oxPrice:48,sheepPrice:24,callRange:165,walkSpeed:68,idleReturnSeconds:60});
// 可移动锚点由统一布局适配更新，尺寸与默认基准不累积变化。
export const PASTURE={...PASTURE_BASE};
export const PEN_OX={mapId:'forest',x:PASTURE.x-84,y:PASTURE.y-15,facing:1};
export const PEN_GATE={mapId:'forest',x:PASTURE.x,y:PASTURE.y-PASTURE.halfHeight-18};
// 牧栏东南的三块林间草地轮流长出甜穗草，牛在草丛斜后方吃草。
export const GRAZING_SITES=[{x:1460,y:1110},{x:1530,y:1165},{x:1600,y:1220}];
export const FORAGE_ID='material:sweet-grass';
export const FORAGE_HINT='牧栏东南的草地上长着金黄穗头的甜穗草。摘一束，走到野牛跟前喂它，就能把它领回营地。';
// 同一组木栏线段用于落地绘制和碰撞，门口间隙可供进出。
const {halfWidth:w,halfHeight:h,gate}=PASTURE;
export const PEN_RAILS=[[-w,-h,-gate,-h],[gate,-h,w,-h],[-w,-h,-w,h],[w,-h,w,h],[-w,h,w,h]];

// 老存档以长柄为原点，读写时换算为实际牛蹄；运行时统一使用牛蹄位置。
export function oxFoot(site){
 const yaw=site.yaw??(site.facing===-1?Math.PI:0);
 return {x:site.x+114*Math.cos(yaw),y:site.y+114*.67*Math.sin(yaw)};
}

// 写回旧格式，以便召牛、停牛和读档都还原到同一落点。
export function oxSiteFromFoot(foot,yaw){
 const offset=oxFoot({x:0,y:0,yaw});
 return {x:foot.x-offset.x,y:foot.y-offset.y};
}
// 骑手固定在牛背中心；这是绘制座位高度，碰撞与开田仍共用牛蹄的一格坐标。
export function oxHandler(foot,yaw){
 return {x:foot.x,y:foot.y-96};
}
