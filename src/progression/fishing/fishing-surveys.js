// 调查只保存一份当前委托和完成计数，不随无限地下层累积无界历史。
import {FISHING_SURVEYS} from '../../config/fishing-surveys.js';
import {FISH_SPECIES} from '../../config/fish-catalog.js';
const validFish=new Set(FISH_SPECIES.map(f=>f.id));
// 丢弃非法水域、鱼种和进度；旧档没有委托，已有收藏不自动补算。
export function normalizeFishingSurveys(raw){
 const completed=Math.max(0,Math.min(1000000,Math.floor(Number(raw?.completed)||0))),a=raw?.active;
 const valid=a&&typeof a.lakeId==='string'&&a.lakeId.length<=160&&/^(surface:(forest|jiuzhaigou):[\w-]+|mine:\d+:\d+:-?\d+,-?\d+)$/.test(a.lakeId)&&Number.isFinite(a.x)&&Number.isFinite(a.y)&&['forest','jiuzhaigou','mine'].includes(a.water)&&Number.isSafeInteger(a.depth)&&a.depth>=0&&validFish.has(a.target);
 return {completed,active:valid?{lakeId:a.lakeId,water:a.water,depth:a.depth,x:a.x,y:a.y,target:a.target,count:Math.max(0,Math.min(3,Math.floor(Number(a.count)||0))),species:[...new Set((Array.isArray(a.species)?a.species:[]).filter(id=>validFish.has(id)))].slice(0,2)}:null};
}
// 轮次使用固定配置循环；同一委托不可跨湖、跨层刷进度。
export function fishingSurveyDefinition(state){return FISHING_SURVEYS[state.completed%FISHING_SURVEYS.length];}
// 与鱼获入护同事务更新；失败、放流和接单前钓获都不能提前结算。
export function creditFishingSurvey(state,lakeId,fishId){
 const a=state.active;if(!a||a.lakeId!==lakeId)return;const def=fishingSurveyDefinition(state);
 if(def.id==='focus'&&a.target!==fishId)return;
 a.count=Math.min(3,a.count+1);if(!a.species.includes(fishId)&&a.species.length<2)a.species.push(fishId);
}
// 统一读取进度，页面与领取判定保持一致。
export function fishingSurveyProgress(state){const a=state.active;if(!a)return 0;return fishingSurveyDefinition(state).id==='variety'?a.species.length:a.count;}
