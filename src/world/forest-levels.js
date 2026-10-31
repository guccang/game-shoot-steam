// 森林野外等级按营地最短距离分布；生态配色、清缴和剧情难度独立保留。
import {TOWN_LAYOUT} from '../config/town-layout.js';
import {worldDistance} from './coordinates.js';
const b=TOWN_LAYOUT.bounds;
export const FOREST_LEVEL_ORIGIN=Object.freeze({x:(b.left+b.right)/2,y:(b.top+b.bottom)/2});
export const FOREST_LEVEL_BANDS=Object.freeze([
 {from:0,to:1500,min:1,max:3,name:'营地周边'},
 {from:1500,to:2400,min:4,max:6,name:'近郊林地'},
 {from:2400,to:3300,min:7,max:9,name:'外围林地'},
 {from:3300,to:4200,min:10,max:12,name:'远行林地'},
 {from:4200,to:5100,min:13,max:15,name:'深林'},
 {from:5100,to:6000,min:16,max:18,name:'远境森林'},
 {from:6000,to:6900,min:19,max:20,name:'极远边境'},
].map(b=>Object.freeze({...b,range:`${b.min}–${b.max}`})));
// 循环地图边缘使用最近镜像，向西越界不会突然误入另一侧高等级区。
export function forestThreatAt(x,y){
 const distance=worldDistance({x,y},FOREST_LEVEL_ORIGIN),band=FOREST_LEVEL_BANDS.find(b=>distance<b.to)||FOREST_LEVEL_BANDS.at(-1);
 const level=Math.min(band.max,band.min+Math.floor((distance-band.from)/(band.to-band.from)*(band.max-band.min+1)));
 return {...band,level,distance};
}
