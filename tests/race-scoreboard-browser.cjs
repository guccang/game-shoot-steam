// 默认4175，可在已有服务占用时使用独立本地端口；隔离存档验收常驻牌面。
async page=>{
 const origin=new URL(page.url());if(!['localhost','127.0.0.1'].includes(origin.hostname))throw Error('只允许本地验收，默认4175');
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),t=await context.newPage(),errors=[],checks=[];
 t.on('pageerror',e=>errors.push(e.message));
 try{
  await t.goto(origin.origin);
  await t.evaluate(async()=>{(await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.living.position={x:510,y:1180};localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
  await t.reload();await t.locator('#start').click();
  await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;a.game.update=()=>{};a.game.mainlineSpeech=null;Object.assign(a.game.player,{x:510,y:1180});a.renderer.camera.time=null;a.refresh();});
  await t.screenshot({path:'output/playwright/race-scoreboard/zero.png'});
  // 用正式Game结算两场赛跑，再交给当前场景与正式保存入口，不打开站点弹窗。
  const record=await t.evaluate(async()=>{const {Game}=await import('/src/game.js');const sim=new Game(structuredClone(a.game.progress),()=>.5);sim.start();for(const [place,elapsed] of [[1,58.4],[3,51.2]]){if(!sim.enterRealm('race')||!sim.startRace())throw Error('无法开始比赛');Object.assign(sim.realm,{place,elapsed});(await import('/src/core/activities/forest-race.js')).finishRace(sim,true);sim.leaveRealm();}a.game.progress=sim.progress;a.save();a.refresh();return a.game.progress.realms.records.race;});
  if(record.clears!==2||record.best!==4||record.bestTimeMs!==51200)throw Error(JSON.stringify(record));
  for(const [width,height] of [[390,844],[320,568],[1280,900]])for(const phase of ['day','night']){
   await t.setViewportSize({width,height});await t.evaluate(async phase=>{a.game.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();a.renderer.draw();},phase);
   await t.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const info=await t.evaluate(async()=>{const state=await(await import('/src/rendering/visual-review.js')).inspectRaceStationScoreboard(a.game);const button=document.getElementById('nearby-interaction'),v=a.renderer.view,c=a.renderer.canvas.getBoundingClientRect();return {...state,dialogs:document.querySelectorAll('dialog[open]').length,buttonOverlap:!button.hidden&&button.getBoundingClientRect().bottom>c.top+(state.site.y-83-v.y)*v.zoom};});
   if(!info.visible||info.dialogs||info.buttonOverlap)throw Error(JSON.stringify(info));checks.push({width,phase,info});await t.screenshot({path:`output/playwright/race-scoreboard/${width}-${phase}.png`});
  }
  await t.reload();await t.locator('#start').click();const restored=await t.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;return a.game.progress.realms.records.race;});
  if(restored.clears!==2||restored.best!==4||restored.bestTimeMs!==51200)throw Error('刷新丢失赛跑纪录');if(errors.length)throw Error(errors.join('\n'));return {checks,record,restored,errors};
 }finally{await context.close();}
}

