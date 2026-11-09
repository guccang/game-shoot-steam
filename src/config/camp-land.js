// 营地地契只管理建设用地；世界坐标、主路和野外通行保持原合同。
import {nearest} from '../world/coordinates.js';
export const CAMP_PLOTS=[
 {id:'core',name:'起始营地',left:-90,right:790,top:-58,bottom:850,coins:0,neighbors:[]},
 {id:'workyard',name:'南侧整备地',left:-90,right:790,top:850,bottom:1140,coins:24,neighbors:['core'],sign:{x:600,y:835}},
 {id:'gardens',name:'挑战庭院',left:-90,right:790,top:1140,bottom:1400,coins:180,neighbors:['workyard'],sign:{x:550,y:1120}},
 {id:'services',name:'西侧服务地',left:-650,right:-90,top:-58,bottom:1400,coins:80,neighbors:['core','workyard'],sign:{x:-65,y:730}},
 {id:'industry',name:'西林工业地',left:-1120,right:-650,top:-58,bottom:1400,coins:320,neighbors:['services'],sign:{x:-625,y:730}},
];
// 周期地图中的建筑、碰撞和点击统一匹配同一地块。
export function campPlotAt(point){return CAMP_PLOTS.find(p=>{const q=nearest(point,{x:(p.left+p.right)/2,y:(p.top+p.bottom)/2});return q.x>=p.left&&q.x<p.right&&q.y>=p.top&&q.y<p.bottom;})||null;}
// 新巡林明确只授予起始地契。
export function freshCampLand(){return {version:1,owned:['core']};}
// 历史存档保留完整地契；新开局明确写入起始地契，避免把老玩家建筑收走。
export function normalizeCampLand(raw){return {version:1,owned:CAMP_PLOTS.filter(p=>p.id==='core'||!raw||Array.isArray(raw.owned)&&raw.owned.includes(p.id)).map(p=>p.id)};}
// 地块身份与显示名称无关，旧内存对象维持迁移前权限。
export function ownsCampPlot(progress,id){return !progress?.campLand||progress.campLand.owned.includes(id);}
// 公共森林与邻里不作为可购买营地土地。
export function ownsCampPoint(progress,point){const p=campPlotAt(point);return !p||ownsCampPlot(progress,p.id);}
// 只展示与任一已有地块相接的扩建入口。
export function availableCampPlots(progress){return CAMP_PLOTS.filter(p=>!ownsCampPlot(progress,p.id)&&p.neighbors.some(id=>ownsCampPlot(progress,id)));}
