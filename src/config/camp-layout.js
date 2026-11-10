import {PASTURE_BASE} from './pasture.js';
import {LIVING_PLACES} from './living-world.js';
import {FIRE_STATION} from './fire-station-layout.js';
import {CAMP_PLAZA_BUILDING} from './camp-plaza.js';
import {CAMP_DEFENSE_POSTS} from './camp-defense.js';
import {CAMP_DECOR_SHOP} from './camp-management.js';
import {TRADE_BOARD,TRADE_BOARD_SIZE} from './camp-trade.js';
import {FARM_SEED_SHOP,FARM_DELIVERY} from './farm.js';
// 可移动设施的稳定身份、原始锚点和手机规划网格；不保存显示名称作为关联键。
import {NORTH_PARKING} from './parking.js';
import {TOWN_LAYOUT} from './town-layout.js';
export const CAMP_LAYOUT_GRID=20;
export const CAMP_ROAD_WIDTH=56;
export const CAMP_BUILDINGS=Object.entries({cottage:'巡林小屋',weapons:'武器工坊',garage:'载具工坊',warehouse:'小屋仓库',warehouseDepot:'后院仓库',outdoor:'户外用品店',ammo:'弹药补给铺',repair:'维修中心',catHome:'猫窝',furniture:'家具小铺',construction:'建筑公司',refinery:'提炼厂',factory:'加工厂',story:'回信驿',clearing:'清缴告示牌',rogue:'远征光门',tower:'时空塔',guardian:'守护祭坛',travel:'远行驿站',tent:'公共帐篷'}).map(([id,name])=>({id,name,...TOWN_LAYOUT[id],...(id==='travel'?{passable:true}:{}),width:TOWN_LAYOUT[id].width||(['cottage'].includes(id)?150:110),height:TOWN_LAYOUT[id].height||(['cottage'].includes(id)?160:100)})).concat([
 // 球场站牌独立搬迁，正式记分牌、修复入口和任务导航由统一锚点同步。
 {id:'football',name:'林间球场',...TOWN_LAYOUT.football,width:112,height:90,passable:true},
 ...CAMP_DEFENSE_POSTS,{...CAMP_PLAZA_BUILDING},
 // 牛栏以南围栏底边为锚点，北门单独预留通道。
 {id:'pasture',name:'牛栏',x:PASTURE_BASE.x,y:PASTURE_BASE.y+PASTURE_BASE.halfHeight,width:PASTURE_BASE.halfWidth*2,height:PASTURE_BASE.halfHeight*2,publicFacility:true,placementKind:'pasture'},
 // 生活设施保留稳定身份，饭桌、栖架和房屋均可规划搬迁。
 ...['camp','roost','relay','pottery','kitchen','market'].map(id=>({...LIVING_PLACES[id],id,publicFacility:true})),
 {...FIRE_STATION,id:'fire',name:'森林消防站',publicFacility:true,placementKind:'fire'},
 // 订单板独立搬迁，原商路身份与统计内容保持不变。
 {...TRADE_BOARD,id:'trade',passable:true,width:TRADE_BOARD_SIZE.width,height:TRADE_BOARD_SIZE.height-TRADE_BOARD_SIZE.foot},
 {...FARM_SEED_SHOP,id:'seed',name:'种子小屋'},
 {...FARM_DELIVERY,id:'delivery',name:'种子快递站'},
 {...CAMP_DECOR_SHOP,name:'营地装饰店'},
 // 停车场以底边中心为规划锚点，六车位保持原稳定标识。
 {id:'north',name:'北门停车场',x:NORTH_PARKING.x+NORTH_PARKING.width/2,y:NORTH_PARKING.y+NORTH_PARKING.height,width:NORTH_PARKING.width,height:NORTH_PARKING.height,parking:true}]);
// 原坐标单独保存，运行设施迁移不会反过来改变默认规划。
export function normalizeCampLayout(raw){const positions={};for(const b of CAMP_BUILDINGS){const p=raw?.positions?.[b.id];if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<23500&&Math.abs(p.y)<23500)positions[b.id]={x:Math.round(p.x/CAMP_LAYOUT_GRID)*CAMP_LAYOUT_GRID,y:Math.round(p.y/CAMP_LAYOUT_GRID)*CAMP_LAYOUT_GRID};}const gates={};for(const [id,value] of Object.entries(raw?.gates||{}))if(/^(top|bottom|left|right):-?\d+(\.\d+)?:-?\d+(\.\d+)?$/.test(id)&&Number.isFinite(value))gates[id]=Math.max(0,Math.min(1,value));return {version:1,positions,gates};}
// 从草稿或已保存配置读取建筑脚底；未搬动时完全沿用旧坐标。
export function campBuildingPosition(layout,building){return {...building,...layout?.positions?.[building.id]};}

// 布局校验分别保留地坪和东侧弯道，避免把入口下方空地误作停车场。
// 消防站按偏心车库和侧门占地；站牌按底座与点击站位占地，保留临河原址干地。
export function campLayoutFootprints(b){if(b.placementKind==='pasture')return [{left:b.x-b.width/2-16,right:b.x+b.width/2+16,top:b.y-b.height-16,bottom:b.y+16},{left:b.x-80,right:b.x+80,top:b.y-b.height-72,bottom:b.y-b.height}];if(b.placementKind==='fire')return [{left:b.x-142,right:b.x+97,top:b.y-135,bottom:b.y+105}];if(b.placementKind==='sign')return [{left:b.x-24,right:b.x+24,top:b.y-12,bottom:b.y+36}];if(b.plaza)return [{left:b.x-b.width/2,right:b.x+b.width/2,top:b.y-b.height,bottom:b.y}];const main={left:b.x-b.width/2-24,right:b.x+b.width/2+24,top:b.y-b.height-20,bottom:b.y+(b.parking?20:95)};return b.parking?[main,{left:b.x+166,right:b.x+343,top:b.y-248,bottom:b.y-132}]:[main];}

// 建筑或大门任一发生搬迁，都启用同一套正式道路与灯光。
export function hasCampLayoutChanges(layout){return Object.keys(layout?.positions||{}).length>0||Object.keys(layout?.gates||{}).length>0;}

// 围栏只避让建筑实际轮廓与门前入口，不套用建筑之间的侧向留白。
export function campFenceFootprints(b){if(b.parking||b.plaza||b.placementKind)return campLayoutFootprints(b);return [{left:b.x-b.width/2-6,right:b.x+b.width/2+6,top:b.y-b.height-6,bottom:b.y+95}];}
