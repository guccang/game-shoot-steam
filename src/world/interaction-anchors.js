// 场景操作统一绑定目标实体，世界建筑与室内家具分别使用各自坐标，不借用玩家位置。
import {WAREHOUSE} from '../config/warehouse.js';
import {WORKSHOP_INTERIORS,interiorLayout} from '../config/workshop-interiors.js';
import {COTTAGE_FURNITURE} from '../config/cottage.js';
import {PARKING_SPOTS} from '../config/parking.js';
import {TOWN_RESTORATIONS} from '../config/town-restoration.js';
import {STORY_POSTS} from '../config/story-posts.js';
import {CLEARING_POST} from '../config/clearing.js';
import {CAMP_GATES} from '../config/camp-defense.js';
import {REALM_ENTRANCES} from './realm-entrances.js';
import {FIRE_STATION} from './fire-navigation.js';
import {RANGER_COTTAGE} from './workshop.js';
import {restorationLocation} from './restoration-area.js';
import {nearest} from './coordinates.js';
import {FARM_SEED_SHOP} from '../config/farm.js';

// 建筑前立面的固定点留给操作按钮，标牌和家具可指定自身中心。
function at(site,lift=16,space='world') { return site?{x:site.x,y:site.y-lift,space}:null; }
// 建筑直接使用本体透明热点，尺寸和脚底由既有实体配置提供。
function building(site,width=site?.width||96,height=site?.height||100){
 return site?{...at(site,0),hitbox:true,width,height}:null;
}

// 停车提示与倒车徽记始终绑定实际泊位，车位搬迁后不再留在建筑旧位置。
export function parkingInteractionAnchor(id) {
 const spot=PARKING_SPOTS.find(s=>s.id===id);if(!spot)return null;
 return at(spot);
}

// 点击意图只决定目标身份；候选变化仍由核心距离与权限校验处理。
export function nearbyInteractionAnchor(game,entry) {
 if(!entry)return null;
 switch(entry.type){
  case 'warehouse':return at(WAREHOUSE,-35);
  case 'vehicle-repair':return building(entry,156,112);
  case 'vehicle-wreck':return at(entry,65);
  case 'seed-shop':return building(FARM_SEED_SHOP);
  case 'cottage':return building(TOWN_RESTORATIONS.find(f=>f.id==='cottage'));
  case 'parking':return parkingInteractionAnchor(entry.id.slice('parking-'.length));
  case 'fire-parking':return at(FIRE_STATION);
  case 'workshop':return building(WORKSHOP_INTERIORS[entry.key]?.site);
  case 'arrival-repair':return building(WORKSHOP_INTERIORS.weapons.site);
  case 'restoration':{const spec=TOWN_RESTORATIONS.find(f=>f.id===entry.key);
   // 多处修复点使用最近实体的脚底，透明热点不遮住成绩与招牌。
   const site=spec&&restorationLocation(spec,game.player);return building(site,spec?.width||112,spec?.height||(spec?.id==='defense'?72:96));}
  case 'realm':return building(REALM_ENTRANCES.find(s=>s.mode===entry.key));
  case 'post':{const post=STORY_POSTS.find(s=>s.id===entry.key);return entry.presentation==='task-entry'?at(post,136):building(post,112,96);}
  // 告示牌热点覆盖牌面与立柱。
  case 'clearing':return building(CLEARING_POST,112,98);
  // 守备热点覆盖正式标牌。
  case 'gate':{const g=CAMP_GATES.find(s=>s.id===entry.key);return g?at({x:g.x-g.ny*108,y:g.y+g.nx*108},166):null;}
  case 'rest':{const bed=COTTAGE_FURNITURE.find(s=>s.id==='bed');return at({...bed,x:bed.x+bed.width/4},10,'room');}
  // 木牌热点在牌面中心，居民与灰堆保持原头顶入口。
  case 'monster-camp':return at(entry,entry.presentation==='camp-sign'?38:72);
  case 'display':return at(entry,16,'room');
  default:return null;
 }
}

// 入室与出门倒计时也归属门口，不随猫猫在候停范围内的位置移动。
export function doorwayInteractionAnchor(game) {
 if(game.cottage)return at(interiorLayout(game.cottage).exit,24,'room');
 // 倒计时保留在屋面，建筑本体只保留透明热点。
 return at(WORKSHOP_INTERIORS[game.cottageEntryKind]?.site||RANGER_COTTAGE,80);
}

// 世界使用最近周期镜像；室内使用正式房间镜头，画布以外的UI不钉屏。
export function projectInteractionAnchor(anchor,view,roomView=null) {
 if(!anchor)return null;
 if(anchor.space==='room')return roomView?{x:roomView.x+anchor.x*roomView.zoom,y:roomView.y+anchor.y*roomView.zoom}:null;
 if(!view)return null;
 const point=nearest(anchor,{x:view.x+view.w/2,y:view.y+view.h/2});
 return {x:(point.x-view.x)*view.zoom,y:(point.y-view.y)*view.zoom};
}
