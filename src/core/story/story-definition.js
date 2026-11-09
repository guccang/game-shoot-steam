import {equipmentStoryCompleted} from '../../config/equipment-quests.js';
import { i18nText } from "../../i18n/index.js";
// 章节内容查询与声明式条件解释；不包含具体阶段编号、人物名或任务路线。
import {STORY_CHAPTER} from '../../config/story.js';
import {STORY_CAMPAIGN} from '../../config/story-campaign.js';

// 显式会话或ID查询，不能用全局当前章节污染另一实例或存档。
export function storyDefinition(context){const id=typeof context==='string'?context:context?.story?.chapterId||context?.chapterId||STORY_CHAPTER.id;
  if(!Object.hasOwn(STORY_CAMPAIGN,id))throw Error(i18nText("core.story-definition.9d9a40a51b", { p0: (id) }));return STORY_CAMPAIGN[id];}
// 章节前置只读取已提交完成记录，重玩不撤销后续开放。
export function storyUnlocked(progress,id){return (storyDefinition(id).requires||[]).every(key=>equipmentStoryCompleted(progress,key));}
// 缺失阶段明确报错，避免错误配置静默退回另一个任务。
export function storyNode(game){const r=game.story;if(!r)return null;
  const nodes=storyDefinition(game).nodes,node=Object.hasOwn(nodes,r.stageId)?nodes[r.stageId]:null;if(!node)throw Error(i18nText("core.story-definition.b7221bdd89", { p0: (r.stageId) }));return node;}
// 回营标记仅用于结尾交付与自由移动判断，不参与营地建筑显隐。
export function storyCampReturn(game){return game.mapId==='forest'&&!game.realm&&storyNode(game)?.campReturn===true;}
// 已读完结尾且满足交付条件才解除移动锁定，交谈和整备仍保留暂停。
export function storyDeliveryReady(game){const r=game.story,node=storyNode(game);return !!r&&storyCampReturn(game)&&r.phase==='prepare'&&!r.dialogue&&node.panel?.type==='claim'&&!!node.claimWhen&&storyCondition(r,node.claimWhen);}
// 点路径只读会话自身属性，不执行表达式或读取原型。
export function storyRead(run,path){return path.split('.').reduce((v,k)=>v&&Object.hasOwn(v,k)?v[k]:undefined,run);}
// 组合条件覆盖完成旗标、已读段落、阶段与运行状态，未知操作明确失败。
export function storyCondition(run,condition){
  if(condition===undefined||condition===true)return true;if(condition===false)return false;
  if('all' in condition)return condition.all.every(c=>storyCondition(run,c));
  if('any' in condition)return condition.any.some(c=>storyCondition(run,c));
  if('not' in condition)return !storyCondition(run,condition.not);
  if('flag' in condition)return run?.flags?.[condition.flag]===true;
  if('read' in condition)return !!run?.readLines?.includes(condition.read);
  if('stage' in condition)return run?.stageId===condition.stage;
  if('path' in condition){const v=storyRead(run,condition.path);return 'equals' in condition?v===condition.equals:!!v;}
  throw Error(i18nText("core.story-definition.9d76436c43", { p0: (JSON.stringify(condition)) }));
}
// 道具绑定仅支持常量、会话字段、布尔条件和二选一，数据可完整导出JSON。
export function storyValue(run,value){
  if(value===null||typeof value!=='object')return value;
  if('when' in value)return storyValue(run,storyCondition(run,value.when)?value.then:value.else);
  if('path' in value)return storyRead(run,value.path)??value.fallback;
  return storyCondition(run,value);
}
// 文案占位符统一从显式上下文取值，不拼接可执行脚本。
export function storyText(text,values={}){return String(text??'').replace(/\{([\w]+)\}/g,(_,key)=>String(values[key]??0));}
// 站点偏移统一用于移动、人物和摆件，避免显示与交互采用两套坐标。
export function storyPosition(spec,context){const point=storyDefinition(context).world.sites[spec.site];
  if(!point)throw Error(i18nText("core.story-definition.0f28701cc8", { p0: (spec.site) }));return {x:point.x+(spec.dx||0),y:point.y+(spec.dy||0)};}
// 场景生命周期由清理表控制，完成或暂离后会话不存在，实体自然退出绘制列表。
export function storySceneActive(game){const rule=storyDefinition(game).cleanup.scene;
  return rule.lifetime==='session'&&!!game.story&&game.mapId===rule.mapId&&(!rule.hideInRealm||!game.realm);}
// 敌人攻击的保护对象由当前阶段声明，敌人系统无需识别阶段编号。
export function storyTarget(game){const id=storyNode(game)?.target;return id?game.story[id]:null;}
// 清理范围来自配置，仅操作当前会话；原森林现场由会话退出恢复。
export function clearStoryState(game,rule){
  for(const key of rule.arrays||[])game[key]=[];
  for(const key of rule.nulls||[])game[key]=null;
  for(const key of rule.playerDelete||[])delete game.player[key];
  if(rule.effects)game.fx.items=[];
  if(rule.run)Object.assign(game.story,structuredClone(rule.run));
  for(const key of rule.flags||[])game.story.flags[key]=true;
}
