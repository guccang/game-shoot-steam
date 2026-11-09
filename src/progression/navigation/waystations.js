// 自建驿站仅持久化地点，未完成行程不跨读档自动驾驶。
import {canonical} from '../../world/coordinates.js';
import {WAYSTATIONS,WAYSTATION_NAME_HEADS as HEADS,WAYSTATION_NAME_TAILS as TAILS} from '../../config/waystations.js';
export function normalizeWaystations(raw){
 const sites=[],ids=new Set();
 for(const site of Array.isArray(raw?.sites)?raw.sites:[]){
  if(sites.length>=WAYSTATIONS.limit)break;
  if(!site||!Number.isFinite(site.x)||!Number.isFinite(site.y)||!Number.isSafeInteger(site.id)||site.id<1||site.id>=1000000000||ids.has(site.id))continue;
  ids.add(site.id);sites.push({id:site.id,name:String(site.name||'').trim().slice(0,16)||'林间驿站',...canonical(site),mapId:'forest'});
 }
 const next=Number.isSafeInteger(raw?.nextId)&&raw.nextId>0&&raw.nextId<=1000000000?raw.nextId:1;
 return {nextId:Math.max(next,1,...sites.map(s=>s.id+1)),sites};
}
// 随机起名后避开已用名称；即使随机源反复给同一值也不会重名或死循环。
export function randomWaystationName(sites,random=Math.random){
 const total=HEADS.length*TAILS.length,value=Number(random()),start=Number.isFinite(value)?Math.floor(Math.max(0,Math.min(.999999999,value))*total):0,used=new Set(sites.map(s=>s.name));
 for(let i=0;i<total;i++){const key=(start+i)%total,name=HEADS[key%HEADS.length]+TAILS[Math.floor(key/HEADS.length)];if(!used.has(name))return name;}
 throw Error('驿站名称组合已用完');
}
