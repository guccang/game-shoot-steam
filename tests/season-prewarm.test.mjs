// 战斗优先预算与有界缓存回归；可控时钟验证慢帧退避，不拿单测代替真机帧率。
import test from 'node:test';
import assert from 'node:assert/strict';
import {SeasonPrewarmScheduler,seasonPrewarmCombat} from '../src/platform/season-prewarm.js';
import {SeasonGroundCache} from '../src/rendering/season-ground-cache.js';
import {GroundCache} from '../src/rendering/ground-cache.js';
import {SEASON_FADE_DURATION} from '../src/world/season-transition.js';
import {freshProgress} from '../src/progression/progress.js';
import {clearingSite} from '../src/progression/story/clearing-site.js';
const view={x:400,y:280,w:240,h:240};
// 使用可释放的轻量像素对象模拟已构建地块；正式浏览器仍使用原生成器。
function fill(pool){for(const key of pool.desired)pool.publish({day:{width:388,height:388},night:{width:388,height:388}},{key});pool.pending=[];}
// 准备完整当前季节和未完成冬季，避免用初次加载混淆换季。
function fixture(){const cache=new SeasonGroundCache(),env={forestSeason:'summer',calendarActive:true,livingSeasonRemaining:100000};cache.update(env,view,0);fill(cache.current);env.forestSeason='winter';cache.update(env,view,1);return {cache,env};}

test('战斗、低帧率和忙帧没有预热预算，连续稳定500ms后恢复且最多1ms',()=>{
 const p=new SeasonPrewarmScheduler();assert.equal(p.begin({now:0,elapsed:.016,combat:true}),false);assert.equal(p.budget(2,0),0);
 assert.equal(p.begin({now:499,elapsed:.016}),false);assert.equal(p.begin({now:500,elapsed:.016}),true);assert.equal(p.budget(2,500),1);
 assert.equal(p.begin({now:520,elapsed:.021}),false);assert.equal(p.reason,'slow-frame');assert.equal(p.budget(1,520),0);
 p.begin({now:1100,elapsed:.016});assert.equal(p.budget(11,1100),0);assert.equal(p.reason,'busy-frame');
 assert.equal(p.begin({now:1599,elapsed:.016}),false);assert.equal(p.begin({now:1600,elapsed:.016}),true);
 p.record(3,1600);p.begin({now:1800,elapsed:.030});assert.equal(p.begin({now:2599,elapsed:.016}),false);assert.equal(p.begin({now:2600,elapsed:.016}),true);
 assert.equal(p.begin({now:2700,elapsed:.016,hidden:true}),false);
});

test('任务、兽潮、清缴和近敌都暂停预热，暂停菜单和远敌允许等待空闲',()=>{
 const g={state:'playing',mapId:'forest',progress:freshProgress(),player:{x:400,y:280},enemies:[]};
 assert.equal(seasonPrewarmCombat(g),false);
 for(const key of ['boss','livingBattle','story','realm','fireActive','workshopTrial']){g[key]={};assert.equal(seasonPrewarmCombat(g),true,key);g[key]=null;}
 g.campDefense={phase:'rest'};assert.equal(seasonPrewarmCombat(g),true);g.campDefense={phase:'result'};assert.equal(seasonPrewarmCombat(g),false);g.campDefense=null;
 const home={...g.player};g.progress.living.patrolActive=true;g.player={...clearingSite(g.progress)};assert.equal(seasonPrewarmCombat(g),true);g.progress.living.patrolActive=false;g.player=home;
 g.enemies=[{x:500,y:280,hp:20}];assert.equal(seasonPrewarmCombat(g),true);g.enemies[0].x=2000;assert.equal(seasonPrewarmCombat(g),false);
 g.player.x=20;g.enemies[0].x=10790;assert.equal(seasonPrewarmCombat(g),true);g.state='paused';assert.equal(seasonPrewarmCombat(g),false);
});

test('下一季不能申请保底或借用当前地面预算，当前任务优先且后台只走一步',()=>{
 const {cache}=fixture();assert.equal(cache.needsWarmup(),false);let clock=0,currentBudget,background=[];
 cache.current.advance=budget=>{currentBudget=budget;clock+=.25;};cache.staged.advance=(...args)=>background.push(args);
 cache.advance(.75,()=>clock,0);assert.equal(currentBudget,.75);assert.equal(background.length,0);
 cache.advance(2,()=>clock,1);assert.equal(currentBudget,2);assert.equal(background[0][0],.75);assert.equal(background[0][2],1);
 cache.setPrewarmPolicy(false,'combat');cache.advance(2,()=>clock,1);assert.equal(background.length,1);assert.equal(cache.backgroundMs,0);
 cache.setPrewarmPolicy(true);cache.current.advance=()=>{clock+=3;};cache.advance(2,()=>clock,1);assert.equal(background.length,1);
});

test('忙帧保留旧季节与预制纹理，就绪也不在战斗中启动渐变，恢复时重验移动视野',()=>{
 const {cache,env}=fixture();fill(cache.staged);const old=cache.current,staged=cache.staged,oldTile=[...old.tiles.values()][0];
 cache.setPrewarmPolicy(false,'combat');const moved={...view,x:3000};cache.update(env,moved,2);assert.equal(cache.current,old);assert.equal(cache.staged,staged);assert.equal(oldTile.day.width,388);
 cache.setPrewarmPolicy(true);cache.update(env,moved,1000);assert.equal(cache.current,old);fill(cache.current);fill(cache.staged);cache.update(env,moved,1001);assert.equal(cache.commits,1);
 cache.setPrewarmPolicy(false,'combat');cache.update(env,moved,1001+SEASON_FADE_DURATION);assert.equal(cache.source,null);assert.equal(oldTile.day.width,1);assert.equal(cache.stats().seasonStaging.pools,1);
});

test('连续100次切季不积累旧纹理，取消、换图和销毁释放工作画布',()=>{
 const {cache,env}=fixture();let expectedBytes;
 for(let i=0;i<100;i++){
  env.forestSeason=i%2?'summer':'winter';const now=100+i*(SEASON_FADE_DURATION+10);cache.update(env,view,now);fill(cache.current);fill(cache.staged);
  const old=[...cache.current.tiles.values()];cache.update(env,view,now+1);assert.equal(cache.stats().seasonStaging.pools,2);
  cache.update(env,view,now+1+SEASON_FADE_DURATION);assert.ok(old.every(t=>t.day.width===1&&t.night.width===1));
  const stats=cache.stats();expectedBytes??=stats.bytes;assert.equal(stats.bytes,expectedBytes);assert.equal(stats.seasonStaging.pools,1);assert.ok(stats.seasonStaging.events.length<=24);
 }
 env.forestSeason='winter';cache.update(env,view,2000000);fill(cache.staged);const discarded=[...cache.staged.tiles.values()];
 env.forestSeason='summer';cache.update(env,view,2000001);assert.ok(discarded.every(t=>t.day.width===1));assert.equal(cache.staged,null);
 cache.setMap('jiuzhaigou');assert.equal(cache.stats().bytes,0);cache.dispose();assert.equal(cache.stats().pendingBytes,0);
});

test('底层步数上限只执行一次生成器推进，取消时仍归还未完成任务',()=>{
 const cache=new GroundCache();let steps=0,closed=false;
 // 记录生成器真实推进次数，验证限额不只停在调度接口。
 function* work(){try{while(true){steps++;yield;}}finally{closed=true;}}
 cache.work={spec:{key:'0:0'},steps:work(),surfaces:new Set(),ms:0};cache.advance(2,()=>0,1);assert.equal(steps,1);cache.dispose();assert.equal(closed,true);
});
