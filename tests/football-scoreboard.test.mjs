// 足球站牌累计、最高分、旧档和正式绘制器专项回归。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {finishFootball} from '../src/core/slime-football.js';
import {drawRestorationObject} from '../src/rendering/town-restoration.js';

test('累计两场并保留最高分，离场及刷新不会重复计分',()=>{
 const g=new Game();g.start();g.progress.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);
 for(const score of [7,3]){assert.ok(g.enterRealm('football'));assert.ok(g.startFootball());g.realm.score=score;assert.ok(finishFootball(g));assert.equal(finishFootball(g),false);g.leaveRealm();}
 const r=g.progress.realms.records.football;assert.equal(r.totalGoals,10);assert.equal(r.best,7);assert.equal(r.clears,2);assert.equal(r.totalGoalsPartial,false);
 assert.deepEqual(validateProgress(JSON.parse(JSON.stringify(g.progress))).realms.records.football,r);
});

test('累计旧档完整逐场账本可恢复，不全只显示下限，重复迁移稳定',()=>{
 const p=freshProgress(),r=p.realms.records.football;r.best=7;r.clears=2;delete r.totalGoals;delete r.totalGoalsPartial;
 p.economyLog.events=[7,3].map(n=>({at:0,type:'challenge',source:'football:'+n,amounts:{}}));
 const full=validateProgress(p);assert.equal(full.realms.records.football.totalGoals,10);assert.equal(full.realms.records.football.totalGoalsPartial,false);
 p.economyLog.events.pop();const partial=validateProgress(p);assert.equal(partial.realms.records.football.totalGoals,7);assert.equal(partial.realms.records.football.totalGoalsPartial,true);assert.deepEqual(validateProgress(partial),partial);
 const zero=validateProgress(null).realms.records.football;assert.equal(zero.totalGoals,0);assert.equal(zero.best,0);assert.equal(zero.totalGoalsPartial,false);
});

test('累计与最高直接由正式站牌绘制，零分、大数和其他站牌不混淆',()=>{
 const p=freshProgress();p.restoration.repaired=['football','race'];const g={progress:p},calls=[];
 const c=new Proxy({fillText(...args){calls.push(args);}}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 const item={...TOWN_RESTORATIONS.find(f=>f.id==='football'),type:'restoration-extra'};
 assert.equal(drawRestorationObject(c,item,g),true);assert.deepEqual(calls.slice(0,4).map(a=>a[0]),['累计进球','0','单场最高进球','0']);
 calls.length=0;Object.assign(p.realms.records.football,{totalGoals:123456789,best:321,totalGoalsPartial:true});drawRestorationObject(c,item,g,1);
 assert.deepEqual(calls.slice(0,4).map(a=>a[0]),['累计进球','≥1.2亿','单场最高进球','321']);
 calls.length=0;drawRestorationObject(c,{...TOWN_RESTORATIONS.find(f=>f.id==='race'),type:'restoration-extra'},g);assert.ok(!calls.some(a=>a[0]==='累计进球'));
});
