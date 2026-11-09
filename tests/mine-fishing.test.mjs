// 使用真实地下湖岸和正式状态机验证抛竿、结算、暂停及场景隔离。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {openBasement} from '../src/progression/mining/mining.js';
import {MINING,minePoint} from '../src/config/mining.js';
import {mineTerrain} from '../src/config/mine-ecology.js';
import {mineSurfaceAt} from '../src/world/mine-surface.js';
import {mineFishingShore} from '../src/world/mine-fishing.js';
import {enterMine} from '../src/core/mining/mining.js';
import {beginFishing,fishingControl,finishFishing,updateOutdoors,deployCamp} from '../src/core/activities/outdoors.js';
let shorePoint;
// 使用天然水格周边可站立岸点，不挖假水池或伪造落漂点。
function scene(){
 const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.homeDecor.basement=true;openBasement(p.mining);p.mining.seed=1847;p.outdoors.rod=true;p.outdoors.bait=20;
 const g=new Game(p,()=>.4);g.state='playing';g.vehicle.active=false;g.livingPersist=()=>true;g.mainlineSpeech=null;g.cottage={kind:'cottage',floor:0,outside:MINING.home};Object.assign(g.player,MINING.hatch.goal);assert.ok(enterMine(g));g.cottage.scanWait=99999;g.magazines[0].ammo=g.weapon().magazineSize;g.magazines[0].remaining=0;
 if(!shorePoint)outer:for(let y=-16;y<16;y++)for(let x=-16;x<16;x++){
  if(!mineTerrain({x,y},p.mining).water)continue;const center=minePoint({x,y});
  for(let dy=-112;dy<=112;dy+=16)for(let dx=-112;dx<=112;dx+=16){Object.assign(g.player,{x:center.x+dx,y:center.y+dy});if(mineFishingShore(g)){shorePoint={x:g.player.x,y:g.player.y};break outer;}}
 }
 assert.ok(shorePoint);Object.assign(g.player,shorePoint);return g;
}
// 每次使用正式游戏主循环，确认地下不会漏掉或重复推进垂钓。
function tick(g,seconds){for(let t=0;t<seconds;t+=.04)g.update(.04,{x:1,y:1});}
// 完整经历蓄力、入水、试探和黑漂，不直接把状态改成已获鱼。
function cast(g){assert.ok(beginFishing(g).ok);fishingControl(g,'press');tick(g,1.2);fishingControl(g,'release');tick(g,7.48);assert.equal(g.fishing.phase,'bite');}

test('地下天然岸边可抛竿，装备不足、矿车、水下及非岸边拒绝',()=>{
 const g=scene();assert.ok(beginFishing(g).ok);assert.equal(g.progress.outdoors.bait,20);fishingControl(g,'cancel');
 g.progress.outdoors.rod=false;assert.equal(beginFishing(g).ok,false);g.progress.outdoors.rod=true;
 g.cottage.ride=1;assert.equal(beginFishing(g).ok,false);g.cottage.ride=null;
 assert.equal(deployCamp(g).ok,false);const water=mineFishingShore(g).water;Object.assign(g.player,water);assert.equal(beginFishing(g).ok,false);Object.assign(g.player,MINING.home);assert.equal(beginFishing(g).ok,false);
});
test('地下与地表威胁分离，附近活怪或受伤中断，暂停不推进',()=>{
 const g=scene();g.enemies=[{hp:100,...g.player}];assert.ok(beginFishing(g).ok);
 g.state='paused';const clock=g.fishing.clock;tick(g,1);assert.equal(g.fishing.clock,clock);g.state='playing';
 const l=g.progress.mining;l.animals['0,1']={key:'0,1',kind:'beetle',x:g.player.x,y:g.player.y,hp:48};updateOutdoors(g,.04);assert.equal(g.fishing,null);
 l.animals={};assert.ok(beginFishing(g).ok);g.player.hp--;updateOutdoors(g,.04);assert.equal(g.fishing,null);
});
test('真实主循环抛竿扣一份鱼饵且锁定移动、矿镐和武器，取消后恢复',()=>{
 const g=scene(),origin={x:g.player.x,y:g.player.y},ammo=g.magazines[0].ammo;g.cottage.tool='pick';g.cottage.autoDig=true;cast(g);
 assert.deepEqual({x:g.player.x,y:g.player.y},origin);assert.equal(g.cottage.tool,null);assert.equal(g.cottage.weaponReady,false);assert.equal(g.magazines[0].ammo,ammo);assert.equal(g.progress.outdoors.bait,19);
 const w=g.fishing.water,s=mineSurfaceAt(g.progress.mining,w.x,w.y);assert.ok(s.open&&s.water);for(let i=0;i<8;i++){const q=mineSurfaceAt(g.progress.mining,w.x+Math.cos(i*Math.PI/4)*38,w.y+Math.sin(i*Math.PI/4)*38);assert.ok(q.open&&q.water);}
 fishingControl(g,'cancel');tick(g,.08);assert.ok(g.cottage.weaponReady);
});
test('抛投保存失败不扣饵，换层、离开与重进同层均撤销旧动作',()=>{
 const g=scene();assert.ok(beginFishing(g).ok);fishingControl(g,'press');tick(g,1);g.livingPersist=()=>false;assert.equal(fishingControl(g,'release'),false);assert.equal(g.progress.outdoors.bait,20);assert.equal(g.fishing.phase,'ready');
 g.cottage.depth=2;updateOutdoors(g,0);assert.equal(g.fishing,null);g.cottage.depth=1;
 assert.ok(beginFishing(g).ok);g.cottage={...g.cottage};updateOutdoors(g,0);assert.equal(g.fishing,null);
 assert.ok(beginFishing(g).ok);g.cottage=null;updateOutdoors(g,0);assert.equal(g.fishing,null);
});
test('地下收放线真实上鱼，共用鱼护，失败重试且不重复结算',()=>{
 const g=scene();cast(g);fishingControl(g,'press');
 for(let i=0;i<1600&&g.fishing.phase==='fight';i++){const f=g.fishing;fishingControl(g,'lean',-(f.direction||1));fishingControl(g,f.tension>.7?'release':f.tension<.45?'press':f.reeling?'press':'release');tick(g,.04);}
 assert.equal(g.fishing.phase,'landed');g.livingPersist=()=>false;assert.equal(finishFishing(g,true).ok,false);assert.equal(g.progress.outdoors.caught,0);
 g.livingPersist=()=>true;assert.ok(finishFishing(g,true).ok);assert.equal(g.progress.outdoors.caught,1);assert.equal(Object.values(g.progress.outdoors.fish).reduce((a,b)=>a+b,0),1);assert.equal(finishFishing(g,true).ok,false);
});
