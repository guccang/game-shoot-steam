import {debugEquipmentMaxed,debugBuildingsUnlocked,debugSeedsUnlocked} from '../../progression/debug-grants.js';
import { i18nText } from "../../i18n/index.js";
// 设置与清空确认面板，确认仅调用应用事务，不自行操作存档或战场。
import { createEventScope } from '../../platform/events.js';
import { createMobileHud } from '../mobile-hud.js';
import {createBuildFingerprint} from './build-fingerprint.js';
import {createFpsDisplay} from '../fps-display.js';
import {createArtStyleControl} from '../art-style-control.js';
// 统一设置、二次确认与嵌套玩法说明的入口。
export function createSettingsPanel({ root, dialogs, game, onReset, onUnlock, onDebugGrant, preferences, onPreferencesChange, onArtStyleChange=()=>{} }) {
  const $ = (id) => root.getElementById(id),
    scope = createEventScope(), mobileHud = createMobileHud(root,()=>!!game.realm);
  const buildFingerprint=createBuildFingerprint(root);
  const fpsDisplay=createFpsDisplay(root,preferences);
  const artStyleControl=createArtStyleControl(root,onArtStyleChange);
  const exportButton=root.createElement('button');exportButton.textContent=i18nText("ui.panels.settings.f551a01ce8");exportButton.id='export-economy';
  $('debug-content').append(exportButton);
  const balanceLink=root.createElement('a');balanceLink.href='/balance.html';balanceLink.target='_blank';balanceLink.rel='noopener';balanceLink.textContent=i18nText("ui.panels.settings.d318deec6d");$('debug-content').append(balanceLink);
  scope.on(exportButton,'click',()=>{
    const blob=new Blob([JSON.stringify({version:1,profile:'recommended',ledger:game.progress.economyLog},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=root.createElement('a');a.href=url;a.download='forest-economy-log.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  $('pause-on-blur').checked = preferences.pauseOnBlur;
  $('show-fps').checked=preferences.showFps;
  // 显示设置独立保存，不改变游戏速度、暂停归属或性能日志开关。
  scope.on($('show-fps'),'change',()=>{
    preferences.showFps=$('show-fps').checked;fpsDisplay.sync();onPreferencesChange();
  });
  // 原生复选框支持键盘与触屏，修改后立即生效并交由应用保存。
  scope.on($('pause-on-blur'), 'change', () => {
    preferences.pauseOnBlur = $('pause-on-blur').checked;
    onPreferencesChange();
  });
  // 确认页默认聚焦取消，重新打开时清理上次写入错误。
  function showResetConfirmation(confirming, restoreFocus = true) {
    $('settings-options').hidden = confirming;
    $('reset-confirmation').hidden = !confirming;
    $('reset-error').hidden = true;
    $('reset-error').textContent = '';
    if (restoreFocus) $(confirming ? 'cancel-reset' : 'reset-progress').focus({ preventScroll: true });
  }
  // 已全部拥有时禁用重复解锁，重新开局后恢复入口。
  function renderUnlock() {
    const complete = game.progress.weapons.every((level) => level > 0);
    $('unlock-weapons').disabled = complete;
    $('unlock-weapons').textContent = complete ? i18nText("ui.panels.settings.660770865b") : i18nText("ui.panels.settings.05d199c8e9");
    $('unlock-buildings').disabled=debugBuildingsUnlocked(game.progress);
    $('unlock-buildings').textContent=$('unlock-buildings').disabled?'建筑已全部解锁':'一键解锁所有建筑';
    $('unlock-seeds').disabled=debugSeedsUnlocked(game.progress);
    $('unlock-seeds').textContent=$('unlock-seeds').disabled?'所有种子购买已解锁':'解锁所有种子购买';
    $('unlock-vehicles').disabled = game.progress.vehicleHulls.every(level=>level>0);
    for(const [id,label] of [['max-weapons','武器'],['max-vehicles','载具']]){const complete=debugEquipmentMaxed(game.progress,id);$(id).disabled=complete;$(id).textContent=complete?`${label}已全部满级`:`一键${label}满级`;}
  }
  // 持久化失败时保留确认页和旧进度，成功才关闭设置。
  function clearProgress() {
    if (!$('settings-dialog').open || $('reset-confirmation').hidden) return;
    if (!onReset()) {
      $('reset-error').textContent = i18nText("ui.panels.settings.63e0402913");
      $('reset-error').hidden = false;
      return;
    }
    dialogs.close('settings-dialog');
  }
  dialogs.register('settings-dialog', {
    onOpen: () => {
      showResetConfirmation(false, false);
      // 每次打开从常用设置开始，调试区保持折叠，存档管理单独展示。
      $('settings-advanced').open = false;
      root.querySelector('.settings-scroll').scrollTop = 0;
      renderUnlock();
      $('unlock-feedback').textContent = '';
      $('debug-content').hidden = true;
      $('debug-toggle').setAttribute('aria-expanded','false');
    },
    focusId: 'close-settings',
  });
  scope.on($('settings-button'), 'click', () => dialogs.open('settings-dialog'));
  // 原生弹窗显示后才有滚动尺寸，避免隐藏状态下重置无效而恢复旧位置。
  scope.on($('settings-dialog'), 'toggle', event => {
    if (event.newState === 'open' && $('reset-confirmation').hidden)
      root.querySelector('.settings-scroll').scrollTop = 0;
  });
  for (const id of ['close-settings', 'settings-done'])
    scope.on($(id), 'click', () => dialogs.close('settings-dialog'));
  scope.on($('reset-progress'), 'click', () => showResetConfirmation(true));
  scope.on($('unlock-weapons'), 'click', () => {
    const success = onUnlock();
    $('unlock-feedback').textContent = success
      ? i18nText("ui.panels.settings.84292d10e8")
      : i18nText("ui.panels.settings.cfef1b0aa3");
    renderUnlock();
  });
  // 调试信息默认收起，每次打开设置都恢复折叠，避免普通设置充满诊断数据。
  scope.on($('debug-toggle'),'click',()=>{
    const open=$('debug-content').hidden;$('debug-content').hidden=!open;
    $('debug-toggle').setAttribute('aria-expanded',String(open));
  });
  for(const [id,kind,message] of [['unlock-seeds','seed-purchases','所有种子购买已解锁，可到种子小屋花费金币购买，进度已保存。'],['unlock-buildings','buildings','所有建筑已修复解锁，入职修复引导已结束，进度已保存。'],['unlock-vehicles','vehicles',i18nText("ui.panels.settings.22b40ae8a8")],['grant-resources','resources',i18nText("ui.panels.settings.83651e84f3")],['max-weapons','max-weapons','全部武器及可升级部件已满级，进度已保存。'],['max-vehicles','max-vehicles','全部载具、炮塔及可升级部件已满级，进度已保存。']])
    scope.on($(id),'click',()=>{
      $('unlock-feedback').textContent=onDebugGrant(kind)?message:i18nText("ui.panels.settings.1262d9ba91");renderUnlock();
    });
  scope.on($('cancel-reset'), 'click', () => showResetConfirmation(false));
  scope.on($('confirm-reset'), 'click', clearProgress);
  scope.on($('settings-dialog'), 'cancel', (event) => {
    if (!$('reset-confirmation').hidden) {
      event.preventDefault();
      showResetConfirmation(false);
    }
  });
  dialogs.register('help-dialog');
  scope.on($('help'), 'click', () => dialogs.open('help-dialog'));
  for (const id of ['close-help', 'help-ok'])
    scope.on($(id), 'click', () => dialogs.close('help-dialog'));
  // 面板卸载时同时恢复移动端搬移的节点。
  function dispose() {
    scope.dispose();
    mobileHud.dispose();
    buildFingerprint.dispose();
    fpsDisplay.dispose();
    artStyleControl.dispose();
    exportButton.remove();balanceLink.remove();
  }
  return { dispose, syncRealm:mobileHud.syncRealm, recordFrame:fpsDisplay.recordFrame };
}
