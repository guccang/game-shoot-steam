// 实际落漂与界面预览共用水域、可见鱼群和钓具权重，避免展示另一套概率。
import {fishingShores} from '../../world/outdoor-sites.js';
import {mineFishingShore,mineCastWater} from '../../world/mine-fishing.js';
import {surfaceFishLake,mineFishLake,lakeFishPool} from '../../world/fish-ecology.js';
import {surfaceAmbientFish,mineAmbientFish} from '../../world/ambient-fish.js';
import {mineLayer} from '../../progression/mining/mine-layers.js';
import {nearest} from '../../world/coordinates.js';
import {touchesLandform} from '../../world/natural-terrain.js';
import {fishingOdds,fishingSetup} from './fishing-tackle.js';
// 准备页显示最近湖岸；地下只有真实可达岸边才提供调查与钓鱼。
export function currentFishingShore(game){return game.cottage?.kind==='mine'?mineFishingShore(game):!game.cottage?fishingShores(game)[0]:null;}
// 地下水域包含楼层身份；地表同一湖不受站位、昼夜、进入顺序影响。
export function fishingLake(game,shore){return !shore?null:shore.mineDepth?mineFishLake(mineLayer(game.progress.mining,shore.mineDepth),shore.water,shore.mineDepth):surfaceFishLake(game.mapId,shore.lake);}
// 蓄力改变落漂距离，所有落点继续接受正式水界校验。
export function fishingCastPoint(game,shore,charge=0){
 if(shore.mineDepth)return mineCastWater(game,shore,charge);
 const edge=shore.water,center=nearest(shore.lake,edge),dx=center.x-edge.x,dy=center.y-edge.y,n=Math.hypot(dx,dy)||1;
 const p={x:edge.x+dx/n*charge*35,y:edge.y+dy/n*charge*35};return touchesLandform(shore.lake,p.x,p.y)?p:edge;
}
// 浮漂附近120单位内的可见鱼种获得距离加权；本湖其他常住鱼仍可咬钩，绝不抽取别湖鱼。
export function lakeFishingContext(game,shore,point=shore?.water,rodId,baitId){
 const setup=fishingSetup(game),lake=fishingLake(game,shore);if(!lake||!point)return {lake:null,odds:[],schools:[],mode:'none'};
 const base=fishingOdds(rodId||setup.rodId,baitId||setup.baitId,lake.water).filter(e=>lakeFishPool(lake).includes(e.index));
 const view={x:point.x-120,y:point.y-120,w:240,h:240},layer=shore.mineDepth?mineLayer(game.progress.mining,shore.mineDepth):null;
 const fish=layer?mineAmbientFish(layer,view,layer.age||0,shore.mineDepth):surfaceAmbientFish(game.mapId,view,game.time||0);
 const schools=fish.filter(f=>f.waterId===lake.id&&Math.hypot(f.x-point.x,f.y-point.y)<=120&&base.some(e=>e.index===f.species));
 const candidates=base;
 const entries=candidates.map(e=>({...e,weight:e.weight*(1+schools.filter(f=>f.species===e.index).reduce((s,f)=>s+4+8*(1-Math.hypot(f.x-point.x,f.y-point.y)/120),0))}));
 const total=entries.reduce((s,e)=>s+e.weight,0);return {lake,schools,mode:schools.length?'school':'resident',odds:entries.map(e=>({...e,probability:e.weight/total}))};
}
// 页面在当前岸边以未蓄力落点预览；正式放手时按实际浮漂位置重新锁定一次。
export function fishingPreview(game){const shore=currentFishingShore(game);return {...lakeFishingContext(game,shore),shore};}
