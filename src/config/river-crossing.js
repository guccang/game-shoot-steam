// 第二章取药与渡河共用真实河道锚点；设施与碰撞只读取这张表。
import {BRIDGE,riverXAt} from '../world/river-geometry.js';
import {TOWN_LAYOUT} from './town-layout.js';
export const RIVER_DELIVERY_SITES={
 CAMP:{...TOWN_LAYOUT.spawn},SUPPLY:{...TOWN_LAYOUT.supply},
 DOCK:{x:riverXAt(1540)-100,y:1540},WATER:{x:riverXAt(1540),y:1540},
 CHANNEL:{x:riverXAt(2000),y:2000},LANDING:{x:riverXAt(2000)+100,y:2000},FAR:{x:1740,y:2200},
};
export const RIVER_DOCKS=[
 {id:'west-ferry',type:'river-dock',x:riverXAt(1540)-65,y:1540,direction:1,label:'西岸渡口'},
 {id:'east-ferry',type:'river-dock',x:riverXAt(2000)+65,y:2000,direction:-1,label:'东岸渡口'},
];
export const RIVER_BRIDGE_BARRIERS=[BRIDGE.x,BRIDGE.x+BRIDGE.width].map((x,i)=>({id:'bridge-repair-'+i,type:'river-barrier',x,y:BRIDGE.y+BRIDGE.height/2,width:18,height:BRIDGE.height,label:'维修中'}));
