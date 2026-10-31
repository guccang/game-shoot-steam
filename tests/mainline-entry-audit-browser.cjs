// 补查随身跨图、现场操作和盾牌临时导航；只覆盖本次修改的入口分支。
async page=>{
 if(new URL(page.url()).port!=='4275')throw Error('仅使用隔离端口');
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;
  // 只建立已接教学步骤，不代替实际菜单点击。
  window.entryCheckpoint=async id=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();const g=a.game,{MAINLINE_IDS}=await import('/src/config/mainline.js');g.progress=(await import('/src/progression/progress.js')).freshProgress();g.progress.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf(id));g.progress.mainline.phase='doing';g.progress.vehicleHulls[0]=1;g.progress.vehicleIndex=0;(await import('/src/config/vehicle-armaments.js')).grantVehicleArmament(g.progress,0);g.mapId='forest';g.reset();g.arrivalScene=null;g.state='playing';g.mainlineTalkDelay=999;g.enemies=[];a.refresh();};
 });
 // 真正切换九寨沟后，回营交付卡先打开地图，不画森林坐标。
 await page.evaluate(async()=>{await entryCheckpoint('other-map');if(!a.game.switchMap('jiuzhaigou'))throw Error('未切换地图');a.game.progress.mainline.phase='report';a.refresh();});
 await page.locator('#mainline-hud').click();await page.locator('#map-dialog').waitFor({state:'visible'});
 for(const [id,site,dialog] of [['first-letter','storyPost','story-dialog'],['long-patrol','weaponsEntry','workshop-dialog']]){
  await page.evaluate(async({id,site})=>{await entryCheckpoint(id);const sites=(await import('/src/config/mainline.js')).MAINLINE_SITES;Object.assign(a.game.player,sites[site]);a.refresh();},{id,site});
  await page.locator('#mainline-hud').click();await page.locator('#'+dialog).waitFor({state:'visible'});
 }
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{await entryCheckpoint('pine-patrol');Object.assign(a.game.player,{x:330,y:729});a.refresh();});await page.waitForTimeout(200);
 await page.evaluate(()=>document.querySelector('[data-camp-gate="left"]').focus({preventScroll:true}));await page.keyboard.press('Enter');await page.waitForTimeout(100);
 if(!await page.evaluate(async()=>(await import('/src/core/world-navigation.js')).worldNavigationObjective(a.game)?.action?.gate==='left'))throw Error('盾牌路线丢失操作');
 const box=await page.locator('#mainline-hud').boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
 if(await page.locator('dialog[open]').count())throw Error('远处点击守门路线误开了其他页面');
 await page.evaluate(()=>{a.game.player.x=200;a.refresh();});await page.locator('#camp-defense-dialog').waitFor({state:'visible'});
 if(await page.locator('[data-select-gate="left"]').getAttribute('aria-pressed')!=='true')throw Error('打开了错误营门');
 await page.evaluate(()=>a.game.summonVehicle());await page.locator('#camp-primary').click();await page.waitForFunction(()=>a.game.enemies.length>3);
 if(!await page.evaluate(()=>a.game.vehicle.active&&a.game.vehicle.index===0))throw Error('松果战车未延续驾驶');
 for(const time of ['day','night']){
  await page.evaluate(async time=>{const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');a.game.progress.living.calendar={day:1,elapsed:time==='day'?400000:1100000};Object.assign(a.environment,{time,weather:'sun',autoWeather:false});a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.refresh();},time);
  await page.screenshot({path:`output/playwright/mainline-horde-damage/pine-defense-${time}.png`});
 }
 return {crossMap:true,nearbyEntries:true,gateIntent:true,pineMounted:true};
}
