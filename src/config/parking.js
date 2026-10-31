import {AMMO_SHOP} from './supplies.js';
// 房屋泊位与自动停车参数共用世界坐标；车位不添加新的地形碰撞。
import {REPAIR_CENTER} from './vehicle-repair.js';
import {townPoint,TOWN_SHIFT_X} from './town-layout.js';
import {WORKSHOP,VEHICLE_WORKSHOP,RANGER_COTTAGE,GARAGE} from '../world/workshop.js';
export const PARKING = Object.freeze({wait:3,radius:48,approachMargin:18,roadClearance:50,releaseRadius:115,stopSpeed:3,speed:55,acceleration:95,width:96,height:86});
// 候停边界只覆盖车位及院内过道，主路和路肩保留通行；车库须驶到门前再候停。
// 北门内侧六个公共车位，共用两条倒车过道，入口通道留在停车场东侧。
export const NORTH_PARKING = Object.freeze({x:145+TOWN_SHIFT_X,y:145,width:380,height:280,entrance:townPoint({x:650,y:205})});
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
 ...[200,340].flatMap((y,row)=>[210,330,450].map((x,column)=>({id:`north-${row}-${column}`,building:'north',name:'北门停车场',x:x+TOWN_SHIFT_X,y,approachY:y+65}))),
];
