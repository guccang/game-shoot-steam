// 实机换乘验收：隔离存档，真实购买按钮、场景上车、HUD和手机昼夜同屏。
async page=>{
 if(new URL(page.url()).port!=='4273')throw Error('仅限隔离端口4273');
 const errors=[],views=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress();
  p.arrival={version:2,phase:'complete',keys:true,parked:false};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
  p.coins=p.wood=100000;p.bosses=50;p.materials={parts:10000,crystal:10000,core:10000};
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;g.spawnTimer=g.fireClock=999;Object.assign(g.player,{x:1050,y:800});a.workshop.open('vehicle',0);});
 await page.locator('#ws-purchase').click();
 if(!(await page.locator('#ws-feedback').innerText()).includes('北停车场'))throw Error('购买去向不清楚');
 if(await page.evaluate(()=>a.game.vehicle.index)!==5)throw Error('购买直接换了随行车');
 await page.locator('#ws-equip').click();
 const nav=await page.evaluate(async()=>(await import('/src/core/world-navigation.js')).worldNavigationObjective(a.game));
 if(!nav?.site.id.startsWith('north-'))throw Error('未导航到实际车位');
 await page.evaluate(async()=>{const g=a.game,s=(await import('/src/core/camp-parking.js')).parkedOwned(g).find(s=>s.record.hull===0);Object.assign(g.player,{x:s.x+64,y:s.y+18,vx:0,vy:0});a.renderer.camera.time=null;});
 await page.locator('[data-parked-hull="0"]').click();
 if(!await page.evaluate(()=>a.game.vehicle.active&&a.game.vehicle.index===0&&a.game.progress.campParking.owned.some(r=>r.hull===5)))throw Error('现场换乘未留下电动车');
 await page.locator('#vehicle-button').click();
 await page.evaluate(async()=>{const g=a.game,s=(await import('/src/core/camp-parking.js')).parkedOwned(g).find(s=>s.record.hull===5);Object.assign(g.player,{x:s.x+64,y:s.y+18,vx:0,vy:0});a.renderer.camera.time=null;window.baseCapacity=g.weapon().magazineSize;});
 await page.locator('[data-parked-hull="5"]').click();
 const boosted=await page.evaluate(()=>a.game.weapon().magazineSize);
 if(boosted!==await page.evaluate(()=>Math.floor(baseCapacity*1.3)))throw Error('电动车倍率错误');
 await page.waitForFunction(()=>Number(document.querySelector('#magazine-hud').getAttribute('aria-valuemax'))===a.game.weapon().magazineSize);
 await page.screenshot({path:'output/playwright/parking-vehicle-transfer/scooter-hud.png'});
 await page.locator('#vehicle-button').click();
 if(await page.evaluate(()=>a.game.weapon().magazineSize)!==await page.evaluate(()=>baseCapacity))throw Error('下车未恢复容量');
 // 正式购买其他车体，保留停驻实体和地形碰撞；展示时冻结时间方便昼夜比较。
 await page.evaluate(async()=>{
  const g=a.game;for(const hull of [1,2,3])if(!g.buyVehicle(hull))throw Error('购车失败'+hull);
  Object.assign(g.player,{x:390,y:430,vx:0,vy:0});g.update(.05);g.enemies=[];g.spawnEnemy(0,900);Object.assign(g.enemies[0],{x:570,y:475,speed:0});
  window.savedTick=g.update.bind(g);g.update=()=>{};
 });
 for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async phase=>{
   const g=a.game;g.progress.living.calendar.elapsed=phase==='night'?220000:1000;
   (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);
   Object.assign(a.environment,{weather:'sun',autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
   a.renderer.camera.time=null;a.renderer.draw();a.refresh();
  },phase);
  await page.screenshot({path:`output/playwright/parking-vehicle-transfer/lot-${width}-${phase}.png`});
  await page.evaluate(()=>a.workshop.open('vehicle',5));
  await page.locator('#ws-vehicle-parking').scrollIntoViewIfNeeded();
  const hint=await page.locator('#ws-vehicle-parking').innerText();if(!hint.includes('30%')||!hint.includes('北停车场'))throw Error('换乘地点或骑乘特性缺失');
  const fit=await page.locator('#ws-vehicle-parking').evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&n.scrollWidth<=n.clientWidth;});if(!fit)throw Error('地点说明溢出');
  await page.screenshot({path:`output/playwright/parking-vehicle-transfer/panel-${width}-${phase}.png`});
  views.push({width,phase,...await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectVehicleTransfer(a.game,document))});
  await page.locator('#ws-close').click();
  await page.waitForFunction(()=>a.game.state==='playing'&&!document.querySelector('dialog[open]'));
 }
 // 六位公共停车场入口和两条倒车过道仍可通过正式物理移动。
 const passage=await page.evaluate(async()=>{
  const g=a.game;g.update=window.savedTick;g.enemies=[];g.spawnTimer=g.fireClock=999;
  Object.assign(g.player,{x:650,y:425,vx:0,vy:0});for(let i=0;i<90;i++)g.update(.05,{x:0,y:-1});
  const entry=g.player.y<220,rows=[];
  for(const y of [265,425]){
   Object.assign(g.player,{x:530,y,vx:0,vy:0});for(let i=0;i<44;i++)g.update(.05,{x:-1,y:0});
   rows.push({x:g.player.x,y:g.player.y});
  }
  return {entry,rows};
 });
 if(!passage.entry||passage.rows.some(p=>p.x>250))throw Error('停车场通道受阻：'+JSON.stringify(passage));
 // 主线买车后在实际车位打开车辆页，按钮直接换乘，驾驶后不再指回停车场。
 await page.evaluate(async()=>{
  const g=a.game,{MAINLINE_IDS}=await import('/src/config/mainline.js');
  g.progress.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('first-vehicle'));g.progress.mainline.phase='doing';g.progress.mainline.seen.drive=0;g.mainlineSpeech=null;
  const spot=(await import('/src/core/camp-parking.js')).parkedOwned(g).find(s=>s.record.hull===0);
  Object.assign(g.player,{x:spot.x+64,y:spot.y+18,vx:0,vy:0});a.renderer.camera.time=null;
  (await import('/src/core/world-navigation.js')).requestMainlineNavigation(g);a.refresh();
 });
 await page.locator('#mainline-hud').click();await page.locator('#ws-equip').click();
 if(!await page.evaluate(()=>a.game.vehicle.active&&a.game.vehicle.index===0))throw Error('主线换乘操作未生效');
 await page.screenshot({path:'output/playwright/parking-vehicle-transfer/mainline-boarded.png'});
 if(errors.length||views.some(v=>v.overflow))throw Error(JSON.stringify({errors,views}));
 return {designCriterion:'parking-vehicle-transfer',purchase:'通过',swap:'通过',boosted,passage,views,errors};
}
