import {setHidden} from './shared/dom-state.js';
import { HELP_EMBLEM } from './help-emblem.js';
import {facilityOpen} from '../config/town-restoration.js';
import {BUILDING_ENTRIES} from '../config/building-entries.js';
// 门口交互、单行怪潮进度、救场气泡与统一结算，UI 不直接更改成绩和钱包。
import {CAMP_GATES,CAMP_DEFENSE,campDefenseGrade,campDefenseReward} from '../config/camp-defense.js';
import {resourceName} from '../rendering/resource-icons.js';
import {startCampDefense,canStartCampDefense,spawnCampBoss,claimCampDefense,leaveCampDefense} from '../core/camp/camp-defense.js';
import {campDefenseObjects} from '../rendering/camp-defense.js';
import {drawBossIcon} from '../rendering/enemies.js';
import {createEventScope} from '../platform/events.js';
import {sceneHit,placeSceneHit} from './scene-hit.js';
import {createCompactSpeech} from './compact-speech.js';
import {requestWorldNavigation} from '../core/navigation/world-navigation.js';
import {worldDistance,nearest} from '../world/coordinates.js';
import {WEAPONS} from '../config/weapons.js';
import {COLLECTED_VEHICLES} from '../config/vehicles.js';
import {taskCombatHudTop} from './task-combat-layout.js';
// 创建稳定节点，刷新进度不会销毁当前按钮焦点。
export function createCampDefensePanel({game,root,renderer,dialogs,onChange}){
 const scope=createEventScope(),frame=root.getElementById('game-frame'),hud=root.createElement('section'),dialog=root.createElement('dialog');
 let selected=CAMP_GATES[0],shownResult=null;
 const markers=CAMP_GATES.map(g=>{const node=root.createElement('button');node.dataset.campGate=g.id;sceneHit(node,g.name+'怪潮守门');frame.append(node);scope.on(node,'click',e=>{if(e.detail===0)visit(g);});return node;});
 hud.id='camp-defense-hud';setHidden(hud,true);
 // 左侧上下区分累计场次与本场拒马，右侧双环继续表示当前波次。
 hud.innerHTML='<div class="camp-hp"><span class="camp-completed" role="img" aria-label="已完成兽潮0次">已完成 <b>0</b> 次</span><div class="camp-barricade"><span>拒马</span><div role="progressbar" aria-label="拒马耐久" aria-valuemin="0"><i></i></div></div></div>'+
  '<button id="camp-boss" aria-label="领主尚未登场"><canvas width="64" height="64" aria-hidden="true"></canvas></button>'+
  '<div class="camp-wave-status"><span class="camp-wave-orbit" data-camp-wave="1"><b class="camp-wave-number">1</b><svg viewBox="0 0 36 36" aria-hidden="true"><circle class="camp-ring-track" cx="18" cy="18" r="16"/><circle class="camp-ring-track" cx="18" cy="18" r="11.5"/><circle class="camp-ring-time" cx="18" cy="18" r="16" pathLength="100"/><circle class="camp-ring-kills" cx="18" cy="18" r="11.5" pathLength="100"/></svg></span><span class="camp-wave-total" aria-hidden="true">/'+CAMP_DEFENSE.waves.length+'</span><span class="camp-time-progress camp-ring-accessible" role="progressbar" aria-label="开波等待进度" aria-valuemin="0" aria-valuemax="100"></span><span class="camp-kill-progress camp-ring-accessible" role="progressbar" aria-label="本波清怪进度" aria-valuemin="0"></span></div>'+
  '<button id="camp-help" aria-label="守门详情">'+HELP_EMBLEM+'</button>';frame.append(hud);
 // 复用正式领主头像，屏幕画布 44 像素；保持 HP、头像、进度、详情的阅读顺序。
 drawBossIcon(hud.querySelector('#camp-boss canvas'),CAMP_DEFENSE.boss.kind,true);
 hud.querySelector('.camp-wave-orbit').setAttribute('role','img');
 dialog.id='camp-defense-dialog';dialog.className='camp-defense-dialog';dialog.innerHTML='<header><h2 id="camp-defense-title">怪潮来临</h2><button id="camp-close" aria-label="关闭守门面板">×</button></header><div id="camp-content"></div><p id="camp-error" role="status"></p><button id="camp-primary" class="primary">开始守门</button><p id="camp-leave-note" hidden>退出将放弃本轮未结算奖励，返回入场前的位置。</p><button id="camp-leave" hidden>退出娱乐</button>';root.body.append(dialog);
 const speech=createCompactSpeech(root,'camp-rescue-speech');
 const $=id=>root.getElementById(id);
 // 只显示当前行动及三档所得，详细规则折叠，不以长文替代现场选择。
 function renderDialog(){const r=game.campDefense;let html='';
  $('camp-defense-title').textContent=r?.phase==='result'?'营地守住了 · '+campDefenseGrade(r):r?'怪潮守门 · '+r.gate.name:'怪潮来临';
  if(!r){html='<div class="camp-gates">'+CAMP_GATES.map(g=>`<button data-select-gate="${g.id}" aria-pressed="${selected.id===g.id}">${g.name}</button>`).join('')+'</div><p>守住五波，迎战巨型史莱姆「藏金团山」。击破它可获得金币和材料。</p><p>伙伴随时接应，每次都有结算奖励。</p>';}
  else if(r.phase==='result'){
   const grade=campDefenseGrade(r),reward=campDefenseReward(r);
   const items=Object.entries(reward).map(([key,amount])=>`<b>${resourceName(key)} +${amount}</b>`).join('');
   html=`<strong class="camp-grade">${grade}</strong><p>${r.reason?'伙伴已击退怪潮，谢谢你守住这段时间。':'藏金团山被击破了！战利品已收齐。'}</p><p>守住 ${r.cleared} / ${CAMP_DEFENSE.waves.length} 波 · 击败 ${r.kills} 只 · 拒马 ${Math.ceil(r.gateHp/CAMP_DEFENSE.gateHp*100)}%</p><div class="camp-rewards">${items}</div>`;
  }
  else html=`<p>第 ${r.wave} 波 · ${r.waveKills} / ${CAMP_DEFENSE.waves[r.wave-1].count}</p><p>拒马 ${Math.ceil(r.gateHp)} / ${CAMP_DEFENSE.gateHp}</p>${r.phase==='rescue'?'<p>'+r.helpers.map(h=>`${h.spec.name}：${COLLECTED_VEHICLES[h.spec.vehicle].name} + ${WEAPONS[h.spec.weapon].name}`).join('<br>')+'</p>':''}`;
  // 场次读取已保存的开场快照，领奖前不提前增加次数。
  html=(r?`<p>第 ${r.rounds+1} 次兽潮 · 已完成 ${game.progress.campDefense.runs} 次</p>`:`<p>已完成 ${game.progress.campDefense.runs} 次兽潮 · 下一次为第 ${game.progress.campDefense.runs+1} 次</p>`)+html;
  html+='<p class="camp-ring-key">波次数字外圈：金色表示开波等待进度，绿色内圈表示本波清怪进度。</p><details><summary>评分与奖励</summary><p>S：守住五波与领主，拒马至少剩一半。A：完成防守，或守住三波后获救。B：其余守门表现。救场击杀不计成绩。</p>'+Object.entries(CAMP_DEFENSE.grades).map(([grade,r])=>`<p>${grade} · 金币 ${r.coins} / 木材 ${r.wood} / 零件 ${r.parts}</p>`).join('')+'</details>';
  const blocked=!r&&worldDistance(game.player,selected)<=160&&!canStartCampDefense(game,selected);
  const canLeave=!!r&&r.phase!=='result'&&r.phase!=='spoils';setHidden($('camp-leave'),!canLeave);setHidden($('camp-leave-note'),!canLeave);
  $('camp-content').innerHTML=html;$('camp-error').textContent=r?.error||(blocked?'先完成当前清缴或活动，再来守门。':'');$('camp-primary').disabled=blocked;$('camp-primary').textContent=!r?(blocked?'当前活动进行中':canStartCampDefense(game,selected)?'开始守门':'前往'+selected.name):r.phase==='result'?'领取奖励，回到营地':'继续守门';
 }
 // 远处点盾牌只规划到候停点，现场点击仍可立即打开。
 function visit(g){if(!facilityOpen(game.progress,'defense')){game.requestFacility?.('defense');return;}if(game.campDefense||game.arrivalCinematic||game.story||game.realm||game.fireActive)return;selected=g;if(worldDistance(game.player,g)>160){requestWorldNavigation(game,BUILDING_ENTRIES.find(e=>e.type==='gate'&&e.key===g.id),'前往'+g.name+'守门',{action:{type:'camp-defense',gate:g.id}});onChange();return;}dialogs.open('camp-defense-dialog');}
 dialogs.register('camp-defense-dialog',{onOpen:renderDialog,focusId:'camp-primary'});
 // 退出沿用详情面板，保存失败保留现场与按钮，结算阶段只提供领取返回。
 scope.on($('camp-leave'),'click',()=>{if(!leaveCampDefense(game)){renderDialog();return;}dialogs.cancelResume();dialogs.close('camp-defense-dialog');onChange();});
 scope.on($('camp-close'),'click',()=>dialogs.close('camp-defense-dialog'));
 scope.on($('camp-help'),'click',()=>dialogs.open('camp-defense-dialog'));
 scope.on($('camp-boss'),'click',()=>{spawnCampBoss(game);onChange();});
 scope.on(dialog,'click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.selectGate){selected=CAMP_GATES.find(g=>g.id===b.dataset.selectGate);renderDialog();}
 });
 scope.on($('camp-primary'),'click',()=>{const r=game.campDefense;
  if(!r){if(canStartCampDefense(game,selected)){dialogs.close('camp-defense-dialog');startCampDefense(game,selected.id);}else{dialogs.close('camp-defense-dialog');visit(selected);}}
  else if(r.phase==='result'){if(!claimCampDefense(game)){renderDialog();return;}dialogs.close('camp-defense-dialog');}
  else dialogs.close('camp-defense-dialog');onChange();
 });
 // 世界短按命中盾牌，拖动仍交给原摇杆，键盘仍可聚焦激活。
 function tap(event){if(game.state!=='playing'||root.querySelector('dialog[open]')||!renderer.view)return false;const v=renderer.view,rect=renderer.canvas.getBoundingClientRect(),point={x:v.x+(event.clientX-rect.left)/rect.width*v.w,y:v.y+(event.clientY-rect.top)/rect.height*v.h};const marker=campDefenseObjects(game).find(o=>{if(o.kind!=='marker')return false;const p=nearest(o,point);return Math.abs(point.x-p.x)<=48&&point.y>=p.y-142&&point.y<=p.y+8;});if(!marker)return false;visit(CAMP_GATES.find(g=>g.id===marker.id));return true;}
 // 兽潮与其他任务共用顶边，结算恢复资源栏后再回到其下方。
 function positionHud(){
  hud.style.top=taskCombatHudTop(root)+'px';
  // 复用正式领主血条，按实际兽潮条高度排列，兼容手机窄屏与换行。
  if(game.campDefense&&!$('boss-hud').hidden)$('boss-hud').style.top=(hud.offsetTop+hud.offsetHeight+8)+'px';
 }
 // 同行显示防线、当前波次和领主；双环读取正式计时与清怪数量，不增加战斗限时。
 function render(){const r=game.campDefense;frame.classList.toggle('camp-defending',!!r);setHidden(hud,!r||!!root.querySelector('dialog[open]'));
  if(!r){shownResult=null;return;}
  // 只显示已领取结算的次数，当前波次、救场与待领奖状态不会提前加一。
  const completed=hud.querySelector('.camp-completed'),runs=game.progress.campDefense.runs;
  completed.querySelector('b').textContent=runs;completed.setAttribute('aria-label',`已完成兽潮${runs}次`);
  for(const id of ['quest','mainline-hud','equipment-goal'])setHidden($(id),true);
  // 基础HUD已更新领主名称、生命数值及条宽；兽潮只接管显隐和排布。
  setHidden($('boss-hud'),hud.hidden||!game.boss?.campDefense||game.boss.hp<=0);
  positionHud();
  const hp=hud.querySelector('.camp-hp i');hp.style.width=r.gateHp/CAMP_DEFENSE.gateHp*100+'%';hp.parentElement.setAttribute('aria-valuenow',Math.ceil(r.gateHp));hp.parentElement.setAttribute('aria-valuemax',CAMP_DEFENSE.gateHp);
  const wave=Math.min(CAMP_DEFENSE.waves.length,Math.max(1,r.wave)),count=CAMP_DEFENSE.waves[wave-1].count;
  const cleared=r.cleared>=CAMP_DEFENSE.waves.length, kills=cleared?count:Math.min(count,Math.max(0,r.waveKills));
  const waiting=r.phase==='waves'&&r.timer>0,timeProgress=1-Math.min(1,Math.max(0,r.timer/CAMP_DEFENSE.rest));
  const orbit=hud.querySelector('.camp-wave-orbit');orbit.dataset.campWave=String(wave);
  orbit.querySelector('b').textContent=wave;orbit.setAttribute('aria-label',`第 ${wave} 波，共 ${CAMP_DEFENSE.waves.length} 波${cleared?'，已全部守住':''}`);
  hud.querySelector('.camp-ring-time').style.strokeDashoffset=String((cleared?0:1-timeProgress)*100);
  hud.querySelector('.camp-ring-kills').style.strokeDashoffset=String((1-kills/count)*100);
  const timer=hud.querySelector('.camp-time-progress');timer.setAttribute('aria-valuenow',Math.round((cleared?1:timeProgress)*100));
  timer.setAttribute('aria-valuetext',waiting?`距离开波 ${Math.ceil(r.timer)} 秒`:cleared?'五波已守住':r.phase==='rescue'?'接应中，计时已停止':'本波已开始');
  const killMeter=hud.querySelector('.camp-kill-progress');killMeter.setAttribute('aria-valuenow',kills);killMeter.setAttribute('aria-valuemax',count);killMeter.setAttribute('aria-valuetext',`本波已清理 ${kills} / ${count}`);
  const boss=$('camp-boss'),bossState=r.bossDefeated?'done':game.boss?'active':r.phase==='boss-ready'?'ready':'pending';
  boss.disabled=r.phase!=='boss-ready';boss.dataset.state=bossState;
  const bossLabel=r.bossDefeated?'领主已击败':game.boss?`领主交战中，耐久 ${Math.ceil(game.boss.hp)} / ${game.boss.maxHp}`:r.phase==='boss-ready'?'迎战领主':'领主尚未登场';
  boss.setAttribute('aria-label',bossLabel);boss.title=bossLabel;
  if(r.phase==='result'&&shownResult!==r&&!root.hidden&&!root.querySelector('dialog[open]')){shownResult=r;dialogs.open('camp-defense-dialog');}
 }
 // 命中区跟随原镜头，救援短句以头顶小气泡显示，不改变缩放或重新对焦。
 function renderFrame(){const available=game.state==='playing'&&!root.hidden&&!root.querySelector('dialog[open]')&&frame.dataset.page!=='title';
  const objects=campDefenseObjects(game);markers.forEach((n,i)=>{const site=objects.find(o=>o.kind==='marker'&&o.id===CAMP_GATES[i].id);if(site)n.setAttribute('aria-label',`${site.name}兽潮守门，已完成${site.completed}次`);if(available&&site)placeSceneHit(n,site,renderer,frame,{width:96,height:150});else setHidden(n,true);});
  const r=game.campDefense;setHidden(speech.node,true);if(!r)return;
  positionHud();
  if(r.phase==='rescue'&&available){
   const helper=r.helpers.filter(h=>h.entered&&r.rescueTime-h.enterAt<CAMP_DEFENSE.rescue.bubbleSeconds).at(-1);
   if(helper)speech.show({...helper.local.player,name:helper.spec.name},helper===r.helpers[0]?CAMP_DEFENSE.lines[r.reason]:'我来接应，跟上！',renderer,{head:82,minTop:hud.offsetTop+hud.offsetHeight+10});
  }
 }
 // 所有临时节点和监听在应用重建时销毁。
 function dispose(){scope.dispose();for(const n of markers)n.remove();hud.remove();dialog.remove();speech.dispose();frame.classList.remove('camp-defending');}
 // 主线复用盾牌的同一入口，远处导航、抵达开页与现场点击保持一致。
 return {render,renderFrame,tap,dispose,visit:id=>{const gate=CAMP_GATES.find(g=>g.id===id);if(gate)visit(gate);}};
}
