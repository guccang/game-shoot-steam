import { i18nText, i18nHtml } from "../i18n/index.js";
// 委托目录的紧凑图标和说明共用正式配置，不改变接取或领取规则。
import {storyRewardMarkup} from './story-rewards.js';
import {escapeStoryText,storyTypeIcon} from './story-icons.js';
// 单行条目仅显示类型、名称和状态；完整状态同时提供给读屏。
export function storyCatalogRow(def,progress,selected,unlocked){
 const done=progress.story.chapters[def.id]?.completed,pending=progress.story.run;
 const disabled=!unlocked||!!pending&&pending.chapterId!==def.id,kind=def.catalogType==='commission'?'commission':'story';
 const state=done?i18nText("ui.story-catalog.624ecd8431"):!unlocked?i18nText("ui.story-catalog.acd7afa383"):disabled?i18nText("ui.story-catalog.9a363b09b2"):i18nText("ui.story-catalog.a0bfbf1512");
 const symbol=done?'✓':disabled?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>':'›';
 return `<button data-story-chapter="${def.id}" aria-pressed="${selected===def.id}" aria-label="${escapeStoryText(i18nText("ui.story.catalogLabel", { p0: kind==='commission'?i18nText("ui.story-catalog.9093b5730c"):i18nText("ui.story-catalog.4c2c5762d3"), p1: def.title, p2: state }))}" title="${escapeStoryText(state)}" ${disabled?'disabled':''}>${storyTypeIcon(kind)}<b>${escapeStoryText(def.title)}</b><span class="story-row-state" aria-hidden="true">${symbol}</span></button>`;
}
// 规则、故事简介及完成记录放在二级说明，不挤占主目录。
export function storyChapterHelp(def,record){
 const choices=Object.entries(record?.choices||{}).map(([key,id])=>{const option=def.choices?.[key]?.find(o=>o.id===id);return option?`<p>${escapeStoryText(option.label)}</p>`:'';}).join('');
 return `<p>${escapeStoryText(def.ui.lead)}</p><h3>${i18nHtml("ui.story-catalog.6a21df238c")}</h3><p>${escapeStoryText(def.ui.role)}</p><p>${i18nHtml("ui.story-catalog.3c0d675aae")}</p><h3>${i18nHtml("ui.story-catalog.9d9a87c03a")}</h3><p>${record?.rewardClaimed?i18nText("ui.story-catalog.1e91dd3dde"):i18nText("ui.story-catalog.8a92ba013a")}</p>${storyRewardMarkup(def,null)||`<p>${i18nHtml("ui.story-catalog.b583008900")}</p>`}${choices}${record?.completed?`<blockquote>${escapeStoryText(def.ui.quote)}<br>——${escapeStoryText(def.ui.author)}</blockquote>`:''}`;
}
