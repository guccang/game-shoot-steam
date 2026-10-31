// 驾驶点击、满位换乘、触屏与昼夜实机验收；只使用隔离端口存档。
async page=>{
 if(new URL(page.url()).port!=='4291')throw Error('仅限隔离端口4291');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true,parked:false};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.vehicleHulls.fill(0);p.vehicleHulls[0]=p.vehicleHulls[3]=1;p.vehicleIndex=3;p.campParking={owned:[{hull:0,spot:'north-0-1',hp:.7,ammo:2,reload:0,wheel:0,track:0}]};localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.locator('#start').click();await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;g.enemies=[];g.spawnTimer=g.fireClock=999;g.parkingVisitors=[];g.parkingVisitTimer=999;Object.assign(g.player,{x:210,y:265,vx:0,vy:0});g.summonVehicle();window.swapTick=g.update.bind(g);g.update=()=>{};a.renderer.camera.time=null;});
 await page.locator('[data-parked-hull="0"]').waitFor({state:'visible'});
 if(await page.locator('[data-parked-hull="0"]').getAttribute('aria-label')!=='换车：松果战车')throw Error('驾驶时未显示换车入口');
 await page.screenshot({path:'output/playwright/parking-vehicle-swap/before.png'});
 await page.locator('[data-parked-hull="0"]').click();
 if(!await page.evaluate(()=>a.game.vehicle.index===0&&a.game.vehicle.active&&a.game.progress.campParking.owned.some(r=>r.hull===3&&r.spot!=='north-0-1')))throw Error('点击未停好旧车并换乘');
 // 满位包括访客，触屏短按直接交换，不能移走访客或重叠当前驾驶车辆。
 const full=await page.evaluate(async()=>{const g=a.game,{PARKING_SPOTS}=await import('/src/config/parking.js'),{VISITOR_MODELS}=await import('/src/config/parking-visitors.js');Object.assign(g.player,{x:270,y:265,vx:0,vy:0});a.renderer.camera.time=null;g.parkingVisitors=PARKING_SPOTS.filter(s=>s.building==='north'&&!g.progress.campParking.owned.some(r=>r.spot===s.id)).map((s,i)=>({spot:s.id,model:VISITOR_MODELS[i%VISITOR_MODELS.length].id}));return {visitors:JSON.stringify(g.parkingVisitors),position:{x:g.player.x,y:g.player.y},spot:g.progress.campParking.owned.find(r=>r.hull===3).spot};});
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 const hit=await page.locator('[data-parked-hull="3"]').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:hit.x+hit.width/2,y:hit.y+hit.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForFunction(()=>a.game.vehicle.index===3&&a.game.vehicle.active);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
 if(!await page.evaluate(full=>{const g=a.game;return JSON.stringify(g.parkingVisitors)===full.visitors&&g.progress.campParking.owned.find(r=>r.hull===0).spot===full.spot&&g.player.x===full.position.x&&g.player.y===full.position.y&&g.vehicles.filter(v=>v.active).length===1;},full))throw Error('满位交换重叠或挤走访客');
 await page.screenshot({path:'output/playwright/parking-vehicle-swap/full-swap.png'});
 // 页面同样使用换乘入口，满位时不先走会挤走访客的普通选车流程。
 await page.evaluate(()=>a.workshop.open('vehicle',0));await page.locator('#ws-equip').click();await page.waitForFunction(()=>a.game.vehicle.index===0&&a.game.vehicle.active&&!document.querySelector('dialog[open]'));
 if(!await page.evaluate(full=>JSON.stringify(a.game.parkingVisitors)===full.visitors,full))throw Error('页面换车改变访客');
 // 正式场景同屏包含角色、载具、访客、环境、敌人与中文换车标签。
 await page.evaluate(()=>{const g=a.game;g.spawnEnemy(0,900);Object.assign(g.enemies[0],{x:g.player.x+150,y:g.player.y+120,speed:0});});
 for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(async phase=>{const g=a.game;g.progress.living.calendar.elapsed=phase==='night'?260000:75000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.renderer.draw();a.refresh();},phase);await page.waitForTimeout(150);
  samples.push({width,phase,...await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectVehicleTransfer(a.game,document))});await page.screenshot({path:`output/playwright/parking-vehicle-swap/${width}-${phase}.png`});
 }
 if(errors.length||samples.some(s=>s.overflow))throw Error(JSON.stringify({errors,samples}));return {designCriterion:'parking-vehicle-transfer',mouse:true,touch:true,fullSwap:true,panelSwap:true,samples,errors};
}
