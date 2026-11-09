// 正式手机页面验证统一图标、实际帮助点击、昼夜与窄屏布局；使用隔离浏览器存档。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],samples=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
 // 对真实按钮测量并检查图标资源，截图保存正常游戏环境。
 async function sample(name){
  await page.waitForTimeout(200);
  const s=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectHelpEmblem(document));
  const visible=s.buttons.filter(b=>b.visible);
  if(!visible.length||s.overflow||visible.some(b=>!b.loaded||!b.label||b.text||b.width<43.9||b.height<43.9))throw Error(name+JSON.stringify(s));
  const shadow=await page.locator('#ws-mastery-help:visible,.story-help-button:visible').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).boxShadow));if(shadow.some(s=>s!=='none'))throw Error('旧按钮阴影残留');
  samples.push({name,buttons:visible});await page.screenshot({path:`output/playwright/help-emblem/${name}.png`});
 }
 // 用真实触控打开原帮助底板，再关闭恢复原页面。
 async function help(button,dialog,close){await page.locator(button).tap();await page.locator(dialog).waitFor({state:'visible'});await page.locator(close).tap();await page.locator(dialog).waitFor({state:'hidden'});}
 try{
  await page.goto(original.url()||'http://localhost:4175');
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;a.menu.enter();await a.ready;});await page.waitForFunction(()=>a.menu.page==='game');
  await page.evaluate(async()=>{const g=a.game;g.update=()=>{};const p=(await import('/src/progression/progress.js')).freshProgress();p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.farm.lessonRewarded=true;p.vehicleHulls.fill(1);p.weapons.fill(1);g.progress=p;g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.enemies=[];g.boss=null;a.renderer.camera.time=null;a.refresh();a.workshop.open('vehicle',8);});
  await sample('vehicle-390');await help('#ws-info','#ws-equipment-dialog','#ws-equipment-done');
  await page.locator('#ws-close').tap();await page.evaluate(()=>a.workshop.open('weapons',0));await page.locator('#ws-function-unlock').tap();await sample('mastery-390');await help('#ws-mastery-help','#ws-mastery-dialog','#ws-mastery-help-done');await page.locator('#ws-close').tap();
  await page.evaluate(()=>a.workshop.open('weapons',0));await page.setViewportSize({width:320,height:568});await sample('weapon-320');await help('#ws-info','#ws-equipment-dialog','#ws-equipment-done');await page.locator('#ws-close').tap();
  await page.evaluate(()=>document.getElementById('story-button').click());await page.locator('[data-story-help="chapter"]').scrollIntoViewIfNeeded();await sample('story-320');await help('[data-story-help="chapter"]','#story-help-dialog','#story-help-close');
  const collection=page.locator('[data-story-help="collection"]');if(await collection.count()){await page.locator('.story-collection summary').tap();await collection.scrollIntoViewIfNeeded();await sample('collection-320');await help('[data-story-help="collection"]','#story-help-dialog','#story-help-close');}await page.locator('#story-close').tap();
  await page.evaluate(()=>document.getElementById('realm-dialog').showModal());await sample('realm-320');await help('#realm-help','#realm-help-dialog','#realm-help-done');await page.evaluate(()=>document.getElementById('realm-dialog').close());
  await page.evaluate(async()=>{const g=a.game;g.progress.living.patrolActive=true;Object.assign(g.player,(await import('/src/progression/story/clearing-site.js')).clearingSite(g.progress));Object.assign(g,{state:'playing',wave:2,waveGroupStart:1,bossWave:5,waveKills:3,waveRest:0,waveWarning:0});a.refresh();});
  for(const [width,height,time] of [[390,844,'day'],[320,568,'night'],[1280,900,'day']]){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);a.game.progress.living.calendar.elapsed=phase.start+phase.duration/2;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();a.renderer.draw();},time);
   await sample(`wave-${width}-${time}`);await help('#wave-help','#wave-help-dialog','#wave-help-close');
  }
  await page.setViewportSize({width:320,height:568});await page.evaluate(async()=>{const g=a.game;g.progress.living.patrolActive=false;g.state='playing';const gate=(await import('/src/config/camp-defense.js')).CAMP_GATES[0];Object.assign(g.player,{x:gate.x,y:gate.y});if(!(await import('/src/core/camp/camp-defense.js')).startCampDefense(g,gate.id))throw Error('守门场地准备失败');a.refresh();});await sample('camp-320');await help('#camp-help','#camp-defense-dialog','#camp-close');
  if(errors.length)throw Error(errors.join('\n'));return {samples,errors};
 }finally{await context.close();}
}
