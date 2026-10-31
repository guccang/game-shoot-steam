// 玩家操作与玩法状态的浏览器适配：本地有界留档、刷新恢复、Debug 导出，不向网络上传。
import {GameplayLog,GAMEPLAY_LOG_VERSION} from '../platform/gameplay-log.js';
import {createEventScope} from '../platform/events.js';
import {gameplayState} from '../core/gameplay-state.js';
export const GAMEPLAY_LOG_KEY='forest-patrol-gameplay-log-v1';
const frequent=new Set(['shot','weapon-sound','weapon-hit','chainsaw-contact','hurt','explosion','grenade-launch','reload-start','reload-complete','living-kill']);

// 日志从应用初始化开始记录，性能采样关闭后仍保留问题发生前后的玩法证据。
export function createGameplayDiagnostics({root,host,getStorage}){
 const log=new GameplayLog({now:()=>host.performance.now()}),scope=createEventScope(),counts=new Map(),urls=new Set(),pointers=new Map(),gestureTimes=new Map();
 let game=null,previous=null,disposed=false,queued=false,storageOK=true,ticks=0,lastInputAt=-Infinity,lastInput='',saving=false,lastStateKey='',lastWrite=-Infinity;
 try{const text=getStorage().getItem(GAMEPLAY_LOG_KEY);if(text&&text.length<=650000){const parsed=JSON.parse(text);if(parsed.schemaVersion===GAMEPLAY_LOG_VERSION&&Array.isArray(parsed.entries))previous=parsed;}}catch{storageOK=false;}
 const section=root.createElement('section');section.className='performance-section';section.id='gameplay-log-section';
 section.innerHTML='<h3>问题定位日志</h3><p>自动记录操作、玩法状态变化与异常。仅保存在本机，最近记录满后覆盖旧记录，每5秒留档；下载包含本次及上一会话。</p><small id="gameplay-log-status" role="status"></small><div class="performance-actions"><button id="gameplay-log-download" type="button">下载问题定位日志</button><button id="gameplay-log-clear" type="button">清空日志</button></div><p id="gameplay-log-feedback" role="status"></p><details id="gameplay-log-text-details" hidden><summary>查看日志文本</summary><textarea id="gameplay-log-text" rows="8" readonly aria-label="问题定位日志文本"></textarea></details>';
 root.getElementById('debug-content').prepend(section);
 // 首页也保留单独的下载入口，初始化失败或刷新后不必先进入战斗才能取出日志。
 const titlePanel=root.createElement('section');titlePanel.id='gameplay-log-title-panel';titlePanel.innerHTML='<button id="gameplay-log-title-download" type="button" class="settings-row">下载问题定位日志</button><p id="gameplay-log-title-feedback" role="status"></p><details id="gameplay-log-title-text-details" hidden><summary>查看日志文本</summary><textarea id="gameplay-log-title-text" rows="8" readonly aria-label="问题定位日志文本"></textarea></details>';root.querySelector('.settings-scroll').prepend(titlePanel);
 const titleDownload=titlePanel.querySelector('button');
 const $=id=>section.querySelector('#'+id);

 // 单次记录异常不能打断游戏事件、输入或保存事务。
 function record(kind,name,data){if(disposed)return;try{log.record(kind,name,kind==='input'?{...data,context:{time:game?.time,state:game?.state,mapId:game?.mapId,task:game?.progress.mainline?.currentId,phase:game?.progress.mainline?.phase}}:data);}catch{/* 诊断失败不影响游戏。 */}}
 // 版本从已有设置指纹读取，初始化失败时仍可导出设备和入口信息。
 function metadata(){return {build:{commit:root.getElementById('settings-git-fingerprint')?.title||null,state:root.getElementById('settings-git-state')?.textContent||null},device:{userAgent:host.navigator.userAgent,viewport:[host.innerWidth,host.innerHeight],dpr:host.devicePixelRatio},page:host.location.origin+host.location.pathname};}
 // 快照仅包含选定的玩法字段和打开的面板，不读取表单文本或完整存档。
 function capture(reason='sample'){
  if(disposed)return;
  try{log.capture({...gameplayState(game),ui:{page:root.getElementById('game-frame')?.dataset.page,dialogs:[...root.querySelectorAll('dialog[open]')].map(n=>n.id),hidden:root.hidden,focused:root.hasFocus()}},reason);}catch(error){record('diagnostic','snapshot-failed',{message:String(error)});}
 }
 // 操作先留时间戳，再在当前处理栈结束后采集结果，避免记录到修改前的任务阶段。
 function captureSoon(){if(queued||disposed)return;queued=true;host.queueMicrotask(()=>{queued=false;capture('after-action');});}
 // 高频射击与受伤按时间窗合并，保留次数和最后一份载荷，不逐发保存大对象。
 function flush(){for(const [name,value] of counts)record('aggregate',name,value);counts.clear();}
 // 游戏正式事件与其时刻的关键上下文一起保存，状态结果由随后快照补齐。
 function event(name,data){
  if(disposed)return;
  if(frequent.has(name)&&!data?.fatal){const value=counts.get(name)||{count:0,from:host.performance.now()};value.count++;value.to=host.performance.now();value.last={kind:data?.kind,weaponIndex:data?.weaponIndex,amount:data?.amount};counts.set(name,value);return;}
  record('game',name,{payload:data,mapId:game?.mapId,time:game?.time,task:game?.progress.mainline?.currentId,phase:game?.progress.mainline?.phase});capture(name);captureSoon();
 }
 // 每次逻辑步只比较阶段标识，切换时立即快照，短暂阶段不会被一秒采样漏掉。
 function observe(){
  if(!game||disposed)return;
  const key=[game.state,game.mapId,game.progress.mainline?.currentId,game.progress.mainline?.phase,game.progress.arrival?.phase,game.progress.living?.patrolActive,game.wave,game.boss?.id,game.vehicle.active,game.vehicle.index,game.story?.chapterId,game.story?.phase,game.story?.stageId,game.realm?.mode,game.realm?.phase,game.realm?.stage,game.campDefense?.phase,game.campDefense?.wave,game.fireRescue?.phase,game.farmWork?.tool,game.farmWork?.job?.action,game.livingBattle,game.cottage?.kind,game.progress.restoration?.build?.id].join('|');
  if(key!==lastStateKey){lastStateKey=key;capture('phase-change');}
 }
 // 移动向量最多每250毫秒采样，方向不变不重记，松手立即记录停止。
 function input(vector){
  if(disposed)return;const now=host.performance.now(),stopped=!vector.x&&!vector.y&&!vector.sprint;
  if(!stopped&&now-lastInputAt<250)return;
  const value={x:Math.round(vector.x*10)/10,y:Math.round(vector.y*10)/10,sprint:!!vector.sprint},key=JSON.stringify(value);
  if(key===lastInput)return;lastInput=key;lastInputAt=now;record('input','movement',value);
 }
 // 完整导出同时保留上一会话，持久化时仅存本次，防止跨刷新无限嵌套。
 function report(){flush();capture('export');return {format:'forest-gameplay-debug',schemaVersion:GAMEPLAY_LOG_VERSION,createdAt:new Date().toISOString(),metadata:metadata(),current:log.report(),previous};}
 // 写盘与游戏存档分离；配额不足时仍可从内存下载，不递归记录存储异常。
 function persist(urgent=false){
  const now=host.performance.now();if(disposed||saving||urgent&&now-lastWrite<1000)return;saving=true;lastWrite=now;
  try{flush();capture('checkpoint');const snapshot={...log.report(),metadata:metadata()};getStorage().setItem(GAMEPLAY_LOG_KEY,JSON.stringify(snapshot));storageOK=true;}catch{storageOK=false;}finally{saving=false;}
 }
 // 状态栏只更新少量文字，日志正文仅在用户下载失败时生成。
 function render(){ $('gameplay-log-status').textContent=`本次 ${log.entries.length} 条 · 已覆盖 ${log.dropped} 条${previous?' · 已保留上一会话':''} · ${storageOK?'本地留档':'仅内存记录（存储不可用）'}`;}
 // 下载使用实际点击手势；普通HTTP与手机浏览器不依赖剪贴板权限。
 function download(){
  record('diagnostic','download');const text=JSON.stringify(report(),null,2);persist();
  const prefix=root.getElementById('game-frame')?.dataset.page==='title'?'gameplay-log-title':'gameplay-log';
  try{
   const url=host.URL.createObjectURL(new host.Blob([text],{type:'application/json'}));urls.add(url);
   const link=root.createElement('a');link.href=url;link.download='forest-gameplay-debug-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';root.body.append(link);link.click();link.remove();
   host.setTimeout(()=>{host.URL.revokeObjectURL(url);urls.delete(url);},1000);
   root.getElementById(prefix+'-feedback').textContent='已生成下载文件，请将该文件提供给开发者。';
  }catch{const details=root.getElementById(prefix+'-text-details');details.hidden=false;details.open=true;root.getElementById(prefix+'-text').value=text;root.getElementById(prefix+'-feedback').textContent='浏览器未能下载，可复制下方日志文本。';}
 }
 // 控件描述只读取稳定ID和操作属性，不收集用户填写的文字、文件名或链接参数。
 function control(target){
  const node=target?.closest?.('button,a,select,input,summary,[role="button"]');if(!node)return null;
  const data={id:node.id||null,tag:node.tagName,dialog:node.closest('dialog')?.id||null};
  data.operation=Object.fromEntries(Object.entries(node.dataset).filter(([key])=>!key.startsWith('i18n')).slice(0,16));
  if(['BUTTON','SUMMARY'].includes(node.tagName))data.label=node.textContent?.trim().slice(0,100);
  if(node.type==='checkbox')data.checked=node.checked;
  if(node.tagName==='SELECT'){data.selectedIndex=node.selectedIndex;data.option=node.selectedOptions?.[0]?.textContent?.slice(0,100);}
  if(['range','number'].includes(node.type))data.value=Number.isFinite(node.valueAsNumber)?node.valueAsNumber:null;
  return data;
 }
 scope.on(root,'click',e=>{const target=control(e.target);if(target){record('input','click',{...target,trusted:e.isTrusted});captureSoon();}},{capture:true});
 scope.on(root,'change',e=>{const target=control(e.target);if(target){record('input','change',target);captureSoon();}},{capture:true});
 // 按下和抬起保留长按操作证据；不监听逐像素移动，也不记录非游戏区域。
 for(const type of ['pointerdown','pointerup','pointercancel'])scope.on(root,type,e=>{
  if(!e.target.closest?.('#game-frame,dialog'))return;
  if(type==='pointerdown')pointers.set(e.pointerId,host.performance.now());else pointers.delete(e.pointerId);
  record('input',type,{target:control(e.target),pointer:e.pointerType,pointerId:e.pointerId,x:Math.round(e.clientX),y:Math.round(e.clientY)});captureSoon();
 },{capture:true,passive:true});
 // 拖动轨迹、滚动和滑杆保留低频采样；每次按下、抬起和最终 change 仍单独记录。
 scope.on(root,'pointermove',e=>{const at=pointers.get(e.pointerId),now=host.performance.now();if(at===undefined||now-at<250)return;pointers.set(e.pointerId,now);record('input','drag',{pointerId:e.pointerId,x:Math.round(e.clientX),y:Math.round(e.clientY)});},{capture:true,passive:true});
 for(const type of ['wheel','scroll','input'])scope.on(root,type,e=>{
  const now=host.performance.now();if(now-(gestureTimes.get(type)??-Infinity)<500)return;gestureTimes.set(type,now);
  record('input',type,{target:control(e.target),id:e.target.id||null,scrollTop:e.target.scrollTop,scrollLeft:e.target.scrollLeft,deltaX:e.deltaX,deltaY:e.deltaY});
 },{capture:true,passive:true});
 for(const type of ['keydown','keyup'])scope.on(host,type,e=>{
  if(e.repeat||!e.code||e.target.closest?.('input,textarea,select,[contenteditable]'))return;
  record('input',type,{code:e.code,ctrl:e.ctrlKey,alt:e.altKey,shift:e.shiftKey,meta:e.metaKey});captureSoon();
 },{capture:true});
 // 崩溃和未处理拒绝即时留档，日志本身的存储失败不会抛出新异常。
 scope.on(host,'error',e=>{record('error','uncaught',{message:e.message,stack:e.error?.stack,file:e.filename,line:e.lineno,column:e.colno});persist(true);});
 scope.on(host,'unhandledrejection',e=>{record('error','unhandledrejection',{reason:e.reason});persist(true);});
 scope.on(root,'visibilitychange',()=>{record('lifecycle','visibility',{hidden:root.hidden});capture('visibility');if(root.hidden)persist();});
 scope.on(host,'pagehide',()=>{record('lifecycle','pagehide');persist();});
 for(const type of ['focus','blur'])scope.on(host,type,()=>{if(type==='blur')pointers.clear();record('lifecycle',type);captureSoon();});
 scope.on($('gameplay-log-download'),'click',download);
 scope.on(titleDownload,'click',download);
 scope.on($('gameplay-log-clear'),'click',()=>{log.clear();counts.clear();previous=null;lastInput='';try{getStorage().removeItem(GAMEPLAY_LOG_KEY);storageOK=true;}catch{storageOK=false;}$('gameplay-log-text').value='';$('gameplay-log-text-details').hidden=true;root.getElementById('gameplay-log-title-text').value='';root.getElementById('gameplay-log-title-text-details').hidden=true;root.getElementById('gameplay-log-title-feedback').textContent='';$('gameplay-log-feedback').textContent='日志已清空，正在记录新的操作。';capture('cleared');render();});
 const timer=host.setInterval(()=>{if(disposed)return;flush();capture();if(++ticks%5===0)persist();if(!section.closest('[hidden]'))render();},1000);
 record('session','start',metadata());render();
 return {record,event,input,observe,report,persist,
  // 实例绑定后首次记录完整玩法基线，初始化失败时仍保留之前的操作和异常。
  attach(value){game=value;capture('attached');},
  // 卸载先留最后状态，再撤销计时器和监听，重复挂载不会重复记录。
  dispose(){if(disposed)return;record('session','end');persist();disposed=true;host.clearInterval(timer);scope.dispose();for(const url of urls)host.URL.revokeObjectURL(url);urls.clear();section.remove();titlePanel.remove();},
 };
}
