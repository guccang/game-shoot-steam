// 任务战斗短句复用居民头顶小气泡，不暂停、不改镜头、不隐藏其他界面。
import {storyCueInfo} from '../rendering/story-guidance.js';
import {createCompactSpeech} from './compact-speech.js';
import {sceneLayout} from './scene-layout.js';
import {nearbyStoryPost} from '../core/story-posts.js';

// 单个正式气泡节点复用所有提示，预警、长对白和操作区始终优先。
export function createStoryChatter({game,root,renderer}){
  const frame=root.getElementById('game-frame'),bubble=createCompactSpeech(root,'story-chatter'),{node}=bubble;
  node.setAttribute('role','status');node.setAttribute('aria-live','polite');
  // 只在说话者头顶空间足够时计入阅读时间，画外短句不再退化为底部面板。
  function renderFrame(){
    const active=game.story?.activeCue;if(active)active.visible=false;
    // 短句锚点与角色共用当前显示帧，避免逻辑坐标相对插值后的镜头来回跳动。
    const info=storyCueInfo(renderer.renderGame||game);
    // 返回驿牌时优先显示任务管理入口，短句暂停阅读计时，离开后继续展示。
    if(game.story&&nearbyStoryPost(game)){bubble.hide();return;}
    if(!info||!info.present||!renderer.view||root.hidden||game.state!=='playing'||game.story.dialogue||root.querySelector('dialog[open]')||['windup','cast'].includes(game.boss?.ai?.phase)){bubble.hide();return;}
    const safe=!game.boss&&!game.enemies.some(e=>e.hp>0)||!!game.story.trial;
    if(info.safeOnly&&!safe){bubble.hide();return;}
    const {frame:rect}=sceneLayout(renderer,frame);
    const huds=['.hud-resources','#quest','#boss-hud'].map(s=>root.querySelector(s)).filter(n=>n&&!n.hidden&&n.getClientRects().length);
    const top=Math.max(12,...huds.map(n=>n.getBoundingClientRect().bottom-rect.top+8));
    active.visible=bubble.show({...info.anchor,name:info.speaker},info.text,renderer,{head:info.head,minTop:top});
    if(node.dataset.cue!==info.id)node.dataset.cue=info.id;
  }
  // 章节退出和面板销毁不残留旧短句或额外监听。
  function dispose(){bubble.dispose();}
  return {renderFrame,dispose};
}
