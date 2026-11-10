// 手机当前任务采用一次性取消操作，覆盖回家、驿站、无任务状态和刷新恢复。
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'}),page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));fs.mkdirSync('output/cancel-current-task',{recursive:true});
 try{
  await page.goto(process.env.TEST_URL||'http://localhost:4175');await page.locator('#start').tap({timeout:60000});await page.locator('#game-frame[data-page=game]').waitFor({timeout:120000});
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true,parked:false};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(t=>t.id);p.restoration.cottageRested=true;g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.vehicle.active=false;g.update=()=>{};Object.assign(g.player,{x:2000,y:1600,vx:0,vy:0});g.progress.waystations.sites=[{id:1,name:'取消测试驿站',mapId:'forest',x:2600,y:1600}];a.save();a.refresh();});
  for(const [width,height] of [[320,568],[390,844]]){
   await page.setViewportSize({width,height});await page.locator('#phone-button').tap();await page.locator('[data-pack-action=home]').tap();await page.locator('#mainline-hud').waitFor({state:'visible'});
   await page.locator('#phone-button').tap();const cancel=page.locator('[data-pack-action=cancel-current-task]');await cancel.scrollIntoViewIfNeeded();
   if(await cancel.textContent()!=='取消当前任务'||await cancel.getAttribute('aria-pressed')!==null)throw Error('取消按钮仍是开关');if(!await page.locator('#phone-dialog').textContent().then(t=>t.includes('回巡林小屋')))throw Error('没有展示当前目标');
   await page.screenshot({path:'output/cancel-current-task/current-'+width+'.png'});await cancel.tap();if(!await cancel.isDisabled())throw Error('取消后按钮未禁用');
   const result=await page.evaluate(async()=>{const {currentNavigationTask}=await import('/src/core/navigation/current-navigation-task.js'),{createSaveStore}=await import('/src/platform/storage.js'),saved=createSaveStore().loadProgress(),b=document.querySelector('[data-pack-action=cancel-current-task]').getBoundingClientRect();return {task:currentNavigationTask(a.game),savedNavigation:saved.mainline.navigationEnabled,tracking:saved.taskTracking.kind,buttonHeight:b.height,overflow:document.documentElement.scrollWidth>innerWidth,oldSwitch:!!document.querySelector('[data-pack-action=toggle-navigation]')};});
   if(result.task||result.savedNavigation||result.tracking!=='none'||result.buttonHeight<44||result.overflow||result.oldSwitch)throw Error(JSON.stringify(result));checks.push({width,...result});
   await page.screenshot({path:'output/cancel-current-task/canceled-'+width+'.png'});await page.locator('#phone-close').tap();await page.locator('#mainline-hud').waitFor({state:'hidden'});
  }
  // 驿站使用同一取消入口，不会因任务寻路原本关闭而重新打开旧路线。
  await page.locator('#phone-button').tap();await page.locator('[data-pack-action=waystations]').tap();await page.locator('[data-station-go="1"]').tap();
  if(!await page.evaluate(()=>!!a.game.waystationTravel))throw Error('驿站未启动');await page.locator('#phone-button').tap();await page.locator('[data-pack-action=cancel-current-task]').tap();
  if(!await page.evaluate(()=>!a.game.waystationTravel&&!a.game.progress.mainline.navigationEnabled))throw Error('取消后仍在自动行进');await page.locator('#phone-close').tap();
  await page.reload();await page.locator('#start').tap({timeout:60000});await page.locator('#game-frame[data-page=game]').waitFor({timeout:120000});await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});await page.locator('#phone-button').tap();
  if(!await page.locator('[data-pack-action=cancel-current-task]').isDisabled())throw Error('刷新后任务复活');
  if(errors.length)throw Error(errors.join('\n'));const result={checks,errors,reloadNoTask:true,stationCanceled:true};fs.writeFileSync('output/cancel-current-task/results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }catch(error){await page.screenshot({path:'output/cancel-current-task/failure.png'});throw error;}finally{await browser.close();}
})();
