// 地下真实装备、有限供给、墙体、事务和怪物节奏的针对性回归。
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
import {WEAPONS} from '../src/config/weapons.js';
import {mineOccupancy} from '../src/physics/mine-motion.js';
import {launchGrenade,explodeGrenade} from '../src/combat/grenades.js';
import {emitWeaponAttack} from '../src/combat/weapon-fire.js';
import {updateBallistics} from '../src/combat/ballistics.js';
// 只布置矿洞测试场地，所有射击、耗弹、伤害和怪物行为使用正式运行入口。
function setup(index=0){
 const p=freshProgress();p.homeDecor.basement=true;openBasement(p.mining);p.mining.seed=1847;p.weapon=index;p.weapons[index]=1;
 const g=new Game(p,()=>.5);g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.livingPersist=()=>true;
 g.cottage={kind:'cottage',floor:0,outside:MINING.home};Object.assign(g.player,MINING.hatch.goal);assert.ok(enterMine(g));
 const l=currentMineLayer(g);for(let y=16;y<=26;y++)for(let x=24;x<=36;x++){l.dug[mineKey({x,y})]=true;l.bridges[mineKey({x,y})]=true;}
 Object.assign(g.player,minePoint({x:30,y:20}));g.cottage.scanWait=9999;g.magazines[index].ammo=g.weapon().magazineSize;g.magazines[index].remaining=0;return g;
}
// 标准怪出生点即归巢点，避免无效字符串坐标掩盖真实移动。
function animal(g,cell={x:32,y:20},kind='spore',hp=60){const key=mineKey(cell),a={key,kind,...minePoint(cell),hp,maxHp:hp,respawn:0,clock:0,walk:0,phase:'recover',timer:999,death:0};currentMineLayer(g).animals[key]=a;return a;}
// 按正式 20Hz 步长推进，不调用地表战斗。
function tick(g,n){for(let i=0;i<n;i++)updateMining(g,.05,{x:0,y:0});}

test('默认手枪地下扣真实弹药并击杀，不改变地表敌人和飞弹',()=>{const g=setup(),a=animal(g),ore=g.progress.mining.ore,ammo=g.magazines[0].ammo,enemies=g.enemies,bullets=g.projectiles;tick(g,100);assert.equal(currentMineLayer(g).animals[a.key].hp,0);assert.equal(g.progress.mining.ore,ore+4);assert.ok(g.magazines[0].ammo<ammo);assert.strictEqual(g.enemies,enemies);assert.strictEqual(g.projectiles,bullets);assert.equal(bullets.length,0);assert.ok(g.cottage.weaponReady);assert.equal(g.progress.statistics.codex.monsters['mine:spore'],1);assert.equal(g.progress.statistics.equipment.weapons.pistol.kills,1);});
test('施工遇敌自动持枪，手动拿起武器取消恢复；暂停冻结弹丸和装填',()=>{const g=setup(),a=animal(g),ammo=g.magazines[0].ammo;g.cottage.tool='pick';g.cottage.autoDig=true;tick(g,4);assert.ok(g.magazines[0].ammo<ammo);assert.equal(g.cottage.combatWork.tool,'pick');assert.equal(g.cottage.tool,null);readyMineWeapon(g);assert.equal(g.cottage.combatWork,null);g.state='paused';const before=JSON.stringify({bullets:g.cottage.combat.projectiles,mag:g.magazines[0],age:currentMineLayer(g).age});tick(g,40);assert.equal(JSON.stringify({bullets:g.cottage.combat.projectiles,mag:g.magazines[0],age:currentMineLayer(g).age}),before);});
test('死亡事务替换进度后多目标和重复命中只奖励一次；失败可重试',()=>{const g=setup(),a=animal(g),b=animal(g,{x:31,y:21}),ore=g.progress.mining.ore;hitMineAnimal(g,a,999);hitMineAnimal(g,a,999);hitMineAnimal(g,b,999);assert.equal(g.progress.mining.ore,ore+8);const c=animal(g,{x:30,y:21});g.livingPersist=()=>false;assert.equal(hitMineAnimal(g,c,999),false);assert.equal(c.hp,1);assert.equal(g.progress.mining.ore,ore+8);g.livingPersist=()=>true;hitMineAnimal(g,c,999);assert.equal(g.progress.mining.ore,ore+12);});
test('成长第九层封顶，前两层轻量且受伤的深层怪读档不截回一级血量',()=>{assert.deepEqual(mineAnimalStats('spore',9),mineAnimalStats('spore',1000));assert.deepEqual([1,2,3,5,6,99].map(mineThreatLimit),[2,2,3,3,4,4]);assert.equal(mineAnimalStats('beetle').hp,48);const g=setup();g.progress.mining.layers[2]=freshMineLayer(2,{x:0,y:0},()=>.5);const l=g.progress.mining.layers[2];l.dug['1,0']=true;l.animals['1,0']={key:'1,0',kind:'spore',...minePoint({x:1,y:0}),hp:65,respawn:0};assert.equal(normalizeMining(g.progress.mining).layers[2].animals['1,0'].hp,65);});
test('近身六怪最多两只同时蓄力，入口会取消蓄力且阻挡已飞孢子伤害',()=>{const g=setup();g.cottage.tool='pick';for(let i=0;i<6;i++){const a=animal(g,{x:30+i%3,y:20+Math.floor(i/3)},'spore');a.x=g.player.x+40+i;a.y=g.player.y;a.phase='roam';a.timer=0;}tick(g,1);assert.equal(Object.values(currentMineLayer(g).animals).filter(a=>a.phase==='windup').length,2);Object.assign(g.player,MINING.home);g.cottage.bolts=[{x:g.player.x-1,y:g.player.y,vx:20,vy:0,enemy:true,damage:99,life:2}];const hp=g.player.hp;tick(g,1);assert.equal(g.player.hp,hp);});
test('切层和出矿不携带地下弹道到地表；弹药不会因再进矿洞补满',()=>{const g=setup();animal(g);tick(g,5);const ammo=g.magazines[0].ammo;Object.assign(g.player,MINING.home);assert.ok(leaveMine(g).ok);assert.equal(g.projectiles.length,0);assert.equal(g.magazines[0].ammo,ammo);assert.ok(enterMine(g));assert.equal(g.cottage.combat,undefined);assert.equal(g.magazines[0].ammo,ammo);});
for(const [index,w] of WEAPONS.entries())if(w.attackKind!=='defense')test('已装备 '+w.id+' 使用原攻击类型并能伤害地下怪物',()=>{const g=setup(index),a=animal(g,{x:31,y:20},'spore',10000);const hp=a.hp;tick(g,index===17?320:240);assert.ok(currentMineLayer(g).animals[a.key].hp<hp,w.id+' 没有造成伤害');});

// 取真实种子岩壁作隔墙夹具，避免伪造地形或把水面当墙。
function wallSetup(index=0){
 const g=setup(index),l=currentMineLayer(g);let found;
 for(let y=18;y<=24&&!found;y++)for(let x=26;x<=34&&!found;x++){const key=mineKey({x,y});delete l.dug[key];const a=minePoint({x:x-1,y}),z=minePoint({x:x+1,y});if(clipMineCombatLine(g,a,z).blocked)found={x,y};else l.dug[key]=true;}
 assert.ok(found,'必须找到真实岩壁');Object.assign(g.player,minePoint({x:found.x-1,y:found.y}));const target=animal(g,{x:found.x+1,y:found.y},'spore',1000);
 updateMineCombat(g,0);return {g,target,b:g.cottage.combat};
}
test('隔岩壁不自动索敌，激光、电弧、穿透与弹射不越过岩壁',()=>{for(const index of [0,1,4,8,9,10,11,17]){const {g,target,b}=wallSetup(index),ammo=g.magazines[index].ammo;tick(g,30);assert.equal(g.magazines[index].ammo,ammo);const muzzle={x:g.player.x,y:g.player.y-8};emitWeaponAttack(b,g.weapon(),muzzle,{x:1,y:0},100,false,true,g.magazines[index]);for(let i=0;i<40;i++)updateBallistics(b,.05);assert.equal(currentMineLayer(g).animals[target.key].hp,1000,WEAPONS[index].id+' 穿墙');for(const shot of b.shots)assert.ok(shot.ex<target.x);}});
test('有限备用弹完成装填后不再补弹；护盾吸收地下伤害',()=>{const g=setup();g.progress.vehicleHulls.fill(0);g.progress.supplies.hand.light=3;g.magazines[0].ammo=0;g.magazines[0].remaining=.1;tick(g,5);assert.equal(g.magazines[0].ammo,3);assert.equal(g.progress.supplies.hand.light,0);const h=setup(18),a=animal(h,{x:30,y:20},'beetle');a.x=h.player.x+18;a.phase='windup';a.timer=.05;const hp=h.player.hp,shield=h.magazines[18].ammo;tick(h,2);assert.equal(h.player.hp,hp);assert.ok(h.magazines[18].ammo<shield);});

test('榴弹落点与爆炸范围都受岩壁阻挡',()=>{const {g,target,b}=wallSetup(6),muzzle={x:g.player.x,y:g.player.y-8};launchGrenade(b,g.weapon(),muzzle,b.enemies[0],100);assert.ok(b.projectiles[0].endX<target.x);for(let i=0;i<40;i++)updateBallistics(b,.05);assert.equal(currentMineLayer(g).animals[target.key].hp,1000);explodeGrenade(b,{...muzzle,radius:300,amount:100,impulse:0});assert.equal(currentMineLayer(g).animals[target.key].hp,1000);});
test('矿车座位上的手枪使用实际弹药，车辆方向不被瞄准改写',()=>{const g=setup(),a=animal(g);currentMineLayer(g).carts=[{id:1,x:g.player.x,y:g.player.y,wheel:0,heading:1}];g.cottage.ride=1;g.cottage.direction=1;tick(g,100);assert.equal(currentMineLayer(g).animals[a.key].hp,0);assert.equal(g.cottage.direction,1);assert.ok(g.magazines[0].ammo<g.weapon().magazineSize);});
test('靠墙的飞行炮体停在已开通空间，地面伙伴不穿岩壁',()=>{for(const index of [12,13,15,16]){const {g}=wallSetup(index);tick(g,100);if(index<=13){for(const n of g[g.weapon().controller].nodes)assert.ok(mineOccupancy(g,g.player.x+n.x,g.player.y+n.y,0,true));}else{const state=g[g.weapon().controller];for(const n of [...state.nodes,...(state.mother?[state.mother]:[])].filter(n=>n.ready&&n.hp>0))assert.ok(mineOccupancy(g,n.x,n.y,0,false),'伙伴穿墙');}}});
test('初始手枪应付一层单怪不超过四秒，深层数值不会随装备抬升',t=>{const samples=[];for(const kind of ['beetle','bat','spore']){const g=setup(),stats=mineAnimalStats(kind),a=animal(g,{x:32,y:20},kind,stats.hp);let steps=0;while(currentMineLayer(g).animals[a.key].hp>0&&steps<80){tick(g,1);steps++;}assert.ok(steps<80);samples.push({kind,hp:stats.hp,damage:stats.damage,seconds:steps*.05});}t.diagnostic(JSON.stringify(samples));});
