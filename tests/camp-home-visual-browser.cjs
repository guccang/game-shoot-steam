// 最终展示层和鼠标点击补验：真实场景、昼夜同屏与入职入库连续样本。
async page=>{
 if(new URL(page.url()).port!=='4268')throw Error('仅限隔离验收端口');
 const errors=[],views=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.vehicleHulls.fill(1);p.vehicleIndex=0;localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.locator('#start').click();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
 await page.evaluate(async()=>{const g=a.game;g.progress.campParking.owned=[{hull:0,spot:'weapons-west',hp:.8,ammo:10,reload:0,wheel:1,track:0}];g.vehicle.active=false;g.parking=null;Object.assign(g.player,{x:509,y:690,vx:0,vy:0});a.renderer.camera.time=null;});
 await page.waitForTimeout(300);await page.locator('[data-parked-hull="0"]').click();
 if(!await page.evaluate(()=>a.game.vehicle.active&&a.game.progress.campParking.owned.length===0))throw Error('鼠标点击上车失败');
 await page.evaluate(async()=>{const g=a.game;g.dismountVehicle();g.parking=null;g.parkingVisitors=[];g.parkingVisitTimer=0;g.parkingView={x:700,y:700,w:300,h:300};g.random=()=>.7;(await import('/src/core/camp-parking.js')).updateParkingVisitors(g,.05);Object.assign(g.player,{x:390,y:430,vx:0,vy:0});a.renderer.camera.time=null;window.savedTick=g.update.bind(g);g.update=()=>{};});
 for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async phase=>{const g=a.game;g.progress.living.calendar.elapsed=phase==='night'?220000:1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);g.enemies=[];g.spawnEnemy(0,900);Object.assign(g.enemies[0],{x:g.player.x+75,y:g.player.y+75,speed:0});a.renderer.camera.time=null;a.renderer.draw();a.refresh();},phase);
  await page.waitForTimeout(300);views.push(await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectCampHome(a.game,document)));
  await page.screenshot({path:`output/playwright/camp-home/lot-${width}-${phase}.png`});
 }
 if(views.some(s=>s.overflow)||errors.length)throw Error(JSON.stringify({views,errors}));
 // 原导演真实推进推车阶段；固定阶段起点，不改入库路线或采样器。
 await page.evaluate(async()=>{const g=a.game;g.update=window.savedTick;const p=(await import('/src/progression/progress.js')).freshRangerProgress();p.arrival.phase='parking';g.progress=p;g.reset();g.restoreWorld();g.start();a.renderer.camera.time=null;});
 await page.waitForFunction(()=>a.game.progress.arrival.elapsed>1.3);await page.screenshot({path:'output/playwright/camp-home/arrival-reverse.png'});
 await page.waitForFunction(()=>a.game.progress.arrival.phase==='handover',null,{timeout:10000});
 await page.screenshot({path:'output/playwright/camp-home/arrival-garage.png'});
 if(!await page.evaluate(()=>!a.game.parking&&a.game.parkingVisitors.length===0&&Math.abs(a.game.arrivalScene.scooter.y-638)<1))throw Error('入职停车受到干扰');
 return {designCriterion:'camp-home-parking',views,errors,arrival:'通过'};
}
