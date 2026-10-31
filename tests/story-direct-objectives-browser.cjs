// 道路选择移除后的正式界面：第一章固定遭遇与第六章目标导航，旧检查点可继续。
async page=>{
 const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;window.routeModule=await import('/src/core/story-route.js');window.realUpdate=a.game.update.bind(a.game);a.game.update=()=>{};});
 for(const [id,loadout] of [['sunleaf-01','line-patrol'],['sunleaf-06','line-patrol'],['sunleaf-06','tide-arc'],['sunleaf-06','canopy-light']]){
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(async({id,loadout})=>{
   const g=a.game;if(g.story)g.leaveStory();g.progress=(await import('/src/progression/progress.js')).freshProgress();
   const def=(await import('/src/config/story-campaign.js')).STORY_CAMPAIGN[id];g.progress.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);for(const key of def.requires||[])g.progress.story.chapters[key].completed=true;
   g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;const posts=await import('/src/core/story-posts.js');Object.assign(g.player,posts.storyPostApproach(posts.storyPostForChapter(g,id)));
   if(!g.enterStory(id))throw Error('无法进入章节');g.advanceStoryDialogue(true);g.chooseStoryLoadout(loadout);g.startStoryStage();
   if(id==='sunleaf-01'){const {runStoryActions}=await import('/src/core/story-manager.js');Object.assign(g.player,def.world.sites.SIGN);runStoryActions(g,[{type:'dialogue',id:'sign'}]);g.advanceStoryDialogue(true);}
   a.renderer.camera.time=null;g.update=realUpdate;a.refresh();
  },{id,loadout});
  // 在同一次帧查询中记录已连通路径，避免第二次查询刚好落在增量重算帧。
  await page.waitForFunction(()=>{const g=a.game,r=routeModule.storyRouteState(g);if(!r?.reachable)return false;window.directRouteResult={phase:g.story.phase,objective:g.storyObjective(),points:r.points.length,reachable:r.reachable,routeButtons:document.querySelectorAll('[data-story-route]').length,openDialogs:[...document.querySelectorAll('dialog[open]')].map(d=>d.id)};return true;},null,{timeout:20000});
  const result=await page.evaluate(()=>directRouteResult);
  if(result.phase!=='active'||result.routeButtons||result.openDialogs.length||result.objective.site!==(id==='sunleaf-01'?'ROAD1':'WEST'))throw Error(JSON.stringify(result));
  await page.mouse.move(5,839);await page.screenshot({path:`output/playwright/boss-repair-flow/direct-${id}-${loadout}.png`});results.push({id,loadout,...result});
 }
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
