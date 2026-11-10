// 使用隔离浏览器存档验证手机开关、导航互斥和刷新恢复，默认4175。
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'}),page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));fs.mkdirSync('output/single-navigation',{recursive:true});
 try{
  await page.goto(process.env.TEST_URL||'http://localhost:4175');await page.locator('#start').tap({timeout:60000});await page.locator('#game-frame[data-page=game]').waitFor({timeout:120000});
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true,parked:false};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(t=>t.id);p.restoration.cottageRested=true;g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.vehicle.active=false;g.update=()=>{};Object.assign(g.player,{x:2000,y:1600,vx:0,vy:0});g.progress.waystations.sites=[{id:1,name:'互斥测试驿站',mapId:'forest',x:2600,y:1600}];a.save();a.refresh();});
  for(const [width,height] of [[320,568],[390,844]]){
   await page.setViewportSize({width,height});await page.locator('#phone-button').tap();const toggle=page.locator('[data-pack-action=toggle-navigation]');await toggle.scrollIntoViewIfNeeded();
   if(await toggle.textContent()!=='关闭任务寻路')throw Error('缺少明确关闭入口');await toggle.tap();if(await toggle.textContent()!=='开启任务寻路')throw Error('关闭状态未更新');
   const result=await page.evaluate(async()=>{const {taskNavigationEnabled}=await import('/src/core/navigation/task-navigation.js'),{storyRouteState}=await import('/src/core/navigation/story-route.js'),{createSaveStore}=await import('/src/platform/storage.js'),b=document.querySelector('[data-pack-action=toggle-navigation]').getBoundingClientRect();return {enabled:taskNavigationEnabled(a.game),saved:createSaveStore().loadProgress().mainline.navigationEnabled,route:storyRouteState(a.game),width:b.width,height:b.height,overflow:document.documentElement.scrollWidth>innerWidth};});
   if(result.enabled||result.saved||result.route||result.height<44||result.overflow)throw Error(JSON.stringify(result));checks.push({viewportWidth:width,...result});await page.screenshot({path:'output/single-navigation/phone-off-'+width+'.png'});
   await toggle.tap();await page.locator('#phone-close').tap();
  }
  // 通过正式手机按钮启动驿站，再从手机选择回家，确认旧行程被取消。
  await page.locator('#phone-button').tap();await page.locator('[data-pack-action=waystations]').tap();await page.locator('[data-station-go="1"]').tap();
  if(!await page.evaluate(()=>!!a.game.waystationTravel&&!a.game.progress.mainline.navigationEnabled))throw Error('驿站未独占导航');
  await page.locator('#phone-button').tap();await page.locator('[data-pack-action=home]').tap();
  if(!await page.evaluate(()=>!a.game.waystationTravel&&a.game.progress.mainline.navigationEnabled))throw Error('回家未取消驿站');
  // 回家导航卡必须随手机关闭操作消失；只重新开启开关不能恢复已取消的临时任务。
  await page.locator('#mainline-hud').waitFor({state:'visible'});
  if(!await page.locator('#mainline-hud').textContent().then(text=>text.includes('回巡林小屋')))throw Error('缺少回家导航卡');
  await page.locator('#phone-button').tap();await page.locator('[data-pack-action=toggle-navigation]').tap();await page.locator('#phone-close').tap();
  await page.locator('#mainline-hud').waitFor({state:'hidden'});await page.screenshot({path:'output/single-navigation/home-card-dismissed.png'});
  await page.locator('#phone-button').tap();await page.locator('[data-pack-action=toggle-navigation]').tap();await page.locator('#phone-close').tap();
  await page.locator('#mainline-hud').waitFor({state:'hidden'});
  await page.locator('#phone-button').tap();await page.locator('[data-pack-action=toggle-navigation]').tap();await page.locator('#phone-close').tap();
  await page.reload();await page.locator('#start').tap({timeout:60000});await page.locator('#game-frame[data-page=game]').waitFor({timeout:120000});await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});await page.locator('#phone-button').tap();
  if(await page.locator('[data-pack-action=toggle-navigation]').textContent()!=='开启任务寻路')throw Error('刷新后关闭偏好丢失');
  if(errors.length)throw Error(errors.join('\n'));fs.writeFileSync('output/single-navigation/results.json',JSON.stringify({checks,errors,reloadClosed:true,stationToHome:true,homeCardDismissed:true},null,2));console.log(JSON.stringify({checks,errors,reloadClosed:true,stationToHome:true,homeCardDismissed:true}));
 }catch(error){await page.screenshot({path:'output/single-navigation/failure.png'});throw error;}finally{await browser.close();}
})();
