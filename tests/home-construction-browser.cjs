// 隔离浏览器存档，实际点击施工和乘梯，验证四向阳台昼夜与短屏触控。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[],views=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.coins=100000;p.wood=10000;
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.enemies=[];g.spawnTimer=999999;
   const room=(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS.construction;Object.assign(g.player,room.door);a.renderer.camera.time=null;a.refresh();
  });
  await page.waitForFunction(()=>a.game.cottage?.kind==='construction');
  await page.locator('[data-room-item="shopkeeper"]').tap();
  await page.locator('[data-npc-service]').tap();
  await page.waitForFunction(()=>document.getElementById('home-construction-dialog').open);
  await page.locator('[data-build="floor"]').tap();await page.locator('[data-build="elevator"]').tap();await page.locator('#home-build-elevator-floor').fill('2');await page.locator('[data-build="elevator"]').tap();
  for(const side of ['north','east','south','west']){await page.locator('#home-build-floor').fill('2');await page.locator('#home-build-side').selectOption(side);await page.locator('[data-build="balcony"]').tap();}
  const built=await page.evaluate(()=>({home:a.game.progress.homeDecor,coins:a.game.progress.coins,wood:a.game.progress.wood}));
  if(built.home.floors!==3||JSON.stringify(built.home.elevators)!=='[0,1]'||built.home.balconies[1].length!==4||built.coins!==79000||built.wood!==7200)throw Error('施工扣款或设施不正确：'+JSON.stringify(built));
  for(const width of [320,390]){
   await page.setViewportSize({width,height:width===320?568:844});await page.locator('#home-build-floor').scrollIntoViewIfNeeded();
   const fields=await page.locator('#home-construction-dialog input,#home-construction-dialog select').evaluateAll(nodes=>nodes.map(n=>({height:n.getBoundingClientRect().height,width:n.getBoundingClientRect().width})));if(fields.some(f=>f.height<44||f.width<44))throw Error('建筑输入触控区不足44像素');
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('施工页面溢出');await page.screenshot({path:`output/playwright/cottage-construction/company-service-${width}.png`});
  }
  await page.locator('[data-build-close]').tap();
  await page.evaluate(async()=>{const g=a.game;Object.assign(g.player,(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS.construction.exit);});
  await page.waitForFunction(()=>!a.game.cottage);
  // 外观与真实角色、载具、怪物一同验收，冻结测试镜头期间不推进战斗。
  await page.evaluate(async()=>{const g=a.game,{COTTAGE}=await import('/src/config/cottage.js');window.homeUpdate=g.update;g.update=()=>{};Object.assign(g.player,{x:COTTAGE.door.x+50,y:COTTAGE.door.y+238});g.vehicle.active=true;g.vehicle.index=0;g.spawnEnemy(0,0,{x:g.player.x+120,y:g.player.y+40},{ambient:true});a.renderer.camera.time=null;a.refresh();});
  for(const time of ['day','night']){
   await page.evaluate(async time=>{const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);a.game.progress.living.calendar.elapsed=phase.start+phase.duration*.5;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);},time);
   await page.waitForTimeout(350);await page.screenshot({path:`output/playwright/cottage-construction/company-exterior-${time}.png`});
  }
  await page.evaluate(async()=>{const g=a.game;g.update=homeUpdate;g.vehicle.active=false;g.enemies=[];const {COTTAGE}=await import('/src/config/cottage.js');Object.assign(g.player,COTTAGE.door);g.cottageDoorLatch=false;});
  await page.waitForFunction(()=>a.game.cottage?.kind==='cottage');
  await page.evaluate(async()=>Object.assign(a.game.player,(await import('/src/config/home-construction.js')).HOME_ELEVATOR.landing));
  await page.locator('#home-travel-open').tap();await page.locator('#home-lift-floor').fill('2');await page.locator('[data-lift]').tap();
  await page.waitForFunction(()=>a.game.cottage.floor===1);
  await page.screenshot({path:'output/playwright/cottage-construction/second-floor.png'});
  for(const side of ['north','east','south','west']){
   await page.evaluate(async side=>{Object.assign(a.game.player,(await import('/src/config/home-construction.js')).HOME_DIRECTIONS[side].door);a.game.cottage.balconyLatch=false;},side);
   await page.waitForFunction(side=>a.game.cottage.balcony===side,side);
   for(const time of ['day','night']){
    await page.evaluate(async time=>{
     const {LIVING_PHASES}=await import('/src/config/living-world.js');a.game.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id===time).start+LIVING_PHASES.find(p=>p.id===time).duration*.5;
     (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);
     Object.assign(a.environment,{weather:'sun',autoWeather:false,livingPreview:false});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);
    },time);
    await page.waitForTimeout(350);
    await page.screenshot({path:`output/playwright/cottage-construction/balcony-${side}-${time}.png`});
   }
   const actorBefore=await page.evaluate(()=>[...a.game.campActors.values()][0].clock);
   const before=await page.evaluate(()=>a.game.player.x);await page.keyboard.down('ArrowRight');await page.waitForTimeout(300);await page.keyboard.up('ArrowRight');
   const after=await page.evaluate(()=>a.game.player.x);if(after<=before)throw Error('阳台无法自由走动');if(await page.evaluate(()=>[...a.game.campActors.values()][0].clock)<=actorBefore)throw Error('阳台居民未继续日常');
   views.push(await page.evaluate(()=>({view:a.renderer.balconyView,player:{x:a.game.player.x,y:a.game.player.y},outside:a.game.cottage.outside})));
   await page.evaluate(async()=>Object.assign(a.game.player,(await import('/src/config/home-construction.js')).HOME_BALCONY.exit));
   await page.waitForFunction(()=>!a.game.cottage.balcony);
   if(await page.evaluate(()=>a.game.cottage.floor!==1))throw Error('阳台返回楼层错误');
  }
  // 高层夹具只改变已建层数量，仍通过真实电梯输入和正式阳台门进入。
  await page.evaluate(async()=>{a.game.progress.homeDecor.floors=1000001;a.game.progress.homeDecor.balconies[1000000]=['south'];Object.assign(a.game.player,(await import('/src/config/home-construction.js')).HOME_ELEVATOR.landing);});
  await page.locator('#home-travel-open').tap();await page.locator('#home-lift-floor').fill('1000001');await page.locator('[data-lift]').tap();await page.waitForFunction(()=>a.game.cottage.floor===1000000);
  await page.evaluate(async()=>{Object.assign(a.game.player,(await import('/src/config/home-construction.js')).HOME_DIRECTIONS.south.door);a.game.cottage.balconyLatch=false;});
  await page.waitForFunction(()=>a.game.cottage.balcony==='south');await page.waitForTimeout(400);
  const high=await page.evaluate(()=>a.renderer.balconyView);if(high.zoom>=views[2].view.zoom)throw Error('高度未改变世界比例');
  await page.screenshot({path:'output/playwright/cottage-construction/high-floor.png'});
  for(const size of [{width:320,height:568},{width:1280,height:900}]){await page.setViewportSize(size);await page.waitForTimeout(300);if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('页面横向溢出');await page.screenshot({path:`output/playwright/cottage-construction/balcony-${size.width}.png`});}
  const review=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectHomeConstruction(a.game,a.renderer,document));if(review.designCriterion!=='cottage-construction'||review.overflow)throw Error('正式验收入口失败');
  if(errors.length)throw Error(errors.join('\n'));return {built,views,high,errors};
 }finally{await context.close();}
}
