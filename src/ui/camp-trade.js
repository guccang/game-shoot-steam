import {escortQuote,escortWaveDone,escortPayout,TRADE_ESCORT} from '../config/trade-escort.js';
// 手机可看行情、接单点与商队位置，到场才办理交接。
import {TRADE_SITES,TRADE_BOARD,TRADE_BOARD_SIZE,TRADE_TASK_IDS,TRADE_RELIC} from '../config/camp-trade.js';
import {tradeField,atTradeSite,tradeAction,tradeCrop,tradePrice,tradeStock} from '../core/camp/camp-trade.js';
import {requestWorldNavigation} from '../core/navigation/world-navigation.js';
import {worldDistance} from '../world/coordinates.js';
import {createEventScope} from '../platform/events.js';
import {placeSceneHit,sceneHit} from './scene-hit.js';
// 所有操作共用当前面板，现场挂牌与手机入口读取同一份订单。
export function createCampTradePanel({game,root,dialogs,renderer,onChange}){
 const scope=createEventScope(),dialog=root.createElement('dialog'),frame=root.getElementById('game-frame');
 dialog.id='camp-trade-dialog';dialog.className='ui-panel ui-page';dialog.setAttribute('aria-labelledby','camp-trade-title');
 dialog.innerHTML='<header class="ui-panel__header"><div><h2 id="camp-trade-title">营地订单与商路</h2></div><button class="ui-close" id="camp-trade-close" aria-label="关闭订单板">×</button></header><div class="ui-panel__body"></div><footer class="ui-panel__footer"><p role="status" aria-live="polite"></p></footer>';
 root.body.append(dialog);
 const body=dialog.querySelector('.ui-panel__body'),status=dialog.querySelector('[role=status]');
 // 行为标识仅使用程序配置中的稳定编号，中文名称用于展示。
 function button(action,text,id='',disabled=false){return `<button type="button" class="ui-button" data-trade-action="${action}" data-id="${id}" ${disabled?'disabled':''}>${text}</button>`;}
 // 订单、货款和佣金分开显示，同一份作物只可选择一个买主。
 function render(){
  const p=game.progress,t=p.trade,crop=tradeCrop(p),local=TRADE_SITES.find(s=>atTradeSite(game,s)),board=!!local,e=t.escort;
  const nearestSite=TRADE_SITES.reduce((best,s)=>worldDistance(game.player,s)<worldDistance(game.player,best)?s:best);
  const sections=[],stock=local?tradeStock(game,local).filter(r=>r.count>0):[];
  const available=stock.find(r=>r.crop.id===crop.id)?.count||0;
  // 在重复可接的委托标题旁标明首次交付进度。
  const completionLabel=id=>t.completed.includes(id)?' · 已完成':'';
  if(local){
   sections.push(`<section class="ui-inset"><h3>${local.name} · 现场出售</h3>${stock.length?stock.map(r=>button('sell','出售'+r.crop.name+' ×'+r.sell+' · '+tradePrice(r.crop,r.sell,local.percent||100)+' 金币',r.crop.id,!r.sell)).join(' '):'<p>带上背包作物，或把货车开到这里。</p>'}</section>`);
  }
  sections.push(`<section class="ui-inset"><h3>邻居订单${completionLabel('crop')}</h3><p>${t.serial%2?'薄荷':'阿团'}收购${crop.name} ×3，交货给 ${tradePrice(crop,3,130)} 金币（加价 30%）。${t.crop&&board?'已带到 '+Math.min(3,available)+'/3 份。':''}</p>${button(t.crop?'give-crop':'take-crop',t.crop?'交付三份作物':'接受作物订单','',!board||!!t.crop&&available<3)}
   ${!board?button('route','前往最近商站',nearestSite.id):''}</section>`);
  sections.push(`<section class="ui-inset"><h3>商队寻物${completionLabel('relic')}</h3><p>击败森林地面怪物，找回货签 ${t.relic??0}/3，报酬 ${TRADE_RELIC.coins} 金币。</p>${button(t.relic===null?'take-relic':'give-relic',t.relic===null?'接受寻物委托':'交还货签','',!board||t.relic!==null&&t.relic<3)}
   </section>`);
  sections.push('<section class="ui-inset"><h3>营地间运货</h3><p>各商站均可接单、交付作物和货签。选择其他营地运送商队货物，到目的地另领佣金。</p>'+
   TRADE_SITES.filter(s=>s!==local).map(s=>`<h4>${s.name}${completionLabel(s.id)}</h4><p>作物加价 ${s.percent-100}% · 护送佣金 ${escortQuote(local||nearestSite,s).coins} 金币 · ${escortQuote(local||nearestSite,s).meters}米 · 3波怪物</p>${button('route','导航到'+s.name,s.id)} ${!e?button('escort','接单运往此营地',s.id,!board):''}`).join('')+'</section>');
  if(e){const goal=TRADE_SITES.find(s=>s.id===e.station);
   sections.unshift(`<section class="ui-inset"><h3>正在运货</h3><p>${(TRADE_SITES.find(s=>s.id===e.origin)||TRADE_BOARD).name} → ${goal.name}</p><p>货物损坏 ${(100-e.hp).toFixed(1)}% · 预计佣金 ${escortPayout(e)} / ${e.pay} · 已清理 ${escortWaveDone(e)}/3波${e.camped?' · 夜间扎营':''}。在车旁领路，离队时商队等候。</p>${e.camped?button('rest-escort','就地扎营，休息到天亮'):''} ${button('route','寻找商队','caravan')} ${!e.camped?button('route','继续前往目的地',goal.id):''} ${button('finish-escort','领取佣金 '+escortPayout(e),'',local!==goal||worldDistance(e,goal)>125||escortWaveDone(e)!==TRADE_ESCORT.waves)}</section>`);
  }
  sections.push(`<section class="ui-inset"><h3>收成去向</h3><label class="ui-choice phone-wood"><input type="checkbox" data-keep ${t.keep?'checked':''}>留下收成，经过仓库也保留作物</label></section>`);
  body.innerHTML='<p class="ui-inset" data-trade-summary>共 '+TRADE_TASK_IDS.length+' 项任务 · 已完成 '+t.completed.length+' 项</p>'+sections.join('');
 }
 dialogs.register(dialog.id,{focusId:'camp-trade-close',onOpen:render});
 // 现场入口和手机详情均继承既有弹窗暂停归属。
 function open(){status.textContent='';root.body.append(dialog);dialogs.open(dialog.id);}
 scope.on(dialog.querySelector('.ui-close'),'click',()=>dialogs.close(dialog.id));
 scope.on(dialog,'change',event=>{if(event.target.matches('[data-keep]')){const r=tradeAction(game,'keep');status.textContent=r.message;render();}});
 scope.on(dialog,'click',event=>{
  const b=event.target.closest('[data-trade-action]');if(!b)return;
  const action=b.dataset.tradeAction,id=b.dataset.id;
  if(action==='route'){
   const site=id==='caravan'&&game.progress.trade.escort?{...game.progress.trade.escort,id,name:'护送商队',mapId:'forest'}:TRADE_SITES.find(s=>s.id===id);
   if(!site||!tradeField(game)){status.textContent='请先返回森林地面。';return;}
   requestWorldNavigation(game,site,'前往'+site.name,{direct:true,arrivalRadius:70});
   for(const key of [dialog.id,'phone-dialog','current-cat-dialog'])if(root.getElementById(key)?.open)dialogs.close(key);
  }else{const r=tradeAction(game,action,id);status.textContent=r.message;render();if(r.ok){
    if(action==='rest-escort'){dialogs.close(dialog.id);for(const key of ['phone-dialog','current-cat-dialog','keepsake-dialog'])if(root.getElementById(key)?.open)dialogs.close(key);}
    if(action==='escort'){const goal=TRADE_SITES.find(s=>s.id===id);requestWorldNavigation(game,goal,'护送至'+goal.name,{direct:true,arrivalRadius:70});}
    onChange();
   }}
 });
 const markers=TRADE_SITES.map(site=>{
  const node=root.createElement('button');node.type='button';sceneHit(node,site.name);node.hidden=true;
  node.style.pointerEvents='auto';node.style.zIndex='4';frame.append(node);
  scope.on(node,'click',()=>{if(!tradeField(game))return;if(atTradeSite(game,site))open();else requestWorldNavigation(game,site,'前往'+site.name,{direct:true});});
  return {node,site};
 });
 // 投影木牌原地的触控区，战斗活动和打开弹窗时隐藏。
 function renderFrame(){
  const visible=tradeField(game)&&game.state==='playing'&&renderer.view;
  for(const {node,site} of markers){
   if(!visible){node.hidden=true;continue;}
   placeSceneHit(node,site,renderer,frame,site===TRADE_BOARD?TRADE_BOARD_SIZE:{width:72,height:45,foot:0});
  }
 }
 return {open,renderFrame,dispose(){scope.dispose();dialog.remove();for(const {node} of markers)node.remove();}};
}
