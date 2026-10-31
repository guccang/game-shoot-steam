// 当前清缴与29步任务经济验收；完整保留超时、失败、余额和活动耗时。
import {mkdir,writeFile} from 'node:fs/promises';
import {runBatch,ROUTE_PRESETS,reportCSV} from '../src/balance/model.js';
import {RECOMMENDED_ECONOMY} from '../src/config/economy.js';
const directory='docs/balance-reports/task-cadence';
await mkdir(directory,{recursive:true});
const names=process.argv.slice(2),matrix=[];
const scenarios=[['standard',{}],['low',{efficiency:.65,minutes:1500}],['high',{efficiency:1.35}],
 ...['forest','rogue','tower','guardian'].map(k=>[k,{weights:ROUTE_PRESETS[k],minutes:1500}]),
 ['save',{strategy:'save',minutes:1500}],['gift',{collection:'hovercraft',minutes:1500}],
 ['low-high-failure',{efficiency:.65,failureRate:.2,minutes:1800}]];
for(const [name,scenario] of scenarios.filter(([name])=>!names.length||names.includes(name))){
 const report=runBatch(RECOMMENDED_ECONOMY,scenario);
 matrix.push({name,summary:report.summary,firstUpgrade:Math.max(...report.results.map(r=>r.firstUpgrade??Infinity))});
 await writeFile(`${directory}/${name}.json`,JSON.stringify(report,null,2));
 await writeFile(`${directory}/${name}.csv`,reportCSV(report));
 console.log(name,JSON.stringify(matrix.at(-1)));
}
await writeFile(`${directory}/${names.length?names.join('-'):'matrix'}.summary.json`,JSON.stringify(matrix,null,2));
if(!names.length){
 const standard=matrix.find(r=>r.name==='standard'),low=matrix.find(r=>r.name==='low');
 const acceptance={standardDuration:standard.summary.p50>=480&&standard.summary.p50<=720,
  standardCompleted:standard.summary.completed===100,standardCadence:standard.summary.lateGapOver12===0,
  lowCompleted:low.summary.completed===100,lowCadence:low.summary.lateGapOver12===0,
  opening:standard.firstUpgrade<=5&&low.firstUpgrade<=5};
 await writeFile(`${directory}/acceptance.json`,JSON.stringify({acceptance,scope:'当前29步任务、默认零额外伐木路线、4分钟回访工坊、6分钟短途秘境；耗时为模拟，非真人全程实测。'},null,2));
 if(Object.values(acceptance).some(v=>!v))throw Error('成长节奏验收未达标');
}
