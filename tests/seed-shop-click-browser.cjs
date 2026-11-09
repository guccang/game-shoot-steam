// 种子小屋本体点击验收：真实触摸短按、拖动、取消、镜头跟随与种田状态。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival=null;p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';p.farm.wildMaps=['forest','jiuzhaigou'];p.farm.delivery.nextAt=Date.now()+3600000;
   g.progress=p;g.mapId='forest';g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.fireClock=999999;g.enemies=[];
   Object.assign(g.player,{x:1000,y:890,vx:0,vy:0});for(const d of document.querySelectorAll('dialog[open]'))d.close();a.renderer.camera.time=null;a.refresh();
  });await page.waitForTimeout(500);
  const hit=page.locator('#seed-shop-hit'),dialog=page.locator('#seed-shop-dialog');
  for(const [time,width,height] of [['day',390,844],['night',320,568]]){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();},time);await page.waitForTimeout(200);
   const r=await hit.boundingBox();if(!r||r.width<44||r.height<44)throw Error('屋身热点缺失');
   await page.screenshot({path:`output/playwright/seed-shop-click/house-${time}.png`});
   await hit.tap({position:{x:r.width/2,y:time==='day'?15:r.height-22}});await dialog.waitFor({state:'visible'});
   if(await page.evaluate(()=>a.game.state!=='paused'))throw Error('屋身打开未暂停');
   await page.locator('#seed-shop-close').tap();await page.waitForFunction(()=>a.game.state==='playing');
  }
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);
  const cdp=await context.newCDPSession(page),r=await hit.boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;
  // 从房屋起步拖动，松手不能被当成短按打开商店。
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+55,y,id:1}]});await page.waitForTimeout(200);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(150);
  if(await dialog.isVisible())throw Error('拖动误打开种子屋');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});if(await dialog.isVisible())throw Error('取消触摸误打开');
  // 种田时直接点击屋身，工作状态暂停后保留，不开新田、不消耗种子。
  const before=await page.evaluate(async()=>{(await import('/src/core/farming/farm.js')).setFarmTool(a.game,'hoe');a.refresh();return a.game.progress.farm.plots.length;});await hit.tap();await dialog.waitFor({state:'visible'});
  if(await page.evaluate(before=>a.game.progress.farm.plots.length!==before||a.game.farmWork?.tool!=='hoe',before))throw Error('种田点击屋身被开地截获');
  await page.locator('#seed-shop-close').tap();await page.waitForFunction(()=>a.game.state==='playing');
  // 改变角色位置后热点仍逐帧跟随镜头，并保留原生键盘操作。
  await page.evaluate(()=>{Object.assign(a.game.player,{x:970,y:940});a.renderer.camera.time=null;});await page.waitForTimeout(300);await hit.focus();await page.keyboard.press('Enter');await dialog.waitFor({state:'visible'});
  if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'seed-cottage',houseTap:true,dragAndCancel:true,farmMode:true,keyboard:true,dayNight:true,errors};
 }finally{await context.close();}
}
