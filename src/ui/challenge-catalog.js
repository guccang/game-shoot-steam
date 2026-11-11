// 营地详情展示六档购买优惠与统一经验表，浏览不修改存档。
import {challengeCatalog} from '../progression/realms/challenge-catalog.js';
import {campProgress,campDiscountText} from '../progression/camp/camp-level.js';
import {CAMP_ACTIVITY_XP,CAMP_BATCHES} from '../config/camp-level.js';
// 原生嵌套弹窗沿用暂停和焦点管理，保留稳定节点标识。
export function createChallengeCatalog({game,root,dialogs,scope}){
 const $=id=>root.getElementById(id),dialog=$('challenge-catalog-dialog');let model=null,selected=1,origin=null;
 // 仅展示所选等级的优惠和累计门槛，资源足够即可购买全部装备。
 function renderTier(){
  const group=model.tiers[selected-1];
  for(const button of $('challenge-tier-nav').children)button.setAttribute('aria-pressed',String(Number(button.dataset.challengeTier)===selected));
  $('challenge-tier-title').textContent=`营地 ${selected} 级 · 购买${campDiscountText(group.percent)}`;
  $('challenge-tier-condition').textContent=`累计 ${group.xp} 经验 · ${group.reached?'已达到':'尚未达到'}。等级只提供优惠，资源足够即可购买。`;
  $('challenge-catalog-grid').innerHTML=`<section><h4>购买优惠</h4><p>角色、武器、载具与可购炮塔的金币和木头费用享${campDiscountText(group.percent)}，材料原价。</p><p>升级、部件和改装费用保持原规则。</p><h4>营地经验</h4><p>伐木每 ${CAMP_BATCHES.trees.count} 棵 +${CAMP_BATCHES.trees.xp} · 野外击败每 ${CAMP_BATCHES.enemies.count} 只怪物 +${CAMP_BATCHES.enemies.xp}</p><p>完成清缴 +${CAMP_ACTIVITY_XP.clearing} · 完整守住兽潮 +${CAMP_ACTIVITY_XP.horde}</p><p>娱乐每层 +${CAMP_ACTIVITY_XP.realm} · 消防成功 +${CAMP_ACTIVITY_XP.fire} · 足球完赛且进球 +${CAMP_ACTIVITY_XP.football}</p><p>主线首次交付 +${CAMP_ACTIVITY_XP.mainline} · 邻里委托首次完成 +${CAMP_ACTIVITY_XP.living}</p><p>故事章节首次交付按章节预算获得经验。任务内击杀不重复计入野外击杀；暂停和挂机不增加经验。</p></section>`;
  $('challenge-catalog-body').scrollTop=0;
 }
 scope.on(root,'click',event=>{const button=event.target.closest('[data-challenge-catalog]');if(!button)return;origin=button;dialogs.open(dialog.id);});
 dialogs.register(dialog.id,{focusId:'challenge-catalog-close',onOpen:()=>{
  const camp=origin?.dataset.challengeCatalog;
  model=challengeCatalog(game.progress,camp);selected=model.current;const q=campProgress(game.progress,camp);
  $('challenge-catalog-current').textContent=`当前 ${q.tier} 级 · ${campDiscountText(q.percent)} · ${q.xp} 经验`;
  $('challenge-tier-nav').replaceChildren(...model.tiers.map(group=>{const button=root.createElement('button');button.type='button';button.dataset.challengeTier=group.tier;button.textContent=`${group.tier} 级`;button.className=group.reached?'reached':'';return button;}));renderTier();
 }});
 scope.on($('challenge-tier-nav'),'click',event=>{const button=event.target.closest('[data-challenge-tier]');if(button){selected=Number(button.dataset.challengeTier);renderTier();}});
 scope.on($('challenge-catalog-close'),'click',()=>dialogs.close(dialog.id));
 scope.on(dialog,'close',()=>{$('challenge-catalog-grid').replaceChildren();model=null;const target=origin?.isConnected?origin:root.querySelector('dialog[open] [data-challenge-catalog]');target?.focus({preventScroll:true});origin=null;});
}
