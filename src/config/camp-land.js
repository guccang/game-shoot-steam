import {CAMP_EXPANSION} from './camp-expansion.js';
// 营地地契只管理建设用地；世界坐标、主路和野外通行保持原合同。
import {nearest} from '../world/coordinates.js';
// 西侧共界为北场最左列车位留出距车位中心120单位的间隔，扩建前后绘制与碰撞保持连续。
const CORE_WEST=-210;
export const CAMP_PLOTS=[
 {id:'core',name:'起始营地',left:CORE_WEST,right:790,top:-58,bottom:850,coins:0,neighbors:[]},
 {id:'workyard',name:'南侧整备地',left:CORE_WEST,right:790,top:850,bottom:1140,coins:24,neighbors:['core'],sign:{x:600,y:835}},
 {id:'gardens',name:'挑战庭院',left:CORE_WEST,right:790,top:1140,bottom:1400,coins:180,neighbors:['workyard'],sign:{x:550,y:1120}},
 {id:'services',name:'西侧服务地',left:-650,right:CORE_WEST,top:-58,bottom:1400,coins:80,neighbors:['core','workyard'],sign:{x:-65,y:730}},
 {id:'industry',name:'西林工业地',left:-1120,right:-650,top:-58,bottom:1400,coins:320,neighbors:['services'],sign:{x:-625,y:730}},
];
// 周期地图中的建筑、碰撞和点击统一匹配同一地块。
export function campPlotAt(point,progress=null){return (progress?campPlots(progress):CAMP_PLOTS).find(p=>{const q=nearest(point,{x:(p.left+p.right)/2,y:(p.top+p.bottom)/2});return q.x>=p.left&&q.x<p.right&&q.y>=p.top&&q.y<p.bottom;})||null;}
// 新巡林明确只授予起始地契。
export function freshCampLand(){return {version:3,expansions:0,additions:[],owned:['core']};}
// 历史存档保留完整地契；新开局明确写入起始地契，避免把老玩家建筑收走。
export function normalizeCampLand(raw){const additions=(Array.isArray(raw?.additions)?raw.additions:[]).filter(r=>r&&['north','south','west','east'].includes(r.direction)&&['left','right','top','bottom'].every(k=>Number.isFinite(r[k])&&Math.abs(r[k])<23500)&&r.right>r.left&&r.bottom>r.top&&Math.abs((r.right-r.left)*(r.bottom-r.top)-CAMP_EXPANSION.area*100)<1).slice(0,CAMP_EXPANSION.maxLevel).map(r=>({direction:r.direction,left:r.left,right:r.right,top:r.top,bottom:r.bottom}));const baseTops=raw?.baseTops&&typeof raw.baseTops==='object'?Object.fromEntries(CAMP_PLOTS.filter(p=>Number.isFinite(raw.baseTops[p.id])&&raw.baseTops[p.id]<=p.top&&raw.baseTops[p.id]>-23500).map(p=>[p.id,raw.baseTops[p.id]])):null;return {version:3,additions,baseTops,expansions:Math.max(0,Math.min(CAMP_EXPANSION.maxLevel,Math.max(additions.length,Math.floor(Number(raw?.expansions)||0)))),owned:CAMP_PLOTS.filter(p=>p.id==='core'||!raw||Array.isArray(raw.owned)&&raw.owned.includes(p.id)).map(p=>p.id)};}
// 地块身份与显示名称无关，旧内存对象维持迁移前权限。
export function ownsCampPlot(progress,id){return !progress?.campLand||progress.campLand.owned.includes(id)||/^expansion-\d+$/.test(id)&&Number(id.slice(10))<(progress.campLand.additions?.length||0);}
// 公共森林与邻里不作为可购买营地土地。
export function ownsCampPoint(progress,point){const p=campPlotAt(point,progress);return !p||ownsCampPlot(progress,p.id);}
// 只展示与任一已有地块相接的扩建入口。
export function availableCampPlots(progress){return CAMP_PLOTS.filter(p=>!ownsCampPlot(progress,p.id)&&p.neighbors.some(id=>ownsCampPlot(progress,id)));}

let activeLand=null;const areaCache=new Map();
// 仅正式激活存档更新环境采样，报价和预览不切换当前世界。
export function activateCampLand(progress){activeLand=progress;}
// 保留旧版北侧已购面积；新版新增固定矩形，购地、围栏和道路共用。
export function campPlots(progress=activeLand){const additions=progress?.campLand?.additions||[],level=Math.max(0,(progress?.campLand?.expansions||0)-additions.length),key=JSON.stringify([additions,progress?.campLand?.baseTops])+(progress?.campLand?.owned||CAMP_PLOTS.map(p=>p.id)).join('|')+':'+level;if(areaCache.has(key))return areaCache.get(key);const owned=CAMP_PLOTS.filter(p=>ownsCampPlot(progress,p.id)),area=owned.reduce((n,p)=>n+(p.right-p.left)*(p.bottom-p.top),0),width=owned.filter(p=>p.top===-58).reduce((n,p)=>n+p.right-p.left,0),extra=area*(CAMP_EXPANSION.baseArea*Math.pow(CAMP_EXPANSION.rate,level)-1)/width;const plots=CAMP_PLOTS.map(p=>({...p,top:progress?.campLand?.baseTops?.[p.id]??(p.top===-58&&ownsCampPlot(progress,p.id)?p.top-extra:p.top)})).concat(additions.map((r,i)=>({...r,id:'expansion-'+i,name:'扩建用地',neighbors:[]})));if(areaCache.size>=64)areaCache.delete(areaCache.keys().next().value);areaCache.set(key,plots);return plots;}
// 面积使用世界平方米：10逻辑单位等于1米。
export function campArea(progress){return campPlots(progress).filter(p=>ownsCampPlot(progress,p.id)).reduce((n,p)=>n+(p.right-p.left)*(p.bottom-p.top),0)/100;}
// 新增区域作为平整营地地面，查询带余量用于清理树冠，不改变原区域内容。
export function campExpansionPoint(point,progress=activeLand,margin=0){if(!progress)return false;return campPlots(progress).some(r=>{if(r.id.startsWith('expansion-')){const p=nearest(point,{x:(r.left+r.right)/2,y:(r.top+r.bottom)/2});return p.x>=r.left-margin&&p.x<=r.right+margin&&p.y>=r.top-margin&&p.y<=r.bottom+margin;}if(r.top>=-58)return false;const p=nearest(point,{x:(r.left+r.right)/2,y:(r.top-58)/2});return p.x>=r.left-margin&&p.x<=r.right+margin&&p.y>=r.top-margin&&p.y<-58;});}
