import {dockNpcDialogue} from './npc-dialogue-layout.js';
// 剧情对白在屏幕底部标注姓名并逐字显示，面板只负责装备与路线等玩家选择。
import { storySpeechInfo } from '../rendering/story-guidance.js';
import {createSpeechBubble} from './speech-bubble.js';

// 单气泡复用，读取正式镜头投影；阅读计时仅在当前场景可见时推进。
export function createStorySpeech({game,root,renderer,onChange}) {
  const frame=root.getElementById('game-frame');
  const bubble=createSpeechBubble(root,'story-speech','森林故事对白',{onAdvance:()=>advance(false),onSkip:()=>advance(true)}),{node}=bubble;
  frame.append(node);
  // 下一句和跳过整段都走正式对白完成逻辑，日志、路线选择与奖励条件不绕过。
  function advance(skip){if(game.story?.dialogue){game.advanceStoryDialogue(skip);onChange();renderFrame();}}
  // 每帧紧跟正式绘制后的镜头；不使用独立setTimeout，后台不会跳过对白。
  function renderFrame(dt=0) {
    const info=storySpeechInfo(game);
    // 父容器参与整片 HUD 的样式选择，状态不变时不重复使后代样式失效。
    if(frame.classList.contains('story-speaking')!==!!info)frame.classList.toggle('story-speaking',!!info);
    if(!info){if(!node.hidden)node.hidden=true;bubble.reset();renderer.storyCamera.layout=null;return;}
    const hidden=root.hidden||game.state!=='story'||!!root.querySelector('dialog[open]')||!renderer.view;
    if(node.hidden!==hidden)node.hidden=hidden;
    if(node.hidden)return;
    bubble.present({...info,nextLabel:game.story.line<info.lines.length-1?'下一句':'继续'},dt);
    // 底部对白不再为头顶气泡挪动镜头，人物仍使用原场景构图。
    renderer.storyCamera.layout=null;dockNpcDialogue(root,node);node.dataset.speaker=info.speaker;

  }
  // 卸载不留按钮监听或叠加计时器。
  function dispose(){bubble.dispose();frame.classList.remove('story-speaking');}
  return {renderFrame,dispose};
}
