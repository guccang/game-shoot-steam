// 使用正式手机界面沿展示边界往返，冻结战斗模拟以排除随机战斗对边界采样的影响。
async original=>{
 const results=[],errors=[],dir='output/playwright/horde-navigation-visibility';
 for(const [width,height,time] of [[320,568,'night'],[390,844,'day'],[1100,800,'night']]){
  const context=await original.context().browser().newContext({viewport:{width,height},isMobile:width<500,hasTouch:true}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://localhost:4175');await page.locator('#start').tap();
   await page.evaluate(async time=>{
    window.a=(await import('/src/main.js')).application;await a.ready;
    const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.bosses=6;p.living.patrolActive=true;
    p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;
    p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.vehicleHulls.fill(1);p.vehicleWeapons.fill(1);p.vehicleIndex=3;
    const g=a.game;g.progress=p;g.reset();a.menu.enter();g.start();g.arrivalScene=null;g.mainlineSpeech=null;g.update=()=>{};
    const site=(await import('/src/progression/clearing-site.js')).clearingSite(p);Object.assign(g.player,{x:site.x+375,y:site.y});g.wave=31;g.summonVehicle();
    Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();
   },time);
   for(const distance of [300,301,375,450,451,375]){
    await page.evaluate(async distance=>{const g=a.game,s=(await import('/src/progression/clearing-site.js')).clearingSite(g.progress);Object.assign(g.player,{x:s.x+distance,y:s.y});g.time+=1;a.renderer.camera.time=null;a.refresh();},distance);
    await page.waitForTimeout(200);
    const state=await page.evaluate(async()=>{
     const g=a.game,objective=(await import('/src/core/world-navigation.js')).worldNavigationObjective(g),route=(await import('/src/core/story-route.js')).storyRouteState(g,a.renderer.view);
     return {quest:!document.getElementById('quest').hidden,objective:!!objective,route:!!route,target:!!(await import('/src/rendering/story-guidance.js')).storyGuidanceState(g).target,living:(await import('/src/core/living-route.js')).livingRouteStates(g).length,waves:(await import('/src/core/living-safety.js')).livingWaveAllowed(g)};
    });
    if(state.quest!==(distance<=450)||state.objective!==(distance>450)||state.target!==(distance>450)||state.route!==(distance>450)||state.living||state.waves!==(distance<=300))throw Error(JSON.stringify({width,distance,state}));
    results.push({width,time,distance,...state});
    if(distance===450||distance===451){await page.waitForFunction(()=>!document.getElementById('toast').classList.contains('visible'));await page.screenshot({path:`${dir}/${width}-${time}-${distance}.png`});}
   }
   // 使用真实寻路按钮关闭，再离开显示区，不能自动重开玩家偏好。
   await page.locator('#task-navigation-toggle').tap();
   await page.evaluate(async()=>{const g=a.game,s=(await import('/src/progression/clearing-site.js')).clearingSite(g.progress);g.player.x=s.x+451;a.refresh();});
   const closed=await page.evaluate(async()=>({enabled:a.game.progress.mainline.navigationEnabled,target:(await import('/src/core/world-navigation.js')).worldNavigationObjective(a.game)}));
   if(closed.enabled!==false||closed.target)throw Error('离场覆盖了手动关闭偏好');
  }finally{await context.close();}
 }
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'clearing-navigation-hud-boundary',results,errors};
}
