// 猫窝只负责获取、查看经验与切换出战猫，不提供付费升级。
import {HEROES} from '../config/heroes.js';
import {heroExperience} from '../progression/hero-experience.js';
import {campPurchasePrice} from '../progression/camp-level.js';
import {adoptCat} from '../core/cat-home.js';
import {heroGrowthMarkup} from './hero-growth.js';
import {drawCat} from '../rendering/characters.js';
import {createEventScope} from '../platform/events.js';
// 所有角色卡片复用真实猫绘制与现有手机底板。
export function createCatHome({game,root,dialogs,input,onChange}){
 const scope=createEventScope(),dialog=root.createElement('dialog');dialog.id='cat-home-dialog';dialog.className='ui-panel';dialog.setAttribute('aria-labelledby','cat-home-title');
 dialog.innerHTML='<header class="ui-panel__header"><div><h2 id="cat-home-title">猫窝</h2><p>结识新伙伴 · 做任务和战斗积累经验，自动升级</p></div><button id="cat-home-close" class="ui-close" aria-label="关闭猫窝">×</button></header><div class="ui-panel__body"><p id="cat-home-wallet"></p><div id="cat-home-roster" class="inventory"></div></div><footer class="ui-panel__footer"><p id="cat-home-message" role="status"></p><button id="cat-home-done" class="ui-button">回到屋内</button></footer>';root.body.append(dialog);let signature='';
 // 仅在真实存档变更时重绘，暂停页面不会持续创建画布。
 function render(){if(!dialog.open)return;if(game.cottage?.kind!=='cat-home'){dialogs.close(dialog.id);return;}const p=game.progress,key=JSON.stringify([p.heroes,p.heroXp,p.hero,p.coins,p.wood,p.campLevel]);if(key===signature)return;signature=key;dialog.querySelector('#cat-home-wallet').textContent=`金币 ${p.coins} · 木头 ${p.wood}`;
  dialog.querySelector('#cat-home-roster').innerHTML=HEROES.map((h,index)=>{const e=heroExperience(p,index),price=campPurchasePrice(p,h),owned=e.level>0,selected=p.hero===index;return `<article class="item-card"><div class="item-top"><canvas class="portrait" width="240" height="200" data-cat-portrait="${index}" aria-label="${h.name}"></canvas><div class="item-title"><h3>${h.name}<span class="level">${owned?'Lv.'+e.level:'未获得'}</span></h3><small>${h.breed}</small><span class="item-tag">${h.trait}</span></div></div>${owned?`<p>经验 ${e.next?e.xp+' / '+e.next:'已满级'}</p><progress max="${e.next||1}" value="${e.next?e.xp:1}" aria-label="${h.name}升级经验"></progress>`:'<p>获得后从 1 级开始，经验归出战猫所有。</p>'}${heroGrowthMarkup(p,index)}<div class="card-buttons"><button class="ui-button" ${owned?'data-cat-equip':'data-cat-adopt'}="${index}" ${selected||!owned&&(p.coins<price.coins||p.wood<price.wood)?'disabled':''}>${owned?selected?'正在出战':'选择出战':`获得伙伴 · ${price.coins} 金币 / ${price.wood} 木头`}</button></div></article>`;}).join('');
  for(const canvas of dialog.querySelectorAll('[data-cat-portrait]'))drawCat(canvas.getContext('2d'),120,154,Number(canvas.dataset.catPortrait),0,2.4,0,0);
 }
 // 管理员为唯一获取页面入口，关闭后仍留在猫窝。
 function open(){if(game.cottage?.kind!=='cat-home'||game.state!=='playing')return;input.reset();signature='';dialog.querySelector('#cat-home-message').textContent='';dialogs.open(dialog.id);render();}
 dialogs.register(dialog.id,{focusId:'cat-home-close'});
 for(const id of ['cat-home-close','cat-home-done'])scope.on(dialog.querySelector('#'+id),'click',()=>dialogs.close(dialog.id));
 scope.on(dialog,'click',event=>{const b=event.target.closest('[data-cat-adopt],[data-cat-equip]');if(!b||b.disabled)return;const result=b.hasAttribute('data-cat-adopt')?adoptCat(game,Number(b.dataset.catAdopt)):{ok:game.transact('heroes',Number(b.dataset.catEquip),'equip'),message:'已切换出战伙伴。'};dialog.querySelector('#cat-home-message').textContent=result.message;if(result.ok)onChange();render();});
 // 卸载释放事件和节点，页面不会跨局遗留。
 function dispose(){scope.dispose();if(dialog.open)dialog.close();dialog.remove();}
 return {open,render,dispose};
}
