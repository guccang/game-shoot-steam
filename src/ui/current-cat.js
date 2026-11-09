// 主菜单只展示当前出战猫，伙伴在猫窝招募，回巡林小屋换班。
import {HEROES} from '../config/heroes.js';
import {heroExperience} from '../progression/player/hero-experience.js';
import {heroGrowthMarkup} from './hero-growth.js';
import {drawCat} from '../rendering/characters.js';
import {createEventScope} from '../platform/events.js';
import {COTTAGE} from '../config/cottage.js';
import {requestWorldNavigation} from '../core/navigation/world-navigation.js';
// 复用正式角色头像和统一手机弹窗，只在打开时读取当前装备状态。
export function createCurrentCat({game,root,dialogs,onInventoryRender,onCleanup}){
 const scope=createEventScope(),panel=root.createElement('dialog');panel.id='current-cat-dialog';panel.className='ui-panel ui-page';panel.setAttribute('aria-labelledby','current-cat-title');
 panel.innerHTML='<header class="ui-panel__header"><div><h2 id="current-cat-title">当前猫猫</h2><p>做任务和战斗获得经验，自动升级</p></div><button id="current-cat-close" class="ui-close" aria-label="关闭猫猫详情">×</button></header><div class="logistics-actions" role="group" aria-label="猫猫详情分类"><button class="ui-button" data-cat-tab="profile" aria-controls="current-cat-profile">角色信息</button><button class="ui-button" data-cat-tab="items" aria-controls="current-cat-items">随身物品</button></div><div class="ui-panel__body" id="current-cat-body"><div id="current-cat-profile"></div><div id="current-cat-items" class="keepsake-content" hidden></div></div><footer class="ui-panel__footer"><button class="ui-button ui-button--primary" data-cat-cleanup>整理背包</button><button class="ui-button" data-cat-go-home>前往巡林小屋</button><button class="ui-button" data-cat-detail-close>返回</button></footer>';root.body.append(panel);
 // 等级、生命、装备加成来自当前正式角色，不把其他伙伴显示为可远程切换。
 function render(){const p=game.loadout,index=p.hero,h=HEROES[index],xp=heroExperience(p,index);panel.querySelector('#current-cat-profile').innerHTML=`<section class="ui-section"><canvas id="current-cat-portrait" width="240" height="200" style="display:block;max-width:100%;margin:auto" aria-label="${h.name}"></canvas><h3>${h.name} · ${xp.level} 级</h3><p>${h.breed} · ${h.trait}</p><p>${h.description}</p><div class="ui-inset"><p>生命 ${Math.ceil(game.player.hp)} / ${game.maxHp()}</p><p>基础步行速度 ${h.speed}</p><p>经验 ${xp.next?xp.xp+' / '+xp.next:'已满级'}</p><progress value="${xp.next?xp.xp:1}" max="${xp.next||1}" aria-label="升级经验"></progress></div></section><section class="ui-section"><h3>当前装备与加成</h3><p>武器：${game.weapon().name}</p>${heroGrowthMarkup(p,index)}</section><p>一、二楼是栗子的家。新伙伴从三楼起每只住一层。先在建筑公司加盖，再去猫窝招募；换班请到伙伴房间找它聊天。</p><p>${game.progress.residentCats.map((hero,i)=>(i+2)+' 楼 · '+HEROES[hero].name).join('　')}</p>`;drawCat(panel.querySelector('canvas').getContext('2d'),120,154,index,0,2.4,0,0);onInventoryRender();}
 // 角色和随身物品共用同一底板，切换只隐藏内容，不重建整页。
 let view='profile';
 function switchView(next){view=next;for(const button of panel.querySelectorAll('[data-cat-tab]')){const active=button.dataset.catTab===view;button.setAttribute('aria-pressed',String(active));button.classList.toggle('ui-button--primary',active);}panel.querySelector('#current-cat-profile').hidden=view!=='profile';panel.querySelector('#current-cat-items').hidden=view!=='items';}
 // 室内外打开同一角色页面，层级跟随实际打开顺序。
 function open(next='profile'){if(game.arrivalCinematic)return;switchView(next);if(!panel.open)root.body.append(panel);dialogs.open(panel.id);}
 dialogs.register(panel.id,{focusId:'current-cat-close',onOpen:render});
 scope.on(root.getElementById('heroes-button'),'click',()=>open());
 scope.on(panel,'click',event=>{const tab=event.target.closest('[data-cat-tab]');if(tab){switchView(tab.dataset.catTab);return;}if(event.target.closest('[data-cat-cleanup]')){onCleanup();return;}if(event.target.closest('#current-cat-close,[data-cat-detail-close]'))dialogs.close(panel.id);if(event.target.closest('[data-cat-go-home]')){requestWorldNavigation(game,{...COTTAGE.door,id:'cottage',mapId:'forest'},'前往巡林小屋',{direct:true});dialogs.close(panel.id);}});
 // 子页改变库存或生命后，返回时同步角色和随身物品。
 scope.on(root,'close',event=>{if(panel.open&&['load-cleanup-dialog','keepsake-dialog','logistics-dialog'].includes(event.target.id))render();},true);
 // 卸载时清除当前实例的节点和监听。
 function dispose(){scope.dispose();panel.remove();}
 return {open,dispose};
}
