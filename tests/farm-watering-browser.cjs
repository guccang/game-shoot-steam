// 手机农田便捷操作验收：真实鼠标/触摸切换工具、排队、重复浇水、收割和存档。
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
  window.resetFields=async()=>{const now=Date.now();g.progress.farm.plots=farmSites.map((s,id)=>({...s,crop:id<2?null:0,plantedAt:id<2?0:id===5?now-61000:now,readyAt:id<2?0:id===5?now-1000:now+(id===4?45000:60000),watered:id===4}));g.progress.farm.nextId=6;(await import('/src/core/farm.js')).setFarmTool(g,'hoe');g.farmCursor=null;Object.assign(g.player,basePlayer,{vx:0,vy:0});a.renderer.camera.time=null;a.refresh();};
  await resetFields();for(const d of document.querySelectorAll('dialog[open]'))d.close();
 });
 await page.locator('#field-menu-toggle').click();await page.locator('#farm-menu').click();
 const cell=id=>page.locator(`[data-farm-cell="${id}"]`);
 // 默认点击只读剩余时间；覆盖锄头、镰刀及键盘激活，不改变工具或已有队列。
 await page.waitForFunction(()=>!document.getElementById('farm-sickle').disabled);
 for(const tool of ['hoe','sickle']){
  await page.locator('#farm-'+tool).click();
  const before=await page.evaluate(()=>JSON.stringify({farm:a.game.progress.farm,work:a.game.farmWork}));
  await cell(2).click();
  if(!await page.locator('#toast').isVisible()||!await page.locator('#farm-notice').textContent().then(t=>t.includes('距成熟还有')))throw Error('未显示成熟时间 '+tool);
  if(await page.evaluate(()=>JSON.stringify({farm:a.game.progress.farm,work:a.game.farmWork}))!==before)throw Error('查看时间改动农活 '+tool);
  await cell(2).focus();await page.keyboard.press('Enter');
  if(await page.evaluate(()=>JSON.stringify({farm:a.game.progress.farm,work:a.game.farmWork}))!==before)throw Error('键盘查看时间改动农活 '+tool);
 }
 // 固定时钟核对分秒进位、浇水后真实时间以及临近成熟时向上取整。
 for(const [remaining,expected] of [[125000,'2分5秒'],[45000,'45秒'],[1,'1秒']]){
  await page.evaluate(ms=>{window.realNow=Date.now;const now=realNow();Date.now=()=>now;a.game.progress.farm.plots[2].readyAt=now+ms;},remaining);
  await cell(2).click();if(!(await page.locator('#farm-notice').textContent()).includes(expected))throw Error('成熟时间格式错误 '+expected);
  await page.evaluate(()=>{Date.now=realNow;});
 }
 await page.evaluate(()=>resetFields());
 // 鼠标按田块切换，空田不会被当前水壶/镰刀错误拦截。
 for(const tool of ['water','sickle','hoe']){
  await page.locator('#farm-'+tool).click();await cell(0).click();if(!await page.locator('#farm-picker').isVisible())throw Error('空田未弹种子面板 '+tool);
  await page.locator('#farm-water').click();await cell(5).click();
  let state=await page.evaluate(()=>({tool:a.game.farmWork.tool,queue:a.game.farmWork.queue.map(j=>j.action),coins:a.game.progress.coins}));if(state.tool!=='harvest'||state.queue.join()!=='harvest')throw Error('成熟田未自动收割');
  await cell(2).click();state=await page.evaluate(()=>({tool:a.game.farmWork.tool,ids:a.game.farmWork.queue.map(j=>j.id)}));if(state.tool!=='harvest'||state.ids.join()!=='5')throw Error('查看幼苗清掉收割队列');
  await page.locator('#farm-water').click();await cell(2).click();await cell(3).click();state=await page.evaluate(()=>({tool:a.game.farmWork.tool,ids:a.game.farmWork.queue.map(j=>j.id)}));if(state.tool!=='water'||state.ids.join()!=='2,3')throw Error('主动浇水队列错误');
 }
 // 触屏沿用同一路径：湿田可再次浇水，成熟田一触收割，种子仍支持拖播。
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 const touch=async locator=>{const r=await locator.boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
 // 手机短按幼苗同样只查时间，拿起水壶后才浇水。
 await touch(page.locator('#farm-hoe'));await touch(cell(2));if(!await page.evaluate(()=>a.game.farmWork.tool==='hoe'&&!a.game.farmWork.queue.length&&document.getElementById('farm-notice').textContent.includes('距成熟还有')))throw Error('手机查看触发浇水');
 await touch(page.locator('#farm-water'));
 await touch(cell(4));if(!await page.evaluate(()=>a.game.farmWork.queue.some(j=>j.id===4&&j.action==='water')))throw Error('湿田触摸无法浇水');
 await touch(cell(5));if(await page.locator('#farm-sickle').getAttribute('aria-pressed')!=='true')throw Error('触摸未选镰刀');
 await touch(cell(0));await touch(page.locator('[data-farm-seed="0"]'));await touch(cell(0));await touch(cell(1));if(!await page.evaluate(()=>a.game.farmWork.queue.map(j=>j.id).join()==='0,1'))throw Error('种子点播队列错误');
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});
 // 已拿种子的拖播与从成熟田起手的拖收都保留跨格队列。
 await page.evaluate(()=>resetFields());await cell(0).click();await page.locator('[data-farm-seed="0"]').click();
 const drag=async(from,to)=>{const x=await cell(from).boundingBox(),y=await cell(to).boundingBox();await page.mouse.move(x.x+x.width/2,x.y+x.height/2);await page.mouse.down();await page.mouse.move(y.x+y.width/2,y.y+y.height/2,{steps:12});await page.mouse.up();};
 await drag(0,1);if(!await page.evaluate(()=>a.game.farmWork.queue.map(j=>j.id).join()==='0,1'))throw Error('拖播队列丢失');
 await page.evaluate(()=>{for(const id of [2,3]){const p=a.game.progress.farm.plots[id];p.plantedAt=Date.now()-61000;p.readyAt=Date.now()-1000;}});await drag(2,3);if(!await page.evaluate(()=>a.game.farmWork.tool==='harvest'&&a.game.farmWork.queue.map(j=>j.id).join()==='2,3'))throw Error('自动拖收队列丢失');
 // 正式动作第一次浇水后缩短25%；动作完成后再次点击，仍会倾倒但不重复减时。
 await page.evaluate(async()=>{await resetFields();window.readyBefore=a.game.progress.farm.plots[2].readyAt;const p=a.game.progress.farm.plots[2];Object.assign(a.game.player,(await import('/src/world/farm-land.js')).farmApproach(a.game,p));a.game.update=originalUpdate;a.renderer.camera.time=null;a.refresh();});await page.waitForTimeout(150);
 await page.locator('#farm-water').click();await cell(2).click();await page.waitForFunction(()=>a.game.progress.farm.plots[2].watered&&!a.game.farmWork.job);const first=await page.evaluate(()=>a.game.progress.farm.plots[2].readyAt);const saved=await page.evaluate(()=>readyBefore-a.game.progress.farm.plots[2].readyAt);if(saved!==15000)throw Error('首次加速不等于25%');
 await cell(2).click();await page.waitForFunction(()=>a.game.farmWork?.job?.action==='water');await page.waitForFunction(()=>!a.game.farmWork.job&&!a.game.farmWork.queue.length);if(await page.evaluate(()=>a.game.progress.farm.plots[2].readyAt)!==first)throw Error('重复浇水叠加减时');
 // 直接点击成熟作物走近挥镰，命中后才发金币。
 const coins=await page.evaluate(()=>a.game.progress.coins);await cell(5).click();await page.waitForFunction(before=>a.game.progress.coins===before+60&&!a.game.farmWork.job,coins);if(await page.evaluate(()=>a.game.progress.farm.plots[5].crop)!==null)throw Error('收割未清空田块');
 const savedPlots=await page.evaluate(()=>a.game.progress.farm.plots.map(({id,watered,readyAt,crop})=>({id,watered,readyAt,crop})));
 // 昼夜只改变环境，湿土与干土同屏，常驻状态不再画水滴标识。
 await page.evaluate(()=>{a.game.update=()=>{};Object.assign(a.game.player,basePlayer);});
 for(const [width,height] of [[320,568],[390,844],[844,390]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(async time=>{const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);a.game.progress.living.calendar={day:1,elapsed:phase.start+phase.duration/2};Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();},time);await page.waitForTimeout(150);await page.screenshot({path:`output/playwright/farm-context-tools/${width}-${time}.png`});samples.push({width,height,time});
 }
 await page.reload();await page.locator('#start').click();const restored=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;return a.game.progress.farm.plots.map(({id,watered,readyAt,crop})=>({id,watered,readyAt,crop}));});if(JSON.stringify(restored)!==JSON.stringify(savedPlots))throw Error('刷新后浇水或收割状态丢失');
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'farm-watering',mouse:true,touch:true,savedMs:saved,repeatUnchanged:true,harvestCoins:60,samples,restored,errors};
}
