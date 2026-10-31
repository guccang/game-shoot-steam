// 手机任务整合验收：仅准备认路后的进度和跳过生长等待，农活、任务按钮及交付使用真实控件。
async page=>{
 await page.goto('http://localhost:4175');
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.setViewportSize({width:390,height:844});
 if(await page.locator('#start').isVisible())await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.guideApp=(await import('/src/main.js')).application;await guideApp.ready;
  const {freshRangerProgress}=await import('/src/progression/progress.js'),{MAINLINE_SITES}=await import('/src/config/mainline.js');
  const p=freshRangerProgress();(await import('/src/progression/farm.js')).grantFarmSeeds(p.farm,0,1);p.arrival=null;p.coins=0;p.wood=0;p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice(0,(await import('/src/config/mainline.js')).MAINLINE_IDS.indexOf('first-farm'));p.restoration.repaired.push('clearing');p.mainline.phase='doing';p.farm.delivery.nextAt=Date.now()+3600000;
  const g=guideApp.game;/* 单项农活夹具不额外放置示范田。 */p.farm.wildMaps=['forest','jiuzhaigou'];g.progress=p;g.mapId='forest';g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.fireClock=999999;g.enemies=[];
  Object.assign(g.player,MAINLINE_SITES.camp,{vx:0,vy:0,invincible:99999});for(const d of document.querySelectorAll('dialog[open]'))d.close();guideApp.renderer.camera.time=null;guideApp.refresh();
 });await page.waitForTimeout(500);
 await page.locator('#field-menu-toggle').click();await page.locator('#mainline-book-menu').click();
 const book=await page.locator('#mainline-current').innerText();if(!book.includes('把我们的雏菊种下来')||!book.includes('木材 +40'))throw Error('正式种田任务或奖励缺失');
 if(await page.locator('#farm-lesson').isVisible())throw Error('重复备忘遮住正式种田任务');
 await page.screenshot({path:'output/playwright/farm-guide/01-task-day.png'});
 await page.locator('#mainline-action').click();await page.waitForSelector('#farm-tools:not([hidden])');
 if(await page.evaluate(()=>guideApp.game.state)!=='playing')throw Error('从任务返回种田仍处于暂停');
 // 按任务引导在营地小田自由选第一块，不再绕到远处草地规避路边判定。
 await page.evaluate(async()=>{
  const g=guideApp.game,{farmLandReason,farmApproach}=await import('/src/world/farm-land.js'),point={x:803.25,y:643.5,mapId:'forest'},start={x:803.25,y:751.5};
  if(farmLandReason(g,point)||!farmApproach(g,point))throw Error('营地小田仍无法开垦');
  window.guideSite={point,start};Object.assign(g.player,start,{vx:0,vy:0});guideApp.renderer.camera.time=null;
 });await page.waitForTimeout(500);
 const land=await page.evaluate(()=>{const v=guideApp.renderer.view,r=guideApp.renderer.canvas.getBoundingClientRect(),p=guideSite.point;return {x:r.x+(p.x-v.x)*v.zoom,y:r.y+(p.y-v.y)*v.zoom};});await page.mouse.click(land.x,land.y);
 await page.waitForFunction(()=>guideApp.game.progress.farm.dug===1&&!guideApp.game.farmWork.job);
 const opened=await page.locator('#mainline-hud').innerText();if(!opened.includes('播下一粒种子'))throw Error('开地后任务未推进 '+opened);
 await page.locator('[data-farm-cell="0"]').click();await page.locator('[data-farm-seed="0"]').click();await page.locator('[data-farm-cell="0"]').click();
 await page.waitForFunction(()=>guideApp.game.progress.farm.planted===1&&!guideApp.game.farmWork.job);
 if(!(await page.locator('#mainline-hud').innerText()).includes('给作物浇一次水'))throw Error('播种后没有浇水目标');
 await page.locator('#farm-water').click();await page.locator('[data-farm-cell="0"]').click();await page.waitForFunction(()=>guideApp.game.progress.farm.plots[0].watered&&!guideApp.game.farmWork.job);
 const watered=await page.evaluate(()=>({phase:guideApp.game.progress.mainline.phase,coins:guideApp.game.progress.coins,time:guideApp.game.progress.farm.plots[0].readyAt-guideApp.game.progress.farm.plots[0].plantedAt}));if(watered.phase!=='report'||watered.coins!==0||watered.time!==45000)throw Error('浇水未完成照料任务或数值错误');
 await page.evaluate(async()=>{const {MAINLINE_SITES}=await import('/src/config/mainline.js');Object.assign(guideApp.game.player,MAINLINE_SITES.camp,{vx:0,vy:0});guideApp.game.mainlineTalkDelay=0;guideApp.renderer.camera.time=null;});
 await page.locator('#mainline-speech .mainline-begin').waitFor({state:'visible'});await page.locator('#mainline-speech .mainline-begin').click();
 await page.waitForFunction(()=>guideApp.game.progress.mainline.completed.includes('first-farm'));
 const reward=await page.evaluate(()=>({coins:guideApp.game.progress.coins,wood:guideApp.game.progress.wood,seeds:guideApp.game.progress.farm.seeds[1]}));if(reward.coins!==0||reward.wood!==40||reward.seeds!==2)throw Error('种田或任务结算重复 '+JSON.stringify(reward));
 // 先关闭任务收据并收起农具，再打开任务书，避免弹窗和工具栏拦截手机菜单。
 await page.locator('#task-reward-close').click();await page.locator('#farm-exit').click();
 // 窄屏夜间复核任务书排版，使用已完成的种田记录展示三项勾选，不改变正式奖励。
 await page.setViewportSize({width:320,height:568});await page.evaluate(async()=>{
  const g=guideApp.game;g.progress.mainline.completed=['first-map'];g.progress.mainline.currentId='first-farm';g.progress.mainline.phase='report';g.mainlineSpeech=null;g.mainlineTalkDelay=999999;
  const {LIVING_PHASES}=await import('/src/config/living-world.js'),{EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js'),phase=LIVING_PHASES.find(p=>p.id==='night');g.progress.living.calendar={day:1,elapsed:phase.start+phase.duration/2};Object.assign(guideApp.environment,{time:'night',weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});guideApp.renderer.light=new EnvironmentTransition(guideApp.environment,0);guideApp.renderer.tone=new SceneTone(guideApp.environment,0);
 });await page.waitForTimeout(300);await page.locator('#field-menu-toggle').click();await page.locator('#mainline-book-menu').click();await page.screenshot({path:'output/playwright/farm-guide/02-task-night.png'});
 if(await page.locator('#mainline-current .mainline-checklist .done').count()!==3)throw Error('三项实际进度未勾选');
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('窄屏任务溢出');if(errors.length)throw Error(JSON.stringify(errors));return {book,watered,reward,errors};
}
