// 以正式场景对象和农田事务验证驯养、读档、重复触控及收草边界。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {validateProgress} from '../src/progression/progress.js';
import {PEN_OX,PEN_GATE} from '../src/config/pasture.js';
import {wildPastureObjects,interactWildPasture} from '../src/core/wild-pasture.js';
import {tendPasture} from '../src/core/farm-production.js';
import {backpackEntries} from '../src/progression/backpack.js';

import {NPC_DIALOGUES} from '../src/config/npc-dialogue.js';
import {chooseNpcLine} from '../src/core/npc-dialogue.js';

test('雪团初识闲聊能说出草地位置和驯牛方法',()=>{
 const npc=NPC_DIALOGUES['resident:snow'];
 const {line}=chooseNpcLine(npc,{count:0,seen:[],last:null},()=>.999);
 assert.match(line.text,/牧栏东南.*甜穗草.*喂它/);
});

// 开放普通森林，练习用的角色仍走真实地图与负重校验。
function scene(){const g=new Game(freshProgress());g.state='playing';g.mainlineSpeech=null;return g;}
// 通过实际刷出的地标提交动作，不直接写入驯养数量。
function approach(g,target){Object.assign(g.player,{x:target.x,y:target.y});return interactWildPasture(g,target.type,target.id);}
test('无草不能驯，采草读档后仍能驯，驯养失败可重试，成功不会重复领牛',()=>{
 const g=scene(),[ox,grass]=wildPastureObjects(g);
 assert.equal(approach(g,ox).ok,false);
 assert.ok(approach(g,grass).ok);
 assert.equal(approach(g,grass).ok,false);
 g.progress=validateProgress(structuredClone(g.progress));
 assert.match(backpackEntries(g).find(r=>r.name==='甜穗草').use,/野牛/);
 g.livingPersist=()=>false;assert.equal(approach(g,ox).ok,false);
 assert.equal(g.progress.farm.forage,1);assert.equal(g.progress.farm.oxPlow,false);
 g.livingPersist=()=>true;assert.ok(approach(g,ox).ok);
 g.progress=validateProgress(structuredClone(g.progress));
 assert.deepEqual(g.progress.farm.oxSite,PEN_OX);assert.equal(g.progress.farm.forage,0);
 assert.equal(approach(g,ox).ok,false);Object.assign(g.player,PEN_GATE);g.progress.coins=100;assert.equal(tendPasture(g,'adopt-ox').ok,false);assert.equal(g.progress.coins,100);
 g.progress.living.calendar.day++;
 const [regrown]=wildPastureObjects(g);assert.equal(regrown.type,'sweet-grass');
 assert.ok(approach(g,regrown).ok);Object.assign(g.player,PEN_GATE);assert.ok(tendPasture(g,'ox','forage').ok);assert.equal(g.progress.farm.oxFeeds,1);
});
test('距离、超载和借用场景拦截采集，不消耗当日草丛',()=>{
 const g=scene(),grass=wildPastureObjects(g).find(s=>s.type==='sweet-grass');
 assert.equal(interactWildPasture(g,grass.type,grass.id).ok,false);
 g.progress.logistics.bagWood=100;assert.equal(approach(g,grass).ok,false);
 assert.equal(g.progress.farm.forageDay,null);g.progress.logistics.bagWood=0;
 g.vehicle.active=true;assert.equal(approach(g,grass).ok,false);
 g.realm={};assert.deepEqual(wildPastureObjects(g),[]);
});
