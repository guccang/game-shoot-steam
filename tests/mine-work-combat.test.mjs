// 挖矿迎敌与安全恢复的正式作业循环，隔离用户存档。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {openBasement} from '../src/progression/mining/mining.js';
import {MINING,minePoint,mineKey} from '../src/config/mining.js';
import {mineTerrain} from '../src/config/mine-ecology.js';
import {enterMine,selectMineTool,updateMining,rideMineCart} from '../src/core/mining/mining.js';
import {currentMineLayer} from '../src/core/mining/mine-layers.js';
import {readyMineWeapon,clipMineCombatLine} from '../src/core/mining/mine-combat.js';
import {updateMineWorkCombat} from '../src/core/mining/mine-work-combat.js';
// 开通可控小洞厅，保留实际岩壁、枪械、弹药和矿物事务。
function setup(){
 const p=freshProgress();p.homeDecor.basement=true;openBasement(p.mining);p.mining.seed=1847;
 const g=new Game(p,()=>.5);g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.livingPersist=()=>true;g.cottage={kind:'cottage',floor:0,outside:MINING.home};Object.assign(g.player,MINING.hatch.goal);assert.ok(enterMine(g));
 const l=currentMineLayer(g);for(let y=16;y<=26;y++)for(let x=24;x<=36;x++){l.dug[`${x},${y}`]=l.bridges[`${x},${y}`]=true;}
 Object.assign(g.player,minePoint({x:30,y:20}));g.cottage.scanWait=9999;g.cottage.hurtWait=999;g.magazines[0].ammo=g.weapon().magazineSize;g.magazines[0].remaining=0;return g;
}
// 固定栖地且不主动攻击，实际武器命中仍由正式弹道结算。
function enemy(g,x=32,y=20){const key=`${x},${y}`,a={key,kind:'spore',...minePoint({x,y}),hp:60,maxHp:60,phase:'recover',timer:999,clock:0,death:0};currentMineLayer(g).animals[key]=a;return a;}
// 按正式帧长推动作业与战斗。
function tick(g,n,input={x:0,y:0}){for(let i=0;i<n;i++)updateMining(g,.05,input);}
test('点击挖矿后遇敌用真实弹药击杀，安全后自动恢复矿镐和自动开采',()=>{
 const g=setup();selectMineTool(g,'pick');const target=enemy(g),ammo=g.magazines[0].ammo;tick(g,1);assert.equal(g.cottage.tool,null);assert.equal(g.cottage.combatWork.tool,'pick');assert.ok(g.cottage.weaponReady);assert.equal(g.cottage.dig,null);
 tick(g,100);assert.equal(currentMineLayer(g).animals[target.key].hp,0);assert.ok(g.magazines[0].ammo<ammo);assert.equal(g.cottage.tool,'pick');assert.equal(g.cottage.autoDig,true);assert.equal(g.cottage.combatWork,null);assert.equal(g.cottage.weaponReady,false);
});
test('脱战缓冲与新威胁避免频繁切换，暂停不推进恢复时间',()=>{
 const g=setup();selectMineTool(g,'rail');const target=enemy(g);updateMineWorkCombat(g,.05);target.hp=0;updateMineWorkCombat(g,.5);assert.equal(g.cottage.combatWork.tool,'rail');const age=g.cottage.combatRecovery;
 g.state='paused';tick(g,30);assert.equal(g.cottage.combatRecovery,age);g.state='playing';target.hp=60;updateMineWorkCombat(g,.5);assert.equal(g.cottage.combatRecovery,0);target.hp=0;updateMineWorkCombat(g,1);assert.equal(g.cottage.tool,'rail');assert.ok(g.cottage.autoDig);
});
test('真实岩壁后的怪物和远处怪物不打断挖矿',()=>{
 const g=setup(),l=currentMineLayer(g);let wall;
 for(let y=18;y<=24&&!wall;y++)for(let x=26;x<=34&&!wall;x++){const k=`${x},${y}`;delete l.dug[k];if(clipMineCombatLine(g,minePoint({x:x-1,y}),minePoint({x:x+1,y})).blocked)wall={x,y};else l.dug[k]=true;}
 assert.ok(wall);Object.assign(g.player,minePoint({x:wall.x-1,y:wall.y}));const a=enemy(g,wall.x+1,wall.y);selectMineTool(g,'pick');updateMineWorkCombat(g,.05);assert.equal(g.cottage.tool,'pick');assert.ok(!g.cottage.combatWork);a.x=g.player.x+1000;updateMineWorkCombat(g,.05);assert.ok(!g.cottage.combatWork);
});
test('手动持枪和取消挖矿不会被自动恢复覆盖，换铺轨保留新作业',()=>{
 for(const choice of ['weapon','pick','rail']){const g=setup();selectMineTool(g,'pick');const a=enemy(g);updateMineWorkCombat(g,.05);if(choice==='weapon')readyMineWeapon(g);else selectMineTool(g,choice);a.hp=0;updateMineWorkCombat(g,2);assert.equal(g.cottage.tool,choice==='rail'?'rail':null);assert.ok(!g.cottage.combatWork);}
});
test('登车和钓鱼取消作业恢复，避免稍后自动拿出矿镐',()=>{
 for(const choice of ['ride','fish']){const g=setup();selectMineTool(g,'pick');enemy(g);updateMineWorkCombat(g,.05);if(choice==='ride'){const l=currentMineLayer(g);l.rails[mineKey({x:30,y:20})]=true;l.carts=[{id:1,x:g.player.x,y:g.player.y,heading:1,wheel:0}];assert.ok(rideMineCart(g));}else g.fishing={};updateMineWorkCombat(g,.05);assert.equal(g.cottage.combatWork,null);assert.equal(g.cottage.tool,null);}
});
test('恢复挖矿后能实际开采岩壁，战斗期间不推进挥镐或发放矿物',()=>{
 const g=setup(),l=currentMineLayer(g);let wall;
 for(let y=18;y<=24&&!wall;y++)for(let x=27;x<=33&&!wall;x++)if(!mineTerrain({x,y},l).natural&&!mineTerrain({x:x-1,y},l).prop)wall={x,y};assert.ok(wall);
 const key=mineKey(wall);delete l.dug[key];Object.assign(g.player,minePoint({x:wall.x-1,y:wall.y}));g.cottage.direction=1;selectMineTool(g,'pick');const a=enemy(g,wall.x-2,wall.y);a.hp=a.maxHp=10000;tick(g,3,{x:1,y:0});assert.equal(currentMineLayer(g).dug[key],undefined);assert.equal(g.cottage.dig,null);
 a.hp=0;tick(g,22);assert.equal(g.cottage.tool,'pick');tick(g,35,{x:1,y:0});assert.equal(currentMineLayer(g).dug[key],true);assert.ok(g.progress.production.minedOre>0);
});
