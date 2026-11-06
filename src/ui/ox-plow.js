// 牵牛操作栏、留场耕牛热点和逐格预览共享正式世界坐标。
import {engageReaper,reaperLine,releaseReaper} from '../core/row-reaper.js';
import {farmGrowth} from '../progression/farm.js';
import {PEN_GATE,oxFoot} from '../config/pasture.js';
import {worldDistance} from '../world/coordinates.js';
import {createEventScope} from '../platform/events.js';
import {farmLandReason} from '../world/farm-land.js';
import {placeSceneHit} from './scene-hit.js';
import {liftOxPlow,oxTarget,turnOx,oxRigClear} from '../core/farm.js';
import {FARM_MAX_PLOTS} from '../config/farm.js';
import {interactWildPasture,wildPastureObjects} from '../core/wild-pasture.js';

export function createOxControls({game,root,layer,renderer,frame,start,stop,say,onPasture}){
 const scope=createEventScope(),panel=root.createElement('section'),hit=root.createElement('button');
 panel.id='farm-ox-controls';panel.hidden=true;panel.setAttribute('aria-label','牵牛操作');
 panel.innerHTML='<button class="ui-button" data-ox-turn>掉头</button><button class="ui-button ui-button--primary" data-ox-hold>按住犁地</button><button class="ui-button" data-ox-park>停牛</button>';
 hit.id='farm-ox-hit';hit.className='scene-hit';hit.setAttribute('aria-label','与耕牛交互');hit.hidden=true;
 const gate=root.createElement('button');gate.id='farm-pasture-gate';gate.className='ui-button';gate.textContent='照料牛羊';gate.hidden=true;gate.style.cssText='position:absolute;pointer-events:auto;min-height:44px;white-space:nowrap;padding:4px';
 layer.append(panel,hit,gate);scope.on(gate,'click',onPasture);
 // 两个世界按钮分别绑定当前草丛与野牛，离开互动距离立即收起。
 const meadowButtons=new Map();
 for(const [type,label] of [['sweet-grass','采甜穗草'],['wild-ox','喂野牛']]){
  const button=root.createElement('button');button.type='button';button.className='ui-button farm-meadow-action';button.hidden=true;
  button.textContent=label;button.dataset.meadow=type;layer.append(button);meadowButtons.set(type,button);
  scope.on(button,'click',()=>{
   const r=interactWildPasture(game,type,Number(button.dataset.site));
   if(!r.ok)say(r.message);
  });
 }
 const hold=panel.querySelector('[data-ox-hold]');
 // 保持同一活动指针，松开、取消、失焦和打开遮罩均停止前进。
 function release(){liftOxPlow(game);releaseReaper(game);}
 function press(){
  if(game.farmWork?.reaper&&!panel.hidden){engageReaper(game);return;}
  const ox=game.farmWork?.ox;if(!ox||ox.approach||ox.turn||panel.hidden)return;
  const reason=farmLandReason(game,oxTarget(game));if(reason){say(reason);return;}
  ox.held=true;
 }
 scope.on(hold,'pointerdown',e=>{if(e.button!==0)return;e.preventDefault();hold.setPointerCapture(e.pointerId);press();});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])scope.on(hold,event,release);
 scope.on(hold,'keydown',e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();if(!e.repeat)press();}});
 scope.on(hold,'keyup',release);scope.on(root.defaultView,'blur',release);scope.on(root,'visibilitychange',()=>{if(root.hidden)release();});
 scope.on(panel.querySelector('[data-ox-turn]'),'click',()=>{release();const r=game.farmWork?.reaper;if(r){r.facing*=-1;return;}const ox=game.farmWork?.ox;if(ox)turnOx(game,-ox.facing);});
 scope.on(panel.querySelector('[data-ox-park]'),'click',()=>{release();if(game.farmWork?.reaper){stop(true);return;}stop();if(game.livingPersist?.(game.progress)===false)say('耕牛已停下，位置保存失败。');});
 scope.on(hit,'click',start);
 // 位置随镜头更新；静止时复用地形校验，进度、落点或地图变化立即重算。
 let previous='',reasons=[],mode=null,previewPlots=null;
 function render(accessible){
  const work=game.farmWork,site=game.progress.farm.oxSite,dialog=root.querySelector('dialog[open]');
  const reaper=work?.reaper;
  const showing=accessible&&(work?.tool==='ox'||!!reaper)&&!dialog&&!!renderer.view;
  if(showing&&work.tool!==mode){mode=work.tool;hold.textContent=reaper?'按住收割':'按住犁地';panel.setAttribute('aria-label',reaper?'单行推镰操作':'牵牛操作');panel.querySelector('[data-ox-park]').textContent=reaper?'收起推镰':'停牛';}
  const wildlife=accessible&&!work&&!dialog?wildPastureObjects(game):[];
  for(const [type,button] of meadowButtons){
   const object=wildlife.find(s=>s.type===type);
   if(!object||worldDistance(game.player,object)>95){button.hidden=true;continue;}
   button.dataset.site=String(object.id);
   placeSceneHit(button,{...object,y:object.y+38},renderer,frame,{width:96,height:44,centered:true});
  }
  if(accessible&&!dialog&&!showing&&game.mapId===PEN_GATE.mapId&&worldDistance(game.player,PEN_GATE)<145)placeSceneHit(gate,PEN_GATE,renderer,frame,{width:110,height:52});else gate.hidden=true;
  panel.hidden=!showing;
  if(!showing)release();
  if(accessible&&!dialog&&!game.oxArrival&&site?.mapId===game.mapId&&!showing)placeSceneHit(hit,oxFoot(site),renderer,frame,{width:112,height:82});
  else hit.hidden=true;
  if(!showing&&work?.ox)work.ox.preview=null;
  if(!showing)return;
  if(reaper){
   // 预览按当前位置、田块事务和成熟时间刷新，静止时不逐帧遍历整片田。
   const key=[Math.round(game.player.x),Math.round(game.player.y),reaper.facing,reaper.line[0]?.id,game.mapId,Math.floor(game.time*4)].join('/');
   if(key!==reaper.previewKey||previewPlots!==game.progress.farm.plots){
    const line=reaper.held?reaper.line:reaperLine(game);
    reaper.preview=line.slice(0,3).map(p=>({...p,valid:p.crop!==null&&farmGrowth(p)>=1}));
    reaper.previewKey=key;previewPlots=game.progress.farm.plots;
   }
   hold.disabled=!!work.job;hold.setAttribute('aria-pressed',String(reaper.held));return;
  }
  hold.disabled=!!work.ox?.turn||!!work.ox?.approach;
  const points=[1,2,3].map(i=>oxTarget(game,i)),p=points[0];
  const key=[p.mapId,p.x,p.y,work.ox?.facing,game.progress.farm.plots.length,Math.floor(game.time*4)].join('/');
  if(key!==previous){reasons=points.map(p=>farmLandReason(game,p)||(!oxRigClear(game,p,work.ox?.yaw??0)?'牛犁无法通行':'')|| (game.progress.farm.plots.length>=FARM_MAX_PLOTS?'田块已满':''));previous=key;}
  work.ox.preview=work.ox.turn?[]:points.map((point,i)=>({...point,valid:!reasons[i]}));
  hold.setAttribute('aria-pressed',String(!!work.ox?.held));
 }
 return {render,dispose:()=>{release();scope.dispose();}};
}
