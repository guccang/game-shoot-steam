// 已有建筑与告示牌的候停点复用正式场景坐标，装饰房屋不虚构页面。
import {REALM_ENTRANCES} from '../world/realm-entrances.js';
import {STORY_POSTS} from './story-posts.js';
import {CLEARING_APPROACH} from './clearing.js';
import {CAMP_GATES} from './camp-defense.js';
export const BUILDING_ENTRY={wait:3,radius:28,releaseRadius:48,stopSpeed:3};
export const BUILDING_ENTRIES=[
 ...REALM_ENTRANCES.map(e=>({id:'realm-'+e.mode,type:'realm',key:e.mode,x:e.x,y:e.y+22,icon:e.mode==='fire'?'fire':'home'})),
 ...STORY_POSTS.map(p=>({id:'post-'+p.id,type:'post',key:p.id,x:p.x+p.approach.dx,y:p.y+p.approach.dy,icon:'board'})),
 // 清缴提示与正式接取权限共用靠近范围，不再要求踩中旧候停点。
 {id:'clearing',type:'clearing',key:'clearing',x:CLEARING_APPROACH.x,y:CLEARING_APPROACH.y,radius:CLEARING_APPROACH.radius,icon:'board'},
 // 守门盾牌在门柱侧边，候停点放在盾牌前，避免把经过大门的玩家送进面板。
 ...CAMP_GATES.map(g=>({id:'gate-'+g.id,type:'gate',key:g.id,x:g.x-g.ny*108,y:g.y+g.nx*108+24,icon:'shield'})),
];
