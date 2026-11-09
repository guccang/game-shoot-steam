// 手机选种报价与正式农活闭环；仅跳过作物等待时间，播种、浇水和收割均走真实点击队列。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.setViewportSize({width:390,height:844});
 if(await page.locator('#start').isVisible())await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.balanceApp=(await import('/src/main.js')).application;await balanceApp.ready;
  const {freshRangerProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js'),{farmCell}=await import('/src/config/farm.js');
  const g=balanceApp.game,p=freshRangerProgress();p.arrival=null;p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.coins=1000;p.farm.delivery.nextAt=Date.now()+3600000;
  p.farm.plots=[{...farmCell(1),mapId:'forest',crop:null,plantedAt:0,readyAt:0,watered:false}];p.farm.nextId=2;p.farm.dug=1;
  /* 单项农活夹具不额外放置示范田。 */p.farm.wildMaps=['forest','jiuzhaigou'];g.progress=p;g.mapId='forest';g.reset();g.state='playing';g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.fireClock=999999;g.arrivalScene=null;
  Object.assign(g.player,{x:837,y:720,vx:0,vy:0});g.enemies=[];balanceApp.renderer.camera.time=null;
  for(const d of document.querySelectorAll('dialog[open]'))d.close();balanceApp.refresh();
 });await page.waitForTimeout(500);
 await page.locator('[data-farm-cell="1"]').click();
 await page.waitForFunction(()=>!document.querySelector('[data-farm-seed="0"]').disabled);
 const initial=await page.locator('#farm-picker').innerText();if(!initial.includes('再获 30 经验解锁胡萝卜')||await page.locator('[data-farm-seed]').count()!==1)throw Error('新档解锁提示错误 '+initial);
 await page.evaluate(()=>{balanceApp.game.progress.farm.xp=30;});
 await page.waitForFunction(()=>!!document.querySelector('[data-farm-seed="1"]'));
 const carrot=await page.locator('[data-farm-seed="1"]').innerText();if(!carrot.includes('40金币')||!carrot.includes('收获220币')||!carrot.includes('净赚180币')||!carrot.includes('2分钟成熟'))throw Error('种子报价不一致 '+carrot);
 await page.locator('[data-farm-seed="1"]').click();await page.locator('[data-farm-cell="1"]').click();
 await page.waitForFunction(()=>balanceApp.game.progress.farm.plots[0].crop===1&&!balanceApp.game.farmWork.job);
 const planted=await page.evaluate(()=>({coins:balanceApp.game.progress.coins,plot:{...balanceApp.game.progress.farm.plots[0]}}));
 if(planted.coins!==960||planted.plot.readyAt-planted.plot.plantedAt!==120000)throw Error('播种实际扣费或时长错误');
 await page.locator('#farm-water').click();await page.locator('[data-farm-cell="1"]').click();
 await page.waitForFunction(()=>balanceApp.game.progress.farm.plots[0].watered&&!balanceApp.game.farmWork.job);
 const watered=await page.evaluate(()=>balanceApp.game.progress.farm.plots[0].readyAt);if(planted.plot.readyAt-watered!==30000)throw Error('浇水减时错误');
 await page.evaluate(()=>{const p=balanceApp.game.progress.farm.plots[0];p.plantedAt-=120000;p.readyAt-=120000;});
 await page.locator('#farm-sickle').click();await page.locator('[data-farm-cell="1"]').click();await page.waitForFunction(()=>balanceApp.game.progress.coins===1180&&!balanceApp.game.farmWork.job);
 await page.evaluate(()=>{balanceApp.game.progress.farm.xp=3300;balanceApp.game.progress.farm.seeds.fill(0);});
 await page.locator('#farm-hoe').click();await page.locator('[data-farm-cell="1"]').click();
 const views=[];
 for(const [width,height,time] of [[390,844,'day'],[320,568,'night']]){
  await page.setViewportSize({width,height});
  await page.evaluate(async time=>{const {LIVING_PHASES}=await import('/src/config/living-world.js'),{EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js'),phase=LIVING_PHASES.find(p=>p.id===time);balanceApp.game.progress.living.calendar={day:1,elapsed:phase.start+phase.duration/2};Object.assign(balanceApp.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});balanceApp.renderer.light=new EnvironmentTransition(balanceApp.environment,0);balanceApp.renderer.tone=new SceneTone(balanceApp.environment,0);},time);
  await page.waitForTimeout(500);await page.screenshot({path:`output/playwright/farm-balance/${width}-${time}.png`});
  const layout=await page.locator('#farm-picker').evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,count:el.querySelectorAll('[data-farm-seed]').length,overflow:[...el.querySelectorAll('small')].some(n=>n.scrollWidth>n.clientWidth+1),text:el.innerText};});
  if(layout.count!==8||layout.left<0||layout.right>width||layout.top<0||layout.bottom>height||layout.overflow)throw Error('选种信息溢出 '+JSON.stringify(layout));views.push(layout);
 }
 const shop=await page.evaluate(async()=>{const {quoteWorkshop}=await import('/src/progression/workshop/workshop.js');const p=structuredClone(balanceApp.game.progress);p.coins=p.wood=100000;p.materials={parts:1000,crystal:1000,core:100};p.restoration.repaired.push('garage');const q=quoteWorkshop(p,{kind:'vehicle',index:2,action:'buy'});return {ok:q.ok,rows:q.rows,spent:p.coins-q.next?.coins};});
 if(!shop.ok||shop.spent!==10780)throw Error('战车正式报价与扣费错误 '+JSON.stringify(shop));
 if(errors.length)throw Error(JSON.stringify(errors));return {initial,carrot,planted,waterSavedSeconds:30,harvestCoins:1180,shop,views,errors};
}
