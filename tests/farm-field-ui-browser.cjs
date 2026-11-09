// 农田轻描边验收：实际场景检查昼夜、排队、浇水、落锄预览及点击与键盘焦点。
async page=>{
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:390,height:844});if(await page.locator('#start').isVisible())await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
  const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';
  const {farmCell}=await import('/src/config/farm.js');p.farm.plots=[0,1,2].map(id=>({...farmCell(id),mapId:'forest',crop:null,plantedAt:0,readyAt:0,watered:false}));p.farm.nextId=3;p.farm.seeds[0]=20;
  /* 单项农活夹具不额外放置示范田。 */p.farm.wildMaps=['forest','jiuzhaigou'];g.progress=p;g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.enemies=[];g.boss=null;g.vehicle.active=false;g.update=()=>{};Object.assign(g.player,{x:837,y:690,vx:0,vy:0});
  for(const d of document.querySelectorAll('dialog[open]'))d.close();
 });
 for(const [width,height] of [[320,568],[390,844],[844,390]])for(const time of ['day','night'])for(const action of ['plant','water','dig']){
  await page.setViewportSize({width,height});
  await page.evaluate(async({time,action})=>{
   const g=a.game,{setFarmTool,queueFarmWork}=await import('/src/core/farming/farm.js');setFarmTool(g,action==='water'?'water':'hoe');g.farmCursor=null;
   for(const p of g.progress.farm.plots){p.crop=action==='water'?0:null;p.plantedAt=Date.now();p.readyAt=Date.now()+45000;p.watered=false;if(action!=='dig')queueFarmWork(g,action,{plot:p.id,crop:0});}
   if(action==='dig')g.farmCursor={x:837,y:568,mapId:'forest'};else g.farmWork.job=g.farmWork.queue.shift();
   const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);g.progress.living.calendar={day:1,elapsed:phase.start+phase.duration/2};Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();
  },{time,action});await page.mouse.move(0,0);await page.waitForTimeout(180);
  const info=await page.locator('.farm-cell').evaluateAll(nodes=>nodes.map(n=>({outline:getComputedStyle(n).outlineStyle,animation:getComputedStyle(n).animationName,queued:n.dataset.queued,hidden:n.hidden})));
  if(info.some(s=>s.outline==='dashed'||s.animation!=='none'||s.hidden))throw Error(JSON.stringify({width,time,action,info}));
  samples.push({width,height,time,action,info});await page.screenshot({path:`output/playwright/farm-field-ui/${width}-${time}-${action}.png`});
 }
 // 真实鼠标选择种子、点击空田入队，确认透明热点没有被视觉调整破坏。
 await page.setViewportSize({width:390,height:844});await page.evaluate(async()=>{const g=a.game;g.farmCursor=null;(await import('/src/core/farming/farm.js')).setFarmTool(g,null);for(const p of g.progress.farm.plots)p.crop=null;a.refresh();});await page.waitForTimeout(150);
 const cell=page.locator('[data-farm-cell="1"]');await cell.hover();const hover=await cell.evaluate(n=>getComputedStyle(n).outlineStyle);if(hover==='dashed')throw Error('悬停仍显示虚线');
 await cell.click();await page.locator('#farm-picker').waitFor({state:'visible'});await page.locator('[data-farm-seed="0"]').click();await cell.click();
 const queued=await page.evaluate(()=>a.game.farmWork?.queue.some(j=>j.id===1&&j.action==='plant'));if(!queued)throw Error('播种点击未进入正式队列');
 await page.keyboard.press('Tab');await cell.focus();const focus=await cell.evaluate(n=>({style:getComputedStyle(n).outlineStyle,width:getComputedStyle(n).outlineWidth}));if(focus.style!=='solid'||parseFloat(focus.width)<2)throw Error('键盘焦点不清楚');
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'world-farm-delivery',samples,hover,focus,queued,errors};
}
