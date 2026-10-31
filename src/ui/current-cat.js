// 主菜单只展示当前出战猫，获取和切换伙伴仍在猫窝屋内办理。
import {HEROES} from '../config/heroes.js';
import {heroExperience} from '../progression/hero-experience.js';
import {heroGrowthMarkup} from './hero-growth.js';
import {drawCat} from '../rendering/characters.js';
import {createEventScope} from '../platform/events.js';
import {CAT_HOME} from '../config/cat-home.js';
import {requestWorldNavigation} from '../core/world-navigation.js';
// 复用正式角色头像和统一手机弹窗，只在打开时读取当前装备状态。
export function createCurrentCat({game,root,dialogs}){
 const scope=createEventScope(),panel=root.createElement('dialog');panel.id='current-cat-dialog';panel.className='ui-panel ui-page';panel.setAttribute('aria-labelledby','current-cat-title');
 panel.innerHTML='<header class="ui-panel__header"><div><h2 id="current-cat-title">当前猫猫</h2><p>做任务和战斗获得经验，自动升级</p></div><button id="current-cat-close" class="ui-close" aria-label="关闭猫猫详情">×</button></header><div class="ui-panel__body" id="current-cat-body"></div><footer class="ui-panel__footer"><button class="ui-button" data-cat-go-home>前往猫窝</button><button class="ui-button ui-button--primary" data-cat-detail-close>返回</button></footer>';root.body.append(panel);
 // 等级、生命、装备加成来自当前正式角色，不把其他伙伴显示为可远程切换。
 function render(){const p=game.loadout,index=p.hero,h=HEROES[index],xp=heroExperience(p,index);panel.querySelector('#current-cat-body').innerHTML=`<section class="ui-section"><canvas id="current-cat-portrait" width="240" height="200" style="display:block;max-width:100%;margin:auto" aria-label="${h.name}"></canvas><h3>${h.name} · ${xp.level} 级</h3><p>${h.breed} · ${h.trait}</p><p>${h.description}</p><div class="ui-inset"><p>生命 ${Math.ceil(game.player.hp)} / ${game.maxHp()}</p><p>基础步行速度 ${h.speed}</p><p>经验 ${xp.next?xp.xp+' / '+xp.next:'已满级'}</p><progress value="${xp.next?xp.xp:1}" max="${xp.next||1}" aria-label="升级经验"></progress></div></section><section class="ui-section"><h3>当前装备与加成</h3><p>武器：${game.weapon().name}</p>${heroGrowthMarkup(p,index)}</section><p>获得新伙伴和切换出战猫，请进入猫窝与管理员交谈。</p>`;drawCat(panel.querySelector('canvas').getContext('2d'),120,154,index,0,2.4,0,0);}
 dialogs.register(panel.id,{focusId:'current-cat-close',onOpen:render});
 scope.on(root.getElementById('heroes-button'),'click',()=>{if(!game.arrivalCinematic)dialogs.open(panel.id);});
 scope.on(panel,'click',event=>{if(event.target.closest('#current-cat-close,[data-cat-detail-close]'))dialogs.close(panel.id);if(event.target.closest('[data-cat-go-home]')){requestWorldNavigation(game,{...CAT_HOME,y:CAT_HOME.y+22},'前往猫窝',{direct:true});dialogs.close(panel.id);}});
 // 卸载时清除当前实例的节点和监听。
 function dispose(){scope.dispose();panel.remove();}
 return {dispose};
}
