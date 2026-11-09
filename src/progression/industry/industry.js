// 工厂输入、输出和在途货物分别保存，旧档的已精炼金属沿用现有材料钱包。
import {INDUSTRY_GOODS,RAW_INDUSTRY,INDUSTRY_RECIPES,INDUSTRY_CAP} from '../../config/industry.js';
// 只接收已定义的实物与有限正整数，空仓也拥有完整键。
export function industryStock(raw){
 return Object.fromEntries(Object.keys(INDUSTRY_GOODS).map(key=>[key,Math.max(0,Math.min(INDUSTRY_CAP,Math.floor(Number(raw?.[key])||0)))]));
}
// 定时任务保存绝对完成时间；重进时仍只能领取这一个已扣料批次。
export function normalizeIndustry(raw){
 const result={version:1,raw:{},bag:industryStock(raw?.bag),vehicles:{},sites:{}};
 for(const r of Object.values(RAW_INDUSTRY))result.raw[r.ore]=Math.max(0,Math.min(INDUSTRY_CAP,Math.floor(Number(raw?.raw?.[r.ore])||0)));
 for(const [id,stock] of Object.entries(raw?.vehicles||{}))if(/^\d+$/.test(id)&&Number(id)<64)result.vehicles[id]=industryStock(stock);
 for(const id of ['refinery','factory']){
  const site=raw?.sites?.[id],job=site?.job,recipe=INDUSTRY_RECIPES.find(r=>r.id===job?.recipe&&r.site===id);
  result.sites[id]={input:industryStock(site?.input),output:industryStock(site?.output),job:recipe&&Number.isSafeInteger(job.count)&&job.count>0&&job.count<=99&&Number.isFinite(job.readyAt)&&job.readyAt>0?{recipe:recipe.id,count:job.count,readyAt:job.readyAt}:null};
 }
 return result;
}
// 存取入口共用真实货仓，不让仓库数字与在途重量各有一份来源。
export function industryStore(p,key,where,create=false){
 const raw=RAW_INDUSTRY[key];
 if(where==='home'){
  if(key==='wood')return [p,'wood'];
  if(key==='rawStone')return [p.mining,'ore'];
  return raw?[p.industry.raw,raw.ore]:[p.materials,key];
 }
 if(where==='bag'){
  if(key==='wood')return [p.logistics,'bagWood'];
  if(raw)return [p.mining.bagOre,raw.ore];
  return [p.industry.bag,key];
 }
 if(key==='wood')return [p.logistics.builds[where],'wood'];
 if(create&&!p.industry.vehicles[where])p.industry.vehicles[where]=industryStock(null);
 return [p.industry.vehicles[where]||{},key];
}
// 每份工业实物均按半千克计重，木材由原有运输库存计量。
export function industryMass(stock){return Object.entries(stock||{}).reduce((sum,[key,n])=>sum+(key!=='wood'&&INDUSTRY_GOODS[key]?n*.5:0),0);}
