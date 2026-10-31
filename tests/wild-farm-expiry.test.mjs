// 野田寿命覆盖完整游戏年、成功播种续期、旧档迁移、写盘失败及两图持久化。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {wildFarmTime,wildFarmYear} from '../src/progression/wild-farm-age.js';
import {advanceLivingCalendar} from '../src/world/living-calendar.js';
import {expireWildFarms,ensureWildFarms} from '../src/core/wild-farm.js';
import {farmAction} from '../src/core/farm.js';

// 起点放在年末附近，验证跨年编号不会提前删除；每图各留一块野田及自耕田。
function scene(){
 const progress=freshProgress();advanceLivingCalendar(progress.living.calendar,wildFarmYear()-1000);
 const now=wildFarmTime(progress.living.calendar),f=progress.farm;
 f.wildMaps=['forest','jiuzhaigou'];f.wildScatterVersion=1;f.nextId=3;
 f.plots=[0,1,2].map(id=>({id,mapId:id===1?'jiuzhaigou':'forest',x:1005+id*56,y:672,crop:null,plantedAt:0,readyAt:0,watered:false,...(id<2?{wild:true,wildSownAt:now}:{})}));
 return {progress,state:'playing',mapId:'forest',player:{x:1005,y:710},trees:[],enemies:[],livingPersist:()=>true};
}
// 所有时间跳转均调用正式历法推进，设备时间只用于单茬成熟。
function advance(g,ms){advanceLivingCalendar(g.progress.living.calendar,ms);}

test('跨年不提前清理，满完整一年删除两图野田且保留自耕田，不补生成或发奖',()=>{
 const g=scene(),before=structuredClone(g.progress);advance(g,1000);assert.equal(expireWildFarms(g),false);
 advance(g,wildFarmYear()-1001);assert.equal(expireWildFarms(g),false);
 advance(g,1);assert.equal(expireWildFarms(g),true);assert.deepEqual(g.progress.farm.plots.map(p=>p.id),[2]);
 assert.equal(g.progress.coins,before.coins);assert.equal(g.progress.farm.xp,before.farm.xp);assert.equal(g.progress.farm.harvested,0);
 g.progress=validateProgress(structuredClone(g.progress));assert.equal(ensureWildFarms(g),false);assert.equal(expireWildFarms(g),false);
 g.mapId='jiuzhaigou';assert.equal(ensureWildFarms(g),false);assert.equal(g.progress.farm.plots.length,1);
});

test('成功播种重置一年，浇水和收获不续期，读档保留播种日期',()=>{
 const g=scene();advance(g,wildFarmYear()/2);g.progress.farm.seeds[0]=1;
 assert.ok(farmAction(g,'plant',{plot:0,crop:0,now:1000}).ok);const sown=g.progress.farm.plots[0].wildSownAt;
 advance(g,100);assert.ok(farmAction(g,'water',{plot:0,now:2000}).ok);
 assert.ok(farmAction(g,'harvest',{plot:0,now:1000000}).ok);assert.equal(g.progress.farm.plots[0].wildSownAt,sown);
 g.progress=validateProgress(JSON.parse(JSON.stringify(g.progress)));assert.equal(g.progress.farm.plots[0].wildSownAt,sown);
 advance(g,wildFarmYear()/2-100);assert.ok(expireWildFarms(g));assert.ok(g.progress.farm.plots.some(p=>p.id===0));
 advance(g,wildFarmYear()/2-1);assert.equal(expireWildFarms(g),false);advance(g,1);assert.ok(expireWildFarms(g));
 assert.ok(!g.progress.farm.plots.some(p=>p.id===0));
});

test('没有种子或保存失败的播种不会续期',()=>{
 const g=scene(),sown=g.progress.farm.plots[0].wildSownAt;advance(g,wildFarmYear()-1);
 assert.equal(farmAction(g,'plant',{plot:0,crop:0,now:1000}).ok,false);
 g.progress.farm.seeds[0]=1;g.livingPersist=()=>false;assert.equal(farmAction(g,'plant',{plot:0,crop:0,now:1000}).ok,false);
 assert.equal(g.progress.farm.plots[0].wildSownAt,sown);assert.equal(g.progress.farm.seeds[0],1);
 g.livingPersist=()=>true;advance(g,1);assert.ok(expireWildFarms(g));
});

test('旧档及坏日期从当前游戏日期起算，重复读档不刷新寿命',()=>{
 const g=scene();advance(g,wildFarmYear()*8);delete g.progress.farm.plots[0].wildSownAt;g.progress.farm.plots[1].wildSownAt=Infinity;
 g.progress=validateProgress(g.progress);const now=wildFarmTime(g.progress.living.calendar);
 assert.ok(g.progress.farm.plots.filter(p=>p.wild).every(p=>p.wildSownAt===now));assert.equal(expireWildFarms(g),false);
 advance(g,100);g.progress=validateProgress(g.progress);assert.equal(g.progress.farm.plots[0].wildSownAt,now);
 advance(g,wildFarmYear()-100);assert.ok(expireWildFarms(g));
});

test('清理先保存后移除，失败保持田地与队列，重试清除旧任务引用',()=>{
 const g=scene();advance(g,wildFarmYear());g.farmWork={job:{id:0},queue:[{id:1},{id:2}]};
 Object.assign(g.progress.mainline.gardening,{plotId:0,planted:1,watered:0,harvested:0});
 const before=structuredClone(g.progress);g.livingPersist=()=>{throw Error('写盘失败');};assert.equal(expireWildFarms(g),false);assert.deepEqual(g.progress,before);assert.equal(g.farmWork.job.id,0);
 g.livingPersist=()=>true;assert.equal(expireWildFarms(g),false);advance(g,10000);assert.ok(expireWildFarms(g));
 assert.equal(g.farmWork.job,null);assert.deepEqual(g.farmWork.queue,[{id:2}]);assert.equal(g.progress.mainline.gardening.plotId,null);assert.equal(g.progress.mainline.gardening.planted,0);
});

test('暂停或世界未就绪时不清理，到期野生作物一并移除',()=>{
 const g=scene();g.progress.farm.plots[0].crop=0;advance(g,wildFarmYear());g.state='paused';assert.equal(expireWildFarms(g),false);
 g.state='playing';g.worldPending=true;assert.equal(expireWildFarms(g),false);g.worldPending=false;assert.ok(expireWildFarms(g));
 assert.deepEqual(g.progress.farm.plots.map(p=>p.id),[2]);
});
