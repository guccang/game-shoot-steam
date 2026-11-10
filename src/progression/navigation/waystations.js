import {WAYSTATION_STYLES,waystationStyle} from '../../config/waystation-styles.js';
// 自建驿站持久化地点和已购外观，未完成行程不跨读档自动驾驶。
import {canonical} from '../../world/coordinates.js';
import {WAYSTATIONS,WAYSTATION_NAME_HEADS as HEADS,WAYSTATION_NAME_TAILS as TAILS,waystationPurpose} from '../../config/waystations.js';
import {waystationLandmarkName} from '../../world/waystation-landmarks.js';
// 只校正旧系统随机名和默认占位名，不改玩家在历史版本留下的自定义名称。
const automaticNames=new Set(['林间驿站',...HEADS.flatMap(head=>TAILS.map(tail=>head+tail))]);
// 读档只校正附近旧随机名；编号、历史自定义名和位置保留，用途缺省时归通用。
export function normalizeWaystations(raw){
 const ownedStyles=[...new Set(['wood',...(Array.isArray(raw?.ownedStyles)?raw.ownedStyles:[]).filter(id=>WAYSTATION_STYLES.some(s=>s.id===id))])],sites=[],ids=new Set();
 for(const site of Array.isArray(raw?.sites)?raw.sites:[]){
  if(sites.length>=WAYSTATIONS.limit)break;
  if(!site||!Number.isFinite(site.x)||!Number.isFinite(site.y)||!Number.isSafeInteger(site.id)||site.id<1||site.id>=1000000000||ids.has(site.id))continue;
  const oldName=String(site.name||'').trim().slice(0,16)||'林间驿站',name=automaticNames.has(oldName)?waystationLandmarkName({...site,mapId:'forest'})||oldName:oldName;
  ids.add(site.id);sites.push({id:site.id,name,style:ownedStyles.includes(waystationStyle(site.style).id)?waystationStyle(site.style).id:'wood',purpose:waystationPurpose(site.purpose).id,...canonical(site),mapId:'forest'});
 }
 const next=Number.isSafeInteger(raw?.nextId)&&raw.nextId>0&&raw.nextId<=1000000000?raw.nextId:1;
 return {nextId:Math.max(next,1,...sites.map(s=>s.id+1)),sites,ownedStyles};
}
// 随机起名后避开已用名称；即使随机源反复给同一值也不会重名或死循环。
export function randomWaystationName(sites,random=Math.random){
 const total=HEADS.length*TAILS.length,value=Number(random()),start=Number.isFinite(value)?Math.floor(Math.max(0,Math.min(.999999999,value))*total):0,used=new Set(sites.map(s=>s.name));
 for(let i=0;i<total;i++){const key=(start+i)%total,name=HEADS[key%HEADS.length]+TAILS[Math.floor(key/HEADS.length)];if(!used.has(name))return name;}
 throw Error('驿站名称组合已用完');
}
