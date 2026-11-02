// 手机清缴导航边界：进入 HUD 与战斗范围后仍指向场内站牌，抵达才收起。
async original=>{
 const results=[],errors=[];
 for(const [width,height,time] of [[320,568,'night'],[390,844,'day']]){
  const context=await original.context().browser().newContext({viewport:{width,height},isMobile:true,hasTouch:true}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://localhost:4175');await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;a.menu.enter();await a.ready;});await page.waitForFunction(()=>a.menu.page==='game');
   await page.evaluate(async time=>{
    const p=(await import('/src/progression/progress.js')).freshProgress();p.bosses=6;p.living.patrolActive=true;p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';p.vehicleHulls[0]=1;p.vehicleIndex=0;
    const g=a.game;g.progress=p;g.reset();g.start();g.vehicle.active=true;g.mainlineSpeech=null;g.update=()=>{};g.enemies=[];
    window.site=(await import('/src/progression/clearing-site.js')).clearingSite(p);window.target=(await import('/src/progression/clearing-site.js')).clearingNavigationSite(p);
    g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time).start+1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
   },time);
   for(const distance of [451,450,375,300,150,80]){
    await page.evaluate(distance=>{const g=a.game;Object.assign(g.player,{x:site.x+distance,y:site.y});g.time+=1;a.renderer.camera.time=null;a.refresh();},distance);await page.waitForTimeout(180);
    const state=await page.evaluate(async()=>{const g=a.game,o=(await import('/src/core/world-navigation.js')).worldNavigationObjective(g),route=(await import('/src/core/story-route.js')).storyRouteState(g,a.renderer.view);return {quest:!document.getElementById('quest').hidden,objective:o?.site,route:!!route,near:route?.near,target:!!(await import('/src/rendering/story-guidance.js')).storyGuidanceState(g).target,waves:(await import('/src/core/living-safety.js')).livingWaveAllowed(g)};});
    if(!state.objective||!state.route||state.near||!state.target||state.quest!==(distance<=450)||state.waves!==(distance<=300))throw Error(JSON.stringify({width,distance,state}));results.push({width,time,distance,...state});
    if(distance===300||distance===80)await page.screenshot({path:`output/playwright/clearing-sign-navigation/${width}-${time}-${distance}.png`});
   }
   await page.evaluate(()=>{Object.assign(a.game.player,{x:target.x+60,y:target.y});a.game.time+=1;a.refresh();});
   const arrived=await page.evaluate(async()=>({o:(await import('/src/core/world-navigation.js')).worldNavigationObjective(a.game),target:(await import('/src/rendering/story-guidance.js')).storyGuidanceState(a.game).target,route:(await import('/src/core/story-route.js')).storyRouteState(a.game)}));if(arrived.o||arrived.target||arrived.route)throw Error('抵达站牌后未收起');
   await page.locator('#task-navigation-toggle').tap();await page.evaluate(()=>{Object.assign(a.game.player,{x:site.x+375,y:site.y});a.refresh();});
   if(await page.evaluate(async()=>(await import('/src/core/world-navigation.js')).worldNavigationObjective(a.game)!==null))throw Error('手动关闭被覆盖');
  }finally{await context.close();}
 }
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
