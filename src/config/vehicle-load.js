// 所有重量采用千克；不同底盘限制牵引级别，换发动机不会把电动车变成坦克拖车。
export const VEHICLE_LOADS=[
 {mass:2800,payload:700,tow:3800},{mass:6800,payload:1600,tow:10000},
 {mass:1800,payload:550,tow:0},{mass:2200,payload:900,tow:3000},
 {mass:4200,payload:1800,tow:7500},{mass:80,payload:110,tow:90},
 {mass:9000,payload:2200,tow:16000},{mass:1600,payload:1200,tow:3800},
 {mass:1300,payload:650,tow:2100},
];
export const VEHICLE_ENGINES=[
 {id:'standard',name:'原厂发动机',payload:1,tow:1,speed:1,mass:0,price:0},
 {id:'torque',name:'高扭矩发动机',payload:1.3,tow:1.3,speed:.95,mass:.02,price:.2},
 {id:'haul',name:'重载发动机',payload:1.75,tow:1.65,speed:.85,mass:.04,price:.35},
];
export const LOAD_RULES={catMass:[40,36,48,38,44,35,42],catCapacity:30,catOverloadSpeed:0,magazineMass:.3,roundMass:.02,plateMassRate:.04,platePriceRate:.025,maxPlates:60,towPayloadPenalty:1,hookDistance:190,ropeLength:150,selfTowRepairRate:.4};
export const WEAPON_MASSES=[2.5,4,12,4.5,6,5,5,6,4,5,6,8,3,4,8,4,4,6,5];
export const CROP_MASSES={grain:1.5,vegetable:2,fruit:3,ornamental:.5};
// 读取当前装配；未拥有车体只作为货架原厂展示，不创造所有权。
export function vehicleBuild(progress,index){return progress.logistics?.builds?.[index]||{engine:0,engines:[0],plates:0,spares:0,cargo:[]};}
// 发动机容量、质量与价格通过同一配置读取。
export function installedEngine(progress,index){return VEHICLE_ENGINES[vehicleBuild(progress,index).engine]||VEHICLE_ENGINES[0];}
// 每层装甲按底盘规格计重，真实重量与展示使用同一函数。
export function armorPlateMass(index){return Math.max(2,Math.round(VEHICLE_LOADS[index].payload*LOAD_RULES.plateMassRate));}
