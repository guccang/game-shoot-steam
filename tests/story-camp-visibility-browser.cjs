// 第二章实际接取与恢复检查：故事仅叠加任务内容，营地永久建筑不随节点消失。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[],checks=[];page.setDefaultTimeout(12000);
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 try{
  await page.goto(original.url()||'http://localhost:4175');
  await page.evaluate(async()=>{
   const a=(await import('/src/main.js')).application;a.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS;p.mainline.phase='complete';
   p.restoration.repaired=['story','cottage'];p.story.chapters['sunleaf-01'].completed=true;
   const {STORAGE_KEYS,WORLD_SAVE_REVISION}=await import('/src/platform/storage.js');localStorage.setItem(STORAGE_KEYS.worldRevision,WORLD_SAVE_REVISION);
   localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));localStorage.setItem('forest-patrol-audio-v1',JSON.stringify({enabled:false}));
  });
  await page.reload();await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;
   const {storyPostForChapter,storyPostApproach}=await import('/src/core/story/story-posts.js');
   Object.assign(a.game.player,storyPostApproach(storyPostForChapter(a.game,'sunleaf-02')));a.game.enemies=[];a.game.boss=null;a.game.mainlineSpeech=null;a.refresh();
  });
  // 从正式任务目录接取第二章，不直接设置故事会话。
  if(!await page.locator('#story-button').isVisible())await page.getByRole('button',{name:'展开功能菜单'}).tap();
  await page.locator('#story-button').tap();await page.locator('[data-story-chapter="sunleaf-02"]').tap();
  await page.locator('[data-story-command="enter"]').tap();await page.locator('#story-speech').waitFor({state:'visible'});await page.locator('#story-speech-pause').tap();
  // 读取正式绘制器已使用的场景，不另外生成示意建筑。
  async function check(label){
   const result=await page.evaluate(async()=>{
    const review=await import('/src/rendering/visual-review.js'),{restorationBuildingVisible}=await import('/src/rendering/town-restoration.js');
    return {...await review.inspectStoryCampReturn(a.renderer,document),garageVisible:restorationBuildingVisible(a.renderer.campScene,'garage'),repaired:a.game.progress.restoration.repaired};
   });
   if(!result.campVisible||!result.seedShop||!result.facilities.includes('camp')||result.garageVisible||result.overflow)throw Error(label+JSON.stringify(result));
   checks.push({label,...result});return result;
  }
  for(const [width,time] of [[320,'day'],[390,'night']]){
   await page.setViewportSize({width,height:844});
   await page.evaluate(async time=>{
    const timing=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);
    a.game.progress.living.calendar.elapsed=timing.start+timing.duration/2;
    (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);
    Object.assign(a.environment,{weather:'sun',autoWeather:false});
    a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
    a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.draw();
   },time);
   await check('接取对白-'+width+'-'+time);await page.screenshot({path:`output/playwright/story-camp-visibility/entry-${width}-${time}.png`});
  }
  await page.locator('#story-speech-skip').tap();await page.waitForTimeout(150);await check('准备出发');
  // 借用装备与出发使用游戏公开动作，持续运行原更新循环验证碰撞开关。
  await page.evaluate(async()=>{
   const def=(await import('/src/core/story/story-definition.js')).storyDefinition(a.game);
   if(!a.game.chooseStoryLoadout(def.loadouts[0].id)||!a.game.startStoryStage())throw Error('无法出发');a.refresh();
  });
  if(await page.locator('#story-dialog').isVisible())await page.locator('#story-close').tap();
  await page.waitForFunction(()=>a.game.state==='playing'&&a.game.player.livingCollision===true);await check('出发取药');
  // 刷新实际存档仍处于第二章，并保持永久建筑视图。
  await page.reload();await page.locator('#start').tap();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
  await page.waitForFunction(()=>a.game.story?.chapterId==='sunleaf-02'&&!!a.renderer.campScene);await check('刷新恢复');
  await page.screenshot({path:'output/playwright/story-camp-visibility/resumed.png'});
  await page.evaluate(()=>{a.game.leaveStory();a.refresh();a.renderer.draw();});
  if(!await page.evaluate(()=>!a.game.story&&a.game.progress.story.chapters['sunleaf-02'].completed===false))throw Error('暂离错误交付章节');
  if(errors.length)throw Error(errors.join('\n'));return {checks,errors};
 }finally{await context.close();}
}
