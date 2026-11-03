// 野外装备、鱼种与操作时长集中配置，界面和正式玩法共用相同价格与重量。
import {FISHING_RODS,FISHING_BAITS} from './fishing-tackle.js';
export const OUTDOOR_GEAR={
 tent:{name:'林间露营套装',coins:180,mass:6,kind:'tent',description:'双层帐篷、天幕、睡袋、折叠桌椅、炉具、营灯和保冷箱。'},
 ...Object.fromEntries(Object.entries(FISHING_RODS).map(([id,g])=>[id==='rod'?'rod':'rod-'+id,{...g,kind:'rod',tackleId:id}])),
 ...Object.fromEntries(Object.entries(FISHING_BAITS).map(([id,g])=>[id==='bait'?'bait':'bait-'+id,{...g,kind:'bait',tackleId:id}]))
};
export {FISH_SPECIES} from './fish-catalog.js';
export const OUTDOOR_RULES=Object.freeze({campReach:125,safeRadius:260,castReach:85,chargeSeconds:1.2,flightSeconds:.7,biteSeconds:1.3,sleepSeconds:2.4,maxFish:60});
