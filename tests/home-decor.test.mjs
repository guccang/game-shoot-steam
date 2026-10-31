// 小屋装扮专项：覆盖真实存档、交易原子性、家具碰撞、路径及历法盆栽。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {HOME_CATALOG,HOME_LIMIT} from '../src/config/home-decor.js';
import {COTTAGE} from '../src/config/cottage.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {freshHome,placementError,plantState,homeFurniture} from '../src/progression/home-decor.js';
import {buyDecor as purchaseDecor,moveDecor,storeDecor,sowDecor,harvestDecor} from '../src/core/home-decor.js';
import {enterCottage,cottageBlocked,sleepInCottage,leaveCottage} from '../src/core/cottage.js';

// 通过正式入口进入已修复小屋，避免用过时的未修复营地夹具。
function setup(){const p=freshProgress();p.coins=10000;p.mainline.completed=[...MAINLINE_IDS];p.restoration.repaired=['cottage'];const g=new Game(p,()=>.7);g.start();g.vehicle.active=false;Object.assign(g.player,COTTAGE.door);assert.ok(enterCottage(g));g.livingPersist=()=>true;return g;}

// 商品交易显式模拟店内会话，随后回家继续验证原有布局和植物规则。
function buyDecor(g,type){const room=g.cottage;if(room)g.cottage={...room,kind:'furniture'};try{return purchaseDecor(g,type);}finally{g.cottage=room;}}

test('十五款目录稳定唯一，旧档免费家具保持原位且刷新不重复赠送',()=>{
 assert.equal(HOME_CATALOG.length,15);assert.equal(new Set(HOME_CATALOG.map(d=>d.id)).size,15);
 const p=freshProgress();delete p.homeDecor;const old=validateProgress(p);assert.deepEqual(old.homeDecor,freshHome());assert.deepEqual(validateProgress(old).homeDecor,old.homeDecor);
});
test('每件商品按报价扣款，独立实例入收纳，金币不足与容量满不扣款',()=>{
 const g=setup();let total=0;
 for(const d of HOME_CATALOG){const r=buyDecor(g,d.id);assert.ok(r.ok);total+=d.price;assert.equal(g.progress.homeDecor.items.find(i=>i.uid===r.uid).x,null);}
 assert.equal(g.progress.coins,10000-total);assert.equal(new Set(g.progress.homeDecor.items.map(i=>i.uid)).size,g.progress.homeDecor.items.length);
 g.progress.coins=0;const before=structuredClone(g.progress);assert.equal(buyDecor(g,'pot').ok,false);assert.deepEqual(g.progress,before);
 g.progress.coins=10000;while(g.progress.homeDecor.items.length<HOME_LIMIT)assert.ok(buyDecor(g,'stool').ok);
 const coins=g.progress.coins;assert.equal(buyDecor(g,'stool').ok,false);assert.equal(g.progress.coins,coins);
});
test('购买、移动、收纳、播种与采收保存失败均回滚，允许重试',()=>{
 const g=setup();const uid=buyDecor(g,'pot').uid;assert.ok(moveDecor(g,uid,120,228).ok);
 for(const operation of [()=>buyDecor(g,'radio'),()=>moveDecor(g,uid,120,252),()=>storeDecor(g,uid),()=>sowDecor(g,uid,'mint')]){
  const before=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(operation().ok,false);assert.deepEqual(g.progress,before);
 }
 g.livingPersist=()=>true;assert.ok(sowDecor(g,uid,'mint').ok);g.progress.living.calendar.day++;
 const before=structuredClone(g.progress);g.livingPersist=()=>{throw Error('磁盘故障');};assert.equal(harvestDecor(g,uid).ok,false);assert.deepEqual(g.progress,before);
 g.livingPersist=()=>true;assert.ok(harvestDecor(g,uid).ok);assert.equal(harvestDecor(g,uid).ok,false);
});
test('家具移动影响真实脚底碰撞，拒绝床位、重叠、门口和猫脚下',()=>{
 const g=setup(),uid=buyDecor(g,'pot').uid;assert.equal(cottageBlocked(120,228,g),false);assert.ok(moveDecor(g,uid,120,228).ok);assert.equal(cottageBlocked(120,228,g),true);
 for(const [x,y] of [[62,140],[273,112],[180,324],[180,300],[NaN,200],[-20,100]])assert.equal(moveDecor(g,uid,x,y).ok,false);
 assert.ok(moveDecor(g,uid,120,252).ok);assert.equal(cottageBlocked(120,228,g),false);assert.equal(cottageBlocked(120,252,g),true);
 assert.ok(storeDecor(g,uid).ok);assert.equal(cottageBlocked(120,252,g),false);assert.ok(!homeFurniture(g.progress.homeDecor).some(i=>i.uid===uid));
});
test('落点合法但封住床边通路时拒绝，窗帘与挂件限制墙位，地毯不阻路',()=>{
 const home={version:1,nextId:5,items:[{uid:1,type:'sofa',x:72,y:216},{uid:2,type:'sofa',x:150,y:216},{uid:3,type:'sofa',x:228,y:216},{uid:4,type:'sofa',x:null,y:null}]};
 assert.match(placementError(home,4,306,216),/通往/);
 const g=setup(),curtain=buyDecor(g,'curtain').uid,painting=buyDecor(g,'painting').uid,rug=buyDecor(g,'rug').uid;
 assert.equal(moveDecor(g,curtain,180,200).ok,false);assert.ok(moveDecor(g,curtain,81,46).ok);
 assert.equal(moveDecor(g,painting,81,46).ok,false);assert.ok(moveDecor(g,painting,144,46).ok);
 assert.ok(moveDecor(g,rug,180,240).ok);assert.equal(cottageBlocked(180,240,g),false);
});
test('播种防连点，睡到明早兑现成熟，收纳和存档刷新保留植物',()=>{
 const g=setup(),uid=buyDecor(g,'pot').uid;assert.equal(sowDecor(g,uid,'mint').ok,false);assert.ok(moveDecor(g,uid,120,228).ok);
 assert.ok(sowDecor(g,uid,'mint').ok);const coins=g.progress.coins;assert.equal(sowDecor(g,uid,'berry').ok,false);assert.equal(g.progress.coins,coins);assert.equal(harvestDecor(g,uid).ok,false);
 assert.ok(storeDecor(g,uid).ok);g.progress=validateProgress(JSON.parse(JSON.stringify(g.progress)));assert.ok(g.progress.homeDecor.items.find(i=>i.uid===uid).plant);
 assert.ok(moveDecor(g,uid,120,228).ok);Object.assign(g.player,{x:119,y:158});assert.ok(sleepInCottage(g,'morning'));
 for(let i=0;i<26;i++)g.update(.05);const item=g.progress.homeDecor.items.find(i=>i.uid===uid);assert.equal(plantState(item,g.progress.living.calendar).ready,true);
 assert.ok(harvestDecor(g,uid).ok);assert.equal(g.progress.coins,coins+18);assert.equal(harvestDecor(g,uid).ok,false);
 assert.ok(leaveCottage(g));assert.equal(buyDecor(g,'pot').ok,false);
});
test('存档去重、未知类型剔除、非法布局收纳，床门原有功能保留',()=>{
 const p=freshProgress();p.homeDecor.items.push({uid:1,type:'pot',x:100,y:100},{uid:9,type:'missing',x:100,y:100},{uid:10,type:'pot',x:62,y:140},{uid:11,type:'curtain',x:81,y:46});
 const result=validateProgress(p);assert.equal(result.homeDecor.items.length,6);assert.equal(result.homeDecor.items.find(i=>i.uid===10).x,null);assert.equal(result.homeDecor.items.find(i=>i.uid===11).x,81);assert.equal(result.homeDecor.nextId,12);
});
test('当天稍晚播种的一天作物在明早成熟，暂停同一日期不增长',()=>{
 const g=setup(),uid=buyDecor(g,'pot').uid;assert.ok(moveDecor(g,uid,120,228).ok);g.progress.living.calendar.elapsed=1200;assert.ok(sowDecor(g,uid,'mint').ok);
 const item=g.progress.homeDecor.items.find(i=>i.uid===uid);assert.equal(plantState(item,g.progress.living.calendar).ratio,0);g.pause();g.update(.05);assert.equal(plantState(item,g.progress.living.calendar).ratio,0);
 g.progress.living.calendar={day:1,elapsed:0};assert.ok(plantState(item,g.progress.living.calendar).ready);
});
