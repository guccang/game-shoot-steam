// 森林野外等级按营地最短距离分布；生态配色、清缴和剧情难度独立保留。
import {worldDistance} from './coordinates.js';
import {TOWN_LAYOUT} from '../config/town-layout.js';
import {WORLD_UNITS_PER_METER} from './distance-units.js';
// 采用晴叶营地围栏几何中心，距离表按玩家看到的米数编写。
export const FOREST_LEVEL_ORIGIN=Object.freeze({x:(TOWN_LAYOUT.bounds.left+TOWN_LAYOUT.bounds.right)/2,y:(TOWN_LAYOUT.bounds.top+TOWN_LAYOUT.bounds.bottom)/2});
export const FOREST_LEVEL_BANDS=Object.freeze([
 {from:0,to:600,min:1,max:3,name:'营地周边'},
 {from:600,to:1050,min:4,max:6,name:'近郊林地'},
 {from:1050,to:1500,min:7,max:9,name:'外围林地'},
 {from:1500,to:1950,min:10,max:12,name:'远行林地'},
 {from:1950,to:2400,min:13,max:15,name:'深林'},
 {from:2400,to:2800,min:16,max:18,name:'远境森林'},
 {from:2800,to:3000,min:19,max:20,name:'极远边境'},
].map(b=>Object.freeze({...b,from:b.from*WORLD_UNITS_PER_METER,to:b.to*WORLD_UNITS_PER_METER,range:`${b.min}–${b.max}`})));
// 循环地图边缘使用最近镜像，向西越界不会突然误入另一侧高等级区。
export function forestThreatAt(x,y){
 const distance=worldDistance({x,y},FOREST_LEVEL_ORIGIN),band=FOREST_LEVEL_BANDS.find(b=>distance<b.to)||FOREST_LEVEL_BANDS.at(-1);
 const level=Math.min(band.max,band.min+Math.floor((distance-band.from)/(band.to-band.from)*(band.max-band.min+1)));
 return {...band,level,distance};
}
