// 连续浇水验收：鼠标与触屏按真实路径去重、跳过、取消，并验证猫猫依次行走结算。
async page=>{
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:390,height:844});if(await page.locator('#start').isVisible())await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
  const p=(await import('/src/progression/progress.js')).freshProgress(),g=a.game;p.arrival=null;p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.farm.seeds[0]=20;
  /* 单项农活夹具不额外放置示范田。 */p.farm.wildMaps=['forest','jiuzhaigou'];g.progress=p;g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.fireClock=999999;g.enemies=[];g.boss=null;g.vehicle.active=false;
  const {farmLandReason,snapFarmPoint,farmApproach}=await import('/src/world/farm-land.js');
  for(let y=400;y<1200&&!window.farmSites;y+=52)for(let x=1500;x<2600&&!window.farmSites;x+=56){const first=snapFarmPoint({x,y},'forest'),sites=Array.from({length:6},(_,id)=>({id,x:first.x+(id%3)*56,y:first.y+Math.floor(id/3)*52,mapId:'forest'}));if(sites.every(s=>!farmLandReason(g,s)&&farmApproach(g,s)))window.farmSites=sites;}
  if(!farmSites)throw Error('未找到合法测试田');
  window.basePlayer={x:farmSites[4].x,y:farmSites[4].y+72};Object.assign(g.player,basePlayer,{vx:0,vy:0});window.originalUpdate=g.update.bind(g);g.update=()=>{};
  // 准备两块空田、两块幼苗、一块湿田与一块成熟田，所有状态都由正式UI读取。
  window.resetFields=async()=>{const now=Date.now();g.progress.farm.plots=farmSites.map((s,id)=>({...s,crop:id<2?null:0,plantedAt:id<2?0:id===5?now-61000:now,readyAt:id<2?0:id===5?now-1000:now+(id===4?45000:60000),watered:id===4}));g.progress.farm.nextId=6;(await import('/src/core/farming/farm.js')).setFarmTool(g,'hoe');g.farmCursor=null;Object.assign(g.player,basePlayer,{vx:0,vy:0});a.renderer.camera.time=null;a.refresh();};
  await resetFields();for(const d of document.querySelectorAll('dialog[open]'))d.close();
 });
 await page.locator('#field-menu-toggle').click();await page.locator('#farm-menu').click();
 // 冷启动时等待正式图集可用，再开始拖动，避免把加载阶段误当成收集失败。
 await page.waitForFunction(()=>!document.getElementById('farm-sickle').disabled);
 const cell=id=>page.locator(`[data-farm-cell="${id}"]`);
 // 实际命中区用于两种指针，按首次经过顺序采集2、3、4号田。
 const centers=async()=>{const values=[];for(let id=0;id<6;id++){const r=await cell(id).boundingBox();values.push({x:r.x+r.width/2,y:r.y+r.height/2});}return values;};
 const route=[2,1,0,3,4,5,4,2];
 // 保持正式更新运行，按住拖动期间不能走动或提前结算。
 await page.evaluate(()=>{const g=a.game;window.waterEvents=[];const emit=g.onEvent;g.onEvent=(type,event)=>{if(type==='farm-change'&&event.action==='water')waterEvents.push({id:event.plot,x:g.player.x,y:g.player.y,savedSeconds:event.wateredPlots[0].savedSeconds});emit(type,event);};window.beforeReady=g.progress.farm.plots.map(p=>p.readyAt);g.player.invincible=99999;g.update=originalUpdate;});
 await page.locator('#farm-water').click();
 let points=await centers();await page.mouse.move(points[2].x,points[2].y);await page.mouse.down();
 for(const id of route.slice(1))await page.mouse.move(points[id].x,points[id].y,{steps:4});await page.waitForTimeout(250);
 const held=await page.evaluate(()=>({tool:a.game.farmWork.tool,ids:a.game.farmWork.queue.map(j=>j.id),dragging:a.game.farmDragging,events:waterEvents.length,job:!!a.game.farmWork.job}));
 if(held.tool!=='water'||held.ids.join()!=='2,3,4'||!held.dragging||held.events||held.job)throw Error(JSON.stringify(held));
 await page.screenshot({path:'output/playwright/farm-water-drag/mouse-queue.png'});await page.mouse.up();
 await page.waitForFunction(()=>waterEvents.length===3&&!a.game.farmWork.job&&!a.game.farmWork.queue.length,null,{timeout:20000});
 const completed=await page.evaluate(async()=>{const {worldDistance}=await import('/src/world/coordinates.js');return {events:waterEvents,near:waterEvents.every(e=>worldDistance(e,a.game.progress.farm.plots[e.id])<=78),saved:a.game.progress.farm.plots.map((p,i)=>beforeReady[i]-p.readyAt)};});
 if(completed.events.map(e=>e.id).join()!=='2,3,4'||!completed.near||completed.saved[2]!==15000||completed.saved[3]!==15000||completed.saved[4]!==0)throw Error(JSON.stringify(completed));
 // 手机拖动同样保持顺序；系统取消只清队列，不改变田块。
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 for(const [width,height] of [[320,568],[390,844],[844,390]]){
  await page.setViewportSize({width,height});await page.evaluate(async()=>{a.game.update=()=>{};await resetFields();});await page.locator('#farm-water').click();await page.waitForTimeout(120);points=await centers();
  const touch=async(type,id)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:id===null?[]:[{...points[id],id:1}]});
  await touch('touchStart',2);for(const id of route.slice(1))await touch('touchMove',id);
  const state=await page.evaluate(()=>({ids:a.game.farmWork.queue.map(j=>j.id),dragging:a.game.farmDragging,ghost:document.getElementById('farm-ghost').textContent}));if(state.ids.join()!=='2,3,4'||!state.dragging||state.ghost!=='安排浇水')throw Error(JSON.stringify({width,state}));
  await page.screenshot({path:`output/playwright/farm-water-drag/touch-${width}.png`});await touch('touchEnd',null);
  if(await page.evaluate(()=>a.game.farmDragging))throw Error('松手未结束拖动');samples.push({width,height,...state});
  await page.evaluate(async()=>{await resetFields();window.cancelBefore=JSON.stringify(a.game.progress.farm.plots);});await page.locator('#farm-water').click();await touch('touchStart',2);await touch('touchMove',3);await touch('touchCancel',null);
  const cancelled=await page.evaluate(()=>!a.game.farmDragging&&!a.game.farmWork.job&&!a.game.farmWork.queue.length&&JSON.stringify(a.game.progress.farm.plots)===cancelBefore);if(!cancelled)throw Error('触摸取消仍保留农活或修改作物');
  // 昼夜手机画面核对剩余时间提示的实际换行，查看操作不安排农活。
  for(const time of ['day','night']){
   await page.evaluate(async time=>{const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);a.game.progress.living.calendar={day:1,elapsed:phase.start+phase.duration/2};Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();},time);
   await page.locator('#farm-hoe').click();await page.locator('[data-farm-cell="2"]').click();
   if(!(await page.locator('#toast').textContent()).includes('距成熟还有')||await page.evaluate(()=>a.game.farmWork.queue.length>0||document.documentElement.scrollWidth>innerWidth))throw Error('查看时间提示或手机布局异常');
   await page.screenshot({path:`output/playwright/farm-water-drag/growth-${width}-${time}.png`});
  }
 }
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'farm-watering',held,completed,samples,cancelled:true,errors};
}
