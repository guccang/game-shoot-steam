// 默认本地4175，允许工作树独立端口；检查真实插值帧与手机触控的选种、播种和退出。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(original.url()||'http://localhost:4175');
  await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress(),{MAINLINE_IDS}=await import('/src/config/mainline.js');p.arrival={version:3,phase:'complete',keys:true};p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('tower'));p.mainline.phase='doing';p.weapons[0]=10;p.farm.wildMaps=['forest'];p.farm.lessonRewarded=true;p.farm.seeds[0]=3;p.farm.unlocked[0]=true;p.farm.plots=[0,1].map(id=>({id,mapId:'forest',x:1000+56*id,y:1400,crop:null,plantedAt:0,readyAt:0,watered:false}));p.farm.nextId=2;p.living.position={x:1040,y:1460};localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
  await page.reload();await page.locator('#start').tap();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;a.game.update=()=>{};a.game.mainlineSpeech=null;a.game.vehicle.active=false;a.game.enemies=[];Object.assign(a.game.player,{x:1040,y:1460});a.renderer.camera.time=null;a.refresh();});
  // 从正式帧循环取得快照，再记录两层导航绘制，截图仍由原渲染器生成。
  async function check(hidden,label){
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const info=await page.evaluate(async()=>{const source=a.renderer.renderGame,{drawStoryGuidance,drawStoryDestination}=await import('/src/rendering/story-guidance.js'),{worldNavigationObjective}=await import('/src/core/world-navigation.js');const counts=[];for(const draw of [drawStoryGuidance,drawStoryDestination]){let n=0;const c=new Proxy({},{get:()=>()=>{n++;},set:()=>{n++;return true;}});draw(c,source,a.renderer.view,true);counts.push(n);}return {counts,tool:a.game.farmWork?.tool,interpolated:source!==a.game,nav:worldNavigationObjective(a.game)?.key,enabled:a.game.progress.mainline.navigationEnabled,task:document.querySelector('#mainline-hud b').textContent};});
   if(!info.interpolated||info.nav!=='towerEntry'||info.task!=='通过时空塔3层'||(hidden?info.counts.some(n=>n!==0):info.counts.some(n=>n===0)))throw Error(label+JSON.stringify(info));checks.push({label,...info});
  }
  for(const [width,height,phase] of [[390,844,'day'],[320,568,'night']]){
   await page.setViewportSize({width,height});await page.evaluate(async phase=>{a.game.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();},phase);
   await check(false,phase+'进入前');await page.screenshot({path:`output/playwright/farm-hide-navigation/${width}-before.png`});
   // 通过常规手机菜单进入后再切短屏，避免已有长菜单的屏外入口干扰导航验收。
   await page.setViewportSize({width:390,height:844});await page.locator('#field-menu-toggle').tap();await page.locator('#farm-menu').tap();await page.setViewportSize({width,height});await page.waitForFunction(()=>!document.querySelector('#farm-sickle').disabled);await check(true,phase+'锄头');
   await page.locator('[data-farm-cell="0"]').tap();await page.locator('#farm-picker').waitFor({state:'visible'});await check(true,phase+'选种');await page.screenshot({path:`output/playwright/farm-hide-navigation/${width}-picker.png`});
   await page.locator('[data-farm-seed="0"]').tap();await check(true,phase+'种子');await page.locator('[data-farm-cell="0"]').tap();
   if(!await page.evaluate(()=>a.game.farmWork.queue.some(j=>j.action==='plant'&&j.id===0)))throw Error('田块点击未安排播种');await check(true,phase+'播种排队');await page.screenshot({path:`output/playwright/farm-hide-navigation/${width}-planting.png`});
   await page.locator('#farm-exit').tap();await check(false,phase+'退出');await page.screenshot({path:`output/playwright/farm-hide-navigation/${width}-restored.png`});
  }
  if(errors.length)throw Error(errors.join('\n'));return {checks,errors};
 }finally{await context.close();}
}
