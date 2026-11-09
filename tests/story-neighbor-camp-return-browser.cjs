// 旧版邻居故事回营手机验收：保留正式循环、触摸输入、对白、面板暂停和交付事务。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
 const page=await context.newPage(),errors=[],checks=[];page.setDefaultTimeout(10000);
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 try{
  await page.goto(original.url()||'http://localhost:4175');
  await page.evaluate(async()=>{
   const a=(await import('/src/main.js')).application;a.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS;p.mainline.phase='complete';
   p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.story.chapters['neighbors-lunch'].completed=false;
   const {STORAGE_KEYS,WORLD_SAVE_REVISION}=await import('/src/platform/storage.js');localStorage.setItem(STORAGE_KEYS.worldRevision,WORLD_SAVE_REVISION);
   localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));localStorage.setItem('forest-patrol-audio-v1',JSON.stringify({enabled:false}));
  });
  await page.reload();await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;
   const g=a.game,{storyPostForChapter,storyPostApproach}=await import('/src/core/story/story-posts.js');g.enemies=[];g.boss=null;
   Object.assign(g.player,storyPostApproach(storyPostForChapter(g,'neighbors-lunch')));if(!(await import('/src/core/story/story-manager.js')).enterStory(g,null,'neighbors-lunch'))throw Error('不能进入旧版邻居故事');
   g.advanceStoryDialogue(true);const def=(await import('/src/core/story/story-definition.js')).storyDefinition(g);g.chooseStoryLoadout(def.loadouts[0].id);g.startStoryStage();
   (await import('/src/core/story/story-manager.js')).runStoryActions(g,[{type:'stage',id:'END'}]);Object.assign(g.player,def.world.sites.CAMP);a.refresh();
  });
  // 夹具通过规则推进准备阶段，收起期间已自动打开的任务簿后验证正式收尾对白。
  if(await page.locator('#story-dialog').isVisible())await page.locator('#story-close').tap();
  await page.locator('#story-speech').waitFor({state:'visible'});
  // 阅读时保留建筑，结束后交付面板可关闭，不能继续锁住移动。
  await page.locator('#story-speech-pause').tap();
  for(const [width,time] of [[320,'day'],[390,'night']]){
   await page.setViewportSize({width,height:844});await page.evaluate(async time=>{
    Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});
    a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);
   },time);await page.waitForTimeout(250);
   const review=await page.evaluate(async()=> (await import('/src/rendering/visual-review.js')).inspectStoryCampReturn(a.renderer,document));
   if(!review.campVisible||!review.facilities.includes('camp')||!review.seedShop||review.overflow)throw Error('回营建筑未恢复 '+JSON.stringify(review));
   await page.screenshot({path:`output/playwright/story-neighbor-camp-return/dialogue-${width}-${time}.png`});checks.push(review);
  }
  await page.locator('#story-speech-skip').tap();await page.locator('[data-story-command="claim"]').waitFor({state:'visible'});
  await page.locator('#story-close').tap();await page.waitForFunction(()=>a.game.state==='playing');
  for(const [width,time] of [[320,'night'],[390,'day']]){
   await page.setViewportSize({width,height:844});await page.evaluate(async time=>{Object.assign(a.environment,{time});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);},time);
   const before=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));
   const touch=await context.newCDPSession(page);await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:80,y:540}]});
   await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:80,y:590}]});await page.waitForTimeout(150);
   await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
   const after=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y,state:a.game.state,claimed:a.game.progress.story.chapters['neighbors-lunch'].completed}));
   if(Math.hypot(after.x-before.x,after.y-before.y)<4||after.state!=='playing'||after.claimed)throw Error('待交付不能触摸移动 '+JSON.stringify({before,after}));
   await page.screenshot({path:`output/playwright/story-neighbor-camp-return/movement-${width}-${time}.png`});checks.push({width,time,before,after});
  }
  // 新版居民交互不再提供旧故事入口；旧会话通过原交付事务验证保存失败和重试。
  await page.evaluate(()=>{
   const persist=a.game.storyPersist;a.game.storyPersist=()=>false;
   if(a.game.claimStory()||!a.game.story)throw Error('保存失败不应交付');
   a.game.storyPersist=persist;if(!a.game.claimStory())throw Error('重试交付失败');a.refresh();
  });
  await page.locator('#task-reward-dialog').waitFor({state:'visible'});await page.locator('#task-reward-close').tap();await page.waitForFunction(()=>!a.game.story&&a.game.state==='playing');
  const result={checks,errors,claimed:await page.evaluate(()=>a.game.progress.story.chapters['neighbors-lunch'].completed)};
  if(errors.length)throw Error(errors.join('\n'));await original.evaluate(r=>window.campReturnResult=r,result);return result;
 }catch(error){const state=await page.evaluate(()=>({state:a?.game.state,phase:a?.game.story?.phase,error:a?.game.story?.error,dialogs:[...document.querySelectorAll('dialog[open]')].map(d=>d.id)}));await original.evaluate(r=>window.campReturnFailure=r,{message:error.message,state,errors});throw error;}finally{await context.close();}
}
