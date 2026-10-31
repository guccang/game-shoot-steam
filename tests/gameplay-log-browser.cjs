// 仅在本地隔离手机会话验收：真实操作、清缴结算、下载、刷新恢复、存储失败与卸载。
async original=>{
 const url=new URL(original.url());if(url.hostname!=='localhost'||!['4175','4176'].includes(url.port))throw Error('仅允许本地验收');
 const context=await original.context().browser().newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,acceptDownloads:true});
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(original.url());await page.locator('#start').tap();await page.locator('#game-frame[data-page=game]').waitFor({timeout:60000});
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;const {freshProgress}=await import('/src/game.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js'),{TOWN_RESTORATIONS}=await import('/src/config/town-restoration.js'),p=freshProgress();
   p.arrival={version:3,phase:'complete',keys:true};p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('vehicle-field'));p.mainline.currentId='vehicle-field';p.mainline.phase='doing';
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.arrivalScene=null;g.livingPreview=false;g.mainlineSpeech=null;g.mainlineTalkDelay=999;
   Object.assign(g.player,{x:780,y:520});a.renderer.camera.time=null;a.refresh();a.diagnostics.gameplay.observe();
  });
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(350);await page.keyboard.up('ArrowRight');
  await page.locator('#vehicle-button').tap();await page.waitForFunction(()=>a.game.vehicle.active);
  await page.locator('#vehicle-button').tap();await page.waitForFunction(()=>!a.game.vehicle.active);
  await page.evaluate(async()=>{const g=a.game;Object.assign(g.player,(await import('/src/config/clearing.js')).CLEARING_APPROACH);a.renderer.camera.time=null;a.refresh();});
  await page.locator('#mainline-hud').tap();await page.locator('#clearing-dialog').waitFor({state:'visible'});await page.locator('#clearing-accept').tap();
  await page.evaluate(()=>{
   const g=a.game;g.update=dt=>{if(g.state==='playing')g.time+=dt;};const site=g.progress.living.clearingSite;Object.assign(g.player,{x:site.x,y:site.y});
   for(let i=0;i<1200&&!g.boss;i++){g.updateWaves(.5);for(const e of g.enemies.filter(e=>e.hp>0))g.hit(e,1e9);}
   if(!g.boss)throw Error('领主未生成');g.hit(g.boss,1e9);a.refresh();
  });
  await page.locator('#task-reward-end-clearing').tap();await page.waitForFunction(()=>a.game.progress.mainline.phase==='report');
  await page.locator('#settings-button').tap();await page.locator('#settings-advanced > summary').tap();await page.locator('#debug-toggle').tap();
  await page.locator('#performance-record-toggle').uncheck();
  await page.evaluate(()=>{
   for(let i=0;i<500;i++)a.game.onEvent('shot',{kind:'pistol'});
   window.dispatchEvent(new ErrorEvent('error',{message:'测试定位异常',error:new Error('测试定位异常')}));
   window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection',{promise:Promise.resolve(),reason:new Error('测试拒绝')}));
  });
  const summary=await page.evaluate(()=>{
   const r=a.diagnostics.gameplay.report(),events=r.current.entries,names=events.map(e=>e.name);
   for(const name of ['keydown','keyup','movement','vehicle-summon','vehicle-dismount','living-change','wave-clear','boss','victory','dialog-open','dialog-close','uncaught','unhandledrejection'])if(!names.includes(name))throw Error('缺少事件 '+name);
   if(!events.some(e=>e.kind==='input'&&e.name==='click'&&e.data.id==='task-reward-end-clearing'))throw Error('缺少结束操作');
   if(!events.some(e=>e.kind==='aggregate'&&e.name==='shot'&&e.data.count>=500))throw Error('高频事件没有汇总');
   if(r.current.latestState.mainline.phase!=='report'||r.current.latestState.clearing.active)throw Error('结算状态错误');
   if(!events.some(e=>e.kind==='storage'&&e.data.ok))throw Error('缺少存档结果');
   if(events.some(e=>e.name==='snapshot-failed'))throw Error('快照异常');
   return {session:r.current.sessionId,count:events.length,state:r.current.latestState.mainline.phase,aggregated:true};
  });
  const downloaded=page.waitForEvent('download');await page.locator('#gameplay-log-download').tap();await(await downloaded).saveAs('output/playwright/gameplay-log/report.json');
  const layouts=[];
  for(const [width,time] of [[320,'day'],[393,'night']]){
   await page.setViewportSize({width,height:720});
   await page.evaluate(async time=>{Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.draw();},time);
   await page.locator('#gameplay-log-download').scrollIntoViewIfNeeded();
   const layout=await page.evaluate(()=>{const d=document.getElementById('settings-dialog'),s=document.getElementById('gameplay-log-section'),b=document.getElementById('gameplay-log-download').getBoundingClientRect();return {overflow:d.scrollWidth>d.clientWidth+1||s.scrollWidth>s.clientWidth+1,height:b.height,x:b.x,right:b.right};});
   if(layout.overflow||layout.height<44||layout.x<0||layout.right>width)throw Error('手机日志布局溢出');
   await page.screenshot({path:`output/playwright/gameplay-log/debug-${width}-${time}.png`});layouts.push({width,time,...layout});
  }
  await page.reload();await page.waitForFunction(async()=>!!(await import('/src/main.js')).application.diagnostics);
  const restored=await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;const r=a.diagnostics.gameplay.report();return {previous:r.previous?.sessionId,hasVictory:r.previous?.entries.some(e=>e.name==='victory'),current:r.current.sessionId};});
  if(restored.previous!==summary.session||!restored.hasVictory||restored.current===summary.session)throw Error('刷新丢失上一会话');
  await page.locator('#title-settings').tap();
  await page.evaluate(()=>{window.realSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('测试配额','QuotaExceededError');};a.diagnostics.gameplay.persist();});
  const fallback=page.waitForEvent('download');await page.locator('#gameplay-log-title-download').tap();await(await fallback).saveAs('output/playwright/gameplay-log/storage-unavailable.json');
  await page.evaluate(()=>{Storage.prototype.setItem=window.realSetItem;});
  await page.evaluate(()=>{window.realCreateURL=URL.createObjectURL;URL.createObjectURL=()=>{throw Error('测试下载不支持');};});
  await page.locator('#gameplay-log-title-download').tap();await page.locator('#gameplay-log-title-text').waitFor({state:'visible'});
  if(JSON.parse(await page.locator('#gameplay-log-title-text').inputValue()).format!=='forest-gameplay-debug')throw Error('下载失败时不能读取日志文本');
  await page.evaluate(()=>{URL.createObjectURL=window.realCreateURL;});
  await page.locator('#close-settings').tap();await page.locator('#start').tap();await page.locator('#game-frame[data-page=game]').waitFor({timeout:60000});
  await page.locator('#settings-button').tap();await page.locator('#settings-advanced > summary').tap();await page.locator('#debug-toggle').tap();
  await page.locator('#gameplay-log-clear').tap();
  const cleaned=await page.evaluate(()=>{const r=a.diagnostics.gameplay.report();return {previous:r.previous,count:r.current.entries.length,cleared:r.current.entries.some(e=>e.name==='log-cleared')};});
  if(cleaned.previous||!cleaned.cleared||cleaned.count>20||await page.locator('#gameplay-log-title-text').inputValue())throw Error('清空后仍带旧日志');
  await page.evaluate(()=>{a.destroy();});if(await page.locator('#gameplay-log-section').count())throw Error('卸载未移除日志面板');
  if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'debug-operation-log',summary,restored,layouts,storageFailureDownload:true,cleared:true,errors};
 }finally{await context.close();}
}
