// 割草体验对照采样：复用正式走位、射击、受伤和结算，观察同屏量及一秒击杀峰值，不改战斗结果。
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(process.argv[2]||'.');
const {Game}=await import(pathToFileURL(resolve(root,'src/game.js')));
const {sampleClearing}=await import(pathToFileURL(resolve(root,'scripts/clearing-timing.mjs')));
const update=Game.prototype.update;
let stats;
// 仅旁观真实更新，不改变敌人、弹药、玩家生命或装备属性。
Game.prototype.update=function(dt,...args){
 const before=this.kills;const result=update.call(this,dt,...args);
 stats.peak=Math.max(stats.peak,this.enemies.filter(e=>e.hp>0).length);
 for(let i=before;i<this.kills;i++)stats.hits.push(this.time);
 while(stats.hits.length&&stats.hits[0]<this.time-1)stats.hits.shift();
 stats.burst=Math.max(stats.burst,stats.hits.length);return result;
};
const cases=[
 {name:'首轮基础手枪',group:1,level:1,heroLevel:1},
 {name:'第二轮三级手枪',group:2,level:3,heroLevel:5},
 {name:'第二轮三级散弹',group:2,level:3,heroLevel:5,weaponIndex:3},
 {name:'第二轮三级激光',group:2,level:3,heroLevel:5,weaponIndex:1},
 {name:'第二轮手枪与松果战车',group:2,level:3,heroLevel:5,vehicleIndex:0,turretLevel:1},
];
const rows=[];
for(const fixture of cases)for(const seed of [11,42,97]){
 stats={peak:0,burst:0,hits:[]};
 const r=sampleClearing(fixture.group,fixture.level,seed,{...fixture,maxSeconds:180});
 rows.push({name:fixture.name,seed,completed:r.completed,state:r.state,seconds:r.seconds,peak:stats.peak,burst:stats.burst,hp:r.hp,waves:r.waves});
}
console.log(JSON.stringify(rows,null,2));
