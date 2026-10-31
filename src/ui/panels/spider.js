import { i18nText, i18nHtml } from "../../i18n/index.js";
// 蜘蛛母体单枪架配置，复用正式母体与挂枪绘制，短标签表达增伤和孵化规则。
import { createEventScope } from '../../platform/events.js';
import { spiderChoices, spiderGunWeapon, spiderGunDamage } from '../../config/spider-loadout.js';
import { effectiveWeapon, weaponDamage } from '../../config/weapon-mods.js';
import { vehicleWeapon, vehicleDamage } from '../../config/vehicles.js';
import { drawSpiderLoadout } from '../../rendering/spider-armed.js';

// 暂停、返回焦点和键盘操作沿用原生弹窗管理。
export function createSpiderPanel({game,root,dialogs,commit,onChange}) {
  const scope=createEventScope(),dialog=root.createElement('dialog');let turret=false;
  dialog.id='spider-dialog';dialog.setAttribute('aria-labelledby','spider-title');
  dialog.innerHTML=`<button class="close" id="close-spider" aria-label="${i18nHtml("ui.panels.spider.4ccec9c631")}">×</button><h2 id="spider-title">${i18nHtml("ui.panels.spider.7cc04ea64d")}</h2><p class="mechanical-caption">${i18nHtml("ui.panels.spider.b1351cce32")}</p><div class="mechanical-vitals"><span>${i18nHtml("ui.panels.spider.95e7475794")}</span><span>${i18nHtml("ui.panels.spider.aecb562d9d")}</span><span>${i18nHtml("ui.panels.spider.d20dce4a30")}</span></div><div id="spider-choices"></div><p id="spider-feedback" role="status"></p><button id="spider-done">${i18nHtml("ui.panels.mechanical.8bfc704ed0")}</button>`;
  root.body.append(dialog);const $=id=>root.getElementById(id);
  // 每个选择显示真实炮型及最终伤害，车载核心只影响原生炮的成长来源。
  function render(){
    const p=game.progress,core=turret?vehicleWeapon(p,16):effectiveWeapon(p,16),damage=turret?vehicleDamage(p,16):weaponDamage(p,16);
    $('spider-choices').innerHTML=spiderChoices(p).map(index=>{
      const preview={...p,spiderLoadout:index},w=spiderGunWeapon(preview,core),selected=index===(p.spiderLoadout??null);
      return `<button data-spider-gun="${index??'native'}" aria-pressed="${selected}"><canvas width="240" height="150" aria-hidden="true"></canvas><b>${index===null?i18nText("ui.panels.spider.458244830d"):w.name}</b><small>${i18nHtml("ui.panels.spider.20de1a1f7d", { p0: (spiderGunDamage(preview,damage)) })}</small><span>${selected?i18nText("ui.panels.mechanical.248c9dbe8b"):i18nText("ui.panels.spider.f8309c1af8")}</span></button>`;
    }).join('');
    for(const button of $('spider-choices').children){
      const index=button.dataset.spiderGun==='native'?null:Number(button.dataset.spiderGun),c=button.querySelector('canvas').getContext('2d');
      drawSpiderLoadout(c,p,core,index);
    }
  }
  dialogs.register('spider-dialog',{onOpen:()=>{render();$('spider-feedback').textContent='';},focusId:'close-spider'});
  scope.on(root,'click',event=>{const button=event.target.closest('[data-spider-config]');if(!button||game.realm)return;turret=button.dataset.spiderKind==='turret';dialogs.open('spider-dialog');});
  scope.on($('spider-choices'),'click',event=>{
    const button=event.target.closest('[data-spider-gun]');if(!button)return;
    const key=button.dataset.spiderGun,result=commit(key==='native'?null:Number(key));
    if(result.ok){render();onChange();$('spider-choices').querySelector(`[data-spider-gun="${key}"]`).focus();}
    $('spider-feedback').textContent=result.ok?i18nText("ui.panels.spider.9d2b1ada70"):result.reason;
  });
  for(const id of ['close-spider','spider-done'])scope.on($(id),'click',()=>dialogs.close('spider-dialog'));
  // 关闭即释放候选画布，不与其他配置面板叠加常驻像素。
  scope.on(dialog,'close',()=>{$('spider-choices').replaceChildren();});
  return {dispose(){scope.dispose();dialog.remove();}};
}
