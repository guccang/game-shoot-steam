// 使用真实湖泊与玩家碰撞复现稀疏钓位漏判，并验证入口与开钓共用资格。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {fishingShores} from '../src/world/outdoor-sites.js';
import {fishingAvailability,beginFishing,fishingControl} from '../src/core/activities/outdoors.js';
import {NATURAL_TERRAIN,touchesLandform} from '../src/world/natural-terrain.js';
import {JIUZHAIGOU_LAKES} from '../src/world/jiuzhaigou.js';
import {blocked} from '../src/physics/motion.js';
import {WORLD} from '../src/world/coordinates.js';
const regression={x:22180.53247164745,y:3339.935126567};
// 只准备装备与自由巡林，不绕过真实水界或正式钓鱼状态机。
function scene(){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.outdoors.rod=true;p.outdoors.bait=20;const g=new Game(p,()=>.4);g.state='playing';g.vehicle.active=false;g.enemies=[];g.boss=null;g.progress.living.patrolActive=false;g.livingPersist=()=>true;g.mainlineSpeech=null;Object.assign(g.player,regression);return g;}
let game;
test('原先距离散钓位86.99的真实岸段现在可以就地备竿，准备不扣饵',()=>{
 game=scene();assert.equal(blocked(game.player.x,game.player.y,16,game.trees,game.player),false);
 const available=fishingAvailability(game);assert.ok(available.ok,available.message);assert.equal(available.shore.lake.id,'regional-lake-9');assert.ok(available.shore.distance<.001);assert.ok(beginFishing(game).ok);assert.equal(game.progress.outdoors.bait,20);assert.ok(game.fishing.odds.length);fishingControl(game,'cancel');
});
test('两张地图每个湖的可站立岸段中点均能被连续近岸查询找到',()=>{
 const g=game;let count=0,lakesChecked=0;
 for(const [mapId,lakes] of [['forest',NATURAL_TERRAIN.lakes],['jiuzhaigou',JIUZHAIGOU_LAKES.filter(l=>l.kind==='lake')]]){
  g.mapId=mapId;const body={...g.player,mapId,campProgress:g.progress,livingCollision:mapId==='forest',flying:false,amphibious:false};
  for(const lake of lakes){let checked=0;const p=lake.outline,sign=Math.sign(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a.x*b.y-b.x*a.y;},0));
   for(let i=0;i<p.length;i++){
    const a=p[i],b=p[(i+1)%p.length],len=Math.hypot(b.x-a.x,b.y-a.y),nx=sign*(b.y-a.y)/len,ny=-sign*(b.x-a.x)/len,x=lake.x+(a.x+b.x)/2,y=lake.y+(a.y+b.y)/2;
    const stand={x:x+nx*32,y:y+ny*32},water={x:x-nx*52,y:y-ny*52};if(blocked(stand.x,stand.y,16,g.trees,body)||!touchesLandform(lake,water.x,water.y))continue;
    Object.assign(g.player,stand);const site=fishingShores(g,{maxDistance:85})[0];assert.ok(site,lake.id+' '+i);assert.ok(site.distance<.001,lake.id+' '+i);assert.ok(touchesLandform(site.lake,site.water.x,site.water.y));checked++;count++;
   }if(checked)lakesChecked++;
  }
 }assert.ok(count>500);assert.ok(lakesChecked>200);console.log({shoreMidpoints:count,lakesChecked});g.mapId='forest';Object.assign(g.player,regression);
});
test('跨地图镜像仍在同一湖备竿，远离、缺饵、乘车、危险与动作占用拒绝',()=>{
 const g=game;Object.assign(g.player,{x:regression.x+WORLD.width,y:regression.y-WORLD.height});assert.ok(fishingAvailability(g).ok);
 g.player.x+=3000;assert.equal(fishingAvailability(g).ok,false);Object.assign(g.player,regression);
 g.progress.outdoors.bait=0;assert.equal(fishingAvailability(g).ok,false);g.progress.outdoors.bait=20;
 g.vehicle.active=true;assert.equal(fishingAvailability(g).ok,false);g.vehicle.active=false;
 g.enemies=[{x:g.player.x+100,y:g.player.y,hp:10}];assert.equal(fishingAvailability(g).ok,false);g.enemies=[];
 assert.ok(beginFishing(g).ok);assert.equal(fishingAvailability(g).ok,false);fishingControl(g,'cancel');assert.ok(fishingAvailability(g).ok);
});
