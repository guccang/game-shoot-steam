// 尾怪显示只读正式状态；覆盖门槛、混合怪、循环地图、镜头及边缘避让。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {waveDifficulty} from '../src/config/waves.js';
import {BOSS_CLEARING} from '../src/config/settlements.js';
import {waveTailTargets} from '../src/core/battle/wave-tail-targets.js';
import {projectTailTarget,placeTailMarker} from '../src/ui/wave-tail-navigation.js';
import {WAVE_TAIL_NAVIGATION as STYLE} from '../src/config/wave-tail-navigation.js';
// 使用正式清缴场与真实计数，目标测试不绕过安全区要求。
function scene(){const g=new Game(freshProgress(),()=>.5);g.start();g.progress.living.patrolActive=true;Object.assign(g.player,BOSS_CLEARING);g.wave=5;g.waveWarning=0;g.bossWave=6;g.waveKills=waveDifficulty(5).total-3;g.enemies=[];return g;}
// 构造可计数普通怪与独立玩法怪，保持每个目标的稳定身份。
function enemy(id,x=1900,extra={}){return {id,x,y:400,hp:20,radius:20,type:'enemy',mapId:'forest',wave:5,...extra};}
test('仅最后三个名额开始提示，清波和专属战斗立即隐藏',()=>{
 const g=scene();g.enemies=[enemy(1)];assert.equal(waveTailTargets(g).length,1);
 g.waveKills--;assert.deepEqual(waveTailTargets(g),[]);g.waveKills++;
 for(const [key,value] of [['waveWarning',1],['waveRest',1],['bossReady',true],['boss',{}],['story',{}],['realm',{}],['state','paused'],['fireRescue',{phase:'active'}],['workshopTrial',{}]]){const old=g[key];g[key]=value;assert.deepEqual(waveTailTargets(g),[],key);g[key]=old;}
 g.waveKills=waveDifficulty(g.wave).total;assert.deepEqual(waveTailTargets(g),[]);
});
test('随机怪可清波，最多选剩余名额个最近目标；排除死亡、援军和任务怪',()=>{
 const g=scene();g.enemies=[enemy(1,2300),enemy(2,1850,{ambient:true,wave:0}),enemy(3,2000),enemy(4,1601,{hp:0}),enemy(5,1602,{livingRequest:'test'}),enemy(6,1603,{bossOwner:1}),enemy(7,1604,{fireEvent:true}),enemy(8,1605,{mapId:'elsewhere'})];
 assert.deepEqual(waveTailTargets(g).map(t=>t.enemy.id),[2,3,1]);g.waveKills++;assert.deepEqual(waveTailTargets(g).map(t=>t.enemy.id),[2,3]);
 const before=JSON.stringify(g.enemies);waveTailTargets(g);assert.equal(JSON.stringify(g.enemies),before);
});
test('安全营地和离开清缴场不保留旧箭头',()=>{const g=scene();g.enemies=[enemy(1)];for(const p of [{x:700,y:700},{x:2800,y:2400}]){Object.assign(g.player,p);assert.deepEqual(waveTailTargets(g),[]);}});
test('正式镜头投影含缩放与循环边界，身体露出屏幕即隐藏提示',()=>{
 const view={x:3300,y:100,w:600,h:1000,zoom:.5};
 assert.deepEqual(projectTailTarget(enemy(1,10),view),{x:155,y:150,visible:true});
 assert.equal(projectTailTarget(enemy(1,650),view).visible,false);
 assert.equal(projectTailTarget(enemy(1,3910),view).visible,true);
 assert.equal(projectTailTarget(enemy(1,3960),view).visible,false);
 const g=scene();g.mapId='other';g.player.x=3590;g.enemies=[enemy(1,10,{mapId:'other'})];assert.equal(waveTailTargets(g)[0].distance,20);
});
test('四向箭头和距离牌完整位于320/390/桌面边缘，多个提示错开',()=>{
 for(const w of [320,390,560]){const h=900,targets=[{x:w+300,y:h/2,angle:90},{x:-300,y:h/2,angle:-90},{x:w/2,y:-300,angle:0},{x:w/2,y:h+300,angle:180}];
 for(const t of targets){const p=placeTailMarker(t,w,h);assert.ok(Math.abs((p.angle-t.angle+360)%360)<1e-8);assert.ok(p.x>=STYLE.width/2&&p.x<=w-STYLE.width/2);assert.ok(p.y>=STYLE.height/2&&p.y<=h-STYLE.height/2);}
 const occupied=[{left:0,top:0,right:w,bottom:240},{left:w-80,top:250,right:w,bottom:850}];
 for(let i=0;i<3;i++){const p=placeTailMarker({x:w+300,y:100},w,h,occupied);assert.ok(p);const b={left:p.x-28,right:p.x+28,top:p.y-27,bottom:p.y+27};assert.ok(occupied.every(o=>b.right<=o.left||b.left>=o.right||b.bottom<=o.top||b.top>=o.bottom));occupied.push(b);}
 assert.equal(placeTailMarker({x:1000,y:1000},w,h,[{left:0,top:0,right:w,bottom:h}]),null);
 }
});
