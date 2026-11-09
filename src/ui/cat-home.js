// 猫窝只负责获取、查看经验与安排入住，不提供付费升级。
import {HEROES} from '../config/heroes.js';
import {heroExperience} from '../progression/player/hero-experience.js';
import {campPurchasePrice} from '../progression/camp/camp-level.js';
import {adoptCat} from '../core/home/cat-home.js';
import {heroGrowthMarkup} from './hero-growth.js';
import {drawCat} from '../rendering/characters.js';
import {createEventScope} from '../platform/events.js';
// 所有角色卡片复用真实猫绘制与现有手机底板。
export function createCatHome({game,root,dialogs,input,onChange}){
 const scope=createEventScope(),dialog=root.createElement('dialog');dialog.id='cat-home-dialog';dialog.className='ui-panel';dialog.setAttribute('aria-labelledby','cat-home-title');
 dialog.innerHTML='<header class="ui-panel__header"><div><h2 id="cat-home-title">猫窝</h2><p>结识新伙伴 · 做任务和战斗积累经验，自动升级</p></div><button id="cat-home-close" class="ui-close" aria-label="关闭猫窝">×</button></header><div class="ui-panel__body"><p id="cat-home-wallet"></p><div id="cat-home-roster" class="inventory"></div></div><footer class="ui-panel__footer"><p id="cat-home-message" role="status"></p><button id="cat-home-done" class="ui-button">回到屋内</button></footer>';root.body.append(dialog);let signature='';
 // 仅在真实存档变更时重绘，暂停页面不会持续创建画布。
 function render(){if(!dialog.open)return;if(game.cottage?.kind!=='cat-home'){dialogs.close(dialog.id);return;}const p=game.progress,key=JSON.stringify([p.heroes,p.heroXp,p.hero,p.coins,p.wood,p.campLevel,p.residentCats,p.homeDecor.floors]);if(key===signature)return;signature=key;dialog.querySelector('#cat-home-wallet').textContent=`金币 ${p.coins} · 木头 ${p.wood}`;
  const floor=p.residentCats.length+2,hasRoom=p.homeDecor.floors>=floor;
  dialog.querySelector('#cat-home-roster').innerHTML=HEROES.map((h,index)=>{
   const e=heroExperience(p,index),price=campPurchasePrice(p,h),owned=e.level>0;
   const lodging=owned?`巡林小屋 ${p.residentCats.indexOf(index)+2} 楼 · ${p.hero===index?'正在出战':'在房间等你'}`:
    hasRoom?`获得后入住巡林小屋第 ${floor} 楼。`:`请先到建筑公司加盖第 ${floor} 楼，给新伙伴留间房。`;
   const adopt=owned?'':`<button class="ui-button" data-cat-adopt="${index}" data-shop-name="${h.name}" data-shop-place="巡林小屋第 ${floor} 楼" data-shop-price="${price.coins} 金币、${price.wood} 木头" ${!hasRoom||p.coins<price.coins||p.wood<price.wood?'disabled':''}>加入购物车 · ${price.coins} 金币 / ${price.wood} 木头</button>`;
   return `<article class="item-card"><div class="item-top"><canvas class="portrait" width="240" height="200" data-cat-portrait="${index}" aria-label="${h.name}"></canvas><div class="item-title"><h3>${h.name}<span class="level">${owned?'Lv.'+e.level:'未获得'}</span></h3><small>${h.breed}</small><span class="item-tag">${h.trait}</span></div></div><p>${lodging}</p>${owned?`<p>经验 ${e.next?e.xp+' / '+e.next:'已满级'}</p><progress max="${e.next||1}" value="${e.next?e.xp:1}" aria-label="${h.name}升级经验"></progress>`:''}${heroGrowthMarkup(p,index)}${adopt}</article>`;
  }).join('');
  for(const canvas of dialog.querySelectorAll('[data-cat-portrait]'))drawCat(canvas.getContext('2d'),120,154,Number(canvas.dataset.catPortrait),0,2.4,0,0);
 }
 // 管理员为唯一获取页面入口，关闭后仍留在猫窝。
 function open(){if(game.cottage?.kind!=='cat-home'||game.state!=='playing')return;input.reset();signature='';dialog.querySelector('#cat-home-message').textContent='';dialogs.open(dialog.id);render();}
 dialogs.register(dialog.id,{focusId:'cat-home-close'});
 for(const id of ['cat-home-close','cat-home-done'])scope.on(dialog.querySelector('#'+id),'click',()=>dialogs.close(dialog.id));
 scope.on(dialog,'click',event=>{const b=event.target.closest('[data-cat-adopt]');if(!b||b.disabled)return;const result=adoptCat(game,Number(b.dataset.catAdopt));dialog.querySelector('#cat-home-message').textContent=result.message;if(result.ok)onChange();render();});
 // 卸载释放事件和节点，页面不会跨局遗留。
 function dispose(){scope.dispose();if(dialog.open)dialog.close();dialog.remove();}
 return {open,render,dispose};
}
