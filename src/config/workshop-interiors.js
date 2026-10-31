import {FURNITURE_SHOP,FURNITURE_SHOP_DISPLAYS} from './furniture-shop.js';
import {FARM_SEED_SHOP,FARM_SEED_DOOR} from './farm.js';
import {REPAIR_CENTER} from './vehicle-repair.js';
import {FIRE_STATION} from './fire-station-layout.js';
import {LEGENDARY_WORKSHOP} from './legendary-workshop.js';
import {TOWN_LAYOUT} from './town-layout.js';
import {LIVING_PLACES} from './living-world.js';
// 工坊室内的入口、家具、展示热点和碰撞共用坐标，玩家只在局部空间步行。
import {WORKSHOP,VEHICLE_WORKSHOP} from '../world/workshop.js';
import {COTTAGE,COTTAGE_FURNITURE} from './cottage.js';
import {homeFurniture} from '../progression/home-decor.js';
import {WEAPONS} from './weapons.js';
import {COLLECTED_VEHICLES,VEHICLE_DISPLAY_ORDER} from './vehicles.js';

export const WORKSHOP_ROOM={width:360,height:380,spawn:{x:180,y:326},exit:{x:180,y:362},exitRadius:24,exitWait:COTTAGE.exitWait,wait:1,radius:26,clickRadius:155};
// 展厅在入口北侧连续展开，目录增长时增加行数；中间留出贯通的宽走道。
export const WEAPON_GALLERY={width:400,height:Math.ceil(WEAPONS.length/2)*150+170,rowGap:150,columns:[90,310],portraitLimit:12};
// 可购车型不受当前所有权或挑战等级过滤；任务专属车仍在原图册查看。
const purchasableVehicles=VEHICLE_DISPLAY_ORDER.filter(index=>!COLLECTED_VEHICLES[index].rewardOnly);
// 展车整体上移，为前方名牌留白；热点与视窗裁切同步保留上方车体。
export const VEHICLE_GALLERY={displayLift:20,depth:Math.ceil(purchasableVehicles.length/2)*200+100,rowGap:200,columns:[95,345]};
export const VEHICLE_DISPLAYS=purchasableVehicles.map((index,slot)=>({id:'showroom-'+COLLECTED_VEHICLES[index].id,type:'vehicle-display',index,x:VEHICLE_GALLERY.columns[slot%2],y:VEHICLE_GALLERY.depth-100-Math.floor(slot/2)*VEHICLE_GALLERY.rowGap,width:110,height:80}));
// 小型营业房使用同一门槛和通道，服务名称决定室内柜台文案。
function serviceRoom(id,name,site,door={x:site.x,y:site.y+22}){return {...WORKSHOP_ROOM,id,name,site,door,outside:{x:door.x,y:door.y+52},service:true};}
export const WORKSHOP_INTERIORS={
 furniture:serviceRoom('furniture','家具小铺',FURNITURE_SHOP),
 seed:serviceRoom('seed','种子小屋',FARM_SEED_SHOP,FARM_SEED_DOOR),
 repair:serviceRoom('repair','载具维修中心',REPAIR_CENTER),
 fire:serviceRoom('fire','森林消防站',FIRE_STATION),
 tower:serviceRoom('tower','时空塔接待厅',TOWN_LAYOUT.tower),
 legendary:serviceRoom('legendary','传奇工坊',LEGENDARY_WORKSHOP),
 relay:serviceRoom('relay','旧哨站',LIVING_PLACES.relay),
 kitchen:serviceRoom('kitchen','阿团的厨房',LIVING_PLACES.kitchen),
 weapons:{...WORKSHOP_ROOM,...WEAPON_GALLERY,spawn:{x:200,y:WEAPON_GALLERY.height-60},exit:{x:200,y:WEAPON_GALLERY.height-18},id:'weapons',name:'武器工坊',site:WORKSHOP,door:{x:WORKSHOP.x,y:WORKSHOP.y+22},outside:{x:WORKSHOP.x+105,y:WORKSHOP.y+65}},
 vehicle:{...WORKSHOP_ROOM,width:440,height:540+VEHICLE_GALLERY.depth,spawn:{x:220,y:480+VEHICLE_GALLERY.depth},exit:{x:220,y:522+VEHICLE_GALLERY.depth},id:'vehicle',name:'载具工坊',site:VEHICLE_WORKSHOP,door:{x:VEHICLE_WORKSHOP.x,y:VEHICLE_WORKSHOP.y+22},outside:{x:VEHICLE_WORKSHOP.x+110,y:VEHICLE_WORKSHOP.y+75}},
};
export const WEAPON_DISPLAYS=WEAPONS.map((_,index)=>({id:'rack-'+index,type:'rack',x:WEAPON_GALLERY.columns[index%2],y:WEAPON_GALLERY.height-160-Math.floor(index/2)*WEAPON_GALLERY.rowGap,width:78,height:28,index}));
// 维修位四边均留出步行环路，侧墙小件与后墙台面不挤占过道。
export const VEHICLE_BAY={id:'bay',type:'bay',x:220,y:300+VEHICLE_GALLERY.depth,width:126,height:130};
export const GARAGE_FURNITURE=[
 {id:'bench',type:'bench',x:85,y:125,width:100,height:32},
 {id:'parts',type:'parts',x:355,y:125,width:102,height:38},
 {id:'tires',type:'tires',x:45,y:330,width:36,height:40},
 {id:'tool-cart',type:'cart',x:395,y:330,width:38,height:36},
].map(item=>({...item,y:item.y+VEHICLE_GALLERY.depth}));
// 小屋仍使用原配置；旧会话没有kind字段时按小屋处理。
export function interiorLayout(room){return WORKSHOP_INTERIORS[room?.kind]||{...COTTAGE,id:'cottage',name:'巡林小屋'};}
// 每件武器在室内有唯一固定展位；不再按页面复用柜子。
export function interiorWeaponDisplays(){return WEAPON_DISPLAYS.map(s=>({...s}));}
// 展车有独立稳定位置，不占用玩家停车记录。
export function interiorVehicleDisplays(){return VEHICLE_DISPLAYS.map(item=>({...item}));}
// 武器柜与车库工具台使用同一碰撞来源；泊位只有停着车才阻挡角色。
export function interiorFurniture(game){
 if(interiorLayout(game.cottage).service)return [{id:'counter',type:'counter',x:180,y:205,width:130,height:36},...(game.cottage.kind==='furniture'?FURNITURE_SHOP_DISPLAYS:[])];
 if(game.cottage?.kind==='weapons')return interiorWeaponDisplays();
 if(game.cottage?.kind==='vehicle')return [...GARAGE_FURNITURE,...VEHICLE_DISPLAYS,...(garageVehicleRecord(game)?[VEHICLE_BAY]:[])];
 return game.progress.homeDecor?homeFurniture(game.progress.homeDecor):COTTAGE_FURNITURE;
}
// 维修泊位只展示 garage 真实记录；上方展车另走原厂样车，不复制玩家车辆。
export function garageVehicleRecord(game){return game.progress.campParking?.owned.find(r=>r.spot==='garage')||null;}

// 展品底座之外的候停范围，中央过道不会因为整排陈列而自动打开页面。
export const WORKSHOP_DISPLAY_ENTRY={wait:3,radius:32,releaseRadius:50,stopSpeed:3};
// 所有营业房只提供售货员热点，陈列柜继续保留展示与碰撞。
export function interiorShopkeeper(room){
 const layout=interiorLayout(room),kind=room?.kind;
 if(!kind||kind==='cottage')return null;
 return {id:'shopkeeper',type:'shopkeeper',kind,index:undefined,x:layout.width/2,y:layout.service?175:layout.spawn.y-80,width:58,height:64,label:kind==='furniture'?'家具售货员':layout.name+'售货员'};
}
// 附近提示与画布点击共用售货员坐标。
export function interiorWorkshopTargets(game){if(!game.cottage)return [];const seller=interiorShopkeeper(game.cottage);return seller?[seller]:[];}
