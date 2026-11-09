// 底部对白沿正式入口和绘制器验收，隔离存档不修改玩家进度。
async page=>{
 if(new URL(page.url()).port!=='4299')throw Error('仅限隔离端口4299');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.destroy();localStorage.clear();const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.locator('#start').click();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;a.game.update=()=>{};a.game.enemies=[];a.game.mainlineSpeech=null;const c=await import('/src/core/camp/living-world.js'),r=c.residentFor(a.game,'cook');Object.assign(a.game.player,{x:r.x,y:r.y+40});a.refresh();});
 await page.evaluate(()=>a.living.open('cook'));await page.locator('#living-dialog').waitFor({state:'visible'});
 // 所有类型共用位置检查，六种视口/昼夜组合保留正式样式与世界。
 async function capture(id){
  for(const [width,height] of [[1280,900],[390,844],[320,568]])for(const phase of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(async phase=>{const g=a.game;g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();},phase);await page.waitForTimeout(150);
   const sample=await page.evaluate(async()=> (await import('/src/rendering/visual-review.js')).inspectNpcDialogue(a.game,document));
   const n=sample.nodes.find(n=>n.id===id);if(!n||!n.speaker||!n.bottom||n.modal||n.overflow||sample.overflow||n.rect.left<sample.frame.left-1||n.rect.right>sample.frame.right+1||n.rect.bottom>height||n.rect.top<sample.frame.top+sample.frame.height*.3||n.rect.height>sample.frame.height*.5||n.rect.bottom<sample.frame.top+sample.frame.height*.6)throw Error('对白位置或姓名异常 '+JSON.stringify(sample));
   if(Math.abs(n.rect.width-sample.frame.width)>1||Math.abs(n.rect.bottom-Math.min(sample.frame.bottom,height))>1)throw Error('对白未铺满底边 '+JSON.stringify(n));
   if(await page.locator('.field-menu').evaluate(n=>getComputedStyle(n).visibility!=='hidden'))throw Error('对白期间菜单未隐藏');
   samples.push({id,width,phase,...sample});await page.screenshot({path:`output/playwright/npc-bottom-dialogue/${id}-${width}-${phase}.png`});
  }
 }
 await capture('living-dialog');
 // 对话下层保留暂停归属，奖励关闭后仍回到正在阅读的NPC。
 await page.evaluate(()=>a.game.onEvent('task-reward',{title:'对话中的奖励展示',reward:{coins:1}}));await page.locator('#task-reward-dialog').waitFor({state:'visible'});await page.locator('#task-reward-close').click();if(await page.evaluate(()=>a.game.state)!=='paused')throw Error('嵌套奖励提前恢复游戏');
 await page.locator('#living-close').press('Escape');await page.waitForFunction(()=>a.game.state==='playing');
 // 实际接取和推进委托，非模态阅读不破坏原有事务及暂停恢复。
 await page.evaluate(async()=>{const r=(await import('/src/core/camp/living-world.js')).residentFor(a.game,'cook');Object.assign(a.game.player,{x:r.x,y:r.y+30});a.living.open('cook');});
 await page.locator('[data-living-accept="neighbors-lunch"]').click();await page.waitForFunction(()=>a.game.progress.living.requests['neighbors-lunch'].stage===0);
 await page.evaluate(async()=>{const c=await import('/src/core/camp/living-world.js'),q=(await import('/src/config/living-world.js')).LIVING_REQUESTS.find(q=>q.id==='neighbors-lunch'),t=c.livingRequestTarget(a.game,q);Object.assign(a.game.player,{x:t.x,y:t.y});a.living.open('cook');});
 await page.locator('[data-living-do="neighbors-lunch"]').click();if(!await page.evaluate(()=>a.game.progress.living.requests['neighbors-lunch'].stage===1))throw Error('委托未推进');
 await page.locator('#living-close').click();await page.waitForFunction(()=>a.game.state==='playing');
 if(await page.locator('.field-menu').evaluate(n=>getComputedStyle(n).visibility==='hidden'))throw Error('关闭对白后菜单未恢复');
 // 目录仍为独立功能面板，关闭后不会遗留底部定位。
 await page.evaluate(()=>a.living.open());if(!await page.locator('#living-dialog').evaluate(n=>n.matches(':modal')&&!n.classList.contains('npc-bottom-dialogue')))throw Error('目录状态错误');await page.locator('#living-close').click();await page.waitForFunction(()=>a.game.state==='playing');
 await page.evaluate(async()=>{const g=a.game,c=await import('/src/config/mainline.js'),m=await import('/src/core/story/mainline-manager.js');g.progress.mainline=(await import('/src/progression/progress.js')).freshProgress().mainline;g.progress.taskTracking={kind:'mainline'};Object.assign(g.player,c.MAINLINE_SITES[m.mainlineTask(g).site]);g.mainlineTalkDelay=0;m.updateMainline(g,.1);a.refresh();});
 await page.locator('#mainline-speech').waitFor({state:'visible'});await page.locator('#mainline-speech-pause').click();await capture('mainline-speech');
 await page.locator('#mainline-speech-pause').click();if(!await page.evaluate(()=>!a.game.mainlineSpeech.paused))throw Error('主线继续讲述失败');await page.locator('#mainline-speech-skip').click();
 // 跳过只完成对白；正式地图功能仍正常打开并关闭。
 if(await page.locator('#map-dialog').isVisible())await page.locator('#close-map').click();
 await page.evaluate(async()=>{const g=a.game;g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.state='playing';const posts=await import('/src/config/story-posts.js'),core=await import('/src/core/story/story-posts.js'),post=posts.STORY_POSTS.find(p=>p.chapters.includes('sunleaf-01'));Object.assign(g.player,core.storyPostApproach(post));if(!g.enterStory('sunleaf-01'))throw Error('故事进入失败');a.refresh();});
 await page.locator('#story-speech').waitFor({state:'visible'});await page.locator('#story-speech-pause').click();await capture('story-speech');
 const before=await page.evaluate(()=>a.game.story.line);await page.waitForTimeout(200);if(await page.evaluate(()=>a.game.story.line)!==before)throw Error('暂停仍换句');await page.locator('#story-speech-skip').click();if(await page.evaluate(()=>!!a.game.story.dialogue))throw Error('跳过未推进');
 // 入职导览仍由正式演出状态提供说话者及下一句。
 await page.evaluate(async()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();const g=a.game;g.leaveStory();g.progress.arrival={version:2,phase:'ride',elapsed:1,line:0,wood:0,keys:false};g.reset();g.state='playing';const r=await import('/src/core/camp/ranger-arrival.js');r.restoreArrival(g);r.updateArrival(g,.01);g.arrivalSpeechPaused=true;a.refresh();});
 await page.locator('#arrival-speech').waitFor({state:'visible'});await capture('arrival-speech');const text=await page.locator('#arrival-speech-text').innerText();await page.locator('#arrival-speech-skip').click();if(await page.locator('#arrival-speech-text').innerText()===text)throw Error('入职下一句失败');
 if(errors.length)throw Error(errors.join('\n'));
 return {count:samples.length,designCriterion:'npc-bottom-dialogue',errors};
}
