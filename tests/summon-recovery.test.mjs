// 正式召唤物观察、恢复目标与高速追赶回归，不连接存档。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { freshProgress } from '../src/progression/progress.js';
import { updateMechanical,resetMechanicalFormation,hurtMechanical } from '../src/combat/mechanical.js';
import { updateSpider } from '../src/combat/spider.js';
import { updateFunnel,resetFunnelFormation } from '../src/combat/funnel.js';
import { WORLD,worldDistance } from '../src/world/coordinates.js';
// 开放场地保留正式索敌、供给和飞控，仅隔离随机刷怪。
function arena(index=15){const p=freshProgress();p.weapons.fill(1);p.weapon=index;p.weaponParts[index].coordination=8;const g=new Game(p,()=>.5);g.state='playing';g.enemies=[];g.trees=[];g.boss=null;Object.assign(g.player,{x:2000,y:2000,arena:{x:2000,y:2000,radius:5000}});g.setViewport(390,844);g.arrivalView={width:390,height:844,left:-220,right:220,top:-260,bottom:260};return g;}
// 使用真实模块推进，避免测试修改运行态内部观察计时。
function step(g,seconds,dt=1/60){for(let i=0;i<Math.round(seconds/dt);i++)tick(g,dt);}
// 四类召唤武器走各自正式更新入口。
function tick(g,dt){if(g.weapon().controller==='mechanical')updateMechanical(g,dt);else if(g.weapon().controller==='spider')updateSpider(g,dt);else updateFunnel(g,dt);}
// 目标实际移出镜头，不用删除对象冒充丢失视野。
function target(g){const t=g.spawnEnemy(0,0,{x:2100,y:2000});Object.assign(t,{hp:1e7,maxHp:1e7,speed:0,damage:0});return t;}
for(const index of [12,13,15,16])test(`武器 ${index} 出屏停留、不盲打、重入恢复、再丢失自然归队`,()=>{
 const g=arena(index);step(g,25);const enemy=target(g);step(g,1);const s=g[g.weapon().controller],n=index===16?s.mother:s.nodes.find(n=>n.targetId===enemy.id);assert.ok(n,'应锁定可见目标');
 const angle=n.angle;enemy.x=2500;tick(g,1/60);assert.ok(n.observation,'出屏应观察');assert.equal(n.targetId,null);assert.equal(n.angle,angle);const hp=enemy.hp;step(g,.2);assert.equal(enemy.hp,hp);assert.ok(n.observation);
 enemy.x=2100;tick(g,1/60);assert.equal(n.observation,undefined);assert.equal(n.targetId,enemy.id);
 enemy.x=2500;tick(g,1/60);step(g,1.1);assert.equal(n.observation,undefined);assert.notEqual(n.mode||n.flight.mode,'observe');
});
test('目标死亡、收起、非战斗取消观察；观察不推进攻击或重置供给',()=>{
 const g=arena();step(g,25);const t=target(g);step(g,.5);t.x=2500;tick(g,1/60);const n=g.mechanical.nodes.find(n=>n.observation);assert.ok(n);const energy=structuredClone(g.magazines[15]);t.hp=0;tick(g,1/60);assert.equal(n.observation,undefined);assert.deepEqual(g.magazines[15],energy);
 t.hp=1000;t.x=2100;step(g,.2);t.x=2500;tick(g,1/60);resetMechanicalFormation(g.mechanical);assert.ok(g.mechanical.nodes.every(n=>!n.observation&&!n.catchingUp));
});
for(const index of [15,16])for(const dt of [1/30,1/120])test(`武器 ${index} 高速转弯追赶，无瞬移或掉队 dt=${dt}`,()=>{
 const g=arena(index);g.arrivalView=null;step(g,45);const s=g[g.weapon().controller],nodes=[...(s.mother?[s.mother]:[]),...s.nodes.filter(n=>n.active&&n.hp>0)];assert.ok(nodes.length>=10);let maxStep=0,maxGap=0;
 for(let i=0;i<Math.round(8/dt);i++){const direction=i*dt<4?0:Math.PI/2;g.player.x+=Math.cos(direction)*360*dt;g.player.y+=Math.sin(direction)*360*dt;const before=nodes.map(n=>({...n}));tick(g,dt);nodes.forEach((n,j)=>{maxStep=Math.max(maxStep,worldDistance(n,before[j]));maxGap=Math.max(maxGap,worldDistance(n,g.player));});}
 assert.ok(maxStep<900*dt,`单步 ${maxStep}`);assert.ok(maxGap<390,`最大落后 ${maxGap}`);step(g,4,dt);assert.ok(nodes.every(n=>worldDistance(n,g.player)<250));assert.ok(nodes.every(n=>!n.catchingUp));
});
test('观察中的伙伴在主人拉远后立刻改为追赶，死亡不遗留观察状态',()=>{
 const g=arena();step(g,25);const t=target(g);step(g,.5);t.x=2500;tick(g,1/60);const n=g.mechanical.nodes.find(n=>n.observation);assert.ok(n);g.player.x-=400;tick(g,1/60);assert.equal(n.observation,undefined);assert.ok(n.catchingUp);hurtMechanical(g,n,n.hp);assert.equal(n.catchingUp,undefined);
});

for(const index of [12,13,15,16])test(`武器 ${index} 暂停冻结观察，恢复后结束等待；零时长不推进`,()=>{
 const g=arena(index);step(g,25);const t=target(g);step(g,.3);t.x=2500;tick(g,1/60);const s=g[g.weapon().controller],n=index===16?s.mother:s.nodes.find(n=>n.observation);assert.ok(n.observation);const remaining=n.observation.remaining;g.pause();g.update(1,{x:1,y:0});assert.equal(n.observation.remaining,remaining);tick(g,0);assert.equal(n.observation.remaining,remaining);g.pause();step(g,1);assert.equal(n.observation,undefined);
});
for(const index of [12,13])test(`飞行武器 ${index} 低动态观察不瞬间折返、补给与收起优先`,()=>{
 const g=arena(index);if(index===12)g.progress.funnelLoadout[0]=0;g.reducedMotion=true;step(g,1);const t=target(g);step(g,.2);const s=g[g.weapon().controller],n=s.nodes[0],before={x:n.x,y:n.y};t.x=2500;tick(g,1/60);assert.ok(n.observation);assert.ok(Math.hypot(n.x-before.x,n.y-before.y)<1);
 if(index===12)n.magazine.remaining=1;else g.magazines[index].remaining=1;tick(g,1/60);assert.equal(n.observation,undefined);resetFunnelFormation(s);assert.ok(s.nodes.every(n=>!n.observation));
});
test('循环地图接缝保持最短距离，高速归队不误判为整张地图掉队',()=>{
 const g=arena();g.player.x=WORLD.width-30;g.player.arena=null;g.trees=[];g.mechanical.follow={x:WORLD.width-2,y:g.player.y,speed:180,heading:0,blend:0,idle:0};g.player.x=2;tick(g,1/60);assert.ok(g.mechanical.follow.speed<300);assert.ok(g.mechanical.nodes.filter(n=>n.ready).every(n=>!n.catchingUp));
});

test('落后的猫即使旧敌仍可见也先追赶，不因追赶补弹或重置冷却',()=>{
 const g=arena();step(g,25);const t=target(g);step(g,.2);const n=g.mechanical.nodes[0];n.x=g.player.x-350;n.y=g.player.y;n.cooldown=.9;const energy=structuredClone(g.magazines[15]);tick(g,1/60);assert.ok(n.catchingUp);assert.equal(n.targetId,null);assert.ok(n.moving);assert.ok(n.cooldown>.8&&n.cooldown<.9);assert.deepEqual(g.magazines[15],energy);assert.ok(t.hp>0);
});
