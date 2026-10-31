// 赛道设施的固定布局、轮廓与效果参数；逻辑、正式绘制及小地图共用。
import {RACE,racePoint} from './forest-race.js';
export const RACE_TRACK={runnerRadius:12,boostSeconds:1.8,boostMultiplier:1.35,mudMultiplier:.55};
export const RACE_FEATURES=[
 {id:'wind-1',kind:'boost',at:.45,lane:35,rx:43,ry:29},
 {id:'hay-1',kind:'bale',at:1.02,lane:-60,radius:24},
 {id:'mud-1',kind:'mud',at:1.8,lane:12,rx:55,ry:34},
 {id:'wind-2',kind:'boost',at:2.6,lane:-42,rx:43,ry:29},
 {id:'hay-2',kind:'bale',at:3.18,lane:52,radius:24},
 {id:'mud-2',kind:'mud',at:3.95,lane:-38,rx:55,ry:34},
 {id:'wind-3',kind:'boost',at:4.72,lane:48,rx:43,ry:29},
 {id:'hay-3',kind:'bale',at:5.38,lane:-60,radius:24}
];
// 设施采用沿跑道切线的局部坐标，保证画出的箭头方向与真实前进方向一致。
export function raceFeatures(arena=RACE.arena){return RACE_FEATURES.map(f=>{const a=Math.PI/2+f.at;return {...f,...racePoint(a,arena,f.lane),angle:Math.atan2((RACE.ry+f.lane)*Math.cos(a),-(RACE.rx+f.lane)*Math.sin(a))};});}
// 泥地为椭圆，加速带为圆角矩形的内接区域；脚底进入才生效。
export function inRaceFeature(p,f){const dx=p.x-f.x,dy=p.y-f.y,c=Math.cos(f.angle),s=Math.sin(f.angle),x=(dx*c+dy*s)/f.rx,y=(-dx*s+dy*c)/f.ry;return f.kind==='boost'?Math.abs(x)<=1&&Math.abs(y)<=1:x*x+y*y<=1;}
