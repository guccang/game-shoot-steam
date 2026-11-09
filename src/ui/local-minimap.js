// 小地图点击进入原地图页，低频绘制不推动世界时间或额外创建全图缓存。
import {createEventScope} from '../platform/events.js';
import {LOCAL_MINIMAP as M} from '../config/local-minimap.js';
import {drawLocalMinimap} from '../rendering/local-minimap.js';
export function createLocalMinimap({game,renderer,root,dialogs}){
 const scope=createEventScope(),frame=root.getElementById('game-frame'),button=root.createElement('button'),canvas=root.createElement('canvas');let next=0,last=null;
 button.id='local-minimap';button.type='button';button.hidden=true;button.setAttribute('aria-label','附近两屏小地图，点击查看地图');button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','map-dialog');canvas.width=canvas.height=M.pixels;canvas.setAttribute('aria-hidden','true');button.append(canvas);frame.append(button);
 scope.on(button,'click',()=>dialogs.open('map-dialog'));
 // 所有场景共用显隐条件，室内及独立副本不会残留错误的森林地形。
 function renderFrame(now=performance.now()){
  const show=!!renderer.view&&['playing','paused'].includes(game.state)&&['forest','jiuzhaigou'].includes(game.mapId)&&!game.cottage&&!game.realm&&!game.story&&!game.arrivalCinematic&&frame.dataset.page!=='title';
  if(button.hidden===show){button.hidden=!show;frame.classList.toggle('has-local-minimap',show);next=0;}
  if(!show||root.hidden||root.querySelector('dialog[open]')||now<next)return;
  next=now+M.interval;last=drawLocalMinimap(canvas.getContext('2d'),game,renderer.view,renderer.environment.time==='night');
 }
 return {renderFrame,stats:()=>last,dispose(){scope.dispose();button.remove();frame.classList.remove('has-local-minimap');canvas.width=canvas.height=1;}};
}
