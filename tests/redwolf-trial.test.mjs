// 红狼试驾必须使用自己的主炮；正式活动检查点不能接管临时场景或消耗存档。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {previewWorkshop} from '../src/progression/workshop.js';
import {createWorkshopTrial} from '../src/core/workshop-trial.js';
import {storyPostApproach,storyPostForChapter} from '../src/core/story-posts.js';
import {STORY_ID} from '../src/config/story.js';

test('红狼击毁残血靶保留真实飘字和死亡动作，等待后才生成新一组满血靶',()=>{
 const p=freshProgress(),before=JSON.stringify(p),t=createWorkshopTrial(p,'vehicle',6,false,{scene:true}),g=t.game,targets=[...t.targets];
 // 预置残血只覆盖击毁回归；默认耐久与首炮掉血由下一项检查。
 for(const e of targets)e.hp=240;
 for(let i=0;i<150&&t.destroyed===0;i++)t.advance(1/30);
 assert.equal(t.destroyed,6);assert.equal(t.damage,1440);assert.ok(targets.every(e=>e.hp<=0));
 assert.equal(t.batch,1);assert.equal(g.enemies.length,0);assert.equal(g.remnants.length,6);
 assert.ok(g.numbers.some(n=>n.text==='560'));assert.ok(g.numbers.some(n=>n.text==='364'));
 const wait=t.refillRemaining;t.advance(0);assert.equal(t.refillRemaining,wait);
 for(let i=0;i<24;i++)t.advance(1/30);
 assert.equal(t.batch,1);assert.equal(g.enemies.length,0);
 for(let i=0;i<14;i++)t.advance(1/30);
 assert.equal(t.batch,2);assert.equal(g.remnants.length,0);assert.ok(g.enemies.every(e=>e.hp===e.maxHp));
 assert.ok(g.enemies.every(e=>!targets.includes(e)));assert.equal(g.kills,0);assert.equal(g.drops.length,0);assert.equal(JSON.stringify(p),before);
});

test('红狼对未被秒杀的目标造成直接伤害和范围伤害，血量不会每帧复原',()=>{
 const t=createWorkshopTrial(freshProgress(),'vehicle',6,false,{scene:true}),g=t.game;
 assert.ok(t.targets.every(e=>e.hp===1200&&e.maxHp===1200));
 for(let i=0;i<150&&t.damage===0;i++)t.advance(1/30);
 assert.equal(t.destroyed,0);assert.ok(t.targets.some(e=>e.hp===640));assert.ok(t.targets.some(e=>e.hp===836));
 assert.equal(g.numbers.length,6);assert.equal(g.remnants.length,0);
 const hp=t.targets.map(e=>e.hp);for(let i=0;i<10;i++)t.advance(1/30);
 assert.ok(t.targets.every((e,i)=>e.hp<=hp[i]));assert.equal(t.batch,1);
 const other=createWorkshopTrial(freshProgress(),'vehicle',0,false,{scene:true});assert.equal(other.spec.hp,240);
});

// 仅通过正式弹道推进，至少经过一轮主炮装填和真实爆炸。
function verifyTrial(progress){
 const before=JSON.stringify(progress),p=previewWorkshop(progress,'vehicle',6).progress;
 const t=createWorkshopTrial(p,'vehicle',6,false,{scene:true}),g=t.game;
 assert.equal(g.vehicle.index,6);assert.equal(g.vehicle.weaponIndex,21);
 assert.ok(!g.story);assert.ok(!g.campDefense);assert.equal(g.fireActive,false);assert.equal(g.fireTransit,false);
 for(let i=0;i<180;i++)t.advance(1/30);
 assert.ok(t.damage>2380,'主炮装填后应继续命中耐久靶');
 assert.equal(g.vehicle.index,6);assert.equal(JSON.stringify(progress),before,'试驾不能改变正式进度');
 return t;
}

test('红狼购买前和升级后均能试驾开火、爆破、装填及重新索敌',()=>{
 const p=freshProgress();verifyTrial(p);p.vehicleHulls[6]=5;p.vehicleWeapons[21]=5;p.turretParts[21].damage=5;verifyTrial(p);
});

test('待续剧情不会把红狼试驾替换为剧情借用装备',()=>{
 const p=freshProgress();p.restoration.repaired=['story'];const g=new Game(p,()=>.5);g.start();
 Object.assign(g.player,storyPostApproach(storyPostForChapter(g,STORY_ID)));assert.ok(g.enterStory());
 assert.ok(g.progress.story.run);verifyTrial(g.progress);
});

test('消防转场检查点不会截断红狼试驾的攻击更新',()=>{
 const p=freshProgress();p.restoration.repaired=['fire'];const g=new Game(p,()=>.4);g.start();
 assert.ok(g.requestFireRescue());assert.ok(g.startFireRescue());assert.equal(g.fireTransit,true);
 assert.ok(g.progress.fireDispatch.run);verifyTrial(g.progress);
});
