// 手机浏览器通过真实点击验证逐字、全文、逐句、整段跳过及后续操作衔接。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;
   window.fresh=(await import('/src/progression/progress.js')).freshProgress;
   window.mainline=await import('/src/core/story/mainline-manager.js');window.ids=(await import('/src/config/mainline.js')).MAINLINE_IDS;
   window.facilities=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS;
   window.speechInfo=(await import('/src/rendering/story-guidance.js')).storySpeechInfo;
   const p=fresh();p.arrival=null;p.restoration.repaired=facilities.map(f=>f.id);p.restoration.cottageRested=true;p.mainline.completed=[...ids];p.mainline.phase='complete';
   const g=a.game;g.progress=p;g.reset();a.menu.enter();g.start();g.arrivalScene=null;g.mainlineSpeech=null;
   Object.assign(a.environment,{time:'day',weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});
   const posts=await import('/src/core/story/story-posts.js');Object.assign(g.player,posts.storyPostApproach(posts.storyPostForChapter(g,'sunleaf-01')));
   if(!g.enterStory('sunleaf-01'))throw Error('未进入故事');a.refresh();
  });
  await page.waitForFunction(()=>{const b=document.getElementById('story-speech');return !b.hidden&&b.dataset.typing==='true'&&b.querySelector('.speech-text-visible').textContent.length>0;});
  const initial=await page.evaluate(()=>({line:a.game.story.line,full:speechInfo(a.game).text,shown:document.querySelector('#story-speech .speech-text-visible').textContent,height:document.getElementById('story-speech').getBoundingClientRect().height}));
  if(!initial.shown.length||initial.shown===initial.full)throw Error('没有逐字显示');
  await page.screenshot({path:'output/playwright/dialogue-typewriter/story-typing-day.png'});
  await page.locator('#story-speech .story-speech-copy').tap();
  const reveal=await page.evaluate(()=>({line:a.game.story.line,shown:document.querySelector('#story-speech .speech-text-visible').textContent,height:document.getElementById('story-speech').getBoundingClientRect().height}));
  if(reveal.line!==initial.line||reveal.shown!==initial.full||Math.abs(initial.height-reveal.height)>1)throw Error('补齐全文时推进或布局跳动');
  await page.waitForTimeout(13000);
  if(await page.evaluate(()=>a.game.story.line)!==initial.line)throw Error('对白仍自动推进');
  await page.locator('#story-speech-next').tap();
  await page.waitForFunction(()=>a.game.story.line===1&&document.getElementById('story-speech').dataset.typing==='true');
  await page.locator('#story-speech-skip').tap();
  await page.locator('#story-dialog').waitFor({state:'visible'});
  const skipped=await page.evaluate(()=>({phase:a.game.story.phase,dialogue:a.game.story.dialogue,read:a.game.story.readLines,completed:a.game.progress.story.chapters['sunleaf-01'].completed}));
  if(skipped.phase!=='prepare'||skipped.dialogue||!skipped.read.includes('intro')||skipped.completed)throw Error('跳过未进入操作或误完成章节');checks.push({initial,reveal,skipped});
  await page.evaluate(async()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();a.game.state='story';const {runStoryActions}=await import('/src/core/story/story-manager.js');runStoryActions(a.game,[{type:'dialogue',id:'sign'}]);a.refresh();});
  await page.locator('#story-speech').waitFor({state:'visible'});await page.locator('#story-speech-skip').tap();
  await page.waitForFunction(()=>!a.game.story.dialogue&&a.game.story.stageId==='Q30');
  checks.push(await page.evaluate(()=>({routePhase:a.game.story.phase,dialogue:a.game.story.dialogue,stage:a.game.story.stageId})));
  // 主线同时覆盖窄屏夜间，沿用真实任务人物位置，不远程接取。
  await page.setViewportSize({width:320,height:568});
  await page.evaluate(async()=>{
   for(const d of document.querySelectorAll('dialog[open]'))d.close();a.game.leaveStory();
   const p=fresh();p.arrival=null;p.restoration.repaired=facilities.map(f=>f.id);p.restoration.cottageRested=true;
   const g=a.game;g.progress=p;g.reset();g.start();g.arrivalScene=null;g.enemies=[];g.boss=null;g.spawnTimer=999;g.fireClock=999;
   Object.assign(g.player,(await import('/src/config/mainline.js')).MAINLINE_SITES.camp);mainline.updateMainline(g,0);
   Object.assign(a.environment,{time:'night'});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();
  });
  await page.waitForFunction(()=>!document.getElementById('mainline-speech').hidden&&document.getElementById('mainline-speech').dataset.typing==='true');
  await page.locator('#mainline-speech .story-speech-copy').tap();
  if(await page.evaluate(()=>a.game.progress.mainline.phase)!=='meet')throw Error('点正文误接任务');
  await page.screenshot({path:'output/playwright/dialogue-typewriter/mainline-night-320.png'});
  const layout=await page.evaluate(()=>{const b=document.getElementById('mainline-speech'),r=b.getBoundingClientRect();return {width:r.width,bottom:r.bottom,overflow:b.scrollWidth>b.clientWidth+1,buttons:[...b.querySelectorAll('button')].map(n=>n.getBoundingClientRect().height),old:!!b.querySelector('[id$="-pause"],.story-speech-progress')};});
  if(layout.overflow||layout.old||layout.buttons.some(h=>h<44)||layout.bottom>568)throw Error('手机对话布局错误');
  await page.locator('#mainline-speech-skip').tap();await page.locator('#phone-dialog').waitFor({state:'visible'});
  if(await page.evaluate(()=>a.game.progress.mainline.phase)!=='doing')throw Error('主线跳过未接续操作');checks.push({layout,mainline:'doing'});
  if(errors.length)throw Error(errors.join('\n'));return {checks,errors};
 }finally{await context.close();}
}
