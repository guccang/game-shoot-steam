// 工作台与命令行共用当前主线模拟、严格情景校验和完整批次报告。
export {wallet,growthCadence,seededRandom} from './model-metrics.js';
import {simulateCampaign} from './campaign-model.js';
import {i18nText} from '../i18n/index.js';
import {RECOMMENDED_ECONOMY,ORIGINAL_ECONOMY} from '../config/economy.js';
import {equipmentRecipe} from '../progression/equipment-goals.js';

export const DEFAULT_ROUTE=[['weapons',3],['vehicle',0],['vehicle',3],['vehicle',2],['weapons',12]];
export const ROUTE_PRESETS={
  mixed:{forest:.45,rogue:.2,tower:.15,guardian:.15,logging:.05},
  zeroLogging:{forest:.5,rogue:.2,tower:.15,guardian:.15,logging:0},
  forest:{forest:1,rogue:0,tower:0,guardian:0,logging:0},
  rogue:{forest:.1,rogue:.9,tower:0,guardian:0,logging:0},
  tower:{forest:.1,rogue:0,tower:.9,guardian:0,logging:0},
  guardian:{forest:.1,rogue:0,tower:0,guardian:.9,logging:0},
};
export const DEFAULT_SCENARIO={minutes:900,efficiency:1,failureRate:.08,movementShare:.22,
  forestKills:22,treeRate:60,realmKills:25,bossSeconds:65,upgradeShare:.4,strategy:'balanced',workshopMinutes:4,expeditionMinutes:6,
  collection:'none',priority:['weapons','heroes','turret','vehicle'],weights:ROUTE_PRESETS.mixed,route:DEFAULT_ROUTE,initial:null};
// 随机流独立于游戏，相同配置、路线与种子得到相同结果。
// 情景参数失败时明确报错，不把负时间或无活动的方案解释为成功。
export function validateScenario(raw={}){
  const s={...DEFAULT_SCENARIO,...raw,weights:{...DEFAULT_SCENARIO.weights,...raw.weights},route:raw.route||DEFAULT_ROUTE};
  for(const [key,min,max] of [['minutes',1,1800],['efficiency',.1,3],['failureRate',0,.8],['movementShare',0,.8],['forestKills',1,180],['treeRate',1,120],['realmKills',1,240],['bossSeconds',10,600],['upgradeShare',0,1],['workshopMinutes',.5,60],['expeditionMinutes',1,120]])
    if(!Number.isFinite(s[key])||s[key]<min||s[key]>max)throw Error(i18nText("balance.model.7b89589443", { p0: (key), p1: (min), p2: (max) }));
  if(!['balanced','save'].includes(s.strategy))throw Error(i18nText("balance.model.a8d56185b6"));
  if(!Array.isArray(s.priority)||s.priority.length!==4||new Set(s.priority).size!==4||s.priority.some(k=>!DEFAULT_SCENARIO.priority.includes(k)))throw Error(i18nText("balance.model.388a3787ee"));
  if(Object.keys(s.weights).some(k=>!Object.hasOwn(ROUTE_PRESETS.mixed,k))||Object.values(s.weights).some(n=>!Number.isFinite(n)||n<0)||!Object.values(s.weights).some(n=>n>0))throw Error(i18nText("balance.model.a050b0f854"));
  if(!Array.isArray(s.route)||s.route.length<1||s.route.length>30||s.route.some(([k,i])=>!equipmentRecipe(k,i)))throw Error(i18nText("balance.model.f4e9004481"));
  if(!['none','hovercraft'].includes(s.collection))throw Error('未知委托赠礼路线');
  const sum=Object.values(s.weights).reduce((a,b)=>a+b,0);
  for(const k of Object.keys(s.weights))s.weights[k]/=sum;
  if(s.initial!==null&&(!s.initial||s.initial.version!==1))throw Error(i18nText("balance.model.ef969063eb"));
  return s;
}
// 轻量模型显式声明假设；正式靶场样本用来校准输入，不伪称完整战斗AI模拟。
export function simulateEconomy(seed=1,config=RECOMMENDED_ECONOMY,raw={}){return simulateCampaign(seed,config,validateScenario(raw));}
// 分段空档包含跨边界部分和无升级尾段；不把失败、等待余额或领取资源计作成长。
// 未完成样本不填假时间；分位数同时报告完成率，避免幸存者偏差。
export function summarize(samples){
  const times=samples.map(s=>s.completionMinute??Infinity).sort((a,b)=>a-b);
  const percentile=q=>{const v=times[Math.min(times.length-1,Math.ceil(q*times.length)-1)];return Number.isFinite(v)?v:null;};
  return {samples:samples.length,completed:samples.filter(s=>s.completed).length,
    incomplete:samples.filter(s=>!s.completed).length,p10:percentile(.1),p50:percentile(.5),p90:percentile(.9),
    longestGap:Math.max(...samples.map(s=>s.longestGap)),
    longestLateGap:Math.max(0,...samples.map(s=>s.cadence?.late.max??0)),
    lateGapOver12:samples.filter(s=>(s.cadence?.late.max??0)>12+1e-9).length,
    lateSamples:samples.filter(s=>s.cadence?.late.max!==null&&s.cadence?.late.max!==undefined).length};
}
// 网页Worker与命令行使用同一批次入口，完整报告保留情景、种子和失败情况。
export function runBatch(config=RECOMMENDED_ECONOMY,scenario={},count=100){
  if(!Number.isInteger(count)||count<100||count>1000)throw Error(i18nText("balance.model.d6645f3cda"));
  const s=validateScenario(scenario),samples=Array.from({length:count},(_,i)=>simulateEconomy(i+1,config,s));
  return {version:4,kind:'simulation',config,scenario:s,assumptions:[
    '怪物金币停止产出，任务和玩法奖励原样保留；种地使用正式事务。模型假定森林中有农活时每分钟最多回访一次，回访12秒，逐块计正式动作时长加0.6秒移动，播种后逐块浇水；优先扩至12块并选择已解锁的高净收益作物，秘境中不经营。这是主动经营假设，不是自动或离线收入承诺。',
    '当前8阶段主线按正式条件交付；模型假定玩家主动连续推进，不估算自选体验与自由探索的实际停留。任务、清缴预算、秘境奖励和交易使用共享规则。',
    '从入职完成的最低钱包开始；入职演出、288木材采集与施工分别计时。默认自由活动含5%采集，零额外伐木为单独压力路线。',
    '森林按正式怪群配额分摊整波材料预算，不再产金币；吞吐仍是历史近似，不代表新版成组战斗的实测通关时长；树木不给金币，怪物和领主不给木材，任务与秘境结算奖励单列。',
    '森林模型代表营地清缴，不含高阶区域自由狩猎和误击树木。采集每分钟60棵再乘效率和移动折损；正式近邻自动采集样本约36棵/20秒，此处保守折减并非真人平均。',
    '战斗速度结合成长估算，固定概率失败；不是逐帧战斗或真人8–12小时通关。故事时长见campaign-timing.js，仍需实测校准。',
    '主线故事活动、永久购买、施工、回访、休整与失败共用时间预算；剧情借用装备不计永久拥有。',
    '目标为完成主线和购买清单，当前武器15级、角色12级、车体10级、车载炮12级；仅真实升级购买计入成长空档。',
    '赠礼默认不取捷径，hovercraft情景完成三项生活委托后领取一次气垫船；原版对照使用旧费用与当前任务结构。'
  ],summary:summarize(samples),representative:samples[0],
  results:samples.map(({seed,completed,completionMinute,purchases,longestGap,cadence,deficits,remaining,levels,completionLevels,failures,mainlineCompleted,firstUpgrade})=>({seed,completed,completionMinute,purchases,longestGap,cadence,deficits,remaining,levels,completionLevels,failures,mainlineCompleted,firstUpgrade}))};
}
// 报告导出使用标准CSV转义，装备名称中的引号或换行不会破坏列结构。
export function reportCSV(report){
  const rows=[[i18nText("balance.model.5e20fc2237"),i18nText("balance.model.c0b3fbff51"),i18nText("balance.model.b9203a0e20"),i18nText("balance.model.56787c255a"),i18nText("balance.model.cdc7ae7978"),i18nText("balance.model.24911c9cd7"),i18nText("balance.model.520124409a"),i18nText("balance.model.74e9515cfb"),i18nText("balance.model.257b6b5f60"),i18nText("balance.model.e05e98f2c4"),i18nText("balance.model.fe6e77add0"),i18nText("balance.model.fc34be5c9e")]];
  for(const r of report.results)rows.push([r.seed,r.completed,r.completionMinute??i18nText("balance.app.6707de42c2"),r.longestGap,r.cadence?.late.max??i18nText("balance.app.0caad9f56b"),(r.cadence?.late.max??0)>12,r.remaining.coins,r.remaining.wood,r.levels.weapon,r.levels.hero,r.levels.vehicle,r.levels.turret]);
  return '\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');
}
export { ORIGINAL_ECONOMY };
