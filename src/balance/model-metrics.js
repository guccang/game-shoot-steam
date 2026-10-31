// 模型共用的随机流、钱包与成长间隔统计；不依赖活动执行器。
import {RESOURCE_KEYS} from '../config/economy.js';
// 固定种子独立于战斗与存档随机状态。
export function seededRandom(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
// 只读永久钱包。
export function wallet(p){return Object.fromEntries(RESOURCE_KEYS.map(k=>[k,k==='coins'||k==='wood'?p[k]:p.materials[k]]));}
// 成长空档包含跨阶段边界与未完成尾段。
export function growthCadence(timeline,end){
  const times=[0,...timeline.filter(e=>e.minute<=end).map(e=>e.minute),end],cadence={};
  for(const [name,min,max] of [['early',0,30],['middle',30,180],['late',180,end]]){
    const gaps=times.slice(1).map((time,i)=>({start:Math.max(min,times[i]),end:Math.min(max,time,end)}))
      .filter(e=>e.end>e.start).map(e=>({...e,minutes:e.end-e.start})).sort((a,b)=>a.minutes-b.minutes);
    cadence[name]={count:gaps.length,p50:gaps.length?gaps[Math.ceil(gaps.length*.5)-1].minutes:null,
      p90:gaps.length?gaps[Math.ceil(gaps.length*.9)-1].minutes:null,max:gaps.at(-1)?.minutes??null,worst:gaps.at(-1)??null};
  }
  return cadence;
}
