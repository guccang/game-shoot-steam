import { i18nText, i18nHtml } from "../../i18n/index.js";
// 机械核心整队枪架配置，使用正式机械猫与枪械绘制，不改变出战装备。
import { createEventScope } from '../../platform/events.js';
import { mechanicalChoices, MECHANICAL_RECALL_COST } from '../../config/mechanical-loadout.js';
import { effectiveWeapon, weaponDamage } from '../../config/weapon-mods.js';
import { drawMechanicalLoadout } from '../../rendering/mechanical-armed.js';
// 独立弹窗继承原生暂停、焦点和键盘按钮操作。
export function createMechanicalPanel({game,root,dialogs,commit,onChange}) {
  const scope=createEventScope(),dialog=root.createElement('dialog');
  dialog.id='mechanical-dialog';dialog.setAttribute('aria-labelledby','mechanical-title');
  dialog.innerHTML=`<button class="close" id="close-mechanical" aria-label="${i18nHtml("ui.panels.mechanical.4f5b854798")}">×</button><h2 id="mechanical-title">${i18nHtml("ui.panels.mechanical.0238a8a5dd")}</h2>
    <p class="mechanical-caption">${i18nHtml("ui.panels.mechanical.79e78a41a5")}</p><div class="mechanical-vitals"><span id="mechanical-hp"></span><span>${i18nHtml("ui.panels.mechanical.0d0799df78", { p0: (MECHANICAL_RECALL_COST) })}</span></div>
    <div id="mechanical-choices"></div><p id="mechanical-feedback" role="status"></p><button id="mechanical-done">${i18nHtml("ui.panels.mechanical.8bfc704ed0")}</button>`;
  root.body.append(dialog);const $=id=>root.getElementById(id);
  // 每张卡片展示装在机械猫背上的实际枪械，清楚区别原生近战与远程跟随。
  function render() {
    const p=game.progress,current=p.mechanicalLoadout;
    $('mechanical-hp').textContent=Number.isInteger(current)?i18nText("ui.panels.mechanical.04f828ddc9"):i18nText("ui.panels.mechanical.8e32541463");
    $('mechanical-choices').innerHTML=mechanicalChoices(p).map(index=>{
      const preview={...p,mechanicalLoadout:index},w=effectiveWeapon(preview,index??15),selected=index===current;
      return `<button data-mechanical-gun="${index??'melee'}" aria-pressed="${selected}"><canvas width="240" height="150" aria-hidden="true"></canvas><b>${index===null?i18nText("ui.panels.mechanical.3618fa7ffb"):w.name}</b><small>${index===null?i18nText("ui.panels.mechanical.257883dcad"):i18nText("ui.panels.mechanical.694c2a681f")}<br>${i18nHtml("ui.panels.mechanical.0e8b7085dd", { p0: (weaponDamage(preview,index??15)) })}</small><span>${selected?i18nText("ui.panels.mechanical.248c9dbe8b"):index===null?i18nText("ui.panels.mechanical.782ff3452c"):i18nText("ui.panels.mechanical.3d55949667")}</span></button>`;
    }).join('');
    for(const button of $('mechanical-choices').children) {
      const index=button.dataset.mechanicalGun==='melee'?null:+button.dataset.mechanicalGun,c=button.querySelector('canvas').getContext('2d');
      drawMechanicalLoadout(c,p,index);
    }
  }
  dialogs.register('mechanical-dialog',{onOpen:()=>{render();$('mechanical-feedback').textContent=i18nText("ui.panels.mechanical.589d98ed24");},focusId:'close-mechanical'});
  scope.on(root,'click',event=>{if(event.target.closest('[data-mechanical-config]')&&!game.realm)dialogs.open('mechanical-dialog');});
  scope.on($('mechanical-choices'),'click',event=>{
    const button=event.target.closest('[data-mechanical-gun]');if(!button)return;
    const key=button.dataset.mechanicalGun,index=key==='melee'?null:+key,result=commit(index);
    if(result.ok){render();onChange();$('mechanical-choices').querySelector(`[data-mechanical-gun="${key}"]`).focus();}
    $('mechanical-feedback').textContent=result.ok?i18nText("ui.panels.mechanical.92011e894e"):result.reason;
  });
  for(const id of ['close-mechanical','mechanical-done'])scope.on($(id),'click',()=>dialogs.close('mechanical-dialog'));
  // 关闭释放候选画布，与蜘蛛配置共用同一峰值预算。
  scope.on(dialog,'close',()=>{$('mechanical-choices').replaceChildren();});
  return {dispose(){scope.dispose();dialog.remove();}};
}
