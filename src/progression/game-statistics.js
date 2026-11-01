// 游戏档案累计统计随成长存档提交，预览副本与失败事务不会污染正式记录。
export const STAT_RESOURCES=['coins','wood','parts','crystal','core'];
export const STAT_ACTIVITIES={clearing:'Boss 清缴',story:'故事章节',commission:'营地委托',living:'邻里请求',defense:'营门守卫',fire:'森林消防',tower:'时空之塔',guardian:'守护女神',rogue:'肉鸽远征',football:'滚滚史莱姆',race:'森林运动会'};
// 统计使用安全整数，拒绝损坏值；累计上限独立于钱包容量。
function count(value){return Number.isFinite(value)?Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,Math.floor(value))):0;}
// 装备使用稳定内容 ID，限制损坏存档的键和规模，缺失的旧明细不推算补写。
function equipmentRecords(raw){
 const records={};
 for(const [id,row] of Object.entries(raw||{}).slice(0,128))if(/^[a-z][a-z0-9-]{0,63}$/.test(id))records[id]={kills:count(row?.kills),trees:count(row?.trees)};
 return records;
}
// 只读取明确保存的统计字段，不从巡游与账本推算历史。
export function validateGameStatistics(raw){
 const value={version:1,partial:!!raw?.partial,kills:count(raw?.kills),trees:count(raw?.trees),resources:{},plays:{},clearingRound:Number.isSafeInteger(raw?.clearingRound)&&raw.clearingRound>=0?raw.clearingRound:-1};
 value.equipment={version:1,partial:!!raw?.equipment?.partial,weapons:equipmentRecords(raw?.equipment?.weapons),vehicles:equipmentRecords(raw?.equipment?.vehicles)};
 for(const key of STAT_RESOURCES)value.resources[key]=count(raw?.resources?.[key]);
 for(const key of Object.keys(STAT_ACTIVITIES))value.plays[key]=count(raw?.plays?.[key]);
 return value;
}
// 尚无统计的运行时对象创建空记录。
function statistics(progress){return progress.statistics??=validateGameStatistics(null);}
// 只在死亡状态首次确认后调用，普通怪、领主与伐倒树木分别记数。
export function recordDefeat(progress,type,source=null){
 const key=type==='tree'?'trees':['enemy','boss'].includes(type)?'kills':null;
 if(key){
  const s=statistics(progress);s[key]=count(s[key]+1);
  s.equipment ||= validateGameStatistics(s).equipment;
  for(const [group,id] of [['weapons',source?.weapon],['vehicles',source?.vehicle]]){
   if(typeof id!=='string'||!/^[a-z][a-z0-9-]{0,63}$/.test(id))continue;
   const rows=s.equipment[group];if(!Object.hasOwn(rows,id)&&Object.keys(rows).length>=128)continue;
   const row=Object.hasOwn(rows,id)?rows[id]:(rows[id]={kills:0,trees:0});row[key]=count(row[key]+1);
  }
 }
}
// 统一入账处传入实际到账量，容量溢出、消费、退款及调试赠送不重复记收益。
export function recordResourceGain(progress,key,amount){
 if(!STAT_RESOURCES.includes(key)||!(amount>0))return;
 const s=statistics(progress);s.resources[key]=count(s.resources[key]+count(amount));
}
// 玩法成功进入才增加；清缴暂停重接属于同一轮，只有下一轮才再次计数。
export function recordActivity(progress,key){
 if(!Object.hasOwn(STAT_ACTIVITIES,key))return;
 const s=statistics(progress);
 if(key==='clearing'){const round=count(progress.bosses);if(s.clearingRound===round)return;s.clearingRound=round;}
 s.plays[key]=count(s.plays[key]+1);
}
