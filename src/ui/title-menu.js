import { i18nText } from "../i18n/index.js";
// 主菜单只提交导航意图，存档写入与游戏生命周期由应用控制。
import {createEventScope} from '../platform/events.js';
import {createTitleVideo} from '../platform/title-video.js';
import {HEROES} from '../config/heroes.js';
import {MAPS} from '../world/maps.js';
import {REALMS} from '../config/realms.js';
import {STORY_CAMPAIGN} from '../config/story-campaign.js';
import {clearingRound} from './clearing-round.js';
// 读取当前正式成长与章节摘要，不另造展示存档。
export function titleSummary(game) {
  const p=game.progress,hero=HEROES[p.hero];
  // 未进入时直接读取存档摘要，不为首页生成场景。
  const realm=game.realm||(game.worldPending?p.realms.run:null),story=game.story||(game.worldPending?p.story.run:null);
  const place=realm?REALMS[realm.mode].name:story?STORY_CAMPAIGN[story.chapterId].title:MAPS.find(m=>m.id===game.mapId)?.name||i18nText("ui.title-menu.9c72997020");
  return i18nText("ui.title.summary", { p0: hero.name, p1: p.heroes[p.hero], p2: place, p3: realm || story ? '' : ` · 第 ${clearingRound(game)} 轮清缴` });
}
// 首页固定一个开始入口，已有存档直接继续，清空操作仅由设置处理。
export function createTitleMenu({root,host,game,shell,dialogs,onEnter,onHome}) {
  const $=id=>root.getElementById(id),scope=createEventScope();
  const video=createTitleVideo({root,host,active:()=>shell.page==='title'});
  // 刷新只更新文本和可见性，保留键盘焦点与单一媒体节点。
  function render() {
    const home=shell.page==='title';
    $('game-frame').dataset.page=shell.page;$('title-menu').hidden=!home;
    $('title-menu').dataset.loading=String(shell.loading);$('title-menu').inert=shell.loading;
    for(const node of $('game-frame').children)if(node.id!=='title-menu'&&node.id!=='start-loading')node.inert=home;
    $('start').disabled=!shell.ready||shell.loading||shell.failed||shell.saveStatus==='corrupt';
    $('start').setAttribute('aria-busy',String(!shell.ready||shell.loading));
    const warning=shell.failed?'地图准备失败，请刷新后重试。':shell.saveStatus==='corrupt'?i18nText('ui.title-menu.b63a1a6bdc'):shell.saveStatus==='unavailable'?i18nText('ui.title-menu.e842016a6d'):'';
    $('title-save-warning').textContent=warning;$('title-save-warning').hidden=!warning;
    $('settings-home').hidden=home;
    $('settings-done').textContent=home?i18nText("rendering.visual-review.e34e61a243"):i18nText("ui.title-menu.871430cf08");
  }
  scope.on($('start'),'click',onEnter);
  scope.on($('title-settings'),'click',()=>dialogs.open('settings-dialog'));
  scope.on($('settings-home'),'click',onHome);
  scope.on(host,'keydown',event=>{if(event.code==='Escape'&&!root.querySelector('dialog[open]')&&shell.page==='game'){event.preventDefault();if(game.state==='playing'||game.canExploreRealm){game.pause();root.getElementById('settings-button').focus();}render();}});
  // 页面改变时才同步播放，避免每帧重复调用媒体API。
  function changed(){render();video.sync();}
  // 卸载菜单和媒体监听，不向玩法弹窗注入设置入口。
  function dispose(){scope.dispose();video.dispose();}
  render();return {render,changed,dispose};
}
