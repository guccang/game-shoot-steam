// 驾驶种田入口回归：真实手机触控、键盘激活、拖收、失败反馈及昼夜同屏。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/farm-dismount/video',size:{width:390,height:844}}});
 const page=await context.newPage(),errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').click();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress(),g=a.game;p.arrival=null;p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';p.farm.lessonRewarded=true;p.farm.seeds[0]=20;p.vehicleHulls[0]=1;p.vehicleIndex=0;(await import('/src/config/vehicle-armaments.js')).grantVehicleArmament(p,0);
   g.progress=p;g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.fireClock=999999;g.enemies=[];g.boss=null;g.vehicle.active=false;
   const {farmLandReason,snapFarmPoint,farmApproach}=await import('/src/world/farm-land.js');
   for(let y=400;y<1200&&!window.farmSites;y+=52)for(let x=1500;x<2600&&!window.farmSites;x+=56){const first=snapFarmPoint({x,y},'forest'),sites=Array.from({length:6},(_,id)=>({id,x:first.x+(id%3)*56,y:first.y+Math.floor(id/3)*52,mapId:'forest'}));if(sites.every(s=>!farmLandReason(g,s)&&farmApproach(g,s)))window.farmSites=sites;}
   if(!farmSites)throw Error('未找到合法测试田');
   window.basePlayer={x:farmSites[4].x,y:farmSites[4].y+72};window.originalUpdate=g.update.bind(g);g.update=()=>{};
   // 每例从驾驶态进入，固定弹药和耐久以核对下车没有免费补充。
   window.resetMounted=()=>{
    const now=Date.now();g.progress.farm.plots=farmSites.map((s,id)=>({...s,crop:id===0?null:id===1?0:1,plantedAt:id===1?now:now-200000,readyAt:id===1?now+60000:now-1000,watered:false}));g.progress.farm.nextId=6;
    g.farmWork=null;g.farmCursor=null;g.vehicle.active=true;g.vehicle.hp=73;g.vehicle.module.magazine.ammo=2;Object.assign(g.player,basePlayer,{vx:0,vy:0,flying:false,amphibious:false});a.renderer.camera.time=null;a.refresh();
   };
   resetMounted();for(const d of document.querySelectorAll('dialog[open]'))d.close();
  });
  await page.waitForFunction(()=>!document.querySelector('#farm-sickle').disabled);
  await page.locator('#field-menu-toggle').tap();await page.locator('#farm-menu').tap();
  const menu=await page.evaluate(()=>({active:a.game.vehicle.active,tool:a.game.farmWork?.tool,hp:a.game.vehicle.hp,ammo:a.game.vehicle.module.magazine.ammo,notice:document.querySelector('#farm-notice').textContent}));
  if(menu.active||menu.tool!=='hoe'||menu.hp!==73||menu.ammo!==2||!menu.notice.includes('已下车'))throw Error('菜单下车错误 '+JSON.stringify(menu));
  // 空田、幼苗、成熟田都从真实触摸入口直接下车，并继续同一次农活。
  for(const id of [0,1,2]){
   await page.evaluate(()=>resetMounted());await page.waitForTimeout(120);await page.locator('[data-farm-cell="'+id+'"]').tap();
   const state=await page.evaluate(()=>({active:a.game.vehicle.active,tool:a.game.farmWork?.tool,queue:a.game.farmWork?.queue.map(j=>j.action),picker:!document.querySelector('#farm-picker').hidden,hp:a.game.vehicle.hp,ammo:a.game.vehicle.module.magazine.ammo}));
   if(state.active||state.hp!==73||state.ammo!==2||id===0&&!state.picker||id===1&&state.queue.join()!=='water'||id===2&&state.queue.join()!=='harvest')throw Error('田块下车错误 '+JSON.stringify({id,state}));samples.push({id,state});
  }
  // 键盘无指针激活也走同一路径。
  await page.evaluate(()=>resetMounted());await page.locator('[data-farm-cell="0"]').focus();await page.keyboard.press('Enter');
  if(await page.evaluate(()=>a.game.vehicle.active||document.querySelector('#farm-picker').hidden))throw Error('键盘激活未下车选种');
  // 模拟安全落地拒绝，确认反馈可见且没有提前排队或改耐久。
  await page.evaluate(()=>{resetMounted();window.originalDismount=a.game.dismountVehicle;a.game.dismountVehicle=()=>false;});
  await page.locator('[data-farm-cell="2"]').tap();
  const failed=await page.evaluate(()=>({active:a.game.vehicle.active,work:a.game.farmWork,notice:document.querySelector('#farm-notice').textContent}));
  if(!failed.active||failed.work||!failed.notice.includes('无法安全下车'))throw Error('失败反馈错误');
  await page.evaluate(()=>{a.game.dismountVehicle=originalDismount;resetMounted();a.game.mainlineSpeech={};a.refresh();});
  if(await page.locator('[data-farm-cell="0"]').isVisible())throw Error('对话期间田地仍接管输入');
  if(!await page.locator('#farm-menu').isVisible())await page.locator('#field-menu-toggle').tap();await page.locator('#farm-menu').tap();if(!await page.evaluate(()=>a.game.vehicle.active))throw Error('活动期间误下车');
  await page.evaluate(()=>{a.game.mainlineSpeech=null;resetMounted();});
  // 下车后真实触摸拖过两个成熟田，保留两格排队而不提前结算。
  const cdp=await context.newCDPSession(page),from=await page.locator('[data-farm-cell="2"]').boundingBox(),to=await page.locator('[data-farm-cell="5"]').boundingBox();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from.x+from.width/2,y:from.y+from.height/2,id:1}]});
  for(let i=1;i<=10;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+from.width/2+(to.x-from.x)*i/10,y:from.y+from.height/2+(to.y-from.y)*i/10,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const drag=await page.evaluate(()=>a.game.farmWork.queue.map(j=>j.id));if(drag.join()!=='2,5')throw Error('驾驶起手拖收丢失 '+drag);
  // 恢复正式更新，确认下车、走近、挥镰、金币到账完成完整闭环。
  await page.evaluate(()=>{resetMounted();window.beforeCoins=a.game.progress.coins;a.game.update=originalUpdate;});await page.locator('[data-farm-cell="5"]').tap();
  await page.waitForFunction(()=>a.game.progress.farm.plots[5].crop===null,null,{timeout:15000});
  const harvest=await page.evaluate(()=>({gain:a.game.progress.coins-beforeCoins,active:a.game.vehicle.active}));if(harvest.gain!==220||harvest.active)throw Error('真实收割结算异常 '+JSON.stringify(harvest));
  await page.evaluate(()=>{a.game.update=()=>{};resetMounted();a.game.dismountVehicle();a.game.farmWork=null;});
  // 图集与正式场景共用，保留成熟胡萝卜、小猫和环境的原比例。
  for(const [width,height] of [[320,568],[390,844],[1280,900]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{
    Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();
   },time);await page.waitForTimeout(350);await page.screenshot({path:'output/playwright/farm-dismount/'+width+'-'+time+'.png'});
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('横向溢出');
  }
  const art=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectFarm(a.game,document).art);
  if(art.sheets!==3||errors.length)throw Error(JSON.stringify({art,errors}));
  return {designCriterion:'world-farm-delivery',menu,samples,failed,drag,harvest,art,video:await page.video().path(),errors};
 }finally{await context.close();}
}
