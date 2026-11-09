// 正式手机触屏验收：章节返场取消、存档重试与兽潮站牌点击，场景和镜头继续实时运行。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const page=await context.newPage(),errors=[],samples=[];page.setDefaultTimeout(10000);
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 try{
  await page.goto('http://localhost:4175');
  await page.evaluate(async()=>{
   const a=(await import('/src/main.js')).application;a.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS;p.mainline.phase='complete';
   p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
   const {STORAGE_KEYS,WORLD_SAVE_REVISION}=await import('/src/platform/storage.js');localStorage.setItem(STORAGE_KEYS.worldRevision,WORLD_SAVE_REVISION);
   localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));localStorage.setItem('forest-patrol-audio-v1',JSON.stringify({enabled:false}));
  });
  await page.reload();await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;
   const {STORY_POSTS}=await import('/src/config/story-posts.js'),{storyPostApproach}=await import('/src/core/story/story-posts.js');
   Object.assign(g.player,storyPostApproach(STORY_POSTS[0]));g.enemies=[];g.boss=null;g.state='playing';
   if(!g.enterStory('sunleaf-01'))throw Error('章节接取失败');g.advanceStoryDialogue(true);g.chooseStoryLoadout('tide-arc');g.startStoryStage();
   Object.assign(g.player,storyPostApproach(STORY_POSTS[0]));a.refresh();
  });
  if(await page.locator('#story-dialog').isVisible())await page.locator('#story-close').tap();
  // 刚选装备的短通知自然结束后采样返场入口，不把瞬间传送夹具当作正常赶路时长。
  await page.waitForFunction(()=>!document.getElementById('toast').classList.contains('visible'));
  // 设置时段只调整环境输入，保留实时移动、角色与载具动作。
  async function lighting(time){await page.evaluate(async time=>{
   Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});
   a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);
   a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);a.refresh();
  },time);}
  // 读取正式 DOM，触控区和完整中文文案必须在游戏框内。
  async function sample(kind,width,time){
   await page.locator('#nearby-interaction').waitFor({state:'visible'});await page.waitForTimeout(250);
   const s=await page.evaluate(async()=>{
    const n=document.getElementById('nearby-interaction'),b=n.getBoundingClientRect(),f=document.getElementById('game-frame').getBoundingClientRect();
    return {review:(await import('/src/rendering/visual-review.js')).inspectChapterTaskEntries(a.game,document),text:n.textContent,label:n.getAttribute('aria-label'),width:b.width,height:b.height,left:b.left,top:b.top,right:b.right,bottom:b.bottom,frame:{left:f.left,top:f.top,right:f.right,bottom:f.bottom},hiddenText:getComputedStyle(n.querySelector('span:not(.parking-hint-icon)')).display==='none',vehicle:a.game.vehicle.active,night:a.renderer.light.sample(performance.now()).night};
   });
   if(s.hiddenText||s.width<44||s.height<44||s.left<s.frame.left||s.right>s.frame.right||s.top<s.frame.top||s.bottom>s.frame.bottom)throw Error('提示被隐藏或越界 '+JSON.stringify(s));
   if(Math.abs(s.night-Number(time==='night'))>.01)throw Error('昼夜采样未生效');
   if(kind==='chapter'&&await page.locator('#story-chatter').isVisible())throw Error('章节短句遮挡管理入口');
   samples.push({kind,viewportWidth:width,time,...s});await page.screenshot({path:`output/playwright/chapter-cancel-horde-hint/${kind}-${width}-${time}.png`});
  }
  for(const [width,height] of [[320,568],[390,844],[844,390],[1280,900]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await lighting(time);await sample('chapter',width,time);
  }
  // 小范围视觉修订可只复核章节提示，避免重复已通过的取消与兽潮全流程。
  if(new URL(original.url()).searchParams.has('entry-visual'))return {pass:true,samples,errors,designCriterion:'chapter-cancel-horde-hint'};
  await page.setViewportSize({width:320,height:568});
  await page.locator('#nearby-interaction').tap();await page.locator('[data-story-command="cancel"]').tap();
  await page.screenshot({path:'output/playwright/chapter-cancel-horde-hint/cancel-confirm.png'});
  await page.locator('[data-story-command="back"]').tap();
  if(!await page.evaluate(()=>!!a.game.story))throw Error('返回确认页误取消任务');
  await page.locator('[data-story-command="cancel"]').tap();
  await page.evaluate(()=>{window.realPersist=a.game.storyPersist;a.game.storyPersist=()=>false;});
  await page.locator('[data-story-command="confirm-cancel"]').tap();
  if(!await page.locator('.story-error').textContent().then(t=>t.includes('取消未保存')))throw Error('缺少保存失败提示');
  await page.evaluate(()=>{a.game.storyPersist=realPersist;});await page.locator('[data-story-command="confirm-cancel"]').tap();
  await page.waitForFunction(()=>!a.game.story&&!a.game.progress.story.run&&a.game.state==='playing');
  await page.reload();await page.locator('#start').tap();
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;if(a.game.story||a.game.progress.story.run)throw Error('取消后刷新恢复了任务');});
  // 同一驿牌重新接取，再暂离并取消已保存检查点。
  await page.locator('[data-story-post="sunleaf-post"]').tap();await page.locator('[data-story-command="enter"]').tap();
  await page.evaluate(()=>{const g=a.game;if(g.story.stageId!=='Q10'||g.story.loadoutId)throw Error('重新接取没有重置阶段');g.advanceStoryDialogue(true);a.refresh();});
  // 选车页已移除暂离入口，开始行动后再验证保存检查点。
  if(await page.locator('[data-story-command="leave"]').count())throw Error('选车页仍显示暂离章节');
  await page.locator('[data-story-loadout="tide-arc"]').tap();await page.locator('[data-story-command="start"]').tap();
  await page.locator('#quest').tap();
  await page.locator('[data-story-command="leave"]').tap();
  await page.evaluate(()=>{if(a.game.story||!a.game.progress.story.run)throw Error('暂离丢失检查点');a.game.state='playing';a.refresh();});
  await page.locator('[data-story-post="sunleaf-post"]').tap();await page.locator('[data-story-command="cancel"]').tap();await page.locator('[data-story-command="confirm-cancel"]').tap();
  await page.waitForFunction(()=>a.game.state==='playing');
  for(const gate of ['left','top']){
   await page.evaluate(async gate=>{
    const g=a.game,site=(await import('/src/config/building-entries.js')).BUILDING_ENTRIES.find(e=>e.type==='gate'&&e.key===gate);
    Object.assign(g.player,{x:site.x+35,y:site.y+15});g.enemies=[];g.boss=null;g.state='playing';a.refresh();
   },gate);
   for(const [width,height] of [[320,568],[390,844],[844,390],[1280,900]])for(const time of ['day','night']){
    await page.setViewportSize({width,height});await lighting(time);await sample('horde-'+gate,width,time);
   }
   await page.setViewportSize({width:390,height:844});await page.locator('#nearby-interaction').tap();
   if(!await page.locator(`[data-select-gate="${gate}"]`).getAttribute('aria-pressed').then(v=>v==='true'))throw Error('打开错误营门');
   await page.locator('#camp-primary').tap();await page.waitForFunction(()=>!!a.game.campDefense&&a.game.state==='playing');
   await page.waitForTimeout(350);if(await page.locator('#nearby-interaction').isVisible())throw Error('战斗后提示未隐藏');
   await page.locator('#camp-help').tap();await page.locator('#camp-leave').tap();await page.waitForFunction(()=>!a.game.campDefense&&a.game.state==='playing');
  }
  if(errors.length)throw Error(errors.join('\n'));return {pass:true,samples,errors,designCriterion:'chapter-cancel-horde-hint',flows:['取消确认返回','保存失败重试','取消后刷新','重新接取','暂离后取消','西门开始退出','北门开始退出']};
 }finally{await context.close();}
}
