// 建筑服务、楼层设施与方位共用纯数据；楼层不设玩法上限，也不预生成房间。
import {TOWN_LAYOUT} from './town-layout.js';
export const CONSTRUCTION_COMPANY={...TOWN_LAYOUT.construction,width:166,height:140,id:'construction',name:'森筑建筑公司',mapId:'forest'};
export const HOME_BUILD_PRICES={floor:{coins:3000,wood:400},elevator:{coins:6000,wood:800},balcony:{coins:1500,wood:200}};
export const HOME_DIRECTIONS={north:{name:'北',dx:0,dy:-1,door:{x:385,y:100}},east:{name:'东',dx:1,dy:0,door:{x:448,y:270}},south:{name:'南',dx:0,dy:1,door:{x:320,y:492}},west:{name:'西',dx:-1,dy:0,door:{x:32,y:380}}};
export const HOME_ELEVATOR={id:'elevator',x:88,y:410,width:68,height:76,landing:{x:88,y:490},radius:52};
export const HOME_BALCONY={width:480,height:230,spawn:{x:240,y:172},exit:{x:240,y:204},radius:28};
// 整数楼层编号只受JavaScript安全整数表示约束，不设十层或百层等游戏封顶。
export function homeFloors(home){return Number.isSafeInteger(home?.floors)&&home.floors>=2?home.floors:2;}
// 每层只记录已安装的方向，拒绝原型键与不存在的楼层。
export function floorBalconies(home,floor){const sides=home?.balconies?.[floor];return Array.isArray(sides)?sides.filter(d=>Object.hasOwn(HOME_DIRECTIONS,d)):[];}
