// 种子小屋商品与来源页，远程浏览不售卖，所有购买调用正式库存事务。
import {MONSTER_CAMPS} from '../config/monster-camps.js';
import {FARM_CROPS,FARM_CATEGORIES,FARM_SEED_DROP,FARM_SEED_DOOR,FARM_SEED_SHOP,farmSeedPool,farmSeedRequirement} from '../config/farm.js';
import {farmCategoryMarkup,farmCategoryCrops} from './farm-categories.js';
import {currentMainlineTask} from '../config/mainline.js';
import {buyFarmSeeds,canBuyFarmSeeds} from '../core/farm-seeds.js';
import {farmCropMarkup} from '../rendering/farm.js';
import {sceneHit,placeSceneHit} from './scene-hit.js';
import {createEventScope} from '../platform/events.js';
import {requestWorldNavigation} from '../core/world-navigation.js';
// 只有确实提供该种子的营地才显示固定奖励，新增随机掉落品种不虚构营地来源。
function campSeedSource(index){const camps=MONSTER_CAMPS.filter(c=>c.seeds.includes(index)).map(c=>c.name);return camps.length?'固定营地：'+camps.join('、')+'。完整清空后，该品种已开放则必得一粒；打开「营地见闻」可导航。':'暂无固定营地来源，可从已开放的野外怪物掉落中收集。';}
// 创建共用底板、商品操作与来源说明，并注册关闭和导航入口。
export function createSeedShop({game,root,renderer,dialogs,onChange}){
 const scope=createEventScope(),dialog=root.createElement('dialog'),hit=root.createElement('button'),frame=root.getElementById('game-frame');let message='',signature='',category='grain';
 dialog.id='seed-shop-dialog';dialog.className='ui-panel ui-page';dialog.setAttribute('aria-labelledby','seed-shop-title');
 dialog.innerHTML='<header class="ui-panel__header"><h2 id="seed-shop-title">种子小屋</h2><button id="seed-shop-close" class="ui-close" aria-label="关闭种子小屋">×</button></header><div id="seed-shop-categories"></div><div class="ui-panel__body"><p id="seed-shop-wallet"></p><p>完成清剿逐步开放掉落品种，首次获得后永久解锁购买。播种消耗库存。</p><p id="seed-shop-location"></p><p id="seed-shop-message" role="status"></p><p id="seed-shop-category-note"></p><div id="seed-shop-goods"></div></div><footer class="ui-panel__footer"><button id="seed-shop-go" class="ui-button">前往种子小屋</button></footer>';
 root.body.append(dialog);
 hit.id='seed-shop-hit';hit.hidden=true;sceneHit(hit,'打开种子小屋');frame.append(hit);
 // 屋身在正常森林可点击，种田与骑乘不变；副本、室内和其他弹窗期间不接收场景点击。
 function available(){return false;}
 // 门口不再有点击层，进入后通过售货员打开页面。
 function renderFrame(){hit.hidden=true;}

 const get=id=>root.getElementById('seed-shop-'+id);
 // 数据来自同一价格和掉落配置；锁定品种也显示来源，玩家可以提前查看目标。
 function render(){
  renderFrame();if(!dialog.open)return;
  const f=game.progress.farm,near=canBuyFarmSeeds(game),key=JSON.stringify([category,f.seeds,f.unlocked,game.progress.coins,game.progress.bosses,near,message]);if(key===signature)return;signature=key;
  const pool=farmSeedPool(game.progress),weight=pool.reduce((sum,c)=>sum+c.weight,0),group=FARM_CATEGORIES.find(c=>c.id===category);
  get('categories').innerHTML=farmCategoryMarkup(category,'data-seed-shop-category',f.seeds,f.unlocked);get('category-note').textContent=group.name+(group.note?' · '+group.note:'');
  get('wallet').textContent='金币 '+game.progress.coins+' · 已解锁 '+f.unlocked.filter(Boolean).length+'/'+FARM_CROPS.length+' · 已完成清剿 '+game.progress.bosses+' 轮';
  get('location').textContent=near?'已到售货员处，可以购买。':'当前仅查看来源；进入营地东侧种子小屋，与售货员交谈购买。';get('message').textContent=message;
  get('goods').innerHTML=farmCategoryCrops(category).map(({crop,i})=>`<article class="ui-section seed-shop-good">${farmCropMarkup(i)}<div><h3>${crop.name}种子</h3><p>${crop.cost} 金币 / 粒 · 库存 ${f.seeds[i]} 粒</p><p>${f.unlocked[i]?'已解锁购买':crop.rounds>game.progress.bosses?'未开放 · '+farmSeedRequirement(crop):'可掉落 · 首次获得后解锁购买'}</p><details><summary>查看种子来源</summary><p>${farmSeedRequirement(crop)}。${crop.rounds>game.progress.bosses?'当前不能从战斗掉落。':'当前掉落品种中占 '+(crop.weight/weight*100).toFixed(1)+'%。'}森林、九寨沟普通怪有${FARM_SEED_DROP.chance*100}%掉落一粒，连续${FARM_SEED_DROP.pity-1}次未掉后下次必掉；领主必掉${FARM_SEED_DROP.bossCount}粒。保底和领主只抽已开放品种。副本、试射及活动怪物不掉种子。</p><p>${campSeedSource(i)}</p><p>种子快递站：不定期补充已解锁品种，不会解锁新种子。${i===1?'首次播种并浇水另送胡萝卜种子2粒。':''}${i===0?'找种委托首只野外怪必掉雏菊。':''}</p><p>生长 ${crop.seconds/60} 分钟 · 收获 ${crop.value} 金币。</p></details></div><div class="seed-shop-actions">${[1,5,10].map(n=>`<button class="ui-button" data-buy-seed="${i}" data-count="${n}" ${!near||!f.unlocked[i]||game.progress.coins<crop.cost*n?'disabled':''}>购买 ${n} 粒 · ${crop.cost*n} 币</button>`).join('')}</div></article>`).join('');
 }
 // 打开只暂停并展示，不自动传送、不发放种子。
 function open(){if(game.realm||game.story||!['playing','paused'].includes(game.state))return false;const task=currentMainlineTask(game.progress.mainline),crop=FARM_CROPS[task?.gardening?.crop??task?.seedDelivery?.crop];if(crop)category=crop.category;message='';dialogs.open(dialog.id);render();return true;}
 // 短按由统一战场输入转发为原生点击；拖动和取消不会打开页面，键盘也可操作。
 scope.on(hit,'click',e=>{if(e.detail===0&&available())open();});
 dialogs.register(dialog.id,{focusId:'seed-shop-close'});scope.on(get('close'),'click',()=>dialogs.close(dialog.id));
 // 切类只更换商品，不重开弹窗，短屏内容回到当前类别的首项。
 scope.on(get('categories'),'click',e=>{const tab=e.target.closest('[data-seed-shop-category]');if(!tab||!FARM_CATEGORIES.some(c=>c.id===tab.dataset.seedShopCategory))return;category=tab.dataset.seedShopCategory;render();dialog.querySelector('.ui-panel__body').scrollTop=0;});
 scope.on(get('go'),'click',()=>{requestWorldNavigation(game,FARM_SEED_DOOR,'前往种子小屋',{direct:true});dialogs.close(dialog.id);onChange();});
 scope.on(get('goods'),'click',e=>{const b=e.target.closest('[data-buy-seed]');if(!b||b.disabled)return;const result=buyFarmSeeds(game,Number(b.dataset.buySeed),Number(b.dataset.count));message=result.message;render();onChange();});
 // 生命周期函数与页面、场景入口同步释放，重复开局不叠加监听。
 function dispose(){scope.dispose();hit.remove();dialog.remove();}
 return {open,render,renderFrame,dispose};
}
