// 本地经济账本仅记录已发生的收入支出，摘要累积、事件有界，不上传服务器。
import { RESOURCE_KEYS } from '../config/economy.js';
const LIMIT=600;
// 新建空账本，避免新档和旧档共用可变引用。
export function freshLedger(){return {version:1,seconds:0,activities:{},income:{},expense:{},events:[],discarded:0};}
// 恢复时限制数据规模和字段；任何钱包仍以正式进度为准。
export function validateLedger(raw){
  const value=freshLedger();
  if(raw?.version!==1)return value;
  for(const key of ['seconds','discarded'])if(Number.isFinite(raw[key])&&raw[key]>=0)value[key]=Math.min(1e12,raw[key]);
  for(const group of ['activities','income','expense'])
    for(const [key,n] of Object.entries(raw[group]||{}).slice(0,2048))
      if(/^[a-z0-9:.-]+$/i.test(key)&&Number.isFinite(n)&&n>=0)value[group][key]=Math.min(1e12,n);
  value.events=(Array.isArray(raw.events)?raw.events:[]).slice(-LIMIT).filter(e=>e&&Number.isFinite(e.at)&&e.at>=0&&typeof e.type==='string'&&typeof e.source==='string')
    .map(e=>({at:e.at,type:e.type.slice(0,30),source:e.source.slice(0,80),
      amounts:Object.fromEntries(RESOURCE_KEYS.filter(k=>Number.isFinite(e.amounts?.[k])&&e.amounts[k]>0).map(k=>[k,Math.min(1e12,e.amounts[k])]))}));
  return value;
}
// 游戏层以可见有效时钟传入秒数，暂停与后台不调用；局内休整同样计入成本。
export function advanceLedger(progress,seconds,activity){
  if(!Number.isFinite(seconds)||seconds<=0)return;
  const l=progress.economyLog ||=freshLedger();
  l.seconds+=seconds;l.activities[activity]=(l.activities[activity]||0)+seconds;
}
// 同一事务只在成功路径记录；试装副本不写正式账本。
export function recordEconomy(progress,type,source,amounts={}){
  const l=progress.economyLog ||=freshLedger(),clean={};
  for(const key of RESOURCE_KEYS){
    const n=amounts[key];
    if(Number.isFinite(n)&&n>0){clean[key]=n;if(['income','expense'].includes(type)){
      const name=source+':'+key;l[type][name]=(l[type][name]||0)+n;
    }}
  }
  // 连续击杀合并到同分钟同来源，避免每只怪写一整条事件。
  const last=l.events.at(-1);
  if(type==='income'&&last?.type===type&&last.source===source&&Math.floor(last.at/60)===Math.floor(l.seconds/60)){
    for(const [key,n] of Object.entries(clean))last.amounts[key]=(last.amounts[key]||0)+n;
    return;
  }
  l.events.push({at:Math.round(l.seconds),type,source,amounts:clean});
  if(l.events.length>LIMIT){l.events.shift();l.discarded++;}
}
