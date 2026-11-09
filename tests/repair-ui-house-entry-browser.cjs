// 默认4175，允许独立本地端口；隔离存档验收修复徽记与真实点击入屋。
async page=>{
 const origin=new URL(page.url());if(!['localhost','127.0.0.1'].includes(origin.hostname))throw Error('仅允许本地测试');
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),t=await context.newPage(),errors=[],checks=[];
 t.on('pageerror',e=>errors.push(e.message));
 try{
  await t.goto(origin.origin);
  await t.evaluate(async()=>{(await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.living.position={x:910,y:350};localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
  await t.reload();await t.locator('#start').click();
  await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;a.game.update=()=>{};a.game.mainlineSpeech=null;a.game.vehicle.active=false;a.game.enemies=[];a.refresh();});
  for(const [width,height,phase] of [[390,844,'day'],[320,568,'night']]){
   await t.setViewportSize({width,height});
   for(const id of ['cottage','garage','tower','clearing']){
    await t.evaluate(async({id,phase})=>{
     const g=a.game,f=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.find(f=>f.id===id);g.progress.restoration.repaired=g.progress.restoration.repaired.filter(k=>k!==id);g.progress.restoration.build={id,elapsed:1.4,x:f.x,y:f.y+55};g.progress.restoration.cottageRested=true;Object.assign(g.player,{x:f.x,y:f.y+55,vx:0,vy:0});
     g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);
     a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();
    },{id,phase});
    await t.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await t.screenshot({path:`output/playwright/repair-ui-house-entry/${width}-${id}.png`});checks.push({width,id,phase});
   }
  }
  await t.setViewportSize({width:320,height:568});
  await t.evaluate(async()=>{const g=a.game,{COTTAGE}=await import('/src/config/cottage.js');g.progress.restoration.build=null;g.progress.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);g.progress.restoration.cottageRested=false;Object.assign(g.player,{x:COTTAGE.door.x+60,y:COTTAGE.door.y+40});a.renderer.camera.time=null;a.refresh();});
  const entry=t.locator('#nearby-interaction[data-interaction="cottage"]');await entry.waitFor({state:'visible'});
  const label=await t.locator('#mainline-hud b').innerText();if(!label.includes('点击「进入小屋」'))throw Error(label);
  await t.screenshot({path:'output/playwright/repair-ui-house-entry/320-entry.png'});await entry.tap();
  await t.waitForFunction(()=>a.game.cottage?.kind==='cottage');const entered=await t.evaluate(()=>({kind:a.game.cottage.kind,countdown:a.game.cottageEntry}));
  await t.screenshot({path:'output/playwright/repair-ui-house-entry/320-inside.png'});
  // 驾驶时只显示下车说明，不能提供绕过核心限制的进屋按钮。
  await t.evaluate(async()=>{(await import('/src/core/home/cottage.js')).leaveCottage(a.game);a.game.vehicle.active=true;a.refresh();});
  await t.waitForFunction(()=>document.querySelector('#mainline-hud b').textContent.includes('先下车'));
  if(await entry.count()&&await entry.isVisible())throw Error('驾驶时误显示进屋入口');
  if(errors.length)throw Error(errors.join('\n'));return {checks,entered,label,errors};
 }finally{await context.close();}
}
