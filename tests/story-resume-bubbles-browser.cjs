// 真实应用回归：整备页返回继续任务，任务短句复用正式NPC头顶投影。
async page=>{
 if(new URL(page.url()).port!=='4301')throw Error('只允许隔离端口4301');
 const checks=[],samples=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 // 手机菜单先展开，再实际点击任务入口。
 async function openTask(){if(!await page.locator('#story-button').isVisible())await page.locator('#field-menu-toggle').click();await page.locator('#story-button').click();}
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{
  (window.a||(await import('/src/main.js')).application).destroy();localStorage.clear();
  const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.restoration.repaired.push('story','garage');
  p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
  localStorage.setItem('forest-patrol-world-revision','forest-threefold-2026-10');localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
  window.a=(await import('/src/app/create-app.js')).createApplication();
 });
 await page.locator('#start').click();await page.evaluate(()=>a.ready);
 await page.evaluate(async()=>{
  const g=a.game,{storyPostApproach,storyPostForChapter}=await import('/src/core/story-posts.js');
  Object.assign(g.player,storyPostApproach(storyPostForChapter(g,'sunleaf-01')));if(!g.enterStory())throw Error('未进入章节');
  g.advanceStoryDialogue(true);a.refresh();
 });
 await page.waitForSelector('#story-dialog[open]');
 if(await page.locator('#story-done').count())throw Error('仍有重复返回底栏');
 if(!await page.locator('[data-story-command="start"]').isDisabled())throw Error('未选装备仍能出发');
 await page.locator('[data-story-loadout="line-patrol"]').click();await page.locator('[data-story-command="start"]').click();
 await page.waitForFunction(()=>a.game.story.stageId==='Q20'&&a.game.story.phase==='active'&&a.game.state==='playing');checks.push('初次选装后回到游戏正式出发');
 // 用正式整备与启动入口构造守点和领主现场，点击必须真正创建战斗。
 async function prepare(stage){await page.evaluate(stage=>{
  const g=a.game;for(const d of document.querySelectorAll('dialog[open]'))d.close();g.boss=null;g.enemies=[];g.hazards=[];
  Object.assign(g.story,{stageId:stage,phase:'prepare',dialogue:null,combat:null,support:null,activeCue:null,cueQueue:[]});g.state='story';a.refresh();
 },stage);await page.waitForSelector('#story-dialog[open]');}
 for(const stage of ['Q50','Q60']){
  await prepare(stage);await page.locator('[data-story-command="start"]').click();await page.waitForFunction(stage=>a.game.story.stageId===stage&&a.game.story.phase==='active'&&a.game.state==='playing',stage);
  const battle=await page.evaluate(()=>({boss:!!a.game.boss,combat:!!a.game.story.combat,time:a.game.time}));
  if(stage==='Q60'?!battle.boss:!battle.combat)throw Error('返回未创建战斗 '+stage);
  await page.waitForTimeout(150);if(!await page.evaluate(t=>a.game.time>t,battle.time))throw Error('返回后时钟冻结');checks.push(stage+'返回创建战斗并持续运行');
 }
 // 主动暂停后查看任务，以及任务内嵌套说明，都不能让返回落在暂停态。
 await page.evaluate(()=>{a.game.pause();a.refresh();});await openTask();
 await page.locator('[data-story-help="chapter"]').click();await page.locator('#story-help-close').click();
 if(await page.evaluate(()=>a.game.state!=='paused'))throw Error('关闭嵌套说明提前恢复');
 await page.locator('[data-story-command="resume"]').click();await page.waitForFunction(()=>a.game.state==='playing');await page.evaluate(()=>{window.reviewBoss=a.game.boss;});checks.push('主动暂停与嵌套说明后可继续');
 // 关闭按钮依旧只关页，不能未经出发操作自动召唤领主。
 await prepare('Q60');await page.locator('#story-close').click();await page.waitForTimeout(80);
 if(!await page.evaluate(()=>a.game.story.phase==='prepare'&&!a.game.boss))throw Error('关闭整备自动开战');
 await openTask();await page.locator('[data-story-command="start"]').click();await page.waitForFunction(()=>!!a.game.boss);checks.push('关闭保留选择，重新打开后出发仍可开战');
 // 正式对白返回只继续阅读，不跳过台词或直接发起战斗。
 await page.evaluate(()=>{const g=a.game;g.boss=null;g.enemies=[];Object.assign(g.story,{phase:'dialogue',dialogue:'boss',line:0});g.state='story';a.refresh();document.getElementById('story-button').click();});
 await page.locator('#story-close').click();await page.waitForTimeout(80);
 if(!await page.evaluate(()=>a.game.story.phase==='dialogue'&&a.game.story.line===0&&!a.game.boss&&!document.getElementById('story-speech').hidden))throw Error('返回跳过正式对白');checks.push('正式对白仍自动阅读');
 // 战斗截图固定模拟时间，但人物、载具、怪物和气泡均为正式绘制器输出。
 await prepare('Q50');await page.locator('[data-story-command="start"]').click();await page.waitForFunction(()=>a.game.story.phase==='active');
 await page.evaluate(async()=>{
  const g=a.game;window.originalUpdate=g.update;g.update=()=>{};
  const {STORY_SITES}=await import('/src/config/story.js');
  (await import('/src/core/story-encounters.js')).spawnStoryEnemy(g,STORY_SITES.RELAY,0);
  // 走近同伴后保留头顶阅读空间，画外和极短屏另外检查隐藏。
  Object.assign(g.player,{x:STORY_SITES.RELAY.x,y:STORY_SITES.RELAY.y-30});
  Object.assign(g.enemies[0],{x:STORY_SITES.RELAY.x+110,y:STORY_SITES.RELAY.y-100});
  Object.assign(g.story,{activeCue:null,cueQueue:[],cueGap:0,experiences:{},seenCues:[]});
  const j=await import('/src/core/story-journey.js');j.recordStoryEvent(g,'charge-end',{hit:false,travel:80});j.updateStoryCues(g,.01);a.renderer.camera.time=null;a.refresh();
 });
 for(const [width,height] of [[320,568],[390,844],[1280,900]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(async phase=>{
   a.game.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;
   (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);
   a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();
  },phase);await page.waitForTimeout(200);
  const sample=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectNpcChatter(document));const n=sample.nodes.find(n=>n.id==='story-chatter');
  if(!n||n.bottom||n.placement!=='overhead'||n.rect.width>168||Math.abs(n.rect.bottom-n.anchor.y)>1||n.rect.left<sample.frame.left||n.rect.right>sample.frame.right||!sample.menuVisible||sample.overflow||n.pointerEvents!=='none')throw Error('头顶气泡错误 '+JSON.stringify(sample));
  if(!await page.locator('#quest').isVisible()||!await page.locator('.hud-resources').isVisible())throw Error('短句隐藏HUD');
  samples.push({width,height,phase,...sample});await page.screenshot({path:`output/playwright/story-resume-bubbles/${width}-${phase}.png`});
 }
 checks.push('三种尺寸昼夜头顶小气泡、NPC锚点与HUD');
 // 使用先前正式生成的领主，确认冲锋预警期间短句让位。
 await page.evaluate(()=>{a.game.boss=reviewBoss;a.game.boss.ai.phase='windup';a.refresh();});await page.waitForTimeout(100);
 if(!await page.locator('#story-chatter').evaluate(n=>n.hidden))throw Error('冲锋预警未隐藏短句');
 await page.evaluate(()=>{a.game.boss=null;a.refresh();});checks.push('冲锋预警优先');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);
 const before=await page.locator('#story-chatter').evaluate(n=>Number(n.dataset.anchorX));
 await page.evaluate(()=>{a.game.player.x+=25;a.renderer.camera.time=null;a.refresh();});await page.waitForTimeout(200);
 const after=await page.locator('#story-chatter').evaluate(n=>Number(n.dataset.anchorX));if(Math.abs(before-after)<1)throw Error('气泡没有跟随镜头');
 // 避让和隐藏不消耗阅读进度，角色在画外不会冒出底部通知。
 await page.evaluate(()=>{a.game.player.x+=1200;a.renderer.camera.time=null;a.refresh();});await page.waitForTimeout(200);
 if(!await page.locator('#story-chatter').evaluate(n=>n.hidden)||!await page.evaluate(()=>a.game.story.activeCue.visible===false))throw Error('画外短句仍然显示');
 const remaining=await page.evaluate(()=>a.game.story.activeCue.remaining);await page.evaluate(async()=>(await import('/src/core/story-journey.js')).updateStoryCues(a.game,.5));
 if(await page.evaluate(()=>a.game.story.activeCue.remaining)!==remaining)throw Error('隐藏时消耗阅读时间');checks.push('镜头跟随与画外隐藏、不消耗阅读时间');
 await page.evaluate(async()=>{const p=(await import('/src/config/story.js')).STORY_SITES.RELAY;Object.assign(a.game.player,{x:p.x,y:p.y+95});a.renderer.camera.time=null;a.refresh();});
 await page.setViewportSize({width:320,height:296});await page.waitForTimeout(150);if(!await page.locator('#story-chatter').evaluate(n=>n.hidden))throw Error('短屏空间不足仍显示');checks.push('短屏不遮挡操作');
 if(errors.length)throw Error(errors.join('\n'));return {passed:true,checks,samples,errors};
}
