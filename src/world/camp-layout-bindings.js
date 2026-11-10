import {FARM_SEED_SHOP,FARM_SEED_DOOR} from '../config/farm.js';
import {INDUSTRY_SITES} from '../config/industry.js';
import {CAMP_ROUTINES} from '../config/camp-routines.js';
// 单一运行世界的布局适配层：把旧模块的静态锚点统一绑定到当前存档，保留既有接口。
// 每个锚点只登记一次原坐标；切换游戏或读档时从基准重新应用，不累积位移。
import {CAMP_BUILDINGS} from '../config/camp-layout.js';
import {TOWN_LAYOUT,TOWN_COURTS,TOWN_SIGNS} from '../config/town-layout.js';
import {WORKSHOP,VEHICLE_WORKSHOP,RANGER_COTTAGE} from './workshop.js';
import {COTTAGE} from '../config/cottage.js';
import {WORKSHOP_INTERIORS} from '../config/workshop-interiors.js';
import {CLICK_BUILDINGS} from '../config/scene-approach.js';
import {WORLD_BUILDINGS} from '../config/world-buildings.js';
import {invalidateBuildingCollisionIndex} from './building-collision.js';
import {TOWN_RESTORATIONS} from '../config/town-restoration.js';
import {SCENERY,CAMP_PROPS} from './scenery.js';
import {PARKING_SPOTS,NORTH_PARKING} from '../config/parking.js';
import {MAINLINE_SITES} from '../config/mainline.js';
import {WAREHOUSE,WAREHOUSE_DEPOT} from '../config/warehouse.js';
import {CAMP_WAREHOUSE} from '../config/wood-storage.js';
import {CAT_HOME} from '../config/cat-home.js';
import {FURNITURE_SHOP} from '../config/furniture-shop.js';
import {AMMO_SHOP} from '../config/supplies.js';
import {OUTDOOR_SHOP} from '../config/outdoor-shop.js';
import {CONSTRUCTION_COMPANY} from '../config/home-construction.js';
import {REPAIR_CENTER,REPAIR_BAY} from '../config/vehicle-repair.js';
import {STORY_POSTS} from '../config/story-posts.js';
import {CLEARING_POST,CLEARING_APPROACH} from '../config/clearing.js';
import {REALM_ENTRANCES} from './realm-entrances.js';
import {BUILDING_ENTRIES} from '../config/building-entries.js';
const bindings=[],seen=new WeakSet(),aliases={'vehicle':'garage','cat-home':'catHome','warehouse-depot':'warehouseDepot'};
let activeKey=null,revision=0;
// 只登记明确属于建筑的世界坐标，不碰室内家具和玩家位置。
function bind(id,site){id=aliases[id]||id;if(!site||!CAMP_BUILDINGS.some(b=>b.id===id)||seen.has(site)||!Number.isFinite(site.x)||!Number.isFinite(site.y))return;seen.add(site);if(Object.isFrozen(site))throw Error('营地锚点不可迁移：'+id);bindings.push({id,site,base:{x:site.x,y:site.y,...Object.fromEntries(['approachY','disembarkY','garageY'].filter(k=>Number.isFinite(site[k])).map(k=>[k,site[k]]))}});}
for(const b of CAMP_BUILDINGS)bind(b.id,TOWN_LAYOUT[b.id]);
for(const [id,site] of Object.entries({weapons:WORKSHOP,garage:VEHICLE_WORKSHOP,cottage:RANGER_COTTAGE,warehouse:WAREHOUSE,warehouseDepot:WAREHOUSE_DEPOT,catHome:CAT_HOME,furniture:FURNITURE_SHOP,ammo:AMMO_SHOP,outdoor:OUTDOOR_SHOP,construction:CONSTRUCTION_COMPANY,repair:REPAIR_CENTER,story:STORY_POSTS.find(p=>p.id==='sunleaf-post'),clearing:CLEARING_POST}))bind(id,site);
bind('weapons',CAMP_ROUTINES.oak.stroll);bind('garage',CAMP_ROUTINES.wheel.stroll);bind('tower',CAMP_ROUTINES.lumi.stroll);
for(const [id,site] of Object.entries(INDUSTRY_SITES))bind(id,site);
// 同步停车场地坪、入口与主线导航。
bind('north',NORTH_PARKING);bind('north',NORTH_PARKING.entrance);bind('north',MAINLINE_SITES.northParking);
bind('seed',FARM_SEED_SHOP);bind('seed',FARM_SEED_DOOR);
bind('cottage',COTTAGE.door);bind('warehouse',CAMP_WAREHOUSE);bind('repair',REPAIR_BAY);bind('clearing',CLEARING_APPROACH);
for(const room of [...Object.values(WORKSHOP_INTERIORS),...CLICK_BUILDINGS])for(const site of [room.site,room.door,room.outside])bind(room.id,site);
for(const b of WORLD_BUILDINGS)bind(b.id,b);
for(const f of TOWN_RESTORATIONS){bind(f.id,f);bind(f.id,f.site);}
for(const s of PARKING_SPOTS)bind(s.building,s);
for(const e of REALM_ENTRANCES)bind(e.mode,e);
for(const e of BUILDING_ENTRIES)bind(e.type==='post'&&e.key==='sunleaf-post'?'story':e.key,e);
for(const [id,site] of Object.entries(MAINLINE_SITES)){const key=({seedShop:'seed',weaponsEntry:'weapons',garageEntry:'garage',warehouseEntry:'warehouse',ammoEntry:'ammo',repairEntry:'repair',storyPost:'story',clearingPost:'clearing',footballEntry:'football',patrol:'clearing'})[id]||id.replace(/Entry$/,'');bind(key,site);}
// 站牌与正式场景共用对象，已有布局载入即迁移，不另存牌位。
for(const sign of TOWN_SIGNS)bind(sign.building,sign);
for(const s of SCENERY){const b=CAMP_BUILDINGS.find(b=>Math.abs(s.x-b.x)<.1&&Math.abs(s.y-b.y)<.1);if(b)bind(b.id,s);}
for(const s of CAMP_PROPS){const b=CAMP_BUILDINGS.filter(b=>Math.abs(s.x-b.x)<b.width/2+30&&s.y>b.y-30&&s.y<b.y+80).sort((a,b)=>Math.hypot(s.x-a.x,s.y-a.y)-Math.hypot(s.x-b.x,s.y-b.y))[0];if(b)bind(b.id,s);}
for(const court of TOWN_COURTS){const id=court.id.replace(/-yard$/,'');bind(id==='cat-home'?'catHome':id,court);}
// 调用方在重建、更新和绘制前激活自己的存档；相同布局是常数时间返回。
export function activateCampLayout(progress){const layout=progress?.campLayout,key=JSON.stringify(layout?.positions||{});if(activeKey===key)return revision;activeKey=key;
 for(const {id,site,base} of bindings){const b=CAMP_BUILDINGS.find(b=>b.id===id),p=layout?.positions?.[id],dx=p?p.x-b.x:0,dy=p?p.y-b.y:0;for(const [k,v] of Object.entries(base))site[k]=v+(k==='x'?dx:dy);}
 invalidateBuildingCollisionIndex();return ++revision;
}
// 碰撞、入口和停车单测可读取登记的真实位置，避免检验一份替代规划。
export function campLayoutBindings(id){return bindings.filter(b=>b.id===id).map(b=>b.site);}
