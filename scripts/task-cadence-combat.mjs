// 当前正式绘制/战斗逻辑采样：固定装备的代表存档，不冒充从零开始的连续游玩。
import {writeFile,mkdir} from 'node:fs/promises';
import {sampleClearing} from './clearing-timing.mjs';
const cases=[{name:'首领前双5级',group:1,level:5,heroLevel:5},
 {name:'步行双7级',group:1,level:7,heroLevel:7},
 {name:'轮式战车与5级主炮',group:1,level:7,heroLevel:7,vehicleIndex:0,vehicleLevel:5,turretLevel:5},
 {name:'中期散弹与气垫船',group:6,level:15,heroLevel:15,weaponIndex:3,vehicleIndex:3,vehicleLevel:10,turretLevel:12},
 {name:'后期散弹与直升机',group:18,level:20,heroLevel:20,weaponIndex:3,vehicleIndex:2,vehicleLevel:20,turretLevel:20}];
const samples=[];for(const fixture of cases)for(const seed of [11,42,97]){
 const sample={name:fixture.name,...sampleClearing(fixture.group,fixture.level,seed,{...fixture,maxSeconds:600})};samples.push(sample);
 console.log(fixture.name,seed,sample.seconds,sample.completed,sample.state);
}
await mkdir('docs/balance-reports/task-cadence',{recursive:true});
await writeFile('docs/balance-reports/task-cadence/combat.json',JSON.stringify({kind:'formal-runtime-fixtures',scope:'同一正式Game.update、实际装填和移动输入。失败和超时全部保留；不含完整任务游玩，不作为真人时长。',samples},null,2));
