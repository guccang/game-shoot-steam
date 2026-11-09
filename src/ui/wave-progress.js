import { i18nText } from "../i18n/index.js";
// 普通巡游进度只读取正式波次；剧情与秘境继续使用各自任务提示。
import { waveDifficulty, WAVE_REST_SECONDS } from '../config/waves.js';

import {livingWaveAllowed,clearingCombatActive} from '../core/camp/living-safety.js';
import { WAVE_WARNING_SECONDS } from '../core/battle/wave-manager.js';
import {clearingRound} from './clearing-round.js';

// 波间只显示一次休整圆环；首次及波中重建单独显示准备圆环，不相加。
export function waveCountdownState(game) {
  if(game.story||game.realm||game.boss||game.bossReady)return null;
  const rest=Number.isFinite(game.waveRest)?Math.max(0,game.waveRest):0;
  const warning=Number.isFinite(game.waveWarning)?Math.max(0,game.waveWarning):0;
  if(!rest&&!warning)return null;
  const duration=rest?WAVE_REST_SECONDS:WAVE_WARNING_SECONDS;
  const remaining=rest||warning;
  return {wave:game.wave+(rest?1:0),progress:Math.max(0,Math.min(1,1-remaining/duration))};
}

// 计算组内完成数与清怪比例，领主胜利后的休整不算作新组第一波完成。
export function waveProgressState(game) {
  const start=game.waveGroupStart??game.wave;
  const count=Math.max(1,game.bossWave-start+1);
  const waiting=game.wave<start;
  const cleared=game.bossReady||game.waveRest>0;
  const completed=Math.max(0,Math.min(count,game.wave-start+(cleared?1:0)));
  const fraction=waiting||cleared?0:Math.max(0,Math.min(1,game.waveKills/waveDifficulty(game.wave).total));
  return {start,count,completed,remaining:count-completed,waiting,
    progress:Math.min(1,(completed+fraction)/count),
    nodes:Array.from({length:count},(_,i)=>({wave:start+i,
      state:i<completed?'done':!waiting&&start+i===game.wave?'current':'pending'}))};
}

// 建立节点组时复用同一个 Boss 按钮，保留原事件、头像缓存和猫爪动画。
export function updateWaveProgress(root,game) {
  const quest=root.getElementById('quest'),track=root.getElementById('wave-track');
  // 详情和短提示复用同一轨道，范围外查看任务时也能读取已保存的波次。
  const embedded=!!track.closest('#wave-help-dialog');
  const visible=!game.story&&!game.realm&&!game.fireActive&&(embedded||livingWaveAllowed(game)||clearingCombatActive(game));
  quest.classList.toggle('wave-quest',visible);
  track.hidden=!visible;
  if(!visible)return;
  const state=waveProgressState(game),nodes=root.getElementById('wave-nodes');
  const countdown=waveCountdownState(game);
  const key=state.start+':'+state.count;
  if(nodes.dataset.group!==key){
    nodes.replaceChildren(...state.nodes.map((node,i)=>{
      const dot=root.createElement('span');
      dot.className='wave-node';dot.dataset.index=String(i);
      // 固定 SVG 环复用节点，圆弧沿正式计时填充，文本刷新不销毁圆环。
      dot.innerHTML='<span class="wave-node-label"></span><svg class="wave-countdown" viewBox="0 0 36 36" aria-hidden="true"><circle class="wave-countdown-base" cx="18" cy="18" r="16"/><circle class="wave-countdown-fill" cx="18" cy="18" r="16" pathLength="100"/></svg>';
      return dot;
    }));
    nodes.dataset.group=key;
  }
  [...nodes.children].forEach((dot,i)=>{
    const node=state.nodes[i];
    const timing=countdown?.wave===node.wave;
    dot.dataset.state=node.state;
    dot.dataset.countdown=String(timing);
    dot.querySelector('.wave-node-label').textContent=node.state==='done'?'✓':String(i+1);
    const arc=dot.querySelector('.wave-countdown-fill');
    arc.style.strokeDashoffset=String(timing?(1-countdown.progress)*100:100);
    const label=`第 ${i+1} 批 · ${timing?'准备中':({done:'已清理',current:'清理中',pending:'未开始'}[node.state])}`;
    dot.title=label;dot.setAttribute('aria-label',label);
    if(timing||node.state==='current')dot.setAttribute('aria-current','step');
    else dot.removeAttribute('aria-current');
  });
  track.style.setProperty('--wave-count',state.count);
  root.getElementById('wave-track-fill').style.width=state.progress*100+'%';
  const bar=root.getElementById('wave-track-bar');
  bar.setAttribute('aria-valuenow',String(Math.round(state.progress*100)));
  bar.setAttribute('aria-valuetext',i18nText("ui.wave-progress.e956bf840e", { p0: (state.completed), p1: (state.count), p2: (state.remaining) }));
  // 组进度由轨道和节点表达，读屏仍保留上方的完整进度说明。
  root.getElementById('quest-detail').textContent='';
  root.getElementById('quest-count').textContent='';
  if(state.waiting)root.getElementById('quest-title').textContent=`第 ${clearingRound(game)} 轮 · 准备出发`;
}
