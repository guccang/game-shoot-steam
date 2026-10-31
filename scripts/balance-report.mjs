// 命令行输出可复现报告；可指定配置JSON、情景JSON和报告文件，不改写正式参数。
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { runBatch, ROUTE_PRESETS, reportCSV } from '../src/balance/model.js';
import { RECOMMENDED_ECONOMY, ORIGINAL_ECONOMY, validateEconomy } from '../src/config/economy.js';
const args=process.argv.slice(2);
// 读取明确的命令行选项，没有值时保留默认情景。
const option=name=>args.includes(name)?args[args.indexOf(name)+1]:null;
const config=option('--config')?validateEconomy(JSON.parse(await readFile(option('--config'),'utf8'))):args.includes('--original')?ORIGINAL_ECONOMY:RECOMMENDED_ECONOMY;
const scenario=option('--scenario')?JSON.parse(await readFile(option('--scenario'),'utf8')):{};
if(option('--route')){if(!ROUTE_PRESETS[option('--route')])throw Error('未知玩法路线');scenario.weights=ROUTE_PRESETS[option('--route')];}
if(option('--efficiency'))scenario.efficiency=Number(option('--efficiency'));
const report=runBatch(config,scenario);
if(option('--out')){
  await mkdir(dirname(option('--out')),{recursive:true});
  await writeFile(option('--out'),JSON.stringify(report,null,2));
  await writeFile(option('--out').replace(/\.json$/, '')+'.csv',reportCSV(report));
}
console.log(JSON.stringify({summary:report.summary,representative:{
  purchases:report.representative.purchases,levels:report.representative.levels,
  completionMinute:report.representative.completionMinute,remaining:report.representative.remaining,
  totals:report.representative.totals,deficits:report.representative.deficits}},null,2));
