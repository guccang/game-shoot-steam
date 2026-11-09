import {setHidden,setText} from './shared/dom-state.js';
// 牵牛操作栏、留场耕牛热点和逐格预览共享正式世界坐标。
import {reaperLine,releaseReaper} from '../core/farming/row-reaper.js';
import {farmGrowth} from '../progression/farming/farm.js';
import {PASTURE,PEN_GATE,oxFoot} from '../config/pasture.js';
import {worldDistance} from '../world/coordinates.js';
import {createEventScope} from '../platform/events.js';
import {farmLandReason} from '../world/farm-land.js';
import {placeSceneHit} from './scene-hit.js';
import {liftOxPlow,oxTarget,turnOx,oxRigClear} from '../core/farming/farm.js';
import {FARM_MAX_PLOTS} from '../config/farm.js';
import {interactWildPasture,wildPastureObjects} from '../core/farming/wild-pasture.js';

export function createOxControls({game,root,layer,renderer,frame,start,stop,say,onPasture,onAxis}){
 const scope=createEventScope(),panel=root.createElement('section'),hit=root.createElement('button');
 panel.id='farm-ox-controls';setHidden(panel,true);panel.setAttribute('aria-label','牵牛操作');
 panel.innerHTML='<button class="ui-button" data-ox-axis>按行</button><button class="ui-button" data-ox-turn>掉头</button><button class="ui-button ui-button--primary" data-ox-hold>点格作业</button><button class="ui-button" data-ox-park>停牛</button>';
 hit.id='farm-ox-hit';hit.className='scene-hit';hit.setAttribute('aria-label','与耕牛交互');setHidden(hit,true);
 const gate=root.createElement('button');gate.id='farm-pasture-gate';gate.className='ui-button';setText(gate,'照料牛羊');setHidden(gate,true);gate.style.cssText='position:absolute;pointer-events:auto;min-height:44px;white-space:nowrap;padding:4px';
 layer.append(panel,hit,gate);scope.on(gate,'click',onPasture);
 // 两个世界按钮分别绑定当前草丛与野牛，离开互动距离立即收起。
 const meadowButtons=new Map();
 for(const [type,label] of [['sweet-grass','采甜穗草'],['wild-ox','喂野牛']]){
  const button=root.createElement('button');button.type='button';button.className='ui-button farm-meadow-action';setHidden(button,true);
  setText(button,label);button.dataset.meadow=type;layer.append(button);meadowButtons.set(type,button);
  scope.on(button,'click',()=>{
   const r=interactWildPasture(game,type,Number(button.dataset.site));
   if(!r.ok)say(r.message);
  });
 }
 const hold=panel.querySelector('[data-ox-hold]');
 // 自动计划由点格启动，按钮只停止；松开屏幕不会撤掉作业。
 function release(){liftOxPlow(game);releaseReaper(game);game.player.vx=game.player.vy=0;}
 scope.on(hold,'click',()=>{release();say('已停止作业，点选地格可重新开始');});
 scope.on(panel.querySelector('[data-ox-turn]'),'click',()=>{release();const r=game.farmWork?.reaper;if(r){r.facing*=-1;return;}const ox=game.farmWork?.ox;if(ox)turnOx(game,-ox.facing);});
 scope.on(panel.querySelector('[data-ox-park]'),'click',()=>{release();if(game.farmWork?.reaper){stop(true);return;}stop();if(game.livingPersist?.(game.progress)===false)say('耕牛已停下，位置保存失败。');});
 scope.on(hit,'click',start);
 scope.on(panel.querySelector('[data-ox-axis]'),'click',()=>{release();onAxis();});
 // 位置随镜头更新；静止时复用地形校验，进度、落点或地图变化立即重算。
 let previous='',reasons=[],mode=null,previewPlots=null;
 function render(accessible){
  setText(panel.querySelector('[data-ox-axis]'),game.progress.farm.axis==='column'?'按列 ↕':'按行 ↔');
  const work=game.farmWork,site=game.progress.farm.oxSite,dialog=root.querySelector('dialog[open]');
  const reaper=work?.reaper;
  const showing=accessible&&(work?.tool==='ox'||!!reaper)&&!dialog&&!!renderer.view;
  if(showing&&work.tool!==mode){mode=work.tool;panel.setAttribute('aria-label',reaper?'单行推镰操作':'牵牛操作');setText(panel.querySelector('[data-ox-park]'),'换农具');}
  const wildlife=accessible&&!work&&!dialog?wildPastureObjects(game):[];
  for(const [type,button] of meadowButtons){
   const object=wildlife.find(s=>s.type===type);
   if(!object||worldDistance(game.player,object)>95){setHidden(button,true);continue;}
   button.dataset.site=String(object.id);
   placeSceneHit(button,{...object,y:object.y+38},renderer,frame,{width:96,height:44,centered:true});
  }
  if(accessible&&!dialog&&!showing&&game.mapId===PEN_GATE.mapId&&worldDistance(game.player,PEN_GATE)<145)placeSceneHit(gate,{x:PEN_GATE.x-PASTURE.gate*.8,y:PEN_GATE.y+16},renderer,frame,{width:110,height:52});else setHidden(gate,true);
  setHidden(panel,!showing);
  if(showing){const running=!!reaper?.held||!!work?.ox?.auto;setText(hold,running?'停止作业':'点格作业');hold.disabled=!running;}
  if(accessible&&(!work||work.tool==='select')&&!dialog&&!game.oxArrival&&!game.progress.farm.oxReturn&&site?.mapId===game.mapId&&!showing)placeSceneHit(hit,oxFoot(site),renderer,frame,{width:112,height:82});
  else setHidden(hit,true);
  if(!showing&&work?.ox)work.ox.preview=null;
  if(!showing)return;
  if(reaper){
   // 预览按当前位置、田块事务和成熟时间刷新，静止时不逐帧遍历整片田。
   const key=[Math.round(game.player.x),Math.round(game.player.y),reaper.facing,reaper.axis,reaper.line[0]?.id,game.mapId,Math.floor(game.time*4)].join('/');
   if(key!==reaper.previewKey||previewPlots!==game.progress.farm.plots){
    const line=reaper.held?reaper.line:reaperLine(game);
    reaper.preview=line.slice(0,3).map(p=>({...p,valid:p.crop!==null&&farmGrowth(p)>=1}));
    reaper.previewKey=key;previewPlots=game.progress.farm.plots;
   }
   hold.disabled=!reaper.held;hold.setAttribute('aria-pressed',String(reaper.held));return;
  }
  hold.disabled=!work.ox?.auto;
  const points=work.ox?.auto?.line.slice(0,3)||[1,2,3].map(i=>oxTarget(game,i)),p=points[0];
  const key=[p.mapId,p.x,p.y,work.ox?.facing,game.progress.farm.plots.length,Math.floor(game.time*4)].join('/');
  if(key!==previous){reasons=points.map(p=>farmLandReason(game,p)||(!oxRigClear(game,p,work.ox?.yaw??0)?'牛犁无法通行':'')|| (game.progress.farm.plots.length>=FARM_MAX_PLOTS?'田块已满':''));previous=key;}
  work.ox.preview=work.ox.turn?[]:points.map((point,i)=>({...point,valid:!reasons[i]}));
  hold.setAttribute('aria-pressed',String(!!work.ox?.held));
 }
 return {render,dispose:()=>{release();scope.dispose();}};
}
