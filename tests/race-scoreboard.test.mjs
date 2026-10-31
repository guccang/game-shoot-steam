// 赛道站常驻成绩验证：正式完赛、重复结算、刷新与牌面绘制。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {finishRace} from '../src/core/forest-race.js';
import {drawRestorationObject} from '../src/rendering/town-restoration.js';

test('两场完赛分别保留最好名次和最快时间，失败与重复结算不增加记录',()=>{
 const g=new Game();g.start();g.progress.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);
 for(const [place,elapsed] of [[1,58.4],[3,51.2]]){
  assert.ok(g.enterRealm('race'));assert.ok(g.startRace());Object.assign(g.realm,{place,elapsed});
  assert.ok(finishRace(g,true));assert.equal(finishRace(g,true),false);g.leaveRealm();
 }
 const r={...g.progress.realms.records.race};assert.equal(r.clears,2);assert.equal(r.best,4);assert.equal(r.bestTimeMs,51200);
 g.enterRealm('race');g.startRace();finishRace(g,false);g.leaveRealm();
 assert.deepEqual(g.progress.realms.records.race,r);
 assert.deepEqual(validateProgress(JSON.parse(JSON.stringify(g.progress))).realms.records.race,r);
});

test('正式牌面显示零记录、名次映射和长数字，未修复不泄露成绩',()=>{
 const p=freshProgress();p.restoration.repaired=['race'];const g={progress:p},calls=[];
 const c=new Proxy({fillText(...args){calls.push(args);}}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 const item={...TOWN_RESTORATIONS.find(f=>f.id==='race'),type:'restoration-extra'};
 drawRestorationObject(c,item,g);assert.deepEqual(calls.slice(0,6).map(a=>a[0]),['完赛次数','0次','最好名次','暂无','最快用时','暂无']);
 for(const best of [1,2,3,4]){
  calls.length=0;Object.assign(p.realms.records.race,{clears:999999,best,bestTimeMs:51200});drawRestorationObject(c,item,g,1);
  assert.deepEqual(calls.slice(0,6).map(a=>a[0]),['完赛次数','99.9万次','最好名次',`第${5-best}名`,'最快用时','51.2 秒']);
 }
 calls.length=0;p.restoration.repaired=[];drawRestorationObject(c,item,g);assert.ok(!calls.some(a=>a[0]==='完赛次数'));
});
