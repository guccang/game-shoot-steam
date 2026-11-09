import {escapeOptionalHtml as escape} from './shared/html.js';
// 邻里、任务簿与工坊共用中文任务状态，显示与购买校验读取同一永久记录。
import {EQUIPMENT_QUESTS,equipmentStoryCompleted} from '../config/equipment-quests.js';
import {STORY_CAMPAIGN} from '../config/story-campaign.js';
import {WEAPONS} from '../config/weapons.js';
import {COLLECTED_VEHICLES} from '../config/vehicles.js';
import {RESIDENTS} from '../config/living-world.js';

// 配置和动态文案统一转义后进入页面。


// 购买前置与章节解锁一致，主线战果未齐时指向缺少的前章。
export function equipmentQuestStatus(progress,q){
 if(equipmentStoryCompleted(progress,q.chapter))return {text:'故事已完成 · 已开放购买',action:'查看故事',ready:true,target:q.chapter};
 const run=progress.story?.run;
 if(run&&run.chapterId!==q.chapter)return {text:`已有《${STORY_CAMPAIGN[run.chapterId].title}》进行中，可完成或返回接取地点取消后接取`,action:'查看当前任务',target:run.chapterId};
 if(run?.chapterId===q.chapter){const node=STORY_CAMPAIGN[q.chapter].nodes[run.stageId];
  return {text:node?.claimWhen?'返回委托人交付后开放购买':`进行中：${node?.title||'继续现场任务'}`,action:'继续任务',target:q.chapter};}
 const missing=q.requires.find(id=>!equipmentStoryCompleted(progress,id));
 if(missing)return {text:'先完成《'+STORY_CAMPAIGN[missing].title+'》，取得下一战所需的战果',action:'查看前章',target:missing};
 return {text:'尚未接取 · '+RESIDENTS.find(r=>r.id===q.host).name,action:'查看故事',target:q.chapter};
}

// 简短单列目录复用邻里请求样式；查看不会自动切换当前导航。
export function equipmentQuestCards(progress,host=null,chapter=null){
 return EQUIPMENT_QUESTS.filter(q=>(!host||q.host===host)&&(!chapter||q.chapter===chapter)).map(q=>{
  const state=equipmentQuestStatus(progress,q),item=(q.kind==='vehicle'?COLLECTED_VEHICLES:WEAPONS).find(e=>e.id===q.equipment);
  return `<article class="living-request" data-equipment-quest="${q.chapter}"><small>${escape(item.name)} · 购买资格</small><h3>${escape(q.title)}</h3><p>${escape(state.text)}</p><button class="ui-button" data-equipment-story="${q.chapter}">查看故事</button></article>`;
 }).join('');
}
