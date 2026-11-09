// 工坊导航实机：点击真实任务卡、沿光点步行、从建筑提交修复与制枪。
async page=>{
 if(new URL(page.url()).port!=='4274')throw Error('仅允许隔离验收端口4274');
 const errors=[],views=[];page.on('pageerror',e=>errors.push(e.message));await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;g.progress=(await import('/src/progression/progress.js')).freshRangerProgress();Object.assign(g.progress.arrival,{phase:'repair',keys:true,wood:24,x:800,y:900});g.progress.wood=24;g.reset();g.state='playing';g.mainlineTalkDelay=999;a.refresh();window.routeState=()=>import('/src/core/navigation/story-route.js').then(m=>m.storyRouteState(g));});
 for(const width of [320,390,1280])for(const time of ['day','night']){
  await page.setViewportSize({width,height:844});await page.evaluate(async time=>{Object.assign(a.environment,{time,weather:'sun',autoWeather:false});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);},time);
  await page.waitForFunction(async()=>!!(await routeState())?.reachable);await page.locator('#arrival-goal').click();await page.waitForTimeout(120);
  const state=await page.evaluate(async()=>({state:a.game.state,route:await routeState(),review:(await import('/src/rendering/visual-review.js')).inspectWorkshopNavigation(a.game,document),dialogs:document.querySelectorAll('dialog[open]').length,scroll:document.getElementById('game-frame').scrollLeft,overflow:document.documentElement.scrollWidth>innerWidth}));
  if(state.state!=='playing'||state.dialogs||state.scroll||state.overflow||state.route.points.length<2)throw Error(JSON.stringify(state));views.push({width,time,points:state.route.points.length});await page.screenshot({path:`output/playwright/workshop-navigation/arrival-${width}-${time}.png`});
 }
 // 逐段使用键盘移动，路线只给方向，不直接写入玩家位置。
 for(let i=0;i<100;i++){
  const next=await page.evaluate(async()=>{const g=a.game,ready=(await import('/src/core/camp/ranger-arrival.js')).arrivalWorkReady(g);if(ready)return null;const r=await routeState(),p=r?.points?.[1];return p?{dx:p.x-g.player.x,dy:p.y-g.player.y}:{};});if(!next)break;if(next.dx===undefined){await page.waitForTimeout(100);continue;}
  const keys=[];if(Math.abs(next.dx)>6)keys.push(next.dx>0?'d':'a');if(Math.abs(next.dy)>6)keys.push(next.dy>0?'s':'w');for(const k of keys)await page.keyboard.down(k);await page.waitForTimeout(100);for(const k of keys)await page.keyboard.up(k);
 }
 if(!await page.evaluate(async()=>(await import('/src/core/camp/ranger-arrival.js')).arrivalWorkReady(a.game)))throw Error('未能沿光点到达工坊');
 await page.screenshot({path:'output/playwright/workshop-navigation/arrival-at-workshop.png'});await page.locator('.world-workshop-entry[data-workshop-kind="weapons"]').click();await page.locator('#arrival-workshop-action').click();
 await page.waitForFunction(()=>a.game.progress.arrival.phase==='craft');await page.locator('#arrival-workshop-dialog').waitFor({state:'visible'});
 await page.locator('#arrival-workshop-close').click();await page.waitForTimeout(150);const craft=await page.evaluate(async()=>(await import('/src/core/navigation/world-navigation.js')).worldNavigationObjective(a.game)?.key);if(craft!=='arrival-craft')throw Error('制枪未继续指向工坊');
 await page.locator('#arrival-goal').click();await page.locator('.world-workshop-entry[data-workshop-kind="weapons"]').click();await page.locator('#arrival-workshop-action').click();await page.waitForFunction(()=>a.game.progress.arrival.phase==='complete');
 const complete=await page.evaluate(async()=>({pistol:a.game.progress.weapons[0],nav:(await import('/src/core/navigation/world-navigation.js')).worldNavigationObjective(a.game)?.key}));if(complete.pistol!==1||complete.nav?.startsWith('arrival-'))throw Error('完成后残留入职路线');
 // 后续购买、升级仅在玩家点击时导航；详情仍能通过问号打开。
 for(const id of ['pistol-upgrade','own-hover']){
  await page.evaluate(async id=>{const g=a.game,{MAINLINE_IDS}=await import('/src/config/mainline.js');g.progress=(await import('/src/progression/progress.js')).freshProgress();g.progress.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf(id));g.progress.mainline.phase='doing';g.reset();g.state='playing';g.mainlineSpeech=null;g.mainlineTalkDelay=999;Object.assign(g.player,{x:900,y:900});a.refresh();},id);
  if(await page.evaluate(async()=>!!(await import('/src/core/navigation/world-navigation.js')).worldNavigationObjective(a.game)))throw Error('购买升级默认强制导航');
  await page.locator('#mainline-hud').click();await page.waitForFunction(async()=>!!(await routeState())?.reachable);
  const selected=await page.evaluate(async()=>({state:a.game.state,dialogs:document.querySelectorAll('dialog[open]').length,nav:(await import('/src/core/navigation/world-navigation.js')).worldNavigationObjective(a.game)?.key}));if(selected.state!=='playing'||selected.dialogs)throw Error('点击任务仍被详情暂停');
  await page.screenshot({path:`output/playwright/workshop-navigation/${id}-route.png`});await page.locator('#mainline-info').click();await page.locator('#mainline-dialog').waitFor({state:'visible'});await page.locator('#mainline-close').click();
  await page.evaluate(async()=>{const o=(await import('/src/core/navigation/world-navigation.js')).worldNavigationObjective(a.game);Object.assign(a.game.player,o.site);a.refresh();});await page.locator('#mainline-hud').click();await page.locator('#workshop-dialog').waitFor({state:'visible'});await page.locator('#ws-close').click();views.push({id,...selected});
 }
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'workshop-task-navigation',views,craft,complete,errors};
}


