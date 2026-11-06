// 自愿闲聊共用底部对白；只有打开与接话触发事务，重绘、关闭和查看任务均不增加交情。
import {NPC_DIALOGUE_STAGES} from '../config/npc-dialogue.js';
import {converseWithNpc} from '../core/npc-dialogue.js';
import {campResidents,campResidentsVisible} from '../core/camp-routines.js';
import {mainlineTask} from '../core/mainline-manager.js';
import {requestWorldNavigation} from '../core/world-navigation.js';
import {worldDistance} from '../world/coordinates.js';
import {createEventScope} from '../platform/events.js';
import {dockNpcDialogue} from './npc-dialogue-layout.js';
import {sceneHit,placeSceneHit} from './scene-hit.js';
import {MAP_CAT_HIT} from './scene-resident.js';

// 对话控制器保留服务回调，在原弹窗恢复世界之后再打开原有事务，避免暂停归属丢失。
export function createNpcConversations({game,root,renderer,dialogs,onChange,onCampService}){
 const scope=createEventScope(),frame=root.getElementById('game-frame'),dialog=root.createElement('dialog'),nodes=new Map();
 let source=null,service=null,pendingService=null,ended=false;
 dialog.id='npc-conversation-dialog';dialog.className='ui-dialogue';dialog.setAttribute('aria-labelledby','npc-conversation-title');
 dialog.innerHTML='<div class="camp-story-heading"><div><small data-npc-job></small><h2 id="npc-conversation-title" tabindex="-1"></h2></div><button class="ui-close" data-npc-close aria-label="结束交谈">×</button></div><div class="story-speech-copy" aria-live="polite" aria-atomic="true"><small data-npc-stage></small><p data-npc-text></p><small data-npc-note></small></div><div class="story-speech-actions"><button class="ui-button" data-npc-next>再聊聊</button><button class="ui-button" data-npc-service>说说正事</button></div>';
 root.body.append(dialog);const $=selector=>dialog.querySelector(selector);
 // 仅使用文本节点呈现作者对白与错误信息，避免内容表成为 HTML 执行入口。
 function advance(){
  const result=converseWithNpc(game,source);
  $('[data-npc-text]').textContent=result.message;$('[data-npc-note]').textContent=result.note||'';
  ended=!!result.ended;
  $('[data-npc-next]').textContent=ended?'下次再聊':result.ok?'再聊聊':'再试一次';
  if(result.ok){$('h2').textContent=result.npc.name;$('[data-npc-job]').textContent=result.npc.job;$('[data-npc-stage]').textContent=NPC_DIALOGUE_STAGES[result.stage].label;}
  dialog.querySelector('.story-speech-copy').scrollTop=0;onChange();
 }
 // 已打开的面板不会因重复点击再抽一句；服务入口只由玩家主动选取。
 function open(id,onService=null){
  if(root.querySelector('dialog[open]')||game.mainlineSpeech)return;
  source=id;service=onService;pendingService=null;$('h2').textContent='聊一会儿';$('[data-npc-job]').textContent='';$('[data-npc-stage]').textContent='';
  $('[data-npc-service]').hidden=!service;advance();dockNpcDialogue(root,dialog);dialogs.open(dialog.id,{modal:false});
 }
 dialogs.register(dialog.id,{focusId:'npc-conversation-title'});
 scope.on($('[data-npc-next]'),'click',()=>{if(ended)dialogs.close(dialog.id);else advance();});
 scope.on($('[data-npc-close]'),'click',()=>dialogs.close(dialog.id));
 scope.on($('[data-npc-service]'),'click',()=>{pendingService=service;dialogs.close(dialog.id);});
 scope.on(dialog,'close',()=>{const action=pendingService;pendingService=null;action?.();});
 // 所有常驻巡林伙伴可闲聊；任务已有热点时避让它，避免两个透明按钮重叠抢点击。
 function renderFrame(){
  if(dialog.open)dockNpcDialogue(root,dialog);
  const enabled=campResidentsVisible(game)&&game.state==='playing'&&!game.mainlineSpeech&&!root.querySelector('dialog[open]');
  if(!enabled){for(const node of nodes.values())if(!node.hidden)node.hidden=true;return;}
  const task=mainlineTask(game),taskHotspot=root.getElementById('mainline-npc');
  for(const actor of campResidents(game)){
   if(task?.npc===actor.id&&taskHotspot&&!taskHotspot.hidden){const node=nodes.get(actor.id);if(node&&!node.hidden)node.hidden=true;continue;}
   let node=nodes.get(actor.id);
   if(!node){node=root.createElement('button');sceneHit(node,'与'+actor.name+'聊天');node.dataset.campConversation=actor.id;frame.append(node);nodes.set(actor.id,node);
    scope.on(node,'click',event=>{if(event.detail!==0||game.state!=='playing')return;
     const current=campResidents(game).find(r=>r.id===actor.id);
     if(worldDistance(game.player,current)>150){requestWorldNavigation(game,current,'去找'+current.name,{direct:true});onChange();return;}
     open('camp:'+actor.id,mainlineTask(game)?.npc===actor.id?()=>onCampService(actor.id):null);
    });
   }
   placeSceneHit(node,actor,renderer,frame,MAP_CAT_HIT);
  }
 }
 // 卸载只移除本控制器的节点与监听，不触发遗留服务或改变存档。
 function dispose(){pendingService=null;scope.dispose();dialog.remove();for(const node of nodes.values())node.remove();}
 return {open,renderFrame,dispose};
}
