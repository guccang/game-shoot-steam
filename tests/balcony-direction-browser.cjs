// 真实手机阳台四向昼夜验收：复用实际存档夹具，走门进出并检查正式世界投影。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/balcony-direction/video/'}});
 const page=await context.newPage(),errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.homeDecor.floors=63;p.homeDecor.balconies[1]=['north','east','south','west'];
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.enemies=[];g.spawnTimer=999999;
   Object.assign(g.player,(await import('/src/config/cottage.js')).COTTAGE.door);g.cottageDoorLatch=false;Object.assign(a.environment,{forestSeason:'spring',autoWeather:false,autoTime:false});a.renderer.camera.time=null;a.refresh();
  });
  await page.waitForFunction(()=>a.game.cottage?.kind==='cottage');await page.evaluate(()=>a.game.cottage.floor=1);
  for(const side of ['north','east','south','west']){
   await page.evaluate(async side=>{Object.assign(a.game.player,(await import('/src/config/home-construction.js')).HOME_DIRECTIONS[side].door);a.game.cottage.balconyLatch=false;},side);
   await page.waitForFunction(side=>a.game.cottage.balcony===side,side);
   for(const time of ['day','night']){
    await page.evaluate(async time=>{
     const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);a.game.progress.living.calendar.elapsed=phase.start+phase.duration*.5;
     (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false,livingPreview:false});
     a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);
    },time);
    await page.waitForTimeout(400);await page.screenshot({path:`output/playwright/balcony-direction/${side}-${time}-390.png`});
    const state=await page.evaluate(async()=>{
     const {balconyObjectVisible,balconyProject}=await import('/src/rendering/home-balcony.js'),v=a.renderer.balconyView,items=a.renderer.balconyRenderer.balconyObjects;
     return {side:v.side,anchor:v.anchor,center:v.center,zoom:v.zoom,objects:items.length,hidden:items.every(i=>balconyObjectVisible(v,i)),forward:balconyProject(v,{x:v.anchor.x+v.forward.x*200,y:v.anchor.y+v.forward.y*200}),overflow:document.documentElement.scrollWidth>innerWidth};
    });
    if(!state.hidden||state.overflow||state.objects===0)throw Error('视野或手机布局错误：'+JSON.stringify(state));results.push(state);
   }
   const before=await page.evaluate(()=>({x:a.game.player.x,clock:[...a.game.campActors.values()][0].clock}));
   await page.keyboard.down('ArrowRight');await page.waitForTimeout(300);await page.keyboard.up('ArrowRight');
   if(await page.evaluate(before=>a.game.player.x<=before.x||[...a.game.campActors.values()][0].clock<=before.clock,before))throw Error('角色或居民未继续真实移动');
   // 沿平台移动到门槛，一秒候停后回到原楼层。
   await page.keyboard.down('ArrowLeft');await page.waitForFunction(()=>a.game.player.x<=244);await page.keyboard.up('ArrowLeft');await page.keyboard.down('ArrowDown');await page.waitForFunction(()=>a.game.player.y>=195);await page.keyboard.up('ArrowDown');
   await page.waitForFunction(()=>!a.game.cottage.balcony);if(await page.evaluate(()=>a.game.cottage.floor!==1))throw Error('返回楼层变化');
  }
  // 窄屏、短横屏及既有桌面竖版容器，逐项检查四向高层视域与实际平台边界。
  for(const size of [{width:320,height:568},{width:844,height:390},{width:1280,height:900}]){
   await page.setViewportSize(size);
   for(const side of ['north','east','south','west']){
    await page.evaluate(async side=>{Object.assign(a.game.player,(await import('/src/config/home-construction.js')).HOME_DIRECTIONS[side].door);a.game.cottage.balconyLatch=false;},side);
    await page.waitForFunction(side=>a.game.cottage.balcony===side,side);
    for(const time of ['day','night']){
     await page.evaluate(async time=>{const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);a.game.progress.living.calendar.elapsed=phase.start+phase.duration*.5;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment);},time);
     await page.waitForTimeout(150);await page.screenshot({path:`output/playwright/balcony-direction/${side}-${time}-${size.width}.png`});
    }
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||a.renderer.cottageView.zoom<=0||a.renderer.balconyRenderer.balconyObjects.some(i=>i.kind==='cottage'&&!i.workshop)))throw Error('短屏溢出或小屋进入视野');
    await page.evaluate(async()=>Object.assign(a.game.player,(await import('/src/config/home-construction.js')).HOME_BALCONY.exit));await page.waitForFunction(()=>!a.game.cottage.balcony);
   }
  }
  await page.setViewportSize({width:390,height:844});
  for(const floor of [62,1000000]){
   await page.evaluate(async floor=>{const g=a.game;g.progress.homeDecor.floors=floor+1;g.progress.homeDecor.balconies[floor]=['east'];g.cottage.floor=floor;Object.assign(g.player,(await import('/src/config/home-construction.js')).HOME_DIRECTIONS.east.door);g.cottage.balconyLatch=false;},floor);
   await page.waitForFunction(()=>a.game.cottage.balcony==='east');await page.waitForTimeout(300);
   await page.screenshot({path:`output/playwright/balcony-direction/east-floor-${floor+1}.png`});
   const high=await page.evaluate(()=>({view:a.renderer.balconyView,items:a.renderer.balconyRenderer.balconyObjects.length,cache:a.renderer.ground.current.tiles.size,limit:a.renderer.ground.current.cacheLimit}));results.push(high);
   if(high.view.zoom>=results[0].zoom)throw Error('高层没有拉远');
   await page.evaluate(async()=>Object.assign(a.game.player,(await import('/src/config/home-construction.js')).HOME_BALCONY.exit));await page.waitForFunction(()=>!a.game.cottage.balcony);
  }
  await page.evaluate(async()=>{a.game.cottage.floor=1;Object.assign(a.game.player,(await import('/src/config/home-construction.js')).HOME_DIRECTIONS.east.door);a.game.cottage.balconyLatch=false;});await page.waitForFunction(()=>a.game.cottage.balcony==='east');
  for(const weather of ['rain','snow','thunder']){
   await page.evaluate(async weather=>{Object.assign(a.environment,{weather,autoWeather:false});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment);},weather);
   await page.waitForTimeout(700);await page.screenshot({path:`output/playwright/balcony-direction/east-${weather}.png`});
  }
  const review=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectHomeConstruction(a.game,a.renderer,document));if(review.designCriterion!=='cottage-construction'||!review.balconyObjects.length)throw Error('正式验收入口缺少朝向场景');
  if(errors.length)throw Error(errors.join('\n'));return {results,errors};
 }finally{await context.close();}
}
