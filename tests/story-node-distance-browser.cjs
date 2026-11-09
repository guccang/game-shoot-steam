// 距离调整实机专项：阶段夹具仅定位场景，正式移动、碰撞、怪物与绘制保持运行。
async(page)=>{
 if(new URL(page.url()).port!=='4287')throw Error('仅允许隔离端口4287');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;window.distanceApp=a;});
 // 初始化已完成导览的检查存档，避免本次测试重复完整新手流程。
 await page.evaluate(()=>{const a=window.distanceApp,g=a.game;g.progress.arrival.phase='complete';g.arrivalScene=null;g.start();a.refresh();});
 for(const [id,stage,site,width,height] of [
  ['sunleaf-01','Q20','SIGN',1280,900],['sunleaf-01','Q50','RELAY',320,568],
  ['sunleaf-03','STOP2','SECOND',390,844],['neighbors-lunch','CLEAR','SECOND',390,844],
  ['sunleaf-05','LIGHT','LIGHT',1280,900],['sunleaf-06','DEFEND','STATION',320,568]]){
  await page.setViewportSize({width,height});
  await page.evaluate(async({id,stage,site})=>{
   const a=window.distanceApp,g=a.game,{STORY_CAMPAIGN}=await import('/src/config/story-campaign.js');
   if(g.story)g.leaveStory();g.progress.story.run=null;g.state='playing';
   for(const required of STORY_CAMPAIGN[id].requires||[])g.progress.story.chapters[required].completed=true;
   const {storyPostForChapter,storyPostApproach}=await import('/src/core/story/story-posts.js');
   Object.assign(g.player,storyPostApproach(storyPostForChapter(g,id)));
   const {enterStory}=await import('/src/core/story/story-manager.js');
   if(!enterStory(g,null,id))throw Error('无法进入 '+id);
   g.advanceStoryDialogue(true);g.chooseStoryLoadout(STORY_CAMPAIGN[id].loadouts[0].id);g.startStoryStage();
   Object.assign(g.story,{stageId:stage,phase:'active',dialogue:null,combat:null,group:0,waypoint:0});
   const center=STORY_CAMPAIGN[id].world.sites[site];Object.assign(g.player,{x:center.x,y:center.y+80});
   const {beginStoryWave,spawnStoryEnemy}=await import('/src/core/story/story-encounters.js');
   beginStoryWave(g,site,6,4);
   for(let i=0;i<2;i++)if(spawnStoryEnemy(g,center,i))g.story.combat.spawned++;
   g.state='playing';for(const d of document.querySelectorAll('dialog[open]'))d.close();
   a.renderer.camera.time=null;a.refresh();a.renderer.draw();
  },{id,stage,site});
  // 真实键盘输入穿过落点侧边，验证场景并非静态预览。
  await page.keyboard.down('d');await page.waitForTimeout(250);await page.keyboard.up('d');
  for(const time of ['day','night']){
   await page.evaluate(time=>{const a=window.distanceApp;
    a.game.progress.living.calendar.elapsed=time==='night'?260000:75000;
    Object.assign(a.environment,{weather:'sun',autoWeather:false,time:time==='day'?'night':'day'});
   },time);
   await page.waitForFunction(time=>window.distanceApp.environment.time===time,time);
   await page.evaluate(async()=>{const a=window.distanceApp;
    a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
    a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
    a.refresh();a.renderer.draw();});
   await page.screenshot({path:`output/playwright/mission-node-distance/${id}-${site}-${width}-${time}.png`});
   samples.push(await page.evaluate(async()=>{const a=window.distanceApp;
    return {...(await import('/src/rendering/visual-review.js')).inspectStoryCampaign(a.game,document),
     navigation:document.getElementById('story-navigation')?.textContent,
     width:innerWidth,time:a.environment.time};}));
  }
 }
 // 路段起点沿目标方向真实移动，验证HUD会随实际距离减少，不是随机显示。
 const before=await page.evaluate(async()=>{const a=window.distanceApp,g=a.game;
  g.leaveStory();g.progress.story.run=null;g.state='playing';
  const {storyPostForChapter,storyPostApproach}=await import('/src/core/story/story-posts.js');
  Object.assign(g.player,storyPostApproach(storyPostForChapter(g,'sunleaf-01')));g.enterStory('sunleaf-01');
  g.advanceStoryDialogue(true);g.chooseStoryLoadout('line-patrol');g.startStoryStage();
  Object.assign(g.story,{stageId:'Q30',routeId:'road',phase:'active',dialogue:null,combat:null,group:0});
  // 跟随正式站点坐标，避免验收夹具仍停留在旧版600米路段。
  Object.assign(g.player,(await import('/src/config/story.js')).STORY_SITES.SIGN);delete g.player.arena;g.state='playing';
  for(const d of document.querySelectorAll('dialog[open]'))d.close();a.refresh();
  return Number(document.getElementById('story-navigation').dataset.distance);
 });
 await page.keyboard.down('d');await page.waitForTimeout(500);await page.keyboard.up('d');
 const after=await page.evaluate(()=>Number(document.getElementById('story-navigation').dataset.distance));
 if(!(before>=1000&&before<=2000&&after<before))throw Error(`实际移动距离没有减少：${before}→${after}`);
 if(errors.length)throw Error(errors.join('\n'));
 return {passed:true,before,after,samples,errors};
}
