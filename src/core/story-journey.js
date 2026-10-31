import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
import { i18nText } from "../i18n/index.js";
// 体验事件与短气泡调度：仅读取正式战斗结果，不改变生命、伤害、敌人数量或任务完成条件。
import {storyDefinition,storyNode,storyCondition} from './story-definition.js';

// 当前借用装备对应一个可选发现；目标名称和反馈都来自表。
export function loadoutExperience(run){return Object.entries(storyDefinition(run).journey.experiences).find(([,e])=>e.loadout===run?.loadoutId);}
// 事件匹配仅支持相等与数字下限，不执行配置中的脚本。
export function matchesStoryEvent(detail,match={}){return Object.entries(match).every(([key,value])=>
  value&&typeof value==='object'?Number.isFinite(detail[key])&&detail[key]>=value.min:detail[key]===value);}
// 分支在首次开始该段对白时锁定，日志不会因后续换装备而改写已经说过的话。
export function storyDialogueEntries(run,key,remember=false){
  const def=storyDefinition(run).dialogues[key];if(!def)return [];
  const saved=run?.dialogueChoices?.[key];
  const variant=saved!==undefined?def.variants?.find(v=>v.id===saved):def.variants?.find(v=>storyCondition(run,v.when));
  if(remember){run.dialogueChoices??={};run.dialogueChoices[key]=variant?.id||'base';}
  const lines=def.lines.map(line=>[...line]);
  if(variant?.line)lines[variant.replace]=[...variant.line];
  if(variant?.append)lines.push(...variant.append.map(line=>[...line]));
  // 选项占位符只从当前章节白名单取显示名，不能注入任意存档文本。
  return lines.map(([speaker,text])=>[speaker,text.replace(/\{(\w+)\}/g,(_,key)=>storyDefinition(run).choices?.[key]?.find(o=>o.id===run?.choices?.[key])?.label||i18nText("core.story-journey.ac95005f09"))]);
}
// 对外日志保留显示名称；场景定位使用上面的稳定人物 ID。
export function storyDialogueLines(run,key,remember=false){
  return storyDialogueEntries(run,key,remember).map(([speaker,text])=>[storyDefinition(run).actors[speaker].name,text]);
}
// 可选目标只显示当前任务需要的一个发现，未完成不改变主线交互。
export function storyExperienceGoal(game){
  const run=game.story;if(!run)return null;
  const choice=run.trial?'loadout':storyNode(game).experience;
  const pair=choice==='loadout'?loadoutExperience(run):choice?[choice,storyDefinition(game).journey.experiences[choice]]:null;
  if(!pair?.[1])return null;const [id,spec]=pair,done=!!run.experiences?.[id];
  return {id,done,text:done?spec.success:spec.goal};
}
// 队列有界；紧急来敌提示优先，普通成功反馈只在安全间隙展示。
function queueCue(game,cue){
  const r=game.story,cfg=storyDefinition(game).journey.speech;
  r.seenCues??=[];r.cueQueue??=[];
  if(cue.once!==false&&r.seenCues.includes(cue.id)||r.activeCue?.id===cue.id||r.cueQueue.some(c=>c.id===cue.id))return;
  const text=cue.experienceText?loadoutExperience(r)?.[1][cue.experienceText]:cue.text;
  if(!text)return;
  const item={...cue,text,priority:cue.priority||0,remaining:cfg.duration,age:0};
  if(item.priority>(r.activeCue?.priority??Infinity)){r.cueQueue.unshift(r.activeCue);r.activeCue=null;r.cueGap=0;}
  r.cueQueue.push(item);r.cueQueue.sort((a,b)=>b.priority-a.priority);r.cueQueue.length=Math.min(r.cueQueue.length,cfg.queueLimit);
}
// 命中来源在正式结算点提供；只有真实满足条件才记录发现与最近实际使用的搭配。
export function recordStoryEvent(game,event,detail={}){
  const r=game.story;if(!r||r.phase!=='active'||game.state!=='playing')return;
  const def=storyDefinition(game);r.experiences??={};
  for(const [id,e] of Object.entries(def.journey.experiences)){
    if(e.event!==event||e.loadout&&e.loadout!==r.loadoutId||!matchesStoryEvent(detail,e.match))continue;
    if(e.loadout)r.lastExperienceLoadout=r.loadoutId;
    if(r.experiences[id])continue;r.experiences[id]=true;
    queueCue(game,{id:'experience:'+id,speaker:e.speaker,text:e.feedback,safeOnly:event!=='charge-end'});
  }
  for(const cue of storyNode(game).cues||[]){
    if(cue.event===event&&matchesStoryEvent(detail,cue.match)&&storyCondition(r,cue.when))queueCue(game,cue);
  }
}
// 仅可见游戏时间推进；画外人物不会让镜头追逐，显示器报告可读后才消耗阅读时长。
export function updateStoryCues(game,dt){
  const r=game.story;if(!r)return;
  r.cueGap=Math.max(0,(r.cueGap||0)-dt);
  const safe=!game.boss&&!game.enemies.some(e=>e.hp>0)||!!r.trial;
  if(r.activeCue){
    if(r.activeCue.visible)r.activeCue.remaining-=dt;
    r.activeCue.age+=dt;
    if(r.activeCue.remaining<=0||r.activeCue.age>GAMEPLAY_VALUES.story.speechMaxSeconds){r.activeCue=null;r.cueGap=storyDefinition(game).journey.speech.gap;}
  }
  if(!r.activeCue&&!r.cueGap){
    const queue=r.cueQueue||[],index=queue.findIndex(c=>!c.safeOnly||safe);
    if(index>=0){r.activeCue=queue.splice(index,1)[0];
      if(r.activeCue.once!==false){r.seenCues??=[];if(!r.seenCues.includes(r.activeCue.id))r.seenCues.push(r.activeCue.id);}}
  }
}
