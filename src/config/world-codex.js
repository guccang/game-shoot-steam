// 世界图鉴目录复用正式配置，稳定键与购买、统计和资源身份保持一致。
import {CREATURE_ENTRIES} from './creature-codex.js';
import {FARM_CROPS,FARM_CATEGORIES} from './farm.js';
import {WEAPONS} from './weapons.js';
import {COLLECTED_VEHICLES} from './vehicles.js';
import {VEHICLE_ARMAMENTS} from './vehicle-armaments.js';
export const CODEX_TABS={overview:'总览',fish:'鱼类',monster:'怪物',crop:'作物',weapon:'武器',vehicle:'载具'};
export const WORLD_CODEX=[...CREATURE_ENTRIES,
 ...FARM_CROPS.map((c,index)=>({...c,index,key:'crop:'+c.id,category:'crop',group:FARM_CATEGORIES.find(t=>t.id===c.category)?.name||'作物',portrait:'crop'})),
 ...WEAPONS.map((w,index)=>({...w,index,key:'weapon:'+w.id,category:'weapon',group:w.attackKind==='defense'?'防护装备':'手持武器',portrait:'weapon'})),
 ...VEHICLE_ARMAMENTS.map(w=>({...w,index:w.weaponIndex,key:'armament:'+w.id,category:'weapon',group:'载具专属装备',portrait:'armament'})),
 ...COLLECTED_VEHICLES.map((v,index)=>({...v,index,key:'vehicle:'+v.id,category:'vehicle',group:v.flying?'飞行载具':v.amphibious?'水陆载具':'地面载具',portrait:'vehicle'}))];
// 展示名变化不会改变条目关联，非法链接返回空值。
export function worldCodexEntry(key){return WORLD_CODEX.find(e=>e.key===key)||null;}
