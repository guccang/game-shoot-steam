import {setHidden} from './shared/dom-state.js';
import {appendRangerLetter} from './ranger-letter.js';
import {constructionWood} from '../progression/economy/resource-wallet.js';
import {woodTaskStatus,repairWoodStatus} from '../core/inventory/wood-task-status.js';
// 入职只在地图上显示短目标，任务工坊靠近自动修复，首枪购买从建筑页面提交。
import {RANGER,arrivalGiftName,RANGER_STAGES,RANGER_LETTER} from '../config/ranger-arrival.js';
import {RESTORATION_SECONDS} from '../config/building-repair-timing.js';
import {arrivalWorkReady,arrivalSpeech,skipArrivalJourney,arrivalWorkshopObjective,completeArrivalLetter,arrivalGuidanceVisible} from '../core/camp/ranger-arrival.js';
import {createEventScope} from '../platform/events.js';
import {createSpeechBubble} from './speech-bubble.js';
// 底部对白使用正式故事组件，建筑页复用弹窗暂停和恢复生命周期。
export function createRangerArrival({game,root,renderer,dialogs,onChange,onOpenWeaponWorkshop}){
  const scope=createEventScope(),frame=root.getElementById('game-frame'),card=root.createElement('section');
  card.className='ranger-arrival';card.id='ranger-arrival';card.hidden=true;card.setAttribute('aria-label','入职目标');
  const goal=root.createElement('button'),title=root.createElement('b'),body=root.createElement('span'),retry=root.createElement('button');
  goal.id='arrival-goal';goal.type='button';
  title.id='arrival-title';body.id='arrival-body';body.setAttribute('aria-live','polite');retry.textContent='重试保存';retry.hidden=true;goal.append(title,body);card.append(goal,retry);frame.append(card);
  // 入职目标分别打开来信、停车场地图或工坊详情，不改动右侧寻路开关。
  scope.on(goal,'click',()=>{if(game.progress.arrival?.phase==='letter')openLetter();else if(game.progress.arrival?.phase==='ride-guide')root.getElementById('phone-button').click();else openWorkshop();onChange();});
  const bubble=createSpeechBubble(root,'arrival-speech','林间接班对白',{interactive:false}),{node,speaker,text}=bubble;frame.append(node);
  // 九秒演出只保留演员头顶短句，阅读操作移到演出后的信件。
  node.classList.add('arrival-head-bubble');
  node.querySelector('.story-speech-actions').hidden=true;
  speaker.hidden=true;
  scope.on(retry,'click',()=>{game.advanceArrival();onChange();});
  const skip=root.createElement('button');skip.id='arrival-skip';skip.textContent='跳过剧情';skip.className='ui-button';skip.hidden=true;frame.append(skip);
  scope.on(skip,'click',()=>{skipArrivalJourney(game);onChange();});
  const dialog=root.createElement('dialog');dialog.id='arrival-workshop-dialog';dialog.className='arrival-workshop-dialog';
  dialog.setAttribute('aria-labelledby','arrival-workshop-title');
  dialog.innerHTML='<header><div><small>晴叶营地</small><h2 id="arrival-workshop-title">武器工坊</h2></div><button id="arrival-workshop-close" aria-label="关闭武器工坊">×</button></header><div class="arrival-workbench"><b id="arrival-workshop-state"></b><p id="arrival-workshop-description"></p><div id="arrival-workshop-cost"></div></div><p id="arrival-workshop-feedback" role="status"></p><button id="arrival-workshop-action" class="primary"></button>';
  root.body.append(dialog);const $=id=>root.getElementById(id);
  dialogs.register(dialog.id,{focusId:'arrival-workshop-close'});
  scope.on($('arrival-workshop-close'),'click',()=>dialogs.close(dialog.id));
  // 修复按钮也可提交施工或重试保存；返回场景靠近任务工坊会自动开工。
  scope.on($('arrival-workshop-action'),'click',()=>{
    if(!arrivalWorkReady(game)||!['gather','repair'].includes(game.progress.arrival.phase)||constructionWood(game.progress)<RANGER.repairWood)return;
    if(game.advanceArrival())dialogs.close(dialog.id);else renderWorkshop();onChange();
  });
  // 来信复用手机底板与弹窗暂停归属，由任务点击打开，阅读确认后进入下一项任务。
  const letter=root.createElement('dialog');letter.id='arrival-letter-dialog';letter.className='ui-panel';
  letter.setAttribute('aria-labelledby','arrival-letter-title');
  letter.innerHTML='<header class="ui-panel__header"><div><h2 id="arrival-letter-title"></h2><p>晴叶营地 · 入职来信</p></div><button id="arrival-letter-close" class="ui-close" aria-label="收好信件">×</button></header><div class="ui-panel__body"></div><footer class="ui-panel__footer"><button id="arrival-letter-done" class="ui-button ui-button--primary">收好信，继续任务</button></footer>';
  letter.querySelector('h2').textContent=RANGER_LETTER.title;
  const letterPaper=root.createElement('article');letter.querySelector('.ui-panel__body').append(letterPaper);
  root.body.append(letter);dialogs.register(letter.id,{focusId:'arrival-letter-close',onOpen:()=>{letterPaper.replaceChildren();appendRangerLetter(letterPaper,game.progress);}});
  const letterFeedback=root.createElement('p');letterFeedback.setAttribute('role','status');letterFeedback.hidden=true;letter.querySelector('.ui-panel__body').append(letterFeedback);
  // 此入口只处理待阅读任务；交接后重读来信由小背包提供。
  function openLetter(){if(game.progress.arrival?.keys&&game.progress.arrival.phase==='letter'&&!game.arrivalCinematic){letterFeedback.hidden=true;$('arrival-letter-done').textContent='读完了，开始巡林';dialogs.open(letter.id);}}
  scope.on($('arrival-letter-close'),'click',()=>dialogs.close(letter.id));
  scope.on($('arrival-letter-done'),'click',()=>{
    if(game.progress.arrival?.phase==='letter'&&!completeArrivalLetter(game)){letterFeedback.textContent='阅读进度保存失败，请重试。';letterFeedback.hidden=false;$('arrival-letter-done').textContent='保存失败，点击重试';return;}
    dialogs.close(letter.id);onChange();
  });
  // 建筑点击只打开详情；购买允许骑乘，真正操作仍校验钥匙、距离与材料。
  function openWorkshop(){if(!game.arrivalPending||game.arrivalCinematic||game.state!=='playing')return;if(['craft'].includes(game.progress.arrival.phase)){onOpenWeaponWorkshop();return;}dialogs.open(dialog.id);renderWorkshop();}
  // 每个阶段只展示一件当前要办的事，费用和得到的东西放在同一页。
  function renderWorkshop(){
    const cost=RANGER.repairWood,ready=arrivalWorkReady(game),wood=repairWoodStatus(game,cost),enough=wood.ready;
    $('arrival-workshop-state').textContent='重建武器工坊';
    $('arrival-workshop-description').textContent='补齐梁架和屋顶，就能在这里购买第一把手枪。';
    $('arrival-workshop-cost').textContent=`已收集 ${wood.gatherProgress} · 可施工 ${wood.progress} · ${wood.breakdown}`;
    $('arrival-workshop-feedback').textContent=game.arrivalError?'保存失败，请关闭页面后重试。':!enough?wood.hint:!ready?'请靠近工坊旁标出的修复区。':'';
    $('arrival-workshop-action').textContent='修复 · 消耗 '+cost+' 木头';
    $('arrival-workshop-action').disabled=!ready||!enough||!game.progress.arrival.keys||!['gather','repair'].includes(game.progress.arrival.phase);
  }
  // 左上短目标避开底部生命条与右侧入口，不承担修复或制作操作。
  function render(){
    const a=game.progress.arrival,active=arrivalGuidanceVisible(game);
    setHidden(skip,!active||!RANGER_STAGES[a?.phase]);if(skip.disabled!==(game.state!=='playing'))skip.disabled=game.state!=='playing';
    frame.classList.toggle('arrival-active',active);frame.classList.toggle('arrival-cinematic',active&&game.arrivalCinematic);
    // 重建与短暂建成展示只保留屋顶徽记，避免手机任务卡遮住施工与计时。
    // 来信和目标卡不因靠近工坊隐藏，保持任务可读、可点击。
    setHidden(card,!active||(!game.arrivalError&&(a.phase==='repairing'||a.phase==='craft'&&a.elapsed<RANGER.rebuildRevealSeconds))||(game.arrivalCinematic&&!game.arrivalError&&a.phase!=='crafting')||!!root.querySelector('dialog[open]'));
    if(!active){setHidden(node,true);return;}
    const titles={letter:'查看松伯的信','ride-guide':'骑上'+arrivalGiftName(game.progress),gather:'采集木料',repair:'重建武器工坊',repairing:'重建中…',craft:'购买手枪',crafting:'领取手枪…'};
    title.textContent=titles[a.phase]||'林间交接';
    const objective=arrivalWorkshopObjective(game),reading=a.phase==='letter';goal.disabled=!reading&&!objective;goal.setAttribute('aria-label',reading?'查看松伯的信，打开来信':objective?objective.label+'，查看相关详情':title.textContent);
    if(reading){goal.setAttribute('aria-haspopup','dialog');goal.setAttribute('aria-controls',letter.id);}else{goal.removeAttribute('aria-haspopup');goal.removeAttribute('aria-controls');}
    // 短提示保留行动、地点和资源缺口，避免与标题重复占满窄任务卡。
    body.textContent=game.arrivalError?'保存失败，请重试。':a.phase==='gather'?`靠近树木采集 · 木材 ${constructionWood(game.progress)}/${RANGER.repairWood}`:a.phase==='repairing'?`屋顶重建 · ${Math.max(1,Math.ceil(RESTORATION_SECONDS-a.elapsed))}秒`:a.phase==='repair'?'靠近工坊，材料足够后自动修复':a.phase==='craft'?(game.progress.wood<RANGER.pistolWood?`还差 ${RANGER.pistolWood-game.progress.wood} 木材，靠近树木采集`:'靠近武器工坊，点击购买'):'稍等片刻';
    if(!game.arrivalError&&['gather','repair','craft'].includes(a.phase)){const wood=a.phase==='craft'?woodTaskStatus(game,RANGER.pistolWood):repairWoodStatus(game,RANGER.repairWood);if(!wood.ready){title.textContent=wood.destination?(wood.destination.kind==='store'?'木材入库':'取回车载木材'):'采集木料';body.textContent='木材 '+(wood.gatherProgress??wood.progress)+' · '+wood.hint;}}
    if(reading)body.textContent='点击任务，查看来信';
    if(a.phase==='ride-guide')body.textContent='前往北停车场找到'+arrivalGiftName(game.progress);
    retry.hidden=!game.arrivalError;card.dataset.phase=a.phase;
    if(dialog.open)renderWorkshop();
    renderFrame();
  }
  // 每帧同步头顶位置和说话者，暂停冻结整个演出时钟。
  function renderFrame(){
    // 气泡与Canvas读取同一帧已插值的演员位置，避免25Hz逻辑坐标相对平滑镜头跳动。
    const info=arrivalSpeech(renderer.renderGame||game),v=renderer.view;
    const hidden=!info||!v||game.state!=='playing'||root.hidden||!!root.querySelector('dialog[open]');
    if(node.hidden!==hidden)node.hidden=hidden;
    if(node.hidden)return;
    speaker.textContent=info.speaker;if(text.textContent!==info.text)text.textContent=info.text;
    // 使用正式镜头坐标贴着说话者头顶，窄屏只夹紧气泡外框，不移动演员。
    const rect=frame.getBoundingClientRect(),canvas=renderer.canvas.getBoundingClientRect();
    const x=(info.anchor.x-v.x)*v.zoom+canvas.left-rect.left,y=(info.anchor.y-info.head-v.y)*v.zoom+canvas.top-rect.top;
    if(x<8||x>rect.width-8||y<16||y>rect.height-24){node.hidden=true;return;}
    const width=node.offsetWidth,height=node.offsetHeight,left=Math.max(8,Math.min(rect.width-width-8,x-width/2));
    node.style.left=left+'px';node.style.top=Math.max(8,y-height-12)+'px';
    node.style.setProperty('--speech-tail',Math.max(12,Math.min(width-12,x-left))+'px');
    node.dataset.anchorX=x;node.dataset.anchorY=y;node.dataset.phase=info.phase;node.dataset.speaker=info.speaker;
  }
  // 卸载释放临时页与节点，不能遗留下一次入职的暂停状态。
  function dispose(){scope.dispose();card.remove();bubble.dispose();skip.remove();dialog.remove();letter.remove();game.arrivalSpeechPaused=false;frame.classList.remove('arrival-active','arrival-cinematic');}
  return {render,renderFrame,openWorkshop,dispose};
}
