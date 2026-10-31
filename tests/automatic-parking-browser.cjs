// 隔离存档实机验收：真实按键停稳、连续倒车、正式工坊弹窗，以及手机桌面昼夜同屏。
async page=>{
 if(new URL(page.url()).port!=='4267')throw Error('仅限隔离验收端口');
 const errors=[],results=[],views=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress();
  p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];
  for(const i of [0,1,3,5])p.vehicleHulls[i]=1;
  p.vehicleIndex=0;
  p.arrival={version:2,phase:'complete',elapsed:0,wood:0,keys:true,parked:false,x:265,y:780};
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;
  window.parkingSamples=[];window.parkingFreeze=false;window.parkingTick=a.game.update.bind(a.game);
  // 仅记录正式更新中的位移及轮相，不代替停车更新器。
  a.game.update=(dt,input)=>{if(window.parkingFreeze)return;const g=a.game,previous={x:g.player.x,y:g.player.y},phase=g.parking?.phase;window.parkingTick(dt,input);
   if(['align','reverse'].includes(phase)&&g.parking?.phase!=='parked')window.parkingSamples.push({dt,phase,x:g.player.x,y:g.player.y,distance:Math.hypot(g.player.x-previous.x,g.player.y-previous.y),wheel:g.vehicle.wheelPhase,track:g.player.walkPhase});};
 });
 // 夹具只负责在各建筑附近准备已拥有车辆，停车时间及运动完全由浏览器帧推进。
 async function prepare(id,hull=0){
  await page.evaluate(async({id,hull})=>{
   const g=a.game,s=(await import('/src/config/parking.js')).PARKING_SPOTS.find(s=>s.id===id);
   window.parkingFreeze=false;g.progress.campParking.owned=[];g.parkingVisitors=[];g.parkingVisitTimer=999;g.vehicle.active=false;g.progress.vehicleIndex=hull;g.vehicle=g.vehicles[hull];g.summonVehicle();
   g.state='playing';g.parking=null;g.mainlineSpeech=null;g.enemies=[];g.boss=null;g.spawnTimer=999;
   Object.assign(g.player,{x:s.x+24,y:s.approachY+30,vx:0,vy:0,pushX:0,pushY:0});
   a.renderer.camera.time=null;a.renderer.draw();a.refresh();
  },{id,hull});
 }
 await page.setViewportSize({width:390,height:844});
 await prepare('garage');await page.keyboard.down('ArrowUp');await page.waitForTimeout(250);await page.keyboard.up('ArrowUp');
 await page.waitForFunction(()=>a.game.parking?.elapsed>.6);
 await page.screenshot({path:'output/playwright/automatic-parking/countdown.png'});
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(100);
 if(!await page.evaluate(()=>a.game.parking?.elapsed===0))throw Error('主动移动没有清空计时');
 await page.keyboard.up('ArrowRight');
 await page.waitForFunction(()=>a.game.parking?.phase==='reverse',null,{timeout:15000});
 await page.screenshot({path:'output/playwright/automatic-parking/reversing.png'});
 await page.locator('#workshop-dialog').waitFor({state:'visible',timeout:15000});
 if(await page.locator('#workshop-dialog').getAttribute('data-workshop-kind')!=='vehicle')throw Error('未打开载具工坊');
 await page.screenshot({path:'output/playwright/automatic-parking/vehicle-workshop.png'});
 await page.locator('#ws-close').click();await page.waitForTimeout(3500);
 if(await page.locator('#workshop-dialog').isVisible())throw Error('关闭后重复打开');
 await page.screenshot({path:'output/playwright/automatic-parking/garage-parked.png'});
 results.push(await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectAutomaticParking(a.game,document)));
 await page.locator('[data-parked-hull="0"]').focus();await page.keyboard.press('Enter');
 const parked=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));
 await page.keyboard.down('ArrowDown');await page.waitForTimeout(600);await page.keyboard.up('ArrowDown');
 if(!await page.evaluate(p=>a.game.player.y>p.y+20,parked))throw Error('入库后无法正常驶出');
 for(const [id,hull,kind] of [['weapons-west',1,'weapons'],['weapons-east',3,'weapons'],['cottage',5,null],['north-0-0',0,null],['north-0-2',0,null],['north-1-0',0,null],['north-1-2',0,null]]){
  await prepare(id,hull);
  await page.waitForFunction(()=>a.game.progress.campParking.owned.length===1,null,{timeout:15000});
  const state=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectAutomaticParking(a.game,document));
  if(state.workshop!==kind)throw Error(JSON.stringify(state));results.push(state);
  await page.screenshot({path:`output/playwright/automatic-parking/${id}-parked.png`});
  if(kind)await page.locator('#ws-close').click();
 }
 // 全营地总览仍使用正式地面、建筑和载具绘制器，仅固定验收镜头。
 await page.setViewportSize({width:1280,height:900});
 await page.evaluate(()=>{window.parkingFreeze=true;window.savedCameraUpdate=a.renderer.camera.update;a.renderer.camera.update=(_p,w,h)=>{const zoom=w/1060;return {x:100,y:65,w:w/zoom,h:h/zoom,width:w,height:h,zoom};};a.renderer.draw();a.refresh();});
 await page.screenshot({path:'output/playwright/automatic-parking/layout-overview.png'});
 await page.evaluate(()=>{a.renderer.camera.update=window.savedCameraUpdate;a.renderer.camera.time=null;});
 const motion=await page.evaluate(()=>({count:parkingSamples.length,maxDistance:Math.max(...parkingSamples.map(s=>s.distance)),invalid:parkingSamples.filter(s=>s.distance>55*Math.min(.05,s.dt)+.001),wheelPositions:new Set(parkingSamples.map(s=>s.wheel.toFixed(3))).size,trackPositions:new Set(parkingSamples.map(s=>s.track.toFixed(3))).size}));
 if(motion.invalid.length||motion.wheelPositions<10||motion.trackPositions<10)throw Error('动作不连续：'+JSON.stringify(motion));
 // 同屏样本使用正式候停状态和绘制器，冻结的只是截图期间的时钟。
 for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});await prepare('weapons-west');
  await page.waitForFunction(()=>a.game.parking?.elapsed>.4);
  await page.evaluate(async time=>{
   window.parkingFreeze=true;const g=a.game;
   g.progress.living.calendar={day:0,elapsed:time==='night'?220000:1000};
   (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);
   Object.assign(a.environment,{weather:'sun',autoWeather:false});
   a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
   a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
   g.spawnEnemy(0,900);if(!g.enemies.length)throw Error('同屏检查缺少怪物');Object.assign(g.enemies[0],{x:g.player.x+60,y:g.player.y+55,speed:0,hp:1e6});
   a.renderer.camera.time=null;a.renderer.draw();a.refresh();
  },time);
  await page.waitForFunction(()=>!document.querySelector('#toast').classList.contains('visible'));
  const state=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectAutomaticParking(a.game,document));
  if(state.overflow)throw Error('窄屏溢出');views.push({width,time,...state});
  await page.screenshot({path:`output/playwright/automatic-parking/world-${width}-${time}.png`});
 }
 if(errors.length)throw Error(errors.join('\n'));
 return {designCriterion:'automatic-parking',results,motion,views,errors};
}
