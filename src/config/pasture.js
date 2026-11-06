// 营地东侧固定牧栏：前栏中间为可步行通过的门。
export const PASTURE=Object.freeze({mapId:'forest',x:990,y:880,halfWidth:130,halfHeight:52,gate:104,oxPrice:48,sheepPrice:24,callRange:165,walkSpeed:68});
export const PEN_OX=Object.freeze({mapId:'forest',x:PASTURE.x-84,y:PASTURE.y-15,facing:1});
export const PEN_GATE=Object.freeze({mapId:'forest',x:PASTURE.x,y:PASTURE.y+PASTURE.halfHeight+18});
// 牧栏东南的三块林间草地轮流长出甜穗草，牛在草丛斜后方吃草。
export const GRAZING_SITES=[{x:1460,y:1110},{x:1530,y:1165},{x:1600,y:1220}];
export const FORAGE_ID='material:sweet-grass';
export const FORAGE_HINT='牧栏东南的草地上长着金黄穗头的甜穗草。摘一束，走到野牛跟前喂它，就能把它领回营地。';
// 同一组木栏线段用于落地绘制和碰撞，门口间隙可供进出。
export const PEN_RAILS=[[-130,-52,130,-52],[-130,-52,-130,52],[130,-52,130,52],[-130,52,-104,52],[104,52,130,52]];

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
// 正面牛犁共用一个落地点，猫站在后方，扶柄随转弯轻微偏向外侧。
export function oxHandler(foot,yaw){
 return {x:foot.x-28*Math.cos(yaw),y:foot.y-83};
}
