// 世界建筑实体目录：底座锚点、墙体和开放车库通道共用周期坐标。
import {TOWN_LAYOUT} from './town-layout.js';
import {REPAIR_CENTER} from './vehicle-repair.js';
import {FARM_SEED_SHOP,FARM_DELIVERY} from './farm.js';
import {FIRE_STATION} from './fire-station-layout.js';
import {LEGENDARY_WORKSHOP} from './legendary-workshop.js';
import {LIVING_PLACES} from './living-world.js';
// 矩形为相对底座的实体墙面；门前进屋点始终留在实体外侧。
export const WORLD_BUILDINGS=[
 {id:'outdoor',...TOWN_LAYOUT.outdoor,rects:[[-106,-114,-62,5],[62,-114,106,5],[-106,-114,106,-104]]},
 {id:'ammo',...TOWN_LAYOUT.ammo,rects:[[-106,-114,-62,5],[62,-114,106,5],[-106,-114,106,-104]]},
 {id:'cat-home',...TOWN_LAYOUT.catHome,rects:[[-67,-93,69,5]]},
 {id:'warehouse-depot',...TOWN_LAYOUT.warehouseDepot,rects:[[-86,-62,86,6]]},
 {id:'warehouse',...TOWN_LAYOUT.warehouse,rects:[[-67,-88,69,5]]},
 {id:'furniture',...TOWN_LAYOUT.furniture,rects:[[-63,-84,65,5]]},
 {id:'construction',...TOWN_LAYOUT.construction,rects:[[-66,-92,66,6]]},
 {id:'cottage',...TOWN_LAYOUT.cottage,rects:[[-60,-98,70,0]]},
 {id:'weapons',...TOWN_LAYOUT.weapons,rects:[[-68,-98,70,6]]},
 {id:'vehicle',...TOWN_LAYOUT.garage,rects:[[-106,-114,-62,5],[62,-114,106,5],[-106,-114,106,-104]]},
 {...REPAIR_CENTER,id:'repair',rects:[[-106,-114,-62,5],[62,-114,106,5],[-106,-114,106,-104]]},
 {...FARM_SEED_SHOP,id:'seed',rects:[[-54,-86,54,5]]},
 {...FARM_DELIVERY,id:'delivery',rects:[[-55,-60,55,4]]},
 {id:'tower',...TOWN_LAYOUT.tower,rects:[[-44,-106,44,4]]},
 {id:'rogue',...TOWN_LAYOUT.rogue,rects:[[-52,-78,52,4]]},
 {id:'guardian',...TOWN_LAYOUT.guardian,rects:[[-49,-70,49,4]]},
 {id:'tent',...TOWN_LAYOUT.tent,rects:[[-42,-45,58,8]]},
 // 消防车库保留出车口与侧门行走通道，侧办公室是实体。
 {id:'fire',...FIRE_STATION,rects:[[-122,-96,-114,4],[24,-96,31,4],[-122,-96,31,-82],[27,-115,77,4]]},
 {id:'legendary',...LEGENDARY_WORKSHOP,conditional:true,rects:[[-101,-112,108,5]]},
 ...['relay','kitchen','market'].map(id=>({id,...LIVING_PLACES[id],rects:[[-LIVING_PLACES[id].width/2,-(id==='market'?52:id==='kitchen'?75:85),LIVING_PLACES[id].width/2,4]]})),
];
