// 建筑服务、楼层设施与方位共用纯数据；楼层不设玩法上限，也不预生成房间。
import {TOWN_LAYOUT} from './town-layout.js';
import {COTTAGE,COTTAGE_STAIRS} from './cottage.js';
export const CONSTRUCTION_COMPANY={...TOWN_LAYOUT.construction,width:166,height:140,id:'construction',name:'森筑建筑公司',mapId:'forest'};
// 加盖使用石质楼板与铁支撑，电梯逐层使用铁结构和铜部件；矿产只扣已入库成品。
export const HOME_BUILD_PRICES={basement:{coins:2400,wood:180},floor:{coins:3000,wood:400,stone:80,iron:8},elevator:{coins:6000,wood:800,iron:12,copper:4},balcony:{coins:1500,wood:200}};
// 报价和缺料提示共用中文资源名称，原石与加工后的石块保持独立身份。
export const HOME_BUILD_RESOURCE_NAMES={coins:'金币',wood:'木材',stone:'石块',iron:'铁块',copper:'铜块'};
// 门框锚在墙体，door 为室内侧可站立的门前点，二者不可混用。
export const HOME_DIRECTIONS={
 north:{name:'北',dx:0,dy:-1,door:{x:240,y:102},frame:{x:240,y:83}},
 east:{name:'东',dx:1,dy:0,door:{x:444,y:312},frame:{x:477,y:312}},
 south:{name:'南',dx:0,dy:1,door:{x:240,y:530},frame:{x:240,y:547}},
 west:{name:'西',dx:-1,dy:0,door:{x:36,y:312},frame:{x:3,y:312}},
};
// 一楼南墙中间装阳台门时，普通出屋地垫与候停区一起移到门的右侧。
export function cottageStreetExit(home){
 return floorBalconies(home,0).includes('south')?{x:335,y:538}:COTTAGE.exit;
}
export const HOME_ELEVATOR={...COTTAGE_STAIRS,id:'elevator'};
export const HOME_BALCONY={width:480,height:230,spawn:{x:240,y:172},exit:{x:240,y:204},radius:28};
// 整数楼层编号只受JavaScript安全整数表示约束，不设十层或百层等游戏封顶。
export function homeFloors(home){return Number.isSafeInteger(home?.floors)&&home.floors>=2?home.floors:2;}
// 电梯只保存实际付费楼层；旧的一次性购买迁为一楼，不按高楼层数展开数组。
export function elevatorFloors(home){return [...new Set((Array.isArray(home?.elevators)?home.elevators:home?.elevator===true?[0]:[]).filter(f=>Number.isSafeInteger(f)&&f>=0&&f<homeFloors(home)))].sort((a,b)=>a-b);}
// 施工从最高已装层的上一层接续，拆除从最高已装层向下；旧档空缺楼层保留楼梯。
export function homeElevatorPlan(home){const lifts=elevatorFloors(home),removeFloor=lifts.at(-1)??null,next=(removeFloor??-1)+1;return {lifts,installFloor:next<homeFloors(home)?next:null,removeFloor};}
// 未安装的楼层保留楼梯，同一梯位始终只有一种设施。
export function hasHomeElevator(home,floor){return elevatorFloors(home).includes(floor);}
// 楼梯南侧入口上楼、北侧入口下楼，中间层同时保留两个方向；场景绘制与行走使用同一数据。
export function homeStairRoutes(home,floor){
 if(hasHomeElevator(home,floor))return [];
 const s=COTTAGE_STAIRS;
 return [...(floor>0?[{id:'stairs-down',label:`下楼至第 ${floor} 楼`,x:s.x,y:362,artY:365,width:84,height:84,goal:s.downLanding,target:floor-1}]:[]),...(floor+1<homeFloors(home)?[{id:'stairs-up',label:`上楼至第 ${floor+2} 楼`,x:s.x,y:462,artY:450,width:84,height:92,goal:s.landing,target:floor+1}]:[])];
}
// 外观只展开六排新增楼层，图集、透显与点击共用高度；真实可用层数不受压缩影响。
export function homeExterior(home){const floors=homeFloors(home),rows=Math.min(6,floors-2),lift=rows*32;return {floors,rows,lift,height:(rows?170:150)+lift};}
// 每层只记录已安装的方向，拒绝原型键与不存在的楼层。
export function floorBalconies(home,floor){const sides=home?.balconies?.[floor];return Array.isArray(sides)?sides.filter(d=>Object.hasOwn(HOME_DIRECTIONS,d)):[];}

import {GLIDERS} from './gliders.js';
// 阳台楼层从零编号，计算时换成实际楼层；滑翔比为水平航程与落差之比。
export const HOME_GLIDER = {floorHeightMeters:3, glideRatio:GLIDERS.basic.ratio, speed:GLIDERS.basic.speed};
export function balconyGlideMeters(floor,ratio=HOME_GLIDER.glideRatio){
 return (floor+1)*HOME_GLIDER.floorHeightMeters*ratio;
}
