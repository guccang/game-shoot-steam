// 生成种田与装备经济报告；输出完整假设，供改数值前后复核而不修改玩家存档。
import {writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {simulateFarmEconomy,farmEconomyCatalog} from '../src/balance/farm-model.js';
const output=process.argv[2]||'output/farm-balance.json';
const scenarios=[{plots:4},{plots:8},{plots:12},{plots:24},{plots:8,water:false},{plots:8,visitSeconds:360,longCrops:true},...[1,7,17].map(seed=>({plots:8,delivery:true,seed}))];
const report={assumptions:['零金币开局，初始开垦计时；含首次收获的两粒胡萝卜，不含任务和玩法奖励。delivery=true情景额外调用正式快递规则，用固定随机种子对比，领取额外花24秒往返及每封1秒。','相邻移动每格0.6秒，每次实际回访12秒，加正式农活动画时长；场地无障碍，没有死亡。','回访间隔不含农活耗时；生长与动作共用时间轴；离线只成熟一茬。','每项目标分别攒钱且留下一轮种子成本；报价使用初始营地98折，购买仍需修好工坊、木材、材料和停车位，不能当成完整通关时间。'],catalog:farmEconomyCatalog(),scenarios:scenarios.map(s=>simulateFarmEconomy(s))};
await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.scenarios,null,2));
