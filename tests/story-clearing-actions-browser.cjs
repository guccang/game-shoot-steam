// 手机实际交互验证：章节阶段操作与第五轮起的清缴结算续接。
async page=>{
 if(new URL(page.url()).port!=='4309')throw Error('仅允许隔离端口4309');
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),t=await context.newPage(),errors=[],checks=[];
 t.on('pageerror',e=>errors.push(e.message));await t.goto('http://localhost:4309');await t.locator('#start').tap();
 await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;});
 // 每个案例重建合法已修复档案，冻结主循环但仍通过正式规则完成五批怪物与领主。
 async function setup(round){await t.evaluate(async round=>{
  const {freshProgress,validateProgress}=await import('/src/progression/progress.js'),p=freshProgress();
  p.arrival={version:2,phase:'complete',keys:true};p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
  p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.bosses=round-1;
  const g=a.game;for(const d of document.querySelectorAll('dialog[open]'))d.close();g.story=null;g.storyForest=null;g.realm=null;g.progress=validateProgress(p);g.reset();g.state='playing';g.mainlineSpeech=null;g.update=()=>{};
  const approach=(await import('/src/config/clearing.js')).CLEARING_APPROACH;Object.assign(g.player,{x:approach.x,y:approach.y});
  if(!(await import('/src/core/clearing-guide.js')).acceptClearingPost(g).ok)throw Error('告示牌接取失败');
  const s=g.progress.living.clearingSite;Object.assign(g.player,{x:s.x,y:s.y});
  for(let i=0;i<600&&!g.boss;i++){g.updateWaves(.5);for(const e of g.enemies.filter(e=>e.hp>0))g.hit(e,1e9);}
  if(!g.boss)throw Error('领主未出现');g.hit(g.boss,1e9);a.refresh();
 },round);await t.locator('#task-reward-dialog').waitFor({state:'visible'});}
 // 昼夜只调整正式环境投影，界面和世界都使用实际应用绘制器。
 async function light(phase){await t.evaluate(async phase=>{
  const g=a.game;g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;
  (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);
  a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();a.renderer.draw();
 },phase);}
 for(const round of [4,5,6]){
  await setup(round);
  if(await t.locator('#task-reward-next-clearing').isVisible()!==(round>=5))throw Error('续接门槛错误 '+round);
  if(round===4){if(!await t.locator('#task-reward-return-camp').isVisible())throw Error('缺少回营提示');await t.locator('#task-reward-close').tap();continue;}
  if(round===5){
   for(const [width,height]of [[320,568],[390,844],[844,390]])for(const phase of ['day','night']){
    await t.setViewportSize({width,height});await light(phase);await t.locator('#task-reward-next-clearing').scrollIntoViewIfNeeded();
    const b=await t.locator('#task-reward-next-clearing').boundingBox();if(b.height<44||b.x<0||b.x+b.width>width||b.y+b.height>height)throw Error('续接触控区越界');
    await t.screenshot({path:`output/playwright/story-clearing-actions/clearing-${width}-${phase}.png`});
   }
   await t.evaluate(()=>{window.persist=a.game.livingPersist;a.game.livingPersist=()=>false;});await t.locator('#task-reward-next-clearing').tap();
   if(!await t.locator('#task-reward-error').textContent()||!await t.locator('#task-reward-dialog').isVisible())throw Error('保存失败未留在面板');
   await t.evaluate(()=>{a.game.livingPersist=window.persist;});
  }
  const before=await t.evaluate(()=>({x:a.game.player.x,y:a.game.player.y,xp:a.game.progress.campLevel.xp}));
  await t.locator('#task-reward-next-clearing').tap();await t.waitForFunction(()=>a.game.state==='playing'&&a.game.progress.living.patrolActive);
  const accepted=await t.evaluate(async before=>{const g=a.game,s=g.progress.living.clearingSite,goal=(await import('/src/core/world-navigation.js')).worldNavigationObjective(g);if(Math.hypot(s.origin.x-before.x,s.origin.y-before.y)>1e-6||g.progress.campLevel.xp!==before.xp||goal.site.x!==s.x||goal.site.y!==s.y)throw Error('续接位置、奖励或导航错误');return s;},before);
  checks.push({round,accepted});
 }
 // 普通奖励不会遗留续接按钮，仍自动关闭。
 await t.evaluate(()=>a.game.onEvent('task-reward',{title:'普通任务奖励',reward:{coins:1}}));await t.locator('#task-reward-dialog').waitFor({state:'visible'});
 if(await t.locator('#task-reward-next-clearing').isVisible())throw Error('普通奖励带续接按钮');await t.locator('#task-reward-dialog').waitFor({state:'hidden',timeout:5000});
 // 正式进入第六章，再将任务定位至截图中的已读结尾，点击原完成按钮。
 await t.setViewportSize({width:390,height:844});await t.evaluate(async()=>{
  const g=a.game;g.progress.living.patrolActive=false;for(const [id,r]of Object.entries(g.progress.story.chapters))if(id!=='sunleaf-06'){r.completed=true;r.rewardClaimed=true;}
  const posts=await import('/src/core/story-posts.js');Object.assign(g.player,posts.storyPostApproach(posts.storyPostForChapter(g,'sunleaf-06')));
  if(!g.enterStory('sunleaf-06'))throw Error('第六章进入失败');
  Object.assign(g.story,{stageId:'END',phase:'prepare',dialogue:null,readLines:['ending']});g.state='story';a.refresh();document.getElementById('story-button').click();
 });await t.locator('[data-story-command="claim"]').waitFor({state:'visible'});
 if(await t.locator('#story-done').count()||await t.locator('#story-dialog > .ui-panel__footer').count())throw Error('重复返回底栏未移除');
 for(const [width,height]of [[320,568],[390,844],[844,390]])for(const phase of ['day','night']){
  await t.setViewportSize({width,height});await light(phase);await t.locator('[data-story-command="claim"]').scrollIntoViewIfNeeded();
  await t.screenshot({path:`output/playwright/story-clearing-actions/story-${width}-${phase}.png`});
 }
 await t.locator('[data-story-command="claim"]').tap();await t.waitForFunction(()=>!a.game.story&&a.game.progress.story.chapters['sunleaf-06'].completed);checks.push('第六章完成并返回森林');
 await t.locator('#task-reward-dialog').waitFor({state:'hidden',timeout:5000});
 // 选择装备后用正文出发，关闭按钮仍只关页；正文继续可恢复主动暂停。
 await t.evaluate(async()=>{
  for(const d of document.querySelectorAll('dialog[open]'))d.close();const g=a.game,posts=await import('/src/core/story-posts.js');
  Object.assign(g.player,posts.storyPostApproach(posts.storyPostForChapter(g,'sunleaf-01')));if(!g.enterStory('sunleaf-01'))throw Error('第一章进入失败');g.advanceStoryDialogue(true);a.refresh();
 });await t.locator('[data-story-command="start"]').waitFor({state:'visible'});
 await t.locator('[data-story-loadout="line-patrol"]').tap();await t.locator('#story-close').tap();
 if(await t.evaluate(()=>a.game.story.phase!=='prepare'))throw Error('关闭自动开战');
 await t.evaluate(()=>document.getElementById('story-button').click());await t.locator('[data-story-command="start"]').tap();await t.waitForFunction(()=>a.game.story.phase==='active'&&a.game.state==='playing');
 await t.evaluate(()=>{a.game.pause();document.getElementById('story-button').click();});await t.locator('[data-story-command="resume"]').tap();await t.waitForFunction(()=>a.game.state==='playing');checks.push('整备出发与暂停继续正常');
 if(errors.length)throw Error(errors.join('\n'));await context.close();await page.evaluate(r=>window.actionsResult=r,{checks,errors});
}
