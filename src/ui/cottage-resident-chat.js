// 住户对话由点击走近触发，仅同一房间的有效对话可以完成换班。
import {HEROES} from '../config/heroes.js';
import {canRelieveResident} from '../core/home/cat-home.js';
import {createEventScope} from '../platform/events.js';

export function createResidentChat({game,root,dialogs,onChange}){
 const scope=createEventScope(),dialog=root.createElement('dialog');
 dialog.id='resident-chat';dialog.className='ui-panel ui-panel--compact';dialog.setAttribute('aria-labelledby','resident-name');
 dialog.innerHTML='<header class="ui-panel__header"><h2 id="resident-name" tabindex="-1"></h2></header><div class="ui-panel__body"><p data-resident-line></p></div><footer class="ui-panel__footer"><button class="ui-button" data-resident-back>下次再聊</button><button class="ui-button ui-button--primary" data-resident-switch></button></footer>';
 root.body.append(dialog);dialogs.register(dialog.id,{focusId:'resident-name'});
 let host=null,index=null;
 // 先清除交接请求，取消或按返回键都不会再次弹出同一句话。
 function forget(){if(host)delete host.residentTalk;host=null;index=null;}
 function close(){forget();dialogs.close(dialog.id);}
 scope.on(dialog,'close',()=>{if(!dialog.open)forget();});
 scope.on(dialog,'cancel',forget);
 scope.on(dialog.querySelector('[data-resident-back]'),'click',close);
 scope.on(dialog.querySelector('[data-resident-switch]'),'click',()=>{
  if(!host||host!==game.cottage||!canRelieveResident(game,index)){close();return;}
  const room=host,name=HEROES[index].name;
  if(!game.transact('heroes',index,'equip')){dialog.querySelector('[data-resident-line]').textContent='换班保存失败，请重试。';return;}
  room.storageNotice=name+'接班了。';close();onChange();
 });
 // 对话只在走近后的游戏帧开启，暂停时沿用手机弹窗管理器。
 function render(){
  const room=game.cottage,owner=room?.residentTalk;
  if(dialog.open){if(room!==host||!canRelieveResident(game,index))close();return;}
  if(host||owner===undefined||game.state!=='playing'||!canRelieveResident(game,owner)||root.querySelector('dialog[open]'))return;
  host=room;index=owner;
  dialog.querySelector('h2').textContent=HEROES[index].name;
  dialog.querySelector('[data-resident-line]').textContent='回来啦！我已经收拾好了，这一趟让我去巡林吧？';
  dialog.querySelector('[data-resident-switch]').textContent='让'+HEROES[index].name+'出战';
  dialogs.open(dialog.id);
 }
 // 离开场景时释放暂停归属与事件监听。
 function dispose(){if(dialog.open)close();scope.dispose();dialog.remove();}
 return {render,dispose};
}
