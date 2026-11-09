// 地下飞行炮体靠边稳定性回归，使用真实岩壁和正式战斗适配。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {openBasement,normalizeMining} from '../src/progression/mining/mining.js';
import {MINING,minePoint,mineKey} from '../src/config/mining.js';
import {mineAnimalStats,mineThreatLimit,mineTerrain} from '../src/config/mine-ecology.js';
import {currentMineLayer} from '../src/core/mining/mine-layers.js';
import {freshMineLayer} from '../src/progression/mining/mine-layers.js';
import {enterMine,leaveMine,updateMining} from '../src/core/mining/mining.js';
import {hitMineAnimal,readyMineWeapon,updateMineCombat,clipMineCombatLine} from '../src/core/mining/mine-combat.js';
import {projectMineFlyingPoint,constrainMineFlyingNode,resetMineCombat} from '../src/core/mining/mine-combat.js';
import {updateFunnelMovement} from '../src/combat/funnel-movement.js';
import {FUNNEL_FOLDED,FUNNEL_OPEN,FUNNEL_CHARGING} from '../src/combat/funnel.js';
import {WEAPONS} from '../src/config/weapons.js';
import {mineOccupancy} from '../src/physics/mine-motion.js';
import {launchGrenade,explodeGrenade} from '../src/combat/grenades.js';
import {emitWeaponAttack} from '../src/combat/weapon-fire.js';
import {updateBallistics} from '../src/combat/ballistics.js';
// 只布置矿洞测试场地，所有射击、耗弹、伤害和怪物行为使用正式运行入口。
function setup(index=0,loadout=null){
 const p=freshProgress();p.homeDecor.basement=true;openBasement(p.mining);p.mining.seed=1847;p.weapon=index;p.weapons[index]=1;if(loadout)p.funnelLoadout=loadout;
 const g=new Game(p,()=>.5);g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.livingPersist=()=>true;
 g.cottage={kind:'cottage',floor:0,outside:MINING.home};Object.assign(g.player,MINING.hatch.goal);assert.ok(enterMine(g));
 const l=currentMineLayer(g);for(let y=16;y<=26;y++)for(let x=24;x<=36;x++){l.dug[mineKey({x,y})]=true;l.bridges[mineKey({x,y})]=true;}
 Object.assign(g.player,minePoint({x:30,y:20}));g.cottage.scanWait=9999;g.magazines[index].ammo=g.weapon().magazineSize;g.magazines[index].remaining=0;return g;
}
// 标准怪出生点即归巢点，避免无效字符串坐标掩盖真实移动。
function animal(g,cell={x:32,y:20},kind='spore',hp=60){const key=mineKey(cell),a={key,kind,...minePoint(cell),hp,maxHp:hp,respawn:0,clock:0,walk:0,phase:'recover',timer:999,death:0};currentMineLayer(g).animals[key]=a;return a;}
// 按正式 20Hz 步长推进，不调用地表战斗。
function tick(g,n){for(let i=0;i<n;i++)updateMining(g,.05,{x:0,y:0});}

// 取真实种子岩壁作隔墙夹具，避免伪造地形或把水面当墙。
function wallSetup(index=0,loadout=null){
 const g=setup(index,loadout),l=currentMineLayer(g);let found;
 for(let y=18;y<=24&&!found;y++)for(let x=26;x<=34&&!found;x++){const key=mineKey({x,y});delete l.dug[key];const a=minePoint({x:x-1,y}),z=minePoint({x:x+1,y});if(clipMineCombatLine(g,a,z).blocked)found={x,y};else l.dug[key]=true;}
 assert.ok(found,'必须找到真实岩壁');Object.assign(g.player,minePoint({x:found.x-1,y:found.y}));const target=animal(g,{x:found.x+1,y:found.y},'spore',1000);
 updateMineCombat(g,0);return {g,target,b:g.cottage.combat};
}

test('持续向岩壁推动时不再跨墙后回弹14单位',()=>{
 const {g,b}=wallSetup(12),p=g.player,hit=clipMineCombatLine(g,p,{x:p.x+128,y:p.y});
 assert.ok(hit.blocked);const node={x:Math.max(0,hit.x-p.x-14),y:0,flight:{vx:30,vy:0}};
 let largestBackstep=0;
 for(let i=0;i<240;i++){const before=node.x;node.x+=.5;b.constrainFlyingNode(node);largestBackstep=Math.max(largestBackstep,before-node.x);}
 assert.ok(largestBackstep<.1,'边缘回弹 '+largestBackstep);
});

test('边缘投影连续且幂等，沿边速度保留，向外速度被消除',()=>{
 const {g}=wallSetup(12),hit=clipMineCombatLine(g,g.player,{x:g.player.x+128,y:g.player.y}),limit=hit.x-g.player.x-MINING.flyingMargin;
 const safe=projectMineFlyingPoint(g,{x:limit+2,y:0}),again=projectMineFlyingPoint(g,safe);
 assert.ok(Math.abs(safe.x-again.x)<.05);assert.ok(Math.abs(safe.x-limit)<.05);
 const n={x:limit+2,y:0,flight:{vx:30,vy:15}};constrainMineFlyingNode(g,n);
 assert.ok(Math.abs(n.flight.vx)<.001);assert.equal(n.flight.vy,15);
});
test('矿区四边和窄通道共用提前余量，不穿墙且打开边缘后立即释放',()=>{
 const g=setup(12),l=currentMineLayer(g),p=g.player;
 l.bounds={left:p.x-24,right:p.x+24,top:p.y-24,bottom:p.y+24};
 for(const d of [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}]){
  const n=projectMineFlyingPoint(g,{x:d.x*100,y:d.y*100});assert.ok(Math.abs(Math.hypot(n.x,n.y)-10)<.05);assert.ok(mineOccupancy(g,p.x+n.x,p.y+n.y,0,true));
 }
 const before=projectMineFlyingPoint(g,{x:100,y:0});l.bounds.right+=200;assert.ok(projectMineFlyingPoint(g,{x:100,y:0}).x>before.x+50);
});
test('完整环绕连续运行不出现14单位拉回，目标和炮体均在已开通空间',t=>{
 const {g,b}=wallSetup(12);g.progress.mining.animals={};let maxStep=0;
 const forms={folded:FUNNEL_FOLDED,open:FUNNEL_OPEN,charging:FUNNEL_CHARGING};
 for(let i=0;i<1200;i++){
  const before=g.funnel.nodes.map(n=>({x:n.x,y:n.y}));
  updateFunnelMovement(b,1/120,[null,null,null],forms);
  for(const n of g.funnel.nodes){b.constrainFlyingNode(n);if(i>120)maxStep=Math.max(maxStep,Math.hypot(n.x-before[n.index].x,n.y-before[n.index].y));assert.ok(mineOccupancy(g,g.player.x+n.x,g.player.y+n.y,0,true));}
 }
 assert.ok(maxStep<8,'连续环绕跳变 '+maxStep);t.diagnostic('120Hz最大位移 '+maxStep);
});
test('靠墙充能的实际泊位和飞行目标一致，普通及低动态都能完成外挂装填',()=>{
 for(const reduced of [false,true]){
  const {g}=wallSetup(12,[0,0,0]);g.progress.mining.animals={};g.reducedMotion=reduced;
  const l=currentMineLayer(g),p=g.player;l.bounds={left:p.x-90,right:p.x+90,top:p.y-24,bottom:p.y+90};
  for(const m of g.magazines[12].modules){m.ammo=0;m.remaining=.3;}
  for(let i=0;i<600&&g.magazines[12].modules.some(m=>m.remaining>0);i++)updateMineCombat(g,1/60);
  assert.ok(g.magazines[12].modules.every(m=>m.remaining===0&&m.ammo>0),'装填卡住 '+JSON.stringify(g.magazines[12].modules));
 }
});
test('低动态与无人机使用同一地下边界，暂停不推进飞行或弹药',()=>{
 for(const index of [12,13]){
  const {g}=wallSetup(index);g.reducedMotion=true;tick(g,10);
  for(const n of g[g.weapon().controller].nodes)assert.ok(mineOccupancy(g,g.player.x+n.x,g.player.y+n.y,0,true));
  const before=JSON.stringify(g[g.weapon().controller]);g.state='paused';tick(g,20);assert.equal(JSON.stringify(g[g.weapon().controller]),before);
 }
});

test('玩家大幅换位或重建飞控后丢弃旧锚点，不拉回旧位置',()=>{
 const {g,b}=wallSetup(12),n=g.funnel.nodes[0];b.constrainFlyingNode(n);
 Object.assign(g.player,minePoint({x:34,y:24}));n.x=0;n.y=-20;b.constrainFlyingNode(n);
 assert.ok(Math.hypot(n.x,n.y)<30);assert.ok(mineOccupancy(g,g.player.x+n.x,g.player.y+n.y,0,true));
 resetMineCombat(g);const fresh=g.funnel.nodes[0];fresh.x=0;fresh.y=-10;constrainMineFlyingNode(g,fresh);assert.ok(Math.hypot(fresh.x,fresh.y)<20);
});
