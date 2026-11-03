// Boss波次UI专项：隔离触屏存档，检验原轨道复用、真实3秒提示及昼夜手机布局。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],samples=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;if(!await a.ready)throw Error('正式资源加载失败');
   const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;
   p.living.patrolActive=true;p.living.clearingNotice='seen';g.progress=p;g.reset();g.start();g.mainlineSpeech=null;g.mainlineTalkDelay=999;
   window.site=(await import('/src/progression/clearing-site.js')).clearingSite(p);Object.assign(g.player,{x:site.x,y:site.y,invincible:0});
   Object.assign(g,{wave:2,waveGroupStart:1,bossWave:5,waveKills:3,waveSpawned:3,waveWarning:0,waveRest:0});
   g.enemies=[];g.spawnEnemy(0,0,{x:site.x+100,y:site.y+65},{ambient:true});g.progress.vehicleHulls[0]=1;g.progress.vehicleIndex=0;g.summonVehicle();
   // 定格战场逻辑供布局复核；正式渲染、轨道刷新与UI关闭时钟仍正常执行。
   g.update=()=>{};a.renderer.camera.time=null;a.refresh();window.originalTrack=document.getElementById('wave-track');
  });
  // 实际帧时钟必须依次显示3、2、1，关闭后轨道仍回到原容器。
  await page.evaluate(()=>{a.game.progress.living.clearingNotice='arrival';a.refresh();});
  const countdown=[];
  for(const seconds of [3,2,1]){
   await page.waitForFunction(seconds=>document.getElementById('clearing-notice-countdown').textContent===`${seconds}秒后关闭`,seconds);
   countdown.push(await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectBossWaveUi(document)));
  }
  await page.locator('#clearing-arrival-notice').waitFor({state:'hidden'});
  if(countdown.some(s=>s.host!=='clearing-notice-track'||!s.visible||s.trackCount!==1||s.nodes.length!==5))throw Error('进场未复用完整轨道 '+JSON.stringify(countdown));
  if(await page.evaluate(()=>document.getElementById('wave-track').parentElement.id)!=='quest')throw Error('自动关闭未归还轨道');
  // 手机竖屏、短横屏及桌面既有容器统一使用同一页面，不新增桌面布局。
  for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[844,390],[1280,900]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});
   await page.evaluate(async time=>{
    Object.assign(a.environment,{livingPreview:true,autoTime:false,autoWeather:false,autoSeason:false,time,weather:'sun'});
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
    a.game.progress.living.clearingNotice='arrival';a.renderer.camera.time=null;a.renderer.resize();a.refresh();
   },time);
   await page.locator('#clearing-arrival-notice').waitFor({state:'visible'});
   const arrival=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectBossWaveUi(document));
   if(!arrival.visible||arrival.overflow||!arrival.contained||arrival.noticeBox.right>width||arrival.trackBox.bottom>arrival.noticeBox.bottom)throw Error('进场布局错误 '+JSON.stringify(arrival));
   await page.screenshot({path:`output/playwright/boss-wave-ui/arrival-${width}-${time}.png`});
   await page.locator('#wave-help').tap();
   const detail=await page.evaluate(async()=>{
    const result=(await import('/src/rendering/visual-review.js')).inspectBossWaveUi(document);
    const dialog=document.getElementById('wave-help-dialog'),body=dialog.querySelector('.ui-panel__body'),close=document.getElementById('wave-help-close').getBoundingClientRect(),action=document.getElementById('clearing-detail-navigation').getBoundingClientRect();
    return {...result,sameTrack:document.getElementById('wave-track')===originalTrack,bodyOverflow:body.scrollWidth>body.clientWidth,dialogBox:dialog.getBoundingClientRect().toJSON(),closeBox:close.toJSON(),actionBox:action.toJSON()};
   });
   if(detail.host!=='wave-help-track'||!detail.visible||!detail.sameTrack||detail.trackCount!==1||detail.nodes[0].state!=='done'||detail.nodes[1].state!=='current'||detail.nodes.length!==5||!detail.contained||detail.overflow||detail.bodyOverflow||detail.closeBox.width<44||detail.closeBox.height<44||detail.noticeVisible)throw Error('详情轨道错误 '+JSON.stringify(detail));
   if(detail.actionBox.height<44||detail.actionBox.bottom>detail.dialogBox.bottom-3||detail.actionBox.bottom>height)throw Error('短屏操作栏被裁切 '+JSON.stringify(detail));
   await page.screenshot({path:`output/playwright/boss-wave-ui/detail-${width}-${time}.png`});samples.push({width,height,time,arrival,detail});
   await page.locator('#wave-help-close').tap();await page.waitForFunction(()=>a.game.state==='playing');
  }
  // 范围外也可查看已保存进度，波间圆环暂停后保持半圈，关闭恢复唯一原轨道。
  await page.evaluate(async()=>{Object.assign(a.game.player,(await import('/src/config/clearing.js')).CLEARING_APPROACH);a.game.waveRest=1.5;document.getElementById('wave-help').click();a.refresh();});
  const rest=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectBossWaveUi(document));
  if(!rest.visible||rest.countdowns.length!==1||Math.abs(rest.countdowns[0].progress-.5)>.01)throw Error('范围外详情或暂停圆环错误 '+JSON.stringify(rest));
  await page.waitForTimeout(3200);if(!await page.locator('#wave-help-dialog').isVisible())throw Error('手动详情被自动关闭');
  await page.keyboard.press('Escape');await page.waitForFunction(()=>document.getElementById('wave-track').parentElement.id==='quest');
  if(errors.length)throw Error(errors.join('\n'));
  return {designCriterion:'boss-wave-ui',countdown:countdown.map(s=>s.closeCountdown),manualDetail:true,rest,samples,errors};
 }finally{await context.close();}
}
