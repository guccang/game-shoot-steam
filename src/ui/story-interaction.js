// 场景物品本体接收短按，动态箭头仅提示位置；拖动继续交给统一移动输入。
import {storyInteractionReady,storyInteractionTarget} from '../core/story/story-interaction.js';
import {sceneHit,placeSceneHit} from './scene-hit.js';
import {sceneLayout} from './scene-layout.js';

// 复用一个原生按钮，保持键盘和无障碍入口，不创建另一份底部操作栏。
export function createStoryInteraction({game,root,renderer,button}){
 sceneHit(button,'故事任务交互');
 button.innerHTML='<span class="story-interact-cue" aria-hidden="true"><span class="story-interact-label">点击</span><svg viewBox="0 0 32 30"><path d="M10 3h12v10h7L16 27 3 13h7z" fill="#f9e9ac" stroke="#365e49" stroke-width="2.5" stroke-linejoin="round"/></svg></span>';
 const label=button.querySelector('.story-interact-label'),cue=button.querySelector('.story-interact-cue'),frame=root.getElementById('game-frame');
 // 每个渲染帧读取正式镜头；箭头局部轻点，实体命中区不跟着动画抖动。
 function renderFrame(){
  const hidden=root.hidden||frame.dataset.page==='title'||!!root.querySelector('dialog[open]')||!storyInteractionReady(game);
  if(button.hidden!==hidden)button.hidden=hidden;if(hidden)return;
  const geometry=sceneLayout(renderer,frame),hud=root.getElementById('quest').getBoundingClientRect();
  const target=storyInteractionTarget(game),r=game.story,o=game.storyObjective();
  const text=r.interacting>0?'操作中':r.trial?'结束试射':'点击';
  if(label.textContent!==text)label.textContent=text;
  const name=r.trial?'结束试射':o.label;
  if(button.getAttribute('aria-label')!==name)button.setAttribute('aria-label',name);
  if(button.disabled!==!!r.interacting)button.disabled=!!r.interacting;
  if(button.dataset.target!==target.kind)button.dataset.target=target.kind;
  placeSceneHit(button,target,renderer,frame,{width:target.width,height:target.height+42,foot:8});
  if(button.hidden)return;
  // 短屏顶栏挡住头顶时，将箭头移到物件侧面并转向本体，不把目标挪到空地。
  const top=parseFloat(button.style.top),left=parseFloat(button.style.left),width=parseFloat(button.style.width),height=parseFloat(button.style.height);
  const side=top<Math.max(6,hud.bottom-geometry.frame.top+6);
  const direction=side?(left+width+80<geometry.frame.width?'right':'left'):'top';
  if(button.dataset.cue!==direction)button.dataset.cue=direction;
  cue.style.left=direction==='right'?`${width}px`:direction==='left'?'0px':'50%';
  cue.style.top=side?`${height-8*renderer.view.zoom-target.height*renderer.view.zoom/2-14}px`:'0px';
  const bob=renderer.reduced.matches||r.interacting?0:Math.sin(game.time*5)*3;
  cue.style.transform=`translate(${direction==='right'?'0':direction==='left'?'-100%':'-50%'},${bob}px)`;
 }
 return {renderFrame};
}
