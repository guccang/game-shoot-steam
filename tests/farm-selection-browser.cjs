// 正式触控长按与拖选验收：圆点位于田格右下角，待办与当前操作同样醒目。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/farm-selection/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival=null;p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';p.farm.wildMaps=['forest','jiuzhaigou'];p.farm.delivery.nextAt=Date.now()+3600000;
   p.farm.plots=[0,1,2,3].map(id=>({id,mapId:'forest',x:893+id%2*56,y:2752+Math.floor(id/2)*52,crop:null,plantedAt:0,readyAt:0,watered:false}));p.farm.nextId=4;p.farm.seeds[0]=10;
   g.progress=p;g.mapId='forest';g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.fireClock=999999;g.enemies=[];
   Object.assign(g.player,{x:921,y:2910,vx:0,vy:0});for(const d of document.querySelectorAll('dialog[open]'))d.close();a.renderer.camera.time=null;
   // 固定时段只用于比较显示，长按、取消、排队与执行均走原生触控和正式农活。
   window.light=async time=>{Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();};await light('day');
  });await page.waitForTimeout(500);
  const cdp=await context.newCDPSession(page);
  // 触点使用实际热点中心，保持手指按下时截图，不能把预设队列冒充长按。
  const touch=async(type,id)=>{const r=id===undefined?null:await page.locator(`[data-farm-cell="${id}"]`).boundingBox();await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:r?[{x:r.x+r.width/2,y:r.y+r.height/2,id:1}]:[]});};
  // 同时检查醒目标记、无虚线以及右下角定位，不只检查逻辑队列。
  const markers=async()=>page.locator('[data-farm-cell]').evaluateAll(nodes=>nodes.map(n=>{const s=getComputedStyle(n,'::after');return {id:n.dataset.farmCell,queued:n.dataset.queued,selected:n.dataset.selected,step:n.dataset.farmStep,content:s.content,color:s.color,opacity:s.opacity,right:s.right,bottom:s.bottom,size:s.width,radius:s.borderRadius,background:s.backgroundColor,outline:getComputedStyle(n).outlineStyle};}));
  await touch('touchStart',0);await page.waitForTimeout(350);let first=await markers();if(first[0].selected!=='true'&&first.find(p=>p.id==='0').selected!=='true')throw Error('长按没有立即选中');
  if((await markers()).find(p=>p.id==='0').radius!=='50%')throw Error('长按没有圆点');await page.screenshot({path:'output/playwright/farm-selection/hold-empty.png'});await touch('touchCancel');
  await page.locator('[data-farm-cell="0"]').tap();await page.locator('[data-farm-seed="0"]').tap();
  for(const width of [390,320]){
   await page.setViewportSize({width,height:width===320?568:844});await page.waitForTimeout(250);
   await touch('touchStart',0);for(const id of [1,3,2])await touch('touchMove',id);await page.waitForTimeout(250);
   const queued=await page.evaluate(()=>({queue:a.game.farmWork.queue.length,empty:a.game.progress.farm.plots.every(p=>p.crop===null)}));if(queued.queue!==4||!queued.empty)throw Error('按住时队列或结算错误');
   const all=await markers();if(all.some(p=>p.queued!=='true'||p.content!=='""'||p.radius!=='50%'||p.background!=='rgb(255, 244, 181)'||p.opacity!=='1'||parseFloat(p.right)>0||parseFloat(p.bottom)>0||p.outline==='dashed'))throw Error(JSON.stringify(all));
   if(new Set(all.map(p=>p.color+p.opacity+p.size)).size!==1)throw Error('排队标记被弱化');
   for(const time of ['day','night']){await page.evaluate(time=>light(time),time);await page.waitForTimeout(180);await page.screenshot({path:`output/playwright/farm-selection/seed-${width}-${time}.png`});}
   await touch('touchCancel');await page.waitForTimeout(100);if((await markers()).some(p=>p.content==='""'||p.step))throw Error('取消后圆点残留');
  }
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);await touch('touchStart',0);for(const id of [1,3,2])await touch('touchMove',id);await touch('touchEnd');
  await page.waitForFunction(()=>a.game.farmWork?.job&&a.game.farmWork.queue.length>0);await page.screenshot({path:'output/playwright/farm-selection/current-and-queued.png'});
  await page.waitForFunction(()=>a.game.progress.farm.plots.every(p=>p.crop===0)&&!a.game.farmWork.job&&!a.game.farmWork.queue.length,null,{timeout:20000});await page.waitForTimeout(100);
  if((await markers()).some(p=>p.content==='""'||p.step))throw Error('完成后圆点残留');
  await page.evaluate(()=>{for(const p of a.game.progress.farm.plots)Object.assign(p,{crop:3,plantedAt:0,readyAt:0});Object.assign(a.game.player,{x:921,y:2910,vx:0,vy:0});a.renderer.camera.time=null;a.refresh();});await page.waitForTimeout(350);
  await touch('touchStart',0);for(const id of [1,3,2])await touch('touchMove',id);
  for(const time of ['day','night']){await page.evaluate(time=>light(time),time);await page.waitForTimeout(180);await page.screenshot({path:`output/playwright/farm-selection/mature-${time}.png`});}
  if((await markers()).filter(p=>p.step&&p.content==='""').length!==4)throw Error('成熟作物长按标记缺失');await touch('touchCancel');
  await page.evaluate(()=>{const p=a.game.progress.farm.plots[0];p.plantedAt=Date.now();p.readyAt=Date.now()+180000;a.refresh();});
  await page.locator('#farm-water').tap();await touch('touchStart',0);await page.waitForTimeout(250);await page.screenshot({path:'output/playwright/farm-selection/hold-growing.png'});await touch('touchEnd');
  await page.waitForFunction(()=>a.game.progress.farm.plots[0].watered,null,{timeout:15000});
  if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'world-farm-delivery',longPress:true,dragQueue:4,cancelClears:true,completionClears:true,watering:true,errors};
 }finally{await context.close();}
}
