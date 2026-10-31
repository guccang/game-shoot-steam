import { HELP_EMBLEM } from './help-emblem.js';
import { i18nText, i18nHtml } from "../i18n/index.js";
// 故事奖励展示只读取配置和永久记录，首通、重玩与整组领取保持同一来源。
import {storyTypeIcon} from './story-icons.js';
import {resourceIcon,resourceName} from '../rendering/resource-icons.js';
import {storyCollectionStatus,ownsStoryEquipment,storyEquipmentName,storyCollectionChoice} from '../progression/story-rewards.js';
// 所有配置文案按普通文本转义，避免把装备名字解释为 HTML。
const esc=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// 单篇主视图只展示本次可领取的资源；首通和重玩解释移到说明页。
export function storyRewardMarkup(def,record){
 if(record?.rewardClaimed)return '';
 const items=Object.entries(def.reward).filter(([,n])=>n>0);
 if(!items.length)return '';
 return `<div class="story-rewards" aria-label="${i18nHtml("ui.story-rewards.baed36af79")}"><div>${items.map(([key,n])=>`<span>${resourceIcon(key)}<strong aria-label="${esc(resourceName(key))} +${n}" title="${esc(resourceName(key))}">+${n}</strong></span>`).join('')}</div></div>`;
}
// 整组赠礼默认只占一行，展开后展示实际选择；规则与折算额放入问号说明。
export function storyCollectionMarkup(progress,post,near){
 if(!post?.collection)return '';
 const c=post.collection,s=storyCollectionStatus(progress,post);
 const cards=c.options.map(o=>{
  const selected=s.claimed===o.id,resources=o.kind==='resources';
  const contents=resources?storyRewardMarkup({reward:o.resources},null):'';
  const state=s.claimed?(selected?i18nText("ui.story-rewards.5fdddf2e66"):i18nText("ui.story-rewards.2a1f5b5694")):!s.ready?i18nText("ui.story-rewards.7f750504c5"):progress.story.run?i18nText("ui.story-rewards.4ff8d7e1d0"):!near?i18nText("ui.story-rewards.733291b49c"):i18nText("ui.story-rewards.844ab94772");
  return `<article><small>${resources?i18nText("ui.story-rewards.4a232ccc67"):o.kind==='vehicle'?i18nText("app.game-events.8f9f50d425"):i18nText("ui.story-rewards.4fe131173e")}</small><b>${esc(storyEquipmentName(o))}</b>${contents}<button data-story-prize="${esc(o.id)}" data-story-board="${esc(post.id)}" ${s.ready&&!s.claimed&&near&&!progress.story.run?'':'disabled'}>${state}</button></article>`;
 }).join('');
 return `<details class="story-collection" data-story-disclosure="collection-${esc(post.id)}"><summary>${storyTypeIcon('gift')}<b>${esc(c.title)}</b><span>${s.count} / ${s.total}${s.claimed?' ✓':s.ready?i18nText("ui.story-rewards.e90d90fb23"):''}</span></summary><div class="story-collection-tools"><span>${storyCollectionChoice(post)}</span><button data-story-help="collection" aria-label="${i18nHtml("ui.story-rewards.962eb82e69")}" class="story-help-button">${HELP_EMBLEM}</button></div><div class="story-prizes">${cards}</div></details>`;
}
// 赠礼说明使用正式配置与当前所有权，不缓存会过期的领取条件。
export function storyCollectionHelp(progress,post,near){
 if(!post?.collection)return '';
 const c=post.collection,s=storyCollectionStatus(progress,post),chosen=c.options.find(o=>o.id===s.claimed);
 return `<p>${esc(c.text)}</p><p>${i18nHtml("ui.story-rewards.f222255146", { p0: (storyCollectionChoice(post)) })}</p>${c.options.filter(o=>o.kind!=='resources').map(o=>`<p>${i18nHtml("ui.story-rewards.f3ab6f184b", { p0: (esc(storyEquipmentName(o))), p1: (ownsStoryEquipment(progress,o)?i18nText("ui.story-rewards.b5e48fbc19"):i18nText("ui.story-rewards.d97c46512e")), p2: (c.duplicateCoins) })}</p>`).join('')}<p>${i18nHtml("ui.story-rewards.b2c5e2ebd0")}</p>${chosen?`<p>${i18nHtml("ui.story-rewards.4f2d3bba46", { p0: (esc(storyEquipmentName(chosen))) })}</p>`:''}${progress.story.run?`<p>${i18nHtml("ui.story-rewards.d0e046406f")}</p>`:''}${near?'':`<p>${i18nHtml("ui.story-rewards.0280d22d2d", { p0: (esc(post.name)) })}</p>`}`;
}
