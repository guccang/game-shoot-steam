// 露营与垂钓直接采样正式地貌、水界和碰撞，不铺设假的钓鱼背景。
import {NATURAL_TERRAIN,touchesLandform} from './natural-terrain.js';
import {JIUZHAIGOU_LAKES} from './jiuzhaigou.js';
import {worldDistance,nearest,canonical} from './coordinates.js';
import {blocked} from '../physics/motion.js';
import {TOWN_LAYOUT} from '../config/town-layout.js';

// 从真实湖轮廓寻找可站立岸点，排除浅滩、树干和无法落漂的凹湾。
export function fishingShores(game){
 const lakes=game.mapId==='forest'?NATURAL_TERRAIN.lakes:game.mapId==='jiuzhaigou'?JIUZHAIGOU_LAKES.filter(l=>l.kind==='lake'):[];
 const sites=[];
 for(const lake of lakes){let best=null;
  for(let i=0;i<lake.outline.length;i+=2){const edge=lake.outline[i],d=Math.hypot(edge.x,edge.y),dx=edge.x/d,dy=edge.y/d;
   const stand=canonical({x:lake.x+edge.x+dx*32,y:lake.y+edge.y+dy*32}),water=canonical({x:lake.x+edge.x-dx*52,y:lake.y+edge.y-dy*52});
   if(blocked(stand.x,stand.y,16,game.trees,{mapId:game.mapId,livingCollision:game.mapId==='forest'})||!touchesLandform(lake,water.x,water.y))continue;
   const distance=worldDistance(game.player,stand);if(!best||distance<best.distance)best={...nearest(stand,game.player),water:nearest(water,nearest(stand,game.player)),lake,mapId:game.mapId,id:'fishing-'+lake.id,name:lake.name||'林间湖泊',distance};
  }if(best)sites.push(best);
 }return sites.sort((a,b)=>a.distance-b.distance);
}
// 帐篷与天幕共同检查整片落点，避开城镇、湖水、道路设施和田块。
export function campPlacement(game){
 const bounds=TOWN_LAYOUT.bounds;
 for(const radius of [80,120,160])for(let i=0;i<12;i++){
  const angle=i*Math.PI/6,site=canonical({x:game.player.x+Math.cos(angle)*radius,y:game.player.y+Math.sin(angle)*radius});
  const town=nearest(site,{x:(bounds.left+bounds.right)/2,y:(bounds.top+bounds.bottom)/2});
  if(game.mapId==='forest'&&town.x>bounds.left-90&&town.x<bounds.right+90&&town.y>bounds.top-90&&town.y<bounds.bottom+90)continue;
  if(game.progress.farm.plots.some(p=>p.mapId===game.mapId&&worldDistance(p,site)<150))continue;
  let clear=true;for(const x of [-82,-40,0,40,82])for(const y of [-50,0,50])if(blocked(site.x+x,site.y+y,18,game.trees,{mapId:game.mapId,livingCollision:game.mapId==='forest'}))clear=false;
  if(clear)return {...site,mapId:game.mapId};
 }return null;
}
