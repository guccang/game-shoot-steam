// 红狼实机回归：带待续活动进入试驾，真实点击、伤害、重开、昼夜和存档隔离。
async page=>{
 if(new URL(page.url()).port!=='4307')throw Error('仅允许隔离端口4307');
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),t=await context.newPage(),errors=[],results=[];
 t.on('pageerror',e=>errors.push(e.message));await t.goto('http://localhost:4307');await t.locator('#start').tap();
 await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;window.readTrial=(await import('/src/ui/workshop/trial-scene.js')).inspectWeaponTrialScene;});
 for(const [activity,width,height]of [['plain',390,844],['story',320,568],['fire',390,844]]){
  await t.setViewportSize({width,height});
  const before=await t.evaluate(async activity=>{
   const {freshProgress,validateProgress}=await import('/src/progression/progress.js'),p=freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.mainline.seen.trial=1;p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
   const g=a.game;g.story=null;g.storyForest=null;g.realm=null;g.progress=validateProgress(p);g.reset();g.state='playing';g.mainlineSpeech=null;
   if(activity==='story'){const {STORY_ID}=await import('/src/config/story.js'),posts=await import('/src/core/story/story-posts.js');Object.assign(g.player,posts.storyPostApproach(posts.storyPostForChapter(g,STORY_ID)));if(!g.enterStory())throw Error('剧情前置失败');}
   if(activity==='fire'){if(!g.requestFireRescue()||!g.startFireRescue()||!g.fireTransit)throw Error('消防转场前置失败');}
   // 冻结底层正式现场，已完成试驾引导；独立演练仍由真实战斗帧循环推进。
   g.update=()=>{};for(const d of document.querySelectorAll('dialog[open]'))d.close();a.workshop.open('vehicle',6);a.refresh();
   return JSON.stringify(g.progress);
  },activity);
  await t.locator('#ws-test').tap();
  await t.waitForFunction(()=>readTrial(document.getElementById('weapon-trial-dialog'))?.damage>0,{},{timeout:12000});
  const hit=await t.evaluate(()=>readTrial(document.getElementById('weapon-trial-dialog')));
  if(!hit.targets.some(e=>e.hp<1200)||await t.locator('#weapon-trial-dialog').getAttribute('data-error'))throw Error('试驾没有真实掉血');
  await t.locator('#weapon-trial-pause').tap();await t.screenshot({path:`output/playwright/redwolf-trial/${activity}-day.png`});
  await t.locator('#weapon-trial-time').tap();await t.screenshot({path:`output/playwright/redwolf-trial/${activity}-night.png`});await t.locator('#weapon-trial-time').tap();
  await t.locator('#weapon-trial-restart').tap();await t.waitForFunction(()=>readTrial(document.getElementById('weapon-trial-dialog'))?.damage>0,{},{timeout:12000});
  await t.locator('#weapon-trial-close').tap();if(!await t.locator('#workshop-dialog').isVisible())throw Error('退出没有返回工坊');
  if(await t.evaluate(()=>JSON.stringify(a.game.progress))!==before)throw Error('试驾污染正式存档：'+activity+' '+await t.evaluate(before=>Object.keys(a.game.progress).filter(k=>JSON.stringify(a.game.progress[k])!==JSON.stringify(JSON.parse(before)[k])),before));
  await t.locator('#ws-close').tap();results.push({activity,damage:hit.damage,destroyed:hit.destroyed,isolated:true,restart:true});
 }
 if(errors.length)throw Error(errors.join('\n'));await context.close();await page.evaluate(r=>window.wolfResult=r,{results,errors});
}
