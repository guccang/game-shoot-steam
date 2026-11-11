import {setHidden} from './shared/dom-state.js';
// 运动会面板采用短规则、名次和资源图标；输入只请求冲刺，不执行奖励结算。
import {RACE,RACE_TURN,raceTime,racePlace} from '../config/forest-race.js';
import {drawRaceCard,drawRaceMap} from '../rendering/forest-race.js';
import {resourceIcon} from '../rendering/resource-icons.js';
import {createEventScope} from '../platform/events.js';
// 入口与其他秘境卡片共用尺寸，纪录用本场最快时间表达。
export function raceCard(record){return `<article class="realm-card realm-race"><div class="realm-art"><canvas data-race-art width="480" height="320" role="img" aria-label="森林跑道和参加赛跑的小猫"></canvas><span class="realm-badge">跑步比赛</span></div><div class="realm-card-body"><div class="realm-card-heading"><div><h3>森林运动会</h3><div class="realm-record">${record.bestTimeMs?`最快 ${raceTime(record.bestTimeMs/1000)}`:'两圈 · 四位选手'}</div></div><button class="primary" data-enter-realm="race">参赛</button></div><div class="realm-card-loot">${resourceIcon('coins')} ${resourceIcon('wood')} ${resourceIcon('parts')}<span>按名次领奖</span></div></div></article>`;}
// 规则详情沿用秘境问号，准备页只留下必要操作信息。
export function raceMarkup(game){
 const r=game.realm,build=r.phase==='build',done=['won','lost'].includes(r.phase);
 return `${build?'<canvas class="football-banner" data-race-art width="480" height="320" role="img" aria-label="两圈森林跑道"></canvas><div class="race-instructions"><span>① 沿旗标跑两圈</span><span>② 绕草捆 · 避泥地</span><span>③ 踩箭头加速 · 冲线领奖</span></div><p class="football-steps">方向键 / 摇杆移动 · Shift / 冲刺按钮加速</p><button class="primary football-start" data-race-start>准备起跑</button>':`<div class="football-result"><b>${r.phase==='won'?`第 ${r.place} 名`:r.phase==='lost'?'未完赛':`${racePlace(r)} / 4`}</b><span>${raceTime(r.elapsed)}</span></div>${done?`<div class="realm-earnings">${Object.entries(r.earnings).filter(([,n])=>n>0).map(([k,n])=>`<span>${resourceIcon(k)}<b>+${n}</b></span>`).join('')||'<span>下次再接再厉</span>'}</div>`:'<button class="primary football-start" data-realm-resume>继续比赛</button>'}`}
 <button class="realm-exit" data-realm-exit>${build||done?'返回森林':'退出比赛'}</button>`;
}
// DOM更新时才绘制入口插画，比赛小地图复用固定Canvas。
export function paintRacePanel(root){for(const canvas of root.querySelectorAll('[data-race-art]'))drawRaceCard(canvas.getContext('2d'));}
// 触摸冲刺与摇杆可同时使用；松开、取消、失焦和暂停立即释放。
export function createRaceControls({game,root}){
 const scope=createEventScope(),layer=root.createElement('div');layer.className='race-controls';layer.hidden=true;
 layer.innerHTML='<span class="race-track-status" role="status" hidden></span><canvas width="120" height="90" role="img" aria-label="跑道小地图：黄点是你，空心圈是下一旗标"></canvas><button type="button" class="race-sprint" aria-label="按住冲刺，松开恢复体力"><span aria-hidden="true">➜</span><b>冲刺</b><meter min="0" max="100" value="100" aria-label="剩余体力"></meter></button>';
 root.getElementById('game-frame').append(layer);const button=layer.querySelector('button'),meter=layer.querySelector('meter'),canvas=layer.querySelector('canvas');
 // 只改变本场输入标志，暂停或切换场景后旧指针不再影响新比赛。
 function release(){if(game.realm?.mode==='race')game.realm.sprinting=false;button.classList.remove('pressed');}
 scope.on(button,'pointerdown',e=>{if(game.realm?.mode!=='race'||game.state!=='playing'||game.realm.warning>0)return;e.preventDefault();button.setPointerCapture(e.pointerId);game.realm.sprinting=true;button.classList.add('pressed');});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])scope.on(button,event,release);
 scope.on(root.defaultView,'blur',release);scope.on(root,'visibilitychange',release);
 scope.on(button,'keydown',e=>{if(['Space','Enter'].includes(e.code)&&game.realm?.mode==='race'&&game.state==='playing'){e.preventDefault();game.realm.sprinting=true;}});
 scope.on(button,'keyup',release);
 // HUD只刷新文本、进度和小地图；不重建正在触摸的按钮。
 function render(){
  const r=game.realm,active=r?.mode==='race';root.getElementById('game-frame').classList.toggle('race-active',active);setHidden(layer,!active||r.phase!=='combat');
  if(!active||game.state!=='playing'){release();if(!active)return;}
  if(active){const status=layer.querySelector('.race-track-status');status.hidden=!(r.track.boostLeft>0||r.track.muddy);status.textContent=r.track.muddy?'≈ 泥地减速':`➜ 顺风 ${r.track.boostLeft.toFixed(1)}秒`;meter.value=r.stamina;button.disabled=game.state!=='playing'||r.warning>0;button.querySelector('b').textContent=r.exhausted?'恢复中':'冲刺';drawRaceMap(canvas.getContext('2d'),r,game.player);
   root.getElementById('quest-title').textContent=`森林运动会 · 第 ${racePlace(r)} 名`;
   root.getElementById('quest-detail').textContent=r.phase==='build'?'两圈赛跑 · 沿箭头前进':r.phase==='won'?'已冲线 · 奖励已入库':r.phase==='lost'?'时间到 · 未完赛':`第 ${Math.min(RACE.laps,Math.floor(Math.max(0,r.distance)/RACE_TURN)+1)} / ${RACE.laps} 圈 · 下一旗标 ${r.nextGate%8||8}`;
   root.getElementById('quest-count').textContent=r.warning>0&&r.phase==='combat'?`${Math.ceil(r.warning)}`:raceTime(r.elapsed);
   root.getElementById('quest').classList.toggle('incoming',r.phase==='combat'&&r.warning>0);
  }
 }
 // 页面卸载归还指针并移除所有监听器，避免跨场残留冲刺状态。
 function dispose(){release();scope.dispose();layer.remove();}
 return {render,dispose,release};
}
