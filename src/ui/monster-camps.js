// 营地小故事使用底部对白；现场线索和灰堆仍由核心事务核对条件。
import {MONSTER_CAMPS,CAMP_CHARACTERS,MONSTER_CAMP_RULES,campCharacterSite,campCacheSite} from '../config/monster-camps.js';
import {campStory} from '../config/camp-stories.js';
import {monsterCampsAvailable,monsterCampChatter,talkCampCharacter,inspectCampCache} from '../core/battle/monster-camps.js';
import {createEventScope} from '../platform/events.js';
import {createCompactSpeech} from './compact-speech.js';
import {dockNpcDialogue} from './npc-dialogue-layout.js';
import {worldDistance} from '../world/coordinates.js';
import {campResidentHead} from '../config/camp-residents.js';
// 所有正文使用textContent，一次只展示一段；节点不随战斗帧重建。
export function createMonsterCampPanel({game,root,renderer,dialogs,onChange,onTalk}){
 const scope=createEventScope(),dialog=root.createElement('dialog'),bubble=createCompactSpeech(root,'monster-camp-chatter');
 let camp=null,person=null,cache=null,story=null,step=0,result=null;
 dialog.id='monster-camps-dialog';dialog.className='ui-dialogue';dialog.setAttribute('aria-labelledby','monster-camps-title');
 dialog.innerHTML='<div class="camp-story-heading"><div><small id="monster-camp-place"></small><h2 id="monster-camps-title" tabindex="-1"></h2></div><button class="ui-close" data-camp-close aria-label="结束聊天">×</button></div><div class="story-speech-copy" aria-live="polite" aria-atomic="true"><p id="monster-camp-message"></p></div><div class="story-speech-actions"><button class="ui-button" data-camp-next>然后呢？</button></div>';
 root.body.append(dialog);
 const title=dialog.querySelector('h2'),place=dialog.querySelector('small'),text=dialog.querySelector('p'),next=dialog.querySelector('[data-camp-next]');
 // 距离资格每次打开重新计算；阅读不能远程取得具名居民的线索。
 function nearby(site){return camp.mapId===game.mapId&&worldDistance(game.player,site)<=MONSTER_CAMP_RULES.interact;}
 // 只更新对白内容和唯一接话操作；底部位置随实际游戏容器变化。
 function render(){
  if(!dialog.open||!camp)return;dockNpcDialogue(root,dialog);
  place.textContent=camp.name;title.textContent=cache?'冷灰堆':story.speaker;
  text.textContent=result?.message||(cache?'灰已经凉了，里面露出一点不属于木炭的颜色。你想起了那句奇怪的叮嘱。':story.pages[step]);
  next.textContent=result?(result.ok?'记住了，回头见':'再试一次'):cache?'轻轻拨开灰烬':step<story.pages.length-1?'然后呢？':person?'你还听说什么？':'下回再聊';
 }
 // 附近入口传入实际锚点；未指定营地时读取当前地图最近营地的故事。
 function open(id=null,siteId=null,storyOnly=false){
  if(!monsterCampsAvailable(game)||!['playing','paused'].includes(game.state))return;
  camp=MONSTER_CAMPS.find(c=>c.id===id&&c.mapId===game.mapId)||MONSTER_CAMPS.filter(c=>c.mapId===game.mapId).sort((a,b)=>worldDistance(game.player,a)-worldDistance(game.player,b))[0];if(!camp)return;
  person=CAMP_CHARACTERS.find(n=>n.camp===camp.id&&nearby(campCharacterSite(camp)))||null;
  cache=siteId===camp.id+'-cache'?CAMP_CHARACTERS.find(n=>n.destination===camp.id&&game.progress.monsterCamps.clues.includes(n.id)&&nearby(campCacheSite(camp))):null;
  if(onTalk&&!cache&&!storyOnly){const campId=camp.id;onTalk(person?'wild:'+person.id:'camp-story:'+campId,()=>open(campId,siteId,true));return;}
  story=campStory(camp,game.progress.monsterCamps.camps[camp.id].clears,person);if(person&&!game.progress.monsterCamps.clues.includes(person.id))person=null;step=0;result=null;
  dockNpcDialogue(root,dialog);dialogs.open(dialog.id,{modal:false});render();
 }
 // 阅读期间保持原有暂停归属；关闭或Esc统一交还战场。
 dialogs.register(dialog.id,{focusId:'monster-camps-title'});scope.on(dialog.querySelector('[data-camp-close]'),'click',()=>dialogs.close(dialog.id));
 // 听到最后才提交线索，失败允许重试；读取正文、重绘和关闭均不发奖。
 scope.on(next,'click',()=>{
  if(result?.ok||!cache&&!person&&step===story.pages.length-1){dialogs.close(dialog.id);return;}
  if(!result&&!cache&&step<story.pages.length-1)step++;
  else result=cache?inspectCampCache(game,cache.id):talkCampCharacter(game,person.id);
  render();dialog.querySelector('.story-speech-copy').scrollTop=0;onChange();
 });
 // 小气泡继续表达场景生活；任何弹窗打开期间收起，不盖住故事。
 function renderFrame(){if(game.state!=='playing'||root.querySelector('dialog[open]'))return bubble.hide();const chatter=monsterCampChatter(game);if(chatter)bubble.show(chatter.actor,chatter.text,renderer,{head:campResidentHead(chatter.actor),minTop:145});else bubble.hide();}
 // 卸载时清理事件和节点，重进游戏不重复创建入口。
 function dispose(){scope.dispose();bubble.dispose();dialog.remove();}
 return {open,render,renderFrame,dispose};
}
