// 专项验证独立演练的真实攻击、场景差异、输入、边界与存档隔离。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshProgress} from '../src/progression/progress.js';
import {createWorkshopTrial} from '../src/core/workshop/workshop-trial.js';
import {WEAPONS} from '../src/config/weapons.js';
import {WEAPON_TRIAL_SCENES,TRIAL_ORIGIN,TRIAL_RADIUS} from '../src/config/weapon-trial-scenes.js';
import {previewWorkshop} from '../src/progression/workshop/workshop.js';
// 场景通过正式工坊工厂创建。
const trial=(index,p=freshProgress())=>createWorkshopTrial(p,'weapons',index,false,{scene:true});
// 小步推进真实战斗，不跳过蓄能、换弹和死亡回收。
function tick(t,seconds,input){for(let n=0;n<Math.ceil(seconds*30);n++)t.advance(1/30,input);}
test('每件武器有明确场景，正式攻击确实命中且不改来源存档',()=>{
 const p=freshProgress(),before=JSON.stringify(p);
 for(let i=0;i<WEAPONS.length;i++){assert.ok(WEAPON_TRIAL_SCENES[WEAPONS[i].id]);const t=trial(i,p);tick(t,12);assert.ok(t.damage>0,WEAPONS[i].id);assert.equal(t.game.kills,0);assert.equal(t.game.drops.length,0);}
 assert.equal(JSON.stringify(p),before);
});
test('纵列、散射、爆破、远距与多向目标存在实际几何差异',()=>{
 const line=trial(1),spread=trial(3),blast=trial(6),long=trial(8),summon=trial(12);
 assert.equal(new Set(line.spec.points.map(p=>p[0])).size,1);
 assert.ok(new Set(spread.spec.points.map(p=>p[0])).size>2);assert.equal(blast.total,6);
 assert.ok(long.targets.every(e=>Math.hypot(e.x-long.spawn.x,e.y-long.spawn.y)>400));
 assert.ok(summon.targets.some(e=>e.x<summon.spawn.x)&&summon.targets.some(e=>e.x>summon.spawn.x));
});
test('输入改变位置与真实动作时钟，不能越出演练边界',()=>{
 const t=trial(0),start=t.game.player.x;tick(t,1,{x:1,y:0});assert.ok(t.game.player.x>start+40);assert.ok(t.game.player.bodyAnimation.moveTime>0);
 tick(t,15,{x:1,y:0});assert.ok(Math.hypot(t.game.player.x-TRIAL_ORIGIN.x,t.game.player.y-TRIAL_ORIGIN.y)<=TRIAL_RADIUS);
});
test('暂停步长不推进；重来重置同一布阵且保留试装部件',()=>{
 const p=freshProgress();p.weaponParts[0].damage=3;const a=trial(0,p),b=trial(0,p);
 tick(a,1);const old=JSON.stringify([a.elapsed,a.game.player,a.game.enemies,a.game.magazines]);a.advance(0,{x:1,y:0});assert.equal(JSON.stringify([a.elapsed,a.game.player,a.game.enemies,a.game.magazines]),old);
 assert.equal(b.elapsed,0);assert.equal(a.game.weapon().parts.damage,b.game.weapon().parts.damage);
});
test('电锯演练有真实树木，正式命中会结算采伐',()=>{
 const t=trial(14),tree=t.game.trees[0];assert.ok(tree);t.game.hit(tree,1e6,false,{weaponIndex:14});assert.equal(t.treesCut,1);assert.equal(tree.hp<=0,true);
});
test('引力场可以真正拉动分散目标，不会每帧固定回原位',()=>{
 const t=trial(17),before=t.targets.map(e=>({x:e.x,y:e.y}));tick(t,5);
 assert.ok(t.targets.some((e,i)=>Math.hypot(e.x-before[i].x,e.y-before[i].y)>20));assert.ok(t.game.gravityFields.length>0||t.damage>0);
});
test('清空整组目标后保留死亡间隔再继续演练，不补满弹匣或重置计时',()=>{
 const t=trial(0);tick(t,.5);t.game.magazines[0].ammo=3;const elapsed=t.elapsed,batch=t.batch;
 for(const e of [...t.game.enemies])t.game.hit(e,1e6);tick(t,.1);
 assert.equal(t.batch,batch);assert.equal(t.game.enemies.length,0);assert.ok(t.refillRemaining>1);tick(t,1.2);
 assert.equal(t.batch,batch+1);assert.ok(t.elapsed>elapsed);assert.ok(t.game.magazines[0].ammo<=3);assert.ok(t.destroyed>=t.total);
});
test('载具进入同一独立场景，主炮和无炮电动车仍各自工作',()=>{
 for(const index of [0,2,5]){const p=previewWorkshop(freshProgress(),'vehicle',index).progress,t=createWorkshopTrial(p,'vehicle',index,false,{scene:true});tick(t,10);assert.equal(t.game.vehicle.active,true);assert.ok(t.damage>0);}
});
