// 专项验收正式导航：昼夜与手机/桌面同屏、真实行走、减少动态和按需清理。
async page=>{
 if(new URL(page.url()).port!=='4257')throw Error('只允许隔离端口4257');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;a.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.living.position={x:580,y:1010};localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.mainlineTalkDelay=999;g.mainlineSpeech=null;Object.assign(g.player,{x:580,y:1010});g.progress.fireDispatch.next=99999;a.environment.autoWeather=false;a.environment.weather='sun';(await import('/src/core/navigation/world-navigation.js')).requestWorldNavigation(g,{x:530,y:740},'前往武器工坊');a.refresh();});
 // 镜头跟随实际步行，路线与距离应随之推进。
 const before=await page.evaluate(async()=>(await import('/src/main.js')).application.game.player.y);
 await page.keyboard.down('ArrowUp');await page.waitForTimeout(550);await page.keyboard.up('ArrowUp');
 const after=await page.evaluate(async()=>(await import('/src/main.js')).application.game.player.y);
 if(after>=before-10)throw Error('沿路步行未前进');
 for(const phase of ['day','night']){
  await page.evaluate(async phase=>{const a=(await import('/src/main.js')).application;Object.assign(a.game.player,{x:580,y:1010});a.game.progress.living.calendar={day:1,elapsed:phase==='day'?400000:1100000};a.refresh();},phase);
  await page.waitForTimeout(21000);
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:900});await page.waitForTimeout(500);
   await page.screenshot({path:`output/playwright/navigation-clarity/camp-${width}-${phase}.png`});
   const s=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,v=(await import('/src/rendering/visual-review.js')).inspectNavigationClarity(a.game,a.renderer.view);return {time:a.environment.time,width:innerWidth,count:v.dots.length,arrows:v.dots.filter(d=>d.arrow).length,targets:v.targets,diameter:v.screenDotDiameter,reachable:v.route?.reachable,overflow:document.documentElement.scrollWidth>innerWidth,zoom:v.zoom};});
   if(s.time!==phase||s.count===0||s.arrows===0||!s.reachable||s.overflow)throw Error(JSON.stringify(s));samples.push(s);
  }
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(600);
 await page.screenshot({path:'output/playwright/navigation-clarity/reduced-motion.png'});await page.emulateMedia({reducedMotion:'no-preference'});
 // 到达后手动拜访标记退出，主线的购买步骤在未点击时不出现路线。
 const cleanup=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game,{MAINLINE_TASKS}=await import('/src/config/mainline.js'),{worldNavigationObjective,requestMainlineNavigation}=await import('/src/core/navigation/world-navigation.js'),{inspectNavigationClarity}=await import('/src/rendering/visual-review.js');
  Object.assign(g.player,{x:530,y:740});worldNavigationObjective(g);
  const index=MAINLINE_TASKS.findIndex(t=>t.id==='buy-shotgun');g.progress.mainline.completed=MAINLINE_TASKS.slice(0,index).map(t=>t.id);g.progress.mainline.phase='doing';
  const hidden=inspectNavigationClarity(g,a.renderer.view);if(hidden.dots.length||hidden.targets.length)throw Error('购买任务自动显示路线');
  Object.assign(g.player,{x:580,y:1010});requestMainlineNavigation(g);const selected=inspectNavigationClarity(g,a.renderer.view);if(!selected.dots.length||!selected.targets.length)throw Error('点击任务后没有导航');
  g.progress.weapons[3]=1;g.progress.weapon=3;const done=inspectNavigationClarity(g,a.renderer.view);if(done.dots.length||done.targets.length)throw Error('完成步骤仍显示旧导航');return {hidden:true,selected:true,done:true};});
 if(errors.length)throw Error(errors.join(';'));return {designCriterion:'navigation-clarity',samples,movement:{before,after},cleanup,errors};
}
