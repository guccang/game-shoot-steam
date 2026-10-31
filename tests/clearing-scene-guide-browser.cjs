// 通过正式场景入口验收清缴教学；昼夜及320/390/桌面面板均使用真实UI。
async page=>{
 if(new URL(page.url()).port!=='4258')throw Error('仅使用隔离端口4258');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;a.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.mainline.completed=['first-map'];p.mainline.phase='doing';p.living.position={x:920,y:1000};p.living.calendar={day:1,elapsed:400000};localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.mainlineTalkDelay=999;g.mainlineSpeech=null;Object.assign(g.player,{x:920,y:1000});g.progress.fireDispatch.next=9999;a.environment.autoWeather=false;a.environment.weather='sun';a.refresh();});
 // 远处从任务手册开始，应收起手册并定位告示牌，不隔空打开接取。
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;Object.assign(a.game.player,{x:1030,y:850});a.refresh();});await page.waitForTimeout(300);
 await page.locator('#mainline-info').click();await page.locator('#mainline-action').click();if(await page.locator('#mainline-dialog').isVisible()||await page.locator('#clearing-dialog').isVisible())throw Error('远处任务手册没有返回场景');
 // 邻里面板的清缴入口位于首屏，并且只导航到现场。
 await page.locator('#living-menu').evaluate(n=>n.click());await page.locator('#living-patrol').click();if(await page.locator('#living-dialog').isVisible())throw Error('邻里面板未退出');
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;Object.assign(a.game.player,{x:920,y:1000});a.refresh();});await page.waitForTimeout(400);
 // 点击绘制器中的盾牌本体，命中与下方按钮相同的交互。
 const shield=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,p=(await import('/src/config/clearing.js')).CLEARING_POST,v=a.renderer.view,c=a.renderer.canvas.getBoundingClientRect();return {x:(p.x-v.x)*v.zoom+c.left,y:(p.y-45-v.y)*v.zoom+c.top};});await page.mouse.click(shield.x,shield.y);if(!await page.locator('#clearing-dialog').isVisible())throw Error('点击建筑本体未打开告示牌');await page.locator('#clearing-close').click();
 for(const phase of ['day','night']){
  await page.evaluate(async phase=>{const a=(await import('/src/main.js')).application;a.game.progress.living.calendar={day:1,elapsed:phase==='day'?400000:1100000};a.refresh();},phase);await page.waitForTimeout(21000);
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:900});await page.waitForTimeout(400);
   await page.screenshot({path:`output/playwright/clearing-scene-guide/entry-${width}-${phase}.png`});
   await page.locator('#clearing-marker').click();await page.waitForTimeout(250);
   const s=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return {...(await import('/src/rendering/visual-review.js')).inspectClearingGuide(a.game,document),phase:a.environment.time,width:innerWidth};});
   if(s.navigation!=='clearing-post'||!s.dialog||s.guide!=='clearing-accept'||s.overflow||s.phase!==phase)throw Error(JSON.stringify(s));samples.push(s);
   await page.screenshot({path:`output/playwright/clearing-scene-guide/panel-${width}-${phase}.png`});await page.locator('#clearing-close').click();
  }
 }
 await page.locator('#clearing-marker').click();await page.locator('#clearing-accept').click();await page.waitForTimeout(300);await page.locator('#clearing-marker').click();await page.waitForTimeout(200);
 await page.screenshot({path:'output/playwright/clearing-scene-guide/manage-320.png'});await page.locator('#clearing-stop').click();
 const stopped=await page.evaluate(async()=>(await import('/src/main.js')).application.game.progress.living.patrolActive);if(stopped)throw Error('告示牌暂停未生效');
 if(errors.length)throw Error(errors.join(';'));return {designCriterion:'clearing-scene-guide',samples,errors};
}
