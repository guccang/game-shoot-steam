import {CAMP_EXPANSION} from './camp-expansion.js';
// 营地地契定义开局范围、扩建顺序及各街区的设施归属。
import {nearest} from '../world/coordinates.js';
// 西侧共界为北场最左列车位留出距车位中心120单位的间隔，扩建前后绘制与碰撞保持连续。
const CORE_WEST=-210;
// 四个方向的木牌固定在初始营地，地契身份决定下一阶段和剩余次数。
export const CAMP_DIRECTIONS=[
 {id:'north',name:'北',sign:{x:65,y:175},plots:['north-yard','commons']},
 {id:'east',name:'东',sign:{x:205,y:625},plots:['quarter','homes']},
 {id:'south',name:'南',sign:{x:80,y:810},plots:['workyard','gardens','river-yard']},
 {id:'west',name:'西',sign:{x:-155,y:580},plots:['services','industry','factory-yard','se-yard']},
];
export const CAMP_PLOTS=[
 {id:'core',name:'巡林营地',left:CORE_WEST,right:245,top:140,bottom:850,coins:0,neighbors:[]},
 {id:'workyard',landmark:'载具工坊',name:'南侧整备地',left:CORE_WEST,right:790,top:850,bottom:1140,coins:24},
 {id:'gardens',landmark:'时空塔',name:'挑战庭院',left:CORE_WEST,right:790,top:1140,bottom:1400,coins:180},
 {id:'services',landmark:'弹药补给铺',name:'西侧服务地',left:-650,right:CORE_WEST,top:180,bottom:1400,coins:80},
 {id:'industry',landmark:'提炼厂',name:'西林提炼区',left:-1120,right:-650,top:-58,bottom:480,coins:320},
 {id:'homes',landmark:'巡林小屋',name:'小屋街区',left:445,right:790,top:-58,bottom:850,coins:16},
 {id:'commons',landmark:'邻里委托板',name:'居民工艺院',left:-650,right:CORE_WEST,top:-58,bottom:180,coins:12},
 {id:'factory-yard',landmark:'加工厂',name:'加工厂区',left:-1120,right:-650,top:480,bottom:820,coins:450},
 {id:'se-yard',landmark:'SE 改装工坊',name:'SE 整备区',left:-1120,right:-650,top:820,bottom:1400,coins:600},
 {id:'north-yard',landmark:'后院仓库',name:'北侧后院',left:CORE_WEST,right:245,top:-58,bottom:140,coins:6},
 {id:'river-yard',landmark:'森林消防站',name:'河畔勤务区',left:790,right:1140,top:810,bottom:1390,coins:240},
 {id:'quarter',landmark:'小屋仓库',name:'仓储街区',left:245,right:445,top:-58,bottom:850,coins:8},
];
// 地界导航和场景点击统一指向本方向的木牌。
for(const direction of CAMP_DIRECTIONS)for(const [stage,id] of direction.plots.entries()){
 const plot=CAMP_PLOTS.find(p=>p.id===id);
 plot.neighbors=[stage?direction.plots[stage-1]:'core'];
 plot.sign=direction.sign;
 plot.wood=plot.coins*2;
}
// 旧档可能跳过了某一阶段，因此按实际地契统计进度。
export function campDirectionStatus(progress,direction){
 const remaining=direction.plots.filter(id=>!ownsCampPlot(progress,id));
 const plot=CAMP_PLOTS.find(p=>p.id===remaining[0]);
 return {next:plot?.id,landmark:plot?.landmark,remaining:remaining.length,total:direction.plots.length};
}
// 周期地图中的建筑、碰撞和点击统一匹配同一地块。
export function campPlotAt(point,progress=null){return (progress?campPlots(progress):CAMP_PLOTS).find(p=>{const q=nearest(point,{x:(p.left+p.right)/2,y:(p.top+p.bottom)/2});return q.x>=p.left&&q.x<p.right&&q.y>=p.top&&q.y<p.bottom;})||null;}
// 新巡林明确只授予起始地契。
export function freshCampLand(){return {version:5,expansions:0,additions:[],owned:['core']};}
// 历史存档保留完整地契；新开局明确写入起始地契，避免把老玩家建筑收走。
export function normalizeCampLand(raw){const additions=(Array.isArray(raw?.additions)?raw.additions:[]).filter(r=>r&&['north','south','west','east'].includes(r.direction)&&['left','right','top','bottom'].every(k=>Number.isFinite(r[k])&&Math.abs(r[k])<23500)&&r.right>r.left&&r.bottom>r.top&&Math.abs((r.right-r.left)*(r.bottom-r.top)-CAMP_EXPANSION.area*100)<1).slice(0,CAMP_EXPANSION.maxLevel).map(r=>({direction:r.direction,left:r.left,right:r.right,top:r.top,bottom:r.bottom}));
 const legacy=!!raw&&!(raw.version>=4),owned=new Set(Array.isArray(raw?.owned)?raw.owned:[]);
 // 旧核心地和工业地拆分后，保留原有建筑权限和扩建前冻结的北边界。
 if(legacy&&owned.has('core')){owned.add('homes');owned.add('commons');}
 if(legacy&&owned.has('industry')){owned.add('factory-yard');owned.add('se-yard');}
 if(raw&&(raw.version??0)<5&&owned.has('core')){owned.add('north-yard');owned.add('quarter');owned.add('river-yard');}
 const tops={...raw?.baseTops};
 if(legacy&&raw.baseTops){
  tops.homes=tops.core;tops.commons=tops.services;tops.services=180;
  tops['factory-yard']=480;tops['se-yard']=820;
 }
 if(raw?.baseTops&&(raw.version??0)<5){tops['north-yard']=tops.core;tops.quarter=tops.core;tops.core=140;}
 const baseTops=raw?.baseTops?Object.fromEntries(CAMP_PLOTS.filter(p=>Number.isFinite(tops[p.id])&&tops[p.id]<=p.top&&tops[p.id]>-23500).map(p=>[p.id,tops[p.id]])):null;
 return {version:5,additions,baseTops,expansions:Math.max(0,Math.min(CAMP_EXPANSION.maxLevel,Math.max(additions.length,Math.floor(Number(raw?.expansions)||0)))),owned:CAMP_PLOTS.filter(p=>p.id==='core'||!raw||owned.has(p.id)).map(p=>p.id)};
}
// 地块身份与显示名称无关，旧内存对象维持迁移前权限。
export function ownsCampPlot(progress,id){return !progress?.campLand||progress.campLand.owned.includes(id)||/^expansion-\d+$/.test(id)&&Number(id.slice(10))<(progress.campLand.additions?.length||0);}
// 地契范围以外沿用野外通行权限。
export function ownsCampPoint(progress,point){const p=campPlotAt(point,progress);return !p||ownsCampPlot(progress,p.id);}
// 只展示与任一已有地块相接的扩建入口。
export function availableCampPlots(progress){const next=CAMP_DIRECTIONS.map(d=>campDirectionStatus(progress,d).next);return CAMP_PLOTS.filter(p=>next.includes(p.id));}

let activeLand=null,activePlots=CAMP_PLOTS;const areaCache=new Map();
// 仅正式激活存档更新环境采样，报价和预览不切换当前世界。
export function activateCampLand(progress){activeLand=progress;activePlots=campPlots(progress).filter(p=>ownsCampPlot(progress,p.id));}
// 安全区查询直接复用已激活的地契，避免每次移动时重新分配。
export function activeCampPlots(){return activePlots;}
// 保留旧版北侧已购面积；新版新增固定矩形，购地、围栏和道路共用。
export function campPlots(progress=activeLand){const additions=progress?.campLand?.additions||[],level=Math.max(0,(progress?.campLand?.expansions||0)-additions.length),key=JSON.stringify([additions,progress?.campLand?.baseTops])+(progress?.campLand?.owned||CAMP_PLOTS.map(p=>p.id)).join('|')+':'+level;if(areaCache.has(key))return areaCache.get(key);const owned=CAMP_PLOTS.filter(p=>ownsCampPlot(progress,p.id)),area=owned.reduce((n,p)=>n+(p.right-p.left)*(p.bottom-p.top),0),width=owned.filter(p=>p.top===-58).reduce((n,p)=>n+p.right-p.left,0),extra=area*(CAMP_EXPANSION.baseArea*Math.pow(CAMP_EXPANSION.rate,level)-1)/Math.max(1,width);const plots=CAMP_PLOTS.map(p=>({...p,top:progress?.campLand?.baseTops?.[p.id]??(p.top===-58&&ownsCampPlot(progress,p.id)?p.top-extra:p.top)})).concat(additions.map((r,i)=>({...r,id:'expansion-'+i,name:'扩建用地',neighbors:[]})));if(areaCache.size>=64)areaCache.delete(areaCache.keys().next().value);areaCache.set(key,plots);return plots;}
// 面积使用世界平方米：10逻辑单位等于1米。
export function campArea(progress){return campPlots(progress).filter(p=>ownsCampPlot(progress,p.id)).reduce((n,p)=>n+(p.right-p.left)*(p.bottom-p.top),0)/100;}
// 新增区域作为平整营地地面，查询带余量用于清理树冠，不改变原区域内容。
export function campExpansionPoint(point,progress=activeLand,margin=0){if(!progress)return false;return campPlots(progress).some(r=>{if(r.id.startsWith('expansion-')){const p=nearest(point,{x:(r.left+r.right)/2,y:(r.top+r.bottom)/2});return p.x>=r.left-margin&&p.x<=r.right+margin&&p.y>=r.top-margin&&p.y<=r.bottom+margin;}if(r.top>=-58)return false;const p=nearest(point,{x:(r.left+r.right)/2,y:(r.top-58)/2});return p.x>=r.left-margin&&p.x<=r.right+margin&&p.y>=r.top-margin&&p.y<-58;});}
