import {gateParkingSpots} from '../world/gate-parking.js';
import {SpatialGrid} from '../world/spatial-grid.js';
import {AMMO_SHOP} from './supplies.js';
// 房屋泊位与自动停车参数共用世界坐标；车位不添加新的地形碰撞。
import {REPAIR_CENTER} from './vehicle-repair.js';
import {townPoint,TOWN_SHIFT_X} from './town-layout.js';
import {WORKSHOP,VEHICLE_WORKSHOP,RANGER_COTTAGE,GARAGE} from '../world/workshop.js';
export const PARKING = Object.freeze({wait:3,radius:48,approachMargin:18,roadClearance:50,releaseRadius:115,stopSpeed:3,speed:55,acceleration:95,width:96,height:86});
// 候停边界只覆盖车位及院内过道，主路和路肩保留通行；车库须驶到门前再候停。
// 北门内侧原场六个公共车位，共用两条倒车过道，入口通道留在停车场东侧。
// 地坪与入口由营地布局统一迁移。
export const NORTH_PARKING = {x:145+TOWN_SHIFT_X,y:145,width:380,height:280,entrance:townPoint({x:650,y:205})};
export const PARKING_SPOTS = [
 // 弹药补给铺库内装弹，停稳后直接进入屋内柜台。
 {id:'ammo-garage',building:'ammo',name:'弹药补给铺',kind:'ammo',indoor:true,garageY:AMMO_SHOP.y,x:AMMO_SHOP.x,y:AMMO_SHOP.y+GARAGE.parkingY,approachY:AMMO_SHOP.y+10,disembarkY:AMMO_SHOP.y+75},
 {id:'garage',building:'garage',name:'载具工坊',kind:'vehicle',indoor:true,garageY:VEHICLE_WORKSHOP.y,x:VEHICLE_WORKSHOP.x,y:VEHICLE_WORKSHOP.y+GARAGE.parkingY,approachY:VEHICLE_WORKSHOP.y+10,disembarkY:VEHICLE_WORKSHOP.y+75},
 // 维修库内位与两侧露天位共用 P 倒车流程，交付区另设在南侧。
 {id:'repair-garage',building:'repair',name:'维修工坊',kind:'repair',indoor:true,garageY:REPAIR_CENTER.y,x:REPAIR_CENTER.x,y:REPAIR_CENTER.y+GARAGE.parkingY,approachY:REPAIR_CENTER.y+10,disembarkY:REPAIR_CENTER.y+75},
 ...[-1,1].map(side=>({id:side<0?'repair-west':'repair-east',building:'repair',name:'维修工坊停车位',kind:'repair',x:REPAIR_CENTER.x+side*170,y:REPAIR_CENTER.y+65,approachY:REPAIR_CENTER.y+130})),
 {id:'weapons-west',building:'weapons',name:'武器工坊',kind:'weapons',x:WORKSHOP.x-55,y:WORKSHOP.y+60,approachY:WORKSHOP.y+115},
 {id:'weapons-east',building:'weapons',name:'武器工坊',kind:'weapons',x:WORKSHOP.x+55,y:WORKSHOP.y+60,approachY:WORKSHOP.y+115},
 // 小屋车位移到东侧快递站下方，南侧留出倒车入口；保留标识以兼容已有停驻车辆。
 {id:'cottage',building:'cottage',name:'小屋停车位',x:RANGER_COTTAGE.x+160,y:RANGER_COTTAGE.y-20,approachY:RANGER_COTTAGE.y+45},
 ...[200,340].flatMap((y,row)=>[210,330,450].map((x,column)=>({id:`north-${row}-${column}`,building:'north',number:row*3+column+1,name:`北门停车场 ${row*3+column+1} 号`,x:x+TOWN_SHIFT_X,y,approachY:y+65}))),
 // 北围栏内侧设六个固定公共位，中央为营门留出行车通道，旧场布局仍可独立搬迁。
 ...[-120,-10,100,210,470,580].map((x,i)=>({id:'north-strip-'+i,building:'annex',number:7+i,name:'北门停车场 '+(7+i)+' 号',x,y:-160,approachY:-95})),
];
const baseSpots=PARKING_SPOTS.slice();
// 每次面积扩建附带独立编号的泊位，旧版向北扩建的地契同样可用。
export function expansionParkingSpots(progress){
 const land=progress?.campLand,level=land?.expansions||0,additions=land?.additions||[],legacy=level-additions.length;
 return Array.from({length:level*3},(_,i)=>{
  const row=Math.floor(i/3),offset=(i%3-1)*120,plot=additions[row-legacy];
  const horizontal=!plot||plot.right-plot.left>=plot.bottom-plot.top;
  const x=plot?(plot.left+plot.right)/2+(horizontal?offset:0):30+offset;
  const y=plot?(plot.top+plot.bottom)/2-18+(horizontal?0:offset):-280-row*120;
  return {id:'north-expansion-'+i,building:'annex',number:13+i,name:'扩建停车位 '+(13+i)+' 号',x,y,approachY:y+65};
 });
}
// 存档分配只读取该档地契，不借用上一个已激活地图的扩建车位。
export function parkingSpotsFor(progress){return baseSpots.concat(expansionParkingSpots(progress),gateParkingSpots(progress));}
// 更新当前世界的实际泊位，所有交互、绘制和导航使用同一批对象。
let parkingGrid;
// 树冠和渲染只查询镜头或采样点附近的泊位。
export function nearbyParkingSpots(x,y,right,bottom,padding){
 parkingGrid??=new SpatialGrid(PARKING_SPOTS);
 return parkingGrid.query(x,y,right,bottom,padding);
}
export function activateParkingSpots(progress){
 PARKING_SPOTS.splice(baseSpots.length,Infinity,...expansionParkingSpots(progress),...gateParkingSpots(progress));
 parkingGrid=null;
}

