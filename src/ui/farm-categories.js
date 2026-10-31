// 选种和小屋共用四类导航，每个入口保留完整中文名称与当前选中状态。
import {FARM_CATEGORIES,FARM_CROPS} from '../config/farm.js';
// 展示顺序单独缓存，不重排存档依赖的作物配置；同价保持原索引顺序。
const categoryCrops=new Map(FARM_CATEGORIES.map(c=>[c.id,Object.freeze(FARM_CROPS.flatMap((crop,i)=>crop.category===c.id?[{crop,i}]:[]).sort((a,b)=>a.crop.cost-b.crop.cost||a.i-b.i))]));
// 选种与小屋按购种单价从低到高共用同一分类清单，分页前完成排序。
export function farmCategoryCrops(category){return categoryCrops.get(category)||[];}
// 小屋显示永久解锁品种数/总品种数；选种页继续显示库存，零库存隐藏、可见数字封顶99。
export function farmCategoryMarkup(selected,attribute,seeds=[],unlocked=null){
 return '<nav class="farm-categories" aria-label="作物分类">'+FARM_CATEGORIES.map(c=>{
  const crops=farmCategoryCrops(c.id);
  const count=crops.reduce((sum,{i})=>sum+(unlocked?(unlocked[i]?1:0):(seeds[i]||0)),0);
  const label=unlocked?`${c.name}，已解锁${count}种，共${crops.length}种，未解锁${crops.length-count}种`:`${c.name}，库存${count}粒种子`;
  const text=unlocked?`${count}/${crops.length}`:count>0?String(Math.min(count,99)):'';
  return `<button type="button" ${attribute}="${c.id}" aria-label="${label}" title="${label}" aria-pressed="${c.id===selected}"><span aria-hidden="true">${c.short}</span>${text?`<span class="farm-category-count" aria-hidden="true">${text}</span>`:''}</button>`;
 }).join('')+'</nav>';
}
