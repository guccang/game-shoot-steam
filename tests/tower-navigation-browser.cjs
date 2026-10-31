// 默认4175，允许独立本地端口；检查真实帧循环的插值快照而非直接绘制权威Game。
async page=>{
 const origin=new URL(page.url());if(!['localhost','127.0.0.1'].includes(origin.hostname))throw Error('仅允许本地测试');
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),t=await context.newPage(),errors=[],checks=[];
 t.on('pageerror',e=>errors.push(e.message));
 try{
  await t.goto(origin.origin);
  await t.evaluate(async()=>{
   (await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();
   const {MAINLINE_IDS}=await import('/src/config/mainline.js');p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('tower'));p.mainline.phase='doing';
   p.arrival={version:3,phase:'complete',keys:true};p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.weapons[0]=10;p.living.position={x:440,y:700};
   localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
  });
  await t.reload();await t.locator('#start').click();
  await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;a.game.update=()=>{};a.game.mainlineSpeech=null;a.game.vehicle.active=false;a.game.enemies=[];a.refresh();});
  for(const [width,height,phase] of [[390,844,'day'],[320,568,'night']]){
   await t.setViewportSize({width,height});
   for(const place of ['workshop','tower']){
    await t.evaluate(async({phase,place})=>{
     Object.assign(a.game.player,place==='workshop'?{x:440,y:700}:{x:1040,y:1380});
     a.game.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;
     (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);
     a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
     a.renderer.camera.time=null;a.refresh();
    },{phase,place});
    await t.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const info=await t.evaluate(async()=>{
     const {worldNavigationObjective}=await import('/src/core/world-navigation.js'),{storyGuidanceState}=await import('/src/rendering/story-guidance.js');
     const source=a.renderer.renderGame,nav=worldNavigationObjective(source),hud=worldNavigationObjective(a.game);
     return {interpolated:source!==a.game,hudKey:hud.key,renderKey:nav.key,target:storyGuidanceState(source).target,label:document.querySelector('#mainline-hud b').textContent};
    });
    if(!info.interpolated||info.hudKey!=='towerEntry'||info.renderKey!=='towerEntry'||info.target.x!==1000||info.target.y!==1300||info.label!=='通过时空塔3层')throw Error(JSON.stringify(info));
    checks.push({width,phase,place,...info});await t.screenshot({path:`output/playwright/tower-navigation/${width}-${place}.png`});
   }
  }
  // 任务开关关闭再开启后仍指向时空塔，不能恢复旧的工坊步骤。
  await t.locator('#task-navigation-toggle').tap();await t.locator('#task-navigation-toggle').tap();
  await t.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const key=await t.evaluate(async()=>(await import('/src/core/world-navigation.js')).worldNavigationObjective(a.renderer.renderGame)?.key);
  if(key!=='towerEntry'||errors.length)throw Error(JSON.stringify({key,errors}));return {checks,toggleTarget:key,errors};
 }finally{await context.close();}
}
