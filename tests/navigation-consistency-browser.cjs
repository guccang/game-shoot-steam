// 默认4175，允许本地独立端口；用正式帧循环核对HUD、插值导航、路线与终点。
async page=>{
 const origin=new URL(page.url());if(!['localhost','127.0.0.1'].includes(origin.hostname))throw Error('仅允许本地验收');
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),t=await context.newPage(),errors=[],checks=[];
 t.on('pageerror',e=>errors.push(e.message));
 try{
  await t.goto(origin.origin);
  await t.evaluate(async()=>{
   (await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress(),{MAINLINE_IDS}=await import('/src/config/mainline.js');
   p.arrival={version:3,phase:'complete',keys:true};p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;
   p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('tower'));p.mainline.phase='doing';p.weapons[0]=10;p.wood=1000;p.living.position={x:440,y:700};
   localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
  });
  await t.reload();await t.locator('#start').click();
  await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;a.game.update=()=>{};a.game.mainlineSpeech=null;a.game.vehicle.active=false;a.game.enemies=[];a.refresh();});
  for(const [width,height,phase] of [[390,844,'day'],[320,568,'night']]){
   await t.setViewportSize({width,height});
   await t.evaluate(async phase=>{a.game.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);},phase);
   for(const scenario of ['mainline','living','repair','visit','distance','closed','construction']){
    await t.evaluate(async scenario=>{
     const g=a.game,{MAINLINE_SITES}=await import('/src/config/mainline.js'),{TOWN_RESTORATIONS}=await import('/src/config/town-restoration.js');
     const {requestMainlineNavigation,requestWorldNavigation}=await import('/src/core/world-navigation.js');requestMainlineNavigation(g);
     g.progress.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);g.progress.restoration.build=null;g.progress.taskTracking={kind:'mainline'};
     if(scenario!=='mainline'){g.progress.living.requests['neighbors-lunch'].stage=0;g.progress.living.requests['neighbors-lunch'].completed=false;g.progress.taskTracking={kind:'living',id:'neighbors-lunch'};}
     if(['repair','closed','construction'].includes(scenario))g.progress.restoration.repaired=g.progress.restoration.repaired.filter(id=>id!=='tower');
     if(scenario==='distance')requestWorldNavigation(g,{x:g.player.x+300,y:g.player.y,mapId:g.mapId},'距离换算验证',{direct:true});
     if(scenario==='visit')requestWorldNavigation(g,MAINLINE_SITES.seedShop,'前往种子小屋',{direct:true});
     if(scenario==='closed')(await import('/src/core/task-navigation.js')).setTaskNavigationEnabled(g,false);
     if(scenario==='construction')g.progress.restoration.build={id:'tower',elapsed:0,x:1000,y:1300};
     a.refresh();
    },scenario);
    await t.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const info=await t.evaluate(async()=>{
     const {worldNavigationObjective}=await import('/src/core/world-navigation.js'),{storyGuidanceState}=await import('/src/rendering/story-guidance.js'),{storyRouteState}=await import('/src/core/story-route.js'),{livingRouteStates}=await import('/src/core/living-route.js');
     const source=a.renderer.renderGame,nav=worldNavigationObjective(source),route=storyRouteState(source),living=livingRouteStates(source);
     return {interpolated:source!==a.game,label:document.querySelector('#mainline-hud b').textContent,kind:document.querySelector('#mainline-hud').dataset.taskKind,key:nav?.key||null,route:route?.site||null,target:storyGuidanceState(source).target,living:living.map(r=>({id:r.id,target:{x:r.target.x,y:r.target.y}})),expected:worldNavigationObjective(a.game)?.site||null,distanceText:document.querySelector('.mainline-bearing small').textContent,expectedMeters:nav?Math.ceil((await import('/src/world/coordinates.js')).worldDistance(a.game.player,nav.site)/10):null};
    });
    if(!info.interpolated||JSON.stringify(info.target)!==JSON.stringify(info.expected))throw Error(JSON.stringify({scenario,info}));
    if(scenario==='mainline'&&(info.key!=='towerEntry'||info.label!=='通过时空塔3层'))throw Error(JSON.stringify(info));
    if(scenario==='living'&&(info.key||info.living.length!==1||info.kind!=='living'))throw Error(JSON.stringify(info));
    if(scenario==='repair'&&(info.key!=='restore-tower'||info.living.length||!info.label.includes('修复时空塔')))throw Error(JSON.stringify(info));
    if(scenario==='visit'&&(info.key!=='visit'||info.living.length||info.label!=='前往种子小屋'))throw Error(JSON.stringify(info));
    if(['closed','construction'].includes(scenario)&&(info.key||info.route||info.target||info.living.length||!info.label.includes('修复时空塔')))throw Error(JSON.stringify(info));
    // 显示换算只改数字，终点、方向和地面路线仍使用同一世界坐标。
    if(info.key&&info.distanceText!==info.expectedMeters+'米')throw Error('距离未统一换算 '+JSON.stringify(info));
    if(scenario==='distance'&&info.distanceText!=='30米')throw Error('300坐标单位应显示30米 '+JSON.stringify(info));
    if(info.key&&info.route!==info.key)throw Error(JSON.stringify(info));
    checks.push({width,scenario,info});
    if(['repair','visit','distance'].includes(scenario))await t.screenshot({path:`output/playwright/navigation-consistency/${width}-${scenario}.png`});
   }
  }
  if(errors.length)throw Error(errors.join('\n'));return {checks,errors};
 }finally{await context.close();}
}
