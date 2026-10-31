// 真实手机交互验收：任务内读信、完成后撤去入口、刷新，以及面板期间同一音乐声源持续播放。
async page=>{
 if(new URL(page.url()).port!=='4300')throw Error('仅允许隔离端口 4300');
 const context=await page.context().browser().newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true});
 // 旁观原生声源的启停，不替换音频服务或音乐文件。
 await context.addInitScript(()=>{
  window.audioAudit=[];const start=AudioBufferSourceNode.prototype.start,stop=AudioBufferSourceNode.prototype.stop;
  AudioBufferSourceNode.prototype.start=function(...args){this.audit={loop:this.loop,duration:this.buffer?.duration,stopped:false};audioAudit.push(this.audit);return start.apply(this,args);};
  AudioBufferSourceNode.prototype.stop=function(...args){if(this.audit)this.audit.stopped=true;return stop.apply(this,args);};
 });
 const t=await context.newPage(),errors=[],results=[];t.on('pageerror',e=>errors.push(e.message));
 await t.goto('http://localhost:4300');
 // 使用正式菜单展开状态，检查功能菜单及后续面板。
 async function menu(){if(await t.locator('#field-menu-toggle').getAttribute('aria-expanded')!=='true')await t.locator('#field-menu-toggle').tap();}
 // 音乐应始终保留原声源；战斗与发动机仍遵循面板暂停。
 async function music(){
  const state=await t.evaluate(()=>({music:a.audio.diagnostics.music,same:!originalMusic.stopped,count:audioAudit.filter(s=>s.loop&&s.duration>10).length,state:a.game.state,vehicle:a.audio.diagnostics.vehicle}));
  if(!state.music||!state.same||state.count!==1)throw Error('面板打断或重启音乐 '+JSON.stringify(state));
  return state;
 }
 for(const [width,height,time,skip] of [[320,568,'day',false],[390,844,'night',true]]){
  await t.setViewportSize({width,height});await t.evaluate(()=>localStorage.clear());await t.reload();
  await t.locator('#start').tap();await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
  if(skip)await t.locator('#arrival-skip').tap();
  await t.waitForFunction(()=>a.game.progress.arrival.phase==='letter');
  await t.waitForFunction(()=>a.audio.diagnostics.music,null,{timeout:30000});
  await t.evaluate(async time=>{
   window.originalMusic=audioAudit.find(s=>s.loop&&s.duration>10&&!s.stopped);if(!originalMusic)throw Error('音乐声源未加载');
   Object.assign(a.environment,{livingPreview:true,autoTime:false,autoWeather:false,autoSeason:false,weather:'sun',forestSeason:'summer',time:time==='day'?'night':'dusk'});
   document.getElementById('time-picture').click();
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
   a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.renderer.draw();a.refresh();
  },time);
  if(await t.locator('#arrival-letter-open').count())throw Error('任务卡仍包含旧读信按钮');
  if(await t.locator('dialog[open]').count())throw Error('来信不应自动弹出');
  const card=await t.locator('#ranger-arrival').boundingBox();if(card.height>120)throw Error('任务卡仍占用过大高度');
  await t.screenshot({path:'output/playwright/letter-task-panel-music/task-'+width+'-'+time+'.png'});
  await t.locator('#arrival-goal').tap();
  await t.locator('#arrival-letter-dialog').waitFor({state:'visible'});
  const opened=await music();if(opened.state!=='paused'||opened.vehicle!==-1)throw Error('读信时战斗或发动机未暂停');
  // 暂时收起不完成任务；再次点同一任务即可继续阅读。
  await t.locator('#arrival-letter-close').tap();await t.locator('#arrival-goal').waitFor({state:'visible'});
  if(!await t.evaluate(()=>a.game.progress.arrival.phase==='letter'))throw Error('关闭来信越过任务确认');
  await music();await t.locator('#arrival-goal').tap();
  const sizes=skip?[[390,844]]:[[320,568],[360,640],[430,932],[844,390]];
  for(const [w,h]of sizes){
   await t.setViewportSize({width:w,height:h});
   const box=await t.locator('#arrival-letter-done').boundingBox();
   if(!box||box.height<44||box.y+box.height>h+1)throw Error('来信确认按钮被裁切 '+w+'x'+h);
   await t.screenshot({path:'output/playwright/letter-task-panel-music/letter-'+w+'x'+h+'-'+time+'.png'});
  }
  await t.setViewportSize({width,height});
  if(!skip){
   await t.evaluate(()=>{window.originalPersist=a.game.arrivalPersist;a.game.arrivalPersist=()=>false;});
   await t.locator('#arrival-letter-done').tap();
   if(await t.locator('#arrival-letter-done').textContent()!=='保存失败，点击重试'||!await t.evaluate(()=>a.game.progress.arrival.phase==='letter'))throw Error('保存失败未保留阅读任务和可见重试');
   await music();await t.evaluate(()=>{a.game.arrivalPersist=originalPersist;});
  }
  await t.locator('#arrival-letter-done').tap();
  await t.waitForFunction(()=>a.game.progress.arrival.phase==='gather'&&a.game.state==='playing');
  await music();await t.screenshot({path:'output/playwright/letter-task-panel-music/gather-'+width+'-'+time+'.png'});
  await menu();if(await t.locator('#arrival-letter-menu').count())throw Error('功能菜单仍残留来信入口');
  await menu();await t.locator('#map-button').tap();await t.locator('#map-dialog').waitFor({state:'visible'});await music();
  await t.locator('#close-map').tap();await t.locator('#settings-button').tap();await music();
  await t.locator('#sound').tap();await t.waitForFunction(()=>!a.audio.diagnostics.music);
  await t.locator('#sound').tap();await t.waitForFunction(()=>a.audio.diagnostics.music);
  await t.locator('#close-settings').tap();
  results.push({width,height,time,cardHeight:card.height,task:true,musicUninterrupted:true,mute:true});
  await t.reload();await t.locator('#start').tap();
  await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
  if(!await t.evaluate(()=>a.game.progress.arrival.phase==='gather'))throw Error('刷新后阅读任务被重置');
 }
 if(errors.length)throw Error(errors.join('\n'));
 await context.close();await page.evaluate(result=>window.letterPanelResult=result,{results,errors});
}
