// 地下网格与地表共用世界单位；只存开掘过的格子，不预生成有限矿区。
import {COTTAGE} from './cottage.js';
export const MINING={tile:64,flyingMargin:14,speed:112,cartSpeed:176,digSeconds:.65,shaftSeconds:4,radius:10,home:{...COTTAGE.door},hatch:{id:'basement',x:155,y:440,width:64,height:56,goal:{x:155,y:480}},prices:{rail:{ore:1,wood:2},cart:{ore:8,wood:12},lamp:{ore:1,wood:1},sign:{ore:0,wood:2},shaft:{ore:5,wood:8}}};
export const MINE_DIRECTIONS=[{id:'north',name:'北',x:0,y:-1},{id:'east',name:'东',x:1,y:0},{id:'south',name:'南',x:0,y:1},{id:'west',name:'西',x:-1,y:0}];
// 以小屋的真实地表位置作为零格，避免室内局部坐标混入地下地图。
export function mineCell(point){return {x:Math.floor((point.x-MINING.home.x)/MINING.tile+.5),y:Math.floor((point.y-MINING.home.y)/MINING.tile+.5)};}
// 地下稳定标识始终使用网格整数，不使用玩家显示文案。
export function mineKey(point){return `${point.x},${point.y}`;}
// 格子中心与地表坐标一一对应，允许负坐标和持续向外开掘。
export function minePoint(cell){return {x:MINING.home.x+cell.x*MINING.tile,y:MINING.home.y+cell.y*MINING.tile};}
// 使用固定种子确定矿脉，刷新和重进不会重抽奖励。
export function mineOre(cell){const n=(Math.imul(cell.x,73856093)^Math.imul(cell.y,19349663)^1847)>>>0;return n%7===0?4:n%3===0?2:1;}
