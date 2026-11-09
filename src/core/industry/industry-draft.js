// 机器备料只记录玩家的投料意图，正式开工仍由原工业事务一次性扣除真实库存。
import {INDUSTRY_RECIPES,INDUSTRY_GOODS} from '../../config/industry.js';
import {canUseIndustry,industryMaterialSources,startIndustry} from './industry.js';
// 切换配方或数量创建新草稿；草稿不进入存档，关闭不损失任何实物。
export function createIndustryDraft(recipe,count=1){return {recipe,count,loaded:[]};}
// 拖放与点击共用相同规则，未开工前原料被其他操作消耗时再次核对。
export function stageIndustryMaterial(game,id,draft,key){const r=INDUSTRY_RECIPES.find(r=>r.id===draft.recipe&&r.site===id);if(!canUseIndustry(game,id))return {ok:false,message:'请进厂后再投料。'};if(!r||!Object.hasOwn(r.input,key)||!Number.isSafeInteger(draft.count)||draft.count<1||draft.count>99)return {ok:false,message:'请先选择有效配方和1至99份数量。'};if(game.progress.industry.sites[id].job)return {ok:false,message:'机器正在运转，请等这一批完成。'};const need=r.input[key]*draft.count,have=industryMaterialSources(game,id,key).total;if(have<need)return {ok:false,message:INDUSTRY_GOODS[key].name+'不足，还缺'+(need-have)+'份。'};if(!draft.loaded.includes(key))draft.loaded.push(key);return {ok:true,message:INDUSTRY_GOODS[key].name+' ×'+need+'已备好，启动时统一扣料。'};}
// 已备好的每一种原料都必须符合当前配方；库存扣减、时间和产出沿用正式生产事务。
export function startIndustryDraft(game,id,draft,now=Date.now()){const r=INDUSTRY_RECIPES.find(r=>r.id===draft.recipe&&r.site===id);if(!r||Object.keys(r.input).some(k=>!draft.loaded.includes(k)))return {ok:false,message:'请把本批需要的材料都放入投料口。'};return startIndustry(game,id,r.id,draft.count,now);}
// 动画与进度条读取同一绝对批次时间；到期保存未成功时维持待结算状态。
export function industryMachineState(job,now=Date.now()){const r=INDUSTRY_RECIPES.find(r=>r.id===job?.recipe);if(!r)return {running:false,ratio:0,phase:0,remaining:0};const duration=r.seconds*job.count*1000,elapsed=Math.max(0,Math.min(duration,now-(job.readyAt-duration)));return {running:now<job.readyAt,ratio:elapsed/duration,phase:elapsed/1000,remaining:Math.max(0,Math.ceil((job.readyAt-now)/1000))};}
