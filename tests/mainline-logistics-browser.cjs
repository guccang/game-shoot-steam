// 手机检查点仅准备任务阶段，所有购买、存取与丢弃由真实按钮提交。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);
 await page.goto('http://localhost:4175');await page.locator('#start').tap();
 await page.locator('#game-frame[data-page=game]').waitFor({timeout:60000});
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;
  window.lessonCheckpoint=async(id,site)=>{
   for(const d of document.querySelectorAll('dialog[open]'))d.close();
   const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS,MAINLINE_SITES}=await import('/src/config/mainline.js');
   const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true,parked:false};p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf(id));p.mainline.currentId=id;p.mainline.phase='doing';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.vehicleHulls[0]=1;p.vehicleIndex=0;p.weapons[0]=1;p.weapon=0;p.coins=1000;p.wood=50;
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.mainlineTalkDelay=g.spawnTimer=g.fireClock=99999;g.enemies=[];g.boss=null;g.vehicle.active=false;g.parkingVisitors=[];g.progress.campParking.owned=[];g.progress.living.patrolActive=false;g.cottage=null;
   Object.assign(g.player,MAINLINE_SITES[site]);g.cottageDoorLatch='ammo';a.renderer.camera.time=null;Object.assign(a.environment,{autoTime:false,time:'day',autoWeather:false,weather:'sun',livingPreview:true});a.refresh();
  };
  await lessonCheckpoint('warehouse-lesson','warehouseEntry');
 });
 await page.waitForTimeout(400);

 // 截图直接来自正式渲染器，同时检查任务文字和弹窗均留在手机视口内。
 async function shot(name){
  await page.waitForTimeout(180);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||[...document.querySelectorAll('dialog[open]')].some(d=>{const r=d.getBoundingClientRect();return r.left<-.5||r.top<-.5||r.right>innerWidth+.5||r.bottom>innerHeight+.5;}));
  if(overflow)throw Error('手机布局溢出：'+name);await page.screenshot({path:'output/playwright/mainline-logistics/'+name+'.png'});
 }
 // 通过真实任务卡打开仓库，取消一次后再提交，确认不会提前完成。
 await page.locator('#mainline-hud').tap();await page.locator('#warehouse-dialog[open]').waitFor();
 await page.locator('[data-item="material:wood"][data-direction="withdraw"]').tap();
 await page.locator('#warehouse-quantity [data-cancel]').last().tap();
 if(await page.evaluate(()=>a.game.progress.mainline.seen.warehouseWithdrawn))throw Error('取消存取记了任务');
 await page.locator('[data-item="material:wood"][data-direction="withdraw"]').tap();await page.locator('#warehouse-quantity [data-confirm]').tap();
 await page.locator('[data-item="material:wood"][data-direction="deposit"]').tap();await page.locator('#warehouse-quantity [data-confirm]').tap();await shot('warehouse-transfer');
 if(!await page.evaluate(()=>a.game.progress.mainline.seen.warehouseWithdrawn&&a.game.progress.mainline.seen.warehouseDeposited))throw Error('存取未记账');
 await page.locator('#warehouse-dialog [data-close]').tap();
 // 背包清理提交一份木头，任务卡直接打开对应来源的清理页。
 await page.evaluate(async()=>{await lessonCheckpoint('bag-cleanup','weapons');a.game.progress.logistics.bagWood=1;a.refresh();});
 await page.locator('#mainline-hud').tap();await page.locator('#load-cleanup-dialog[data-source="bag"][open]').waitFor();
 await page.locator('[data-cleanup-item="material:wood"]').tap();await shot('bag-confirm');await page.locator('[data-quantity-confirm]').tap();
 if(!await page.evaluate(()=>a.game.progress.mainline.seen.bagCleaned))throw Error('背包清理未记账');await page.locator('#load-cleanup-close').tap();
 // 载重先看实际货舱页，再到仓库给当前车装一份木头。
 await page.evaluate(async()=>{await lessonCheckpoint('vehicle-weight','garage');});await page.locator('#mainline-hud').tap();await page.locator('#logistics-dialog[open]').waitFor();await shot('vehicle-weight');
 if(!await page.evaluate(()=>a.game.progress.mainline.seen.vehicleLoadViewed))throw Error('载重浏览未记账');await page.locator('#logistics-close').tap();
 await page.evaluate(async()=>{Object.assign(a.game.player,(await import('/src/config/mainline.js')).MAINLINE_SITES.warehouseEntry);a.renderer.camera.time=null;a.refresh();});
 await page.locator('#mainline-hud').tap();await page.locator('#warehouse-source').selectOption('0');await page.locator('[data-item="material:wood"][data-direction="withdraw"]').tap();await page.locator('#warehouse-quantity [data-confirm]').tap();await shot('cargo-loaded');
 if(!await page.evaluate(()=>a.game.progress.mainline.seen.cargoLoaded))throw Error('车库装载未记账');await page.locator('#warehouse-dialog [data-close]').tap();
 await page.evaluate(async()=>{await lessonCheckpoint('cargo-cleanup','garage');a.game.progress.logistics.builds[0].wood=1;a.refresh();});
 await page.locator('#mainline-hud').tap();await page.locator('#load-cleanup-dialog[data-source="vehicle"][open]').waitFor();await page.locator('[data-cleanup-item="material:wood"]').tap();await page.locator('[data-quantity-confirm]').tap();await shot('cargo-cleanup');
 if(!await page.evaluate(()=>a.game.progress.mainline.seen.cargoCleaned))throw Error('货舱清理未记账');await page.locator('#load-cleanup-close').tap();
 // 健康车现场检查即可通过；远程手机检查和有损伤车不能直接通过。
 await page.evaluate(async()=>{await lessonCheckpoint('repair-center','repairEntry');});await page.locator('#mainline-hud').tap();await page.locator('#vehicle-repair-dialog[open]').waitFor();await shot('repair-healthy');
 if(!await page.evaluate(()=>a.game.progress.mainline.seen.repairVisited&&a.game.progress.mainline.seen.repairChecked))throw Error('健康车现场检查未完成');await page.locator('#vehicle-repair-close').tap();
 await page.evaluate(async()=>{await lessonCheckpoint('repair-center','repairEntry');a.game.vehicle.hp*=.9;a.game.vehicle.active=true;a.refresh();});
 await page.locator('#mainline-hud').tap();await page.locator('[data-repair-hull="0"]').tap();await page.locator('[data-repair-confirm]').tap();
 if(await page.evaluate(()=>a.game.progress.mainline.seen.repairChecked))throw Error('下单误算修好');await shot('repair-order');await page.locator('#vehicle-repair-close').tap();
 await page.waitForFunction(()=>a.game.progress.mainline.seen.repairChecked===1,null,{timeout:30000});
 // 弹药教学沿正式门前倒计时进屋，再与售货员交谈购买。
 await page.evaluate(async()=>{await lessonCheckpoint('supply-ammo','ammoEntry');a.game.cottageDoorLatch=null;a.refresh();});
 await page.waitForFunction(()=>a.game.cottage?.kind==='ammo');await page.locator('[data-room-item]').tap();await page.locator('#field-equipment-dialog[open]').waitFor();
 await page.locator('[data-supply-target="hand"]').tap();await page.locator('[data-ammo-buy="light"][data-ammo-target="hand"]').tap();await shot('ammo-purchase');
 if(!await page.evaluate(()=>a.game.progress.mainline.seen.ammoPurchased))throw Error('实际购弹未记账');await page.locator('#field-equipment-close').tap();
 // 昼夜复核每项主线与建筑、角色同屏，采用长短两种手机视口。
 for(const [width,height] of [[320,568],[390,844]])for(const time of ['day','night'])for(const [id,site] of [['supply-ammo','weapons'],['warehouse-lesson','warehouseEntry'],['bag-cleanup','weapons'],['vehicle-weight','garage'],['cargo-cleanup','garage'],['repair-center','repairEntry']]){
  await page.setViewportSize({width,height});await page.evaluate(async({id,site,time})=>{await lessonCheckpoint(id,site);if(id==='cargo-cleanup')a.game.progress.logistics.builds[0].wood=1;if(id==='bag-cleanup')a.game.progress.logistics.bagWood=1;Object.assign(a.environment,{time});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);a.refresh();},{id,site,time});
  await shot(id+'-'+width+'-'+time);
 }
 if(errors.length)throw Error(errors.join('\n'));
 await context.close();return {ok:true,checks:'六项真实交互、取消不计数、健康检查与维修完成、两种手机昼夜截图',errors};
}
