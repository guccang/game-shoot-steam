// 使用正式章节、设置和寻路入口验收任务HUD；阶段夹具不代表通关。
async page=>{
 if(new URL(page.url()).port!=='4176')throw Error('仅在隔离端口4176执行，避免更改玩家存档');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(()=>localStorage.clear());await page.goto('http://localhost:4176');await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;g.progress=(await import('/src/progression/progress.js')).freshProgress();g.progress.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS;g.progress.mainline.phase='complete';g.progress.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);g.reset();g.state='playing';g.arrivalScene=null;const posts=await import('/src/core/story/story-posts.js');Object.assign(g.player,posts.storyPostApproach(posts.storyPostForChapter(g,'sunleaf-01')));if(!g.enterStory('sunleaf-01','sunleaf-post'))throw Error('进入故事失败');g.advanceStoryDialogue(true);g.chooseStoryLoadout('frost-guard');Object.assign(g.story,{stageId:'Q50',phase:'prepare',dialogue:null});g.startStoryStage();g.player.invincible=9999;g.attackTimer=9999;g.story.combat.timer=9999;a.refresh();});
 // 检查顶边、设置留白和中文正文；点击由浏览器真实发送。
 async function inspect(label){
  const sample=await page.evaluate(()=>{a.refresh();const box=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};},visible=n=>!!n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden';const q=document.getElementById(a.game.boss?'boss-hud':'quest');return {frame:box(document.getElementById('game-frame')),hud:box(q),settings:box(document.getElementById('settings-button')),toggle:box(document.getElementById('task-navigation-toggle')),hidden:[...document.querySelectorAll('.hud-resources>.resource-pill,.hud-resources .environment-picture')].every(n=>!visible(n)),settingsVisible:visible(document.getElementById('settings-button')),text:[...q.querySelectorAll('b,small,#quest-count')].filter(visible).map(n=>({id:n.id,text:n.textContent,box:box(n),clipped:n.scrollWidth>n.clientWidth+1}))};});
  if(!sample.hidden||!sample.settingsVisible||sample.settings.width<44||sample.settings.right>sample.frame.right||sample.hud.x<sample.frame.x||Math.abs(sample.hud.y-sample.settings.y)>2||sample.hud.right>sample.settings.x-6||sample.hud.y<sample.frame.y||sample.hud.bottom>sample.frame.bottom)throw Error(label+JSON.stringify(sample));
  if(sample.text.some(n=>n.box.right>sample.hud.right+1||n.box.bottom>sample.hud.bottom+1))throw Error('文字溢出 '+label+JSON.stringify(sample));samples.push({label,...sample});
 }
 for(const [width,height] of [[320,568],[390,844],[1280,800],[900,480]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(async time=>{a.game.progress.living.calendar={day:1,elapsed:time==='day'?400000:1100000};Object.assign(a.environment,{time,autoTime:false,weather:'sun',autoWeather:false});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();},time);
  await inspect(`${width}-${time}`);await page.screenshot({path:`output/playwright/task-combat-hud/${width}-${time}.png`});
  await page.locator('#settings-button').click();await page.locator('#settings-dialog').waitFor({state:'visible'});await page.keyboard.press('Escape');await page.locator('#settings-dialog').waitFor({state:'hidden'});await page.waitForFunction(()=>a.game.state==='playing');await inspect(`${width}-${time}-settings`);
 }
 await page.setViewportSize({width:320,height:568});await page.locator('#task-navigation-toggle').click();await inspect('关闭寻路');await page.locator('#task-navigation-toggle').click();
 await page.evaluate(async()=>{const g=a.game;g.enemies=[];Object.assign(g.story,{stageId:'Q60',phase:'active',dialogue:null,combat:null});(await import('/src/core/story/story-encounters.js')).spawnStoryBoss(g);a.refresh();});await inspect('领主');await page.screenshot({path:'output/playwright/task-combat-hud/boss-320.png'});
 await page.evaluate(async()=>{(await import('/src/core/story/story-manager.js')).leaveStory(a.game);a.refresh();});
 if(!await page.locator('#season-picture').isVisible()||!await page.locator('#weather-picture').isVisible()||!await page.locator('.hud-resources>.resource-pill').first().isVisible())throw Error('退出任务未恢复资源环境栏');
 await page.screenshot({path:'output/playwright/task-combat-hud/exit-320.png'});
 if(errors.length)throw Error(errors.join('\n'));return {samples,errors};
}



