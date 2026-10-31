// 资源分工方案验收：每条路线固定100种子，保留失败与零额外采集压力结果。
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {runBatch,ROUTE_PRESETS,reportCSV,validateScenario} from '../src/balance/model.js';
import {RECOMMENDED_ECONOMY} from '../src/config/economy.js';
import {openingEconomyReport} from './opening-economy-audit.mjs';
export const RESOURCE_SCENARIOS=[['standard',{}],['low',{efficiency:.65,minutes:1800}],
 ['high',{efficiency:1.35}],['zero-logging',{weights:ROUTE_PRESETS.zeroLogging,minutes:1800}]];
// 可归档已经运行的批次，但必须与当前完整配置、情景及100个固定种子一致。
export async function saveResourceReports(reports,directory='docs/balance-reports/resource-source'){
 await mkdir(directory,{recursive:true});const matrix=[];
 for(const [name,scenario] of RESOURCE_SCENARIOS){
  const report=reports[name];assert.deepEqual(report.config,RECOMMENDED_ECONOMY);
  assert.deepEqual(report.scenario,validateScenario(scenario));
  assert.deepEqual(report.results.map(r=>r.seed),Array.from({length:100},(_,i)=>i+1));
  matrix.push({name,summary:report.summary,firstUpgrade:Math.max(...report.results.map(r=>r.firstUpgrade??Infinity))});
  await writeFile(`${directory}/${name}.json`,JSON.stringify(report,null,2));
  await writeFile(`${directory}/${name}.csv`,reportCSV(report));
 }
 const opening=openingEconomyReport(),standard=reports.standard.summary,low=reports.low.summary;
 const acceptance={standardDuration:standard.p50>=480&&standard.p50<=720,standardCompleted:standard.completed===100,
  standardLateCadence:standard.lateGapOver12===0,lowCompleted:low.completed===100,lowLateCadence:low.lateGapOver12===0,
  openingResources:opening.after.waves.at(-1).balance.coins===60&&opening.after.waves.at(-1).balance.wood===6};
 await writeFile(`${directory}/opening.json`,JSON.stringify(opening,null,2));
 await writeFile(`${directory}/matrix.json`,JSON.stringify(matrix,null,2));
 await writeFile(`${directory}/acceptance.json`,JSON.stringify({acceptance,
  scope:'少量采集，金币靠战斗、木材靠采集，任务与秘境补充。零额外采集为压力对照；完整模拟非真人实测。',
  limitations:'包含当前入职演出与288木材成本后，标准首次升级约5.39分钟、低效7.15分钟；前5分钟目标未达。低效前中期最坏空档约29分钟；仅后期空档达标。'},null,2));
 assert.ok(Object.values(acceptance).every(Boolean),'资源或后期节奏验收未达标');return matrix;
}
// 命令行直接执行时重新模拟；导入时只提供严格归档函数，避免隐式重跑。
export async function validateResourceSources(){
 const reports={};for(const [name,scenario] of RESOURCE_SCENARIOS){reports[name]=runBatch(RECOMMENDED_ECONOMY,scenario);console.log(name,JSON.stringify(reports[name].summary));}
 return saveResourceReports(reports);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await validateResourceSources();
