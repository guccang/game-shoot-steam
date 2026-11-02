// 小屋武器架使用真实场景热点，楼梯由站定倒计时控制；存取面板沿用手机底板与暂停管理。
import {createEventScope} from '../platform/events.js';
import {sceneHit} from './scene-hit.js';
import {cottageFloor} from '../config/cottage.js';
import {placedDecor} from '../progression/home-decor.js';
import {carriedWeapon} from '../progression/weapon-storage.js';
import {accessibleWeaponRack,weaponStorageReason,transferRackWeapon} from '../core/weapon-storage.js';
import {WEAPONS} from '../config/weapons.js';
import {WEAPON_RACK_CAPACITY} from '../config/home-decor.js';
import {itemDefinition} from '../config/items.js';
import {catLoad} from '../progression/load-weight.js';
// 列表文本来自配置，转义后进入HTML，避免名称中的符号破坏结构。
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// 生命周期挂在房屋控制器上，返回室外立即关闭存取页。
export function createCottageStorage({game,renderer,root,panel,dialogs,input,onChange}){
 const scope=createEventScope(),hits=root.createElement('div'),dialog=root.createElement('dialog');hits.className='workshop-room-hits';panel.append(hits);
 dialog.id='weapon-rack-dialog';dialog.className='ui-panel ui-page';dialog.setAttribute('aria-labelledby','weapon-rack-title');
 dialog.innerHTML='<header class="ui-panel__header"><div><h2 id="weapon-rack-title">武器收纳架</h2><p id="weapon-rack-summary"></p></div><button id="weapon-rack-close" class="ui-close" aria-label="关闭武器架">×</button></header><div class="ui-panel__body" id="weapon-rack-content"></div><footer class="ui-panel__footer" style="display:block"><p id="weapon-rack-message" role="status"></p><button class="ui-button" data-rack-close>回到小屋</button></footer>';root.body.append(dialog);
 let uid=null,message='',signature='';const get=id=>root.getElementById('weapon-rack-'+id);
 // 当前楼层的真实武器架是唯一点击热点来源，未摆放家具不产生幽灵按钮。
 function targets(){return game.cottage?.kind==='cottage'&&!game.cottage.balcony?placedDecor(game.progress.homeDecor,cottageFloor(game.cottage)).filter(i=>i.type==='weapon-rack').map(i=>({...i,id:'rack-'+i.uid,height:90,label:'打开武器架 '+i.uid})):[];}
 // 每次提交后重读存档，重复点击不会复制武器，也不会使用上次页面的数量。
 function renderContent(){
  const rack=accessibleWeaponRack(game,uid),p=game.progress,load=catLoad(game);
  get('summary').textContent=`${cottageFloor(game.cottage)+1}楼 · ${(rack?.weapons||[]).length}/${WEAPON_RACK_CAPACITY} 把 · 背包 ${load.weight.toFixed(2)}/${load.capacity} kg`;
  get('message').textContent=message;
  if(!rack){get('content').innerHTML='<p>请靠近当前楼层的武器架。</p>';return;}
  // 架上列表与背包列表分开；取出即装备，存当前主武器自动换为另一把随身武器。
  const row=(index,stored)=>{const item=itemDefinition('weapon:'+index),reason=stored?'':weaponStorageReason(p,index),full=!stored&&rack.weapons.length>=WEAPON_RACK_CAPACITY;return `<section class="ui-section"><h3>${escape(WEAPONS[index].name)}${p.weapon===index?' · 当前主武器':''}</h3><p>等级 ${p.weapons[index]} · 武器 ${item.mass} kg · 已装填 ${game.magazines[index]?.ammo||0} 发</p>${reason?'<p>'+escape(reason)+'</p>':''}<button class="ui-button" data-rack-${stored?'take':'store'}="${index}" ${reason||full?'disabled':''}>${stored?'取出并装备':full?'架子已满':'存入武器架'}</button></section>`;};
  get('content').innerHTML=`${load.overloaded?'<p class="ui-inset">背包载荷已满，存入武器可减轻负重。</p>':''}<h3>架上展示</h3>${rack.weapons.length?rack.weapons.map(i=>row(i,true)).join(''):'<p>架子还空着，可以从下方存入武器。</p>'}<h3>随身武器</h3><p>每架可放3把，更多武器架可在家具小铺购买。武器及弹匣一同存放，等级和改装保留；备用弹药仍留在背包。</p>${WEAPONS.map((_,i)=>i).filter(i=>carriedWeapon(p,i)).map(i=>row(i,false)).join('')}`;
 }
 dialogs.register(dialog.id,{focusId:'weapon-rack-close',onOpen:renderContent});
 // 先核验操作距离，再开面板或换楼层；点击远处物件只提示靠近。
 function activate(item){
  if(game.state!=='playing'||game.cottage?.sleep||root.querySelector('dialog[open]'))return;
  input.reset();game.cottage.exitElapsed=0;
  if(!accessibleWeaponRack(game,item.uid)){game.cottage.storageNotice='请靠近武器架，再点击存取。';return;}
  game.cottage.storageNotice='';uid=item.uid;message='';dialogs.open(dialog.id);
 }
 scope.on(hits,'click',event=>{if(event.detail===0){const item=targets().find(i=>i.id===event.target.closest('[data-cottage-target]')?.dataset.cottageTarget);if(item)activate(item);}});
 scope.on(dialog,'click',event=>{const button=event.target.closest('button');if(!button||button.disabled)return;if(button.id==='weapon-rack-close'||button.hasAttribute('data-rack-close')){dialogs.close(dialog.id);return;}const direction=button.dataset.rackStore!==undefined?'store':button.dataset.rackTake!==undefined?'take':null;if(!direction)return;const result=transferRackWeapon(game,uid,Number(button.dataset[direction==='store'?'rackStore':'rackTake']),direction);message=result.message;if(result.ok)onChange();renderContent();});
 // 触摸移动继续交给原输入系统，只有短按命中真实家具才消费。
 function tap(event){
  if(game.cottage?.kind!=='cottage')return false;const v=renderer.cottageView;if(!v)return false;const r=renderer.canvas.getBoundingClientRect(),sx=event.clientX-r.left,sy=event.clientY-r.top;
  if(v.clip&&(sy<v.clip.y||sy>v.clip.y+v.clip.height))return false;
  const x=(sx-v.x)/v.zoom,y=(sy-v.y)/v.zoom,item=targets().find(i=>Math.abs(x-i.x)<i.width/2&&y>i.y-i.height+16&&y<i.y+22);if(!item)return false;activate(item);return true;
 }
 // 与正式镜头同步裁切，短屏与横屏中隐藏不可见热点，保持至少44px可操作范围。
 function render(){
  const list=targets(),v=renderer.cottageView,key=list.map(i=>i.id+':'+i.x+':'+i.y+':'+i.label).join('|');hits.hidden=!list.length||!!root.querySelector('dialog[open]');
  if(dialog.open&&!accessibleWeaponRack(game,uid))dialogs.close(dialog.id);
  if(key!==signature){signature=key;hits.replaceChildren();for(const item of list){const b=root.createElement('button');sceneHit(b,item.label);b.dataset.cottageTarget=item.id;hits.append(b);}}
  if(!v)return;const bounds=panel.getBoundingClientRect(),canvas=renderer.canvas.getBoundingClientRect(),clip=v.clip||{x:0,y:0,width:canvas.width,height:canvas.height};
  for(const b of hits.children){const item=list.find(i=>i.id===b.dataset.cottageTarget),width=Math.max(44,item.width*v.zoom),height=Math.max(44,item.height*v.zoom),left=v.x+item.x*v.zoom-width/2,top=v.y+(item.y+16)*v.zoom-height;
   b.hidden=left<clip.x||left+width>clip.x+clip.width||top<clip.y||top+height>clip.y+clip.height;
   Object.assign(b.style,{left:canvas.left-bounds.left+left+'px',top:canvas.top-bounds.top+top+'px',width:width+'px',height:height+'px',transform:'none'});
  }
 }
 // 关闭原生页面并释放动态热点，切回首页不遗留事件。
 function dispose(){scope.dispose();if(dialog.open)dialogs.close(dialog.id);dialog.remove();hits.remove();}
 return {tap,render,dispose};
}
