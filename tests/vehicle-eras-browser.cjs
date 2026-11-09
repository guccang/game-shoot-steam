// 手机实际拖动结账、就近上车、骑行、独立射击和挽马连续帧验收。
async original=>{
 const ctx=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await ctx.newPage(),touch=await ctx.newCDPSession(page),errors=[];
 const out='output/playwright/vehicle-eras/';
 page.on('pageerror',e=>errors.push(e.message));
 // 使用连续触点拖至真实结账区，读取订单后再支付。
 async function pay(){
  const button=page.locator('#ws-purchase'),from=await button.boundingBox(),to=await page.locator('#workshop-dialog > .shop-dropzone').boundingBox();
  const x=from.x+from.width/2,y=from.y+from.height/2,tx=to.x+to.width/2,ty=to.y+to.height/2;
  for(const [type,t] of [['touchStart',0],['touchMove',.35],['touchMove',.75],['touchMove',1]])
   await touch.send('Input.dispatchTouchEvent',{type,touchPoints:[{x:x+(tx-x)*t,y:y+(ty-y)*t}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.locator('#workshop-dialog > .shop-dropzone').tap();
  const modal=page.locator('#shop-checkout');
  if((await modal.innerText()).includes('undefined'))throw Error('订单缺少资源名称');
  await modal.locator('[data-pay]').tap();
 }
 // 手指控制摇杆，车轮必须跟随实际位移。
 async function drive(){
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:60,y:470}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:130,y:470}]});
  await page.waitForTimeout(500);
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }
 // 使用项目昼夜历法，让对象和地表经过同一套正式光照。
 async function light(time){
  await page.evaluate(async time=>{
   const a=window.a,phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);
   a.game.progress.living.calendar.elapsed=phase.start+phase.duration/2;
   (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);
   Object.assign(a.environment,{time,autoTime:false,livingPreview:false,weather:'sun',autoWeather:false});
   a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);
   a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);a.refresh();
  },time);
 }
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;
   const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};
   p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
   p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
   p.wood=1000;p.coins=5000;p.weapon=0;p.weapons[0]=1;
   Object.assign(p.materials,{copper:300,iron:300,rareMetal:300,draftHorse:1,core:100,crystal:100,parts:300});
   g.progress=p;g.reset();g.start();g.mainlineSpeech=null;g.mainlineTalkDelay=g.spawnTimer=g.fireClock=999999;g.vehicle.active=false;
   for(const d of document.querySelectorAll('dialog[open]'))d.close();
   const room=(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS.vehicle;
   Object.assign(g.player,room.door);
   if(!(await import('/src/core/home/cottage.js')).enterWorkshop(g,'vehicle'))throw Error('进入载具工坊失败');
   a.workshop.open('vehicle',19);
  });
  await pay();await page.waitForFunction(()=>a.game.progress.vehicleHulls[19]===1);
  await page.evaluate(()=>a.workshop.open('vehicle',20));await page.screenshot({path:out+'recipe-390.png'});
  await pay();await page.waitForFunction(()=>a.game.progress.vehicleHulls[20]===1&&!a.game.progress.vehicleHulls[19]);
  await page.evaluate(async()=>{
   for(const d of document.querySelectorAll('dialog[open]'))d.close();
   const g=a.game;g.cottage=null;g.state='playing';Object.assign(g.player,{x:700,y:2782});
   for(const i of [21,11,12,13,14])if(!g.buyVehicle(i))throw Error('打造失败 '+i);
   window.parkForReview=(hull,x,y)=>Object.assign(g.progress.campParking.owned.find(r=>r.hull===hull),{spot:null,mapId:'forest',x,y});
   parkForReview(21,700,2752);a.renderer.camera.time=null;a.refresh();
  });
  await page.waitForFunction(()=>a.game.vehicle.index===21&&a.game.vehicle.active);
  await light('day');
  const x=await page.evaluate(()=>a.game.player.x);await drive();
  if(await page.evaluate(()=>a.game.player.x)===x)throw Error('铁车无法移动');
  await page.evaluate(()=>{const g=a.game,e=g.spawnEnemy(0,0,{x:g.player.x+90,y:g.player.y-36});Object.assign(e,{speed:0,damage:0,hp:9999,maxHp:9999});g.fireClock=0;g.magazines[0].ammo=g.weapon().magazineSize;g.magazines[0].remaining=0;});
  await page.waitForFunction(()=>a.game.magazines[0].ammo<a.game.weapon().magazineSize);
  await page.screenshot({path:out+'bike-day.png'});
  await page.evaluate(async()=>{const g=a.game;g.dismountVehicle();Object.assign(g.player,{x:704,y:2750});
   parkForReview(21,980,2950);parkForReview(14,718,2740);if(!(await import('/src/core/vehicles/camp-parking.js')).boardParkedVehicle(g,14))throw Error('马车取车失败');});
  await page.evaluate(async()=>{
   const {inspectVehicleEras}=await import('/src/rendering/visual-review.js');
   window.sampleWagon=()=>inspectVehicleEras(a.renderer);
   window.wheelBefore=sampleWagon().wheel||0;
  });
  await drive();
  const riding=await page.evaluate(()=>({...sampleWagon(),before:wheelBefore}));
  if(riding.model!=='copper-wagon'||riding.capacity!==300||riding.wheel===riding.before)throw Error('马车驾驶采样异常');
  await page.screenshot({path:out+'wagon-day.png'});
  await page.evaluate(async()=>{const g=a.game;g.dismountVehicle();
   for(const i of [15,16,17,18])if(!g.buyVehicle(i))throw Error('改造失败 '+i);
   Object.assign(g.player,{x:704,y:2750});parkForReview(18,718,2740);
   if(!(await import('/src/core/vehicles/camp-parking.js')).boardParkedVehicle(g,18))throw Error('运输平台取车失败');});
  await page.setViewportSize({width:320,height:568});await light('night');await page.waitForTimeout(220);
  await page.screenshot({path:out+'hover-night.png'});
  await page.setViewportSize({width:950,height:760});await page.waitForTimeout(120);await page.screenshot({path:out+'hover-wide.png'});
  await light('day');await page.waitForTimeout(120);await page.screenshot({path:out+'hover-wide-day.png'});
  // 固定场景和相机，逐款通过正式战场绘制器取样，便于比较尺寸、骑姿和昼夜遮挡。
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{a.game.spawnTimer=999999;});
  for(const phase of ['day','night']){
   await light(phase);
   for(let index=11;index<=22;index++){
    await page.evaluate(index=>{
     const g=a.game;g.vehicle.active=false;g.vehicle=g.vehicles[index];g.vehicle.active=true;
     g.progress.vehicleIndex=index;a.renderer.draw();
    },index);
    await page.screenshot({path:out+'scene-'+phase+'-'+index+'.png',clip:{x:110,y:265,width:170,height:185}});
   }
  }
  if(errors.length)throw Error(errors.join('\n'));
 }finally{await ctx.close();}
}