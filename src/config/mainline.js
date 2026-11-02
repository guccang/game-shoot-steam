import {isCampaignTask} from './mainline-pacing.js';
import {WAREHOUSE} from './warehouse.js';
import {AMMO_SHOP} from './supplies.js';
import {REPAIR_CENTER} from './vehicle-repair.js';
import {FIRE_STATION} from './fire-station-layout.js';
// 巡林成长主线：地点、人物、对白、操作条件、资源奖励与章节顺序均为可序列化内容表。
import {FARM_SEED_DOOR} from './farm.js';
import {MONSTER_CAMPS} from './monster-camps.js';
import {TOWN_LAYOUT} from './town-layout.js';
import {WORKSHOP,VEHICLE_WORKSHOP} from '../world/workshop.js';
import {REALM_ENTRANCES} from '../world/realm-entrances.js';
import {STORY_POSTS} from './story-posts.js';
import {CAMP_GATES} from './camp-defense.js';
import {CLEARING_APPROACH} from './clearing.js';
import {NORTH_PARKING} from './parking.js';
import content from './content/mainline.json' with {type:'json'};
// 操作落点引用真实建筑；交谈地点独立保留，避免导航到老师而非操作入口。
const post=STORY_POSTS.find(p=>p.id==='sunleaf-post');
// 找种任务直接进入产出雏菊的真实营地，任务卡、地面路线和终点共用坐标。
const seedCamp=MONSTER_CAMPS.find(c=>c.id==='ember-pot');
export const MAINLINE_SITES={
 warehouseEntry:{...WAREHOUSE,y:WAREHOUSE.y+60},
 ammoEntry:{...AMMO_SHOP,y:AMMO_SHOP.y+22},
 repairEntry:{...REPAIR_CENTER,y:REPAIR_CENTER.y+65},
 // 球赛接取、进行与交付共用球场站前落点，不再借用守护祭坛入口。
 footballEntry:{name:'林间球场站',mapId:'forest',x:TOWN_LAYOUT.football.x,y:TOWN_LAYOUT.football.y+30},
 seedCamp:{id:seedCamp.id,name:seedCamp.name,mapId:seedCamp.mapId,x:seedCamp.x,y:seedCamp.y+110},
 seedShop:{...FARM_SEED_DOOR,name:'种子小屋门前'},
 northParking:{id:'north-parking',name:'北停车场',mapId:'forest',...NORTH_PARKING.entrance},
 weaponsEntry:{name:'武器工坊',mapId:'forest',x:WORKSHOP.x,y:WORKSHOP.y+25},
 garageEntry:{name:'载具工坊',mapId:'forest',x:VEHICLE_WORKSHOP.x,y:VEHICLE_WORKSHOP.y+55},
 storyPost:{name:post.name,mapId:post.mapId,x:post.x+post.approach.dx,y:post.y+post.approach.dy},
 westGate:{...CAMP_GATES.find(g=>g.id==='left'),mapId:'forest'},
 ...Object.fromEntries(REALM_ENTRANCES.map(e=>[e.mode+'Entry',{name:'建筑入口',mapId:'forest',x:e.x,y:e.y+40}])),
 clearingPost:{name:'清缴告示牌前',mapId:'forest',...CLEARING_APPROACH},
 camp:{name:'晴叶回信驿旁',mapId:'forest',x:TOWN_LAYOUT.letters.x+80,y:TOWN_LAYOUT.letters.y+55},
 weapons:{name:'武器工坊门前',mapId:'forest',x:WORKSHOP.x+20,y:WORKSHOP.y+135},
 garage:{name:'载具工坊门前',mapId:'forest',x:VEHICLE_WORKSHOP.x+55,y:VEHICLE_WORKSHOP.y+120},
 patrol:CLEARING_APPROACH, // 未接取时指向告示牌，活动目标由 clearingObjective 读取存档。
 neighbors:{name:'怪物邻里委托板',mapId:'forest',x:TOWN_LAYOUT.neighborsPost.x,y:TOWN_LAYOUT.neighborsPost.y+40},
 rogue:{name:'远征光门旁',mapId:'forest',x:TOWN_LAYOUT.rogue.x-45,y:TOWN_LAYOUT.rogue.y+85},
 tower:{name:'时空塔门前',mapId:'forest',x:TOWN_LAYOUT.tower.x-45,y:TOWN_LAYOUT.tower.y+85},
 guardian:{name:'守护祭坛前',mapId:'forest',x:TOWN_LAYOUT.guardian.x-45,y:TOWN_LAYOUT.guardian.y+85},
 fire:{name:'消防站门前',mapId:'forest',x:FIRE_STATION.x-100,y:FIRE_STATION.y+90},
};
export const MAINLINE_NPCS={mint:{name:'青芽',hero:1},oak:{name:'阿栎师傅',hero:0},wheel:{name:'苔轮',hero:2},lumi:{name:'小灯',hero:3}};
// 任务解释器直接消费内容表，增加现有机制任务无需改解释器。
export const MAINLINE_TASKS=content.tasks;
export const MAINLINE_IDS=MAINLINE_TASKS.map(t=>t.id);

// 主动选择的自选体验继续当前阶段；默认只寻找下一项战役任务。
export function currentMainlineTask(run){
 if(!run)return null;
 return MAINLINE_TASKS.find(t=>t.id===run.currentId&&!run.completed.includes(t.id))||MAINLINE_TASKS.find(t=>isCampaignTask(t)&&!run.completed.includes(t.id))||null;
}
