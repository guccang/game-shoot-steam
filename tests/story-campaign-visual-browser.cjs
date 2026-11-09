// 多章最终昼夜同屏：阶段夹具固定场景，正式渲染器、载具和机械猫仍正常运行。
async(page)=>{
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 if(new URL(page.url()).port!=='4224')throw Error('仅允许隔离端口4224');await page.reload();
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;window.campaignApp=a;});
 for(const [id,stage,loadout,site,width,height] of [['sunleaf-02','SAIL','tide-arc','WATER',320,568],['sunleaf-03','STOP2','frost-guard','SECOND',390,844],['sunleaf-04','REPAIR','little-team','THIRD',1280,900],['sunleaf-05','LAND','canopy-light','FAR',390,844],['sunleaf-06','GUARD','line-patrol','STATION',1280,900]]){
  await page.setViewportSize({width,height});
  await page.evaluate(async({id,stage,loadout,site})=>{const a=window.campaignApp,g=a.game;
   if(g.story)g.leaveStory();g.progress.story.run=null;g.enemies=[];g.boss=null;g.state='playing';Object.assign(g.player,{x:900,y:700,hp:120});
   for(const d of document.querySelectorAll('dialog[open]'))d.close();
   if(!g.enterStory(id))throw Error('无法接取 '+id);g.advanceStoryDialogue(true);g.chooseStoryLoadout(loadout);g.startStoryStage();
   const def=(await import('/src/core/story/story-definition.js')).storyDefinition(g);
   Object.assign(g.story,{stageId:stage,phase:stage==='GUARD'?'prepare':'active',dialogue:null,group:0,waypoint:0,combat:null});
   Object.assign(g.player,def.world.sites[site]);if(id==='sunleaf-03'||id==='sunleaf-04')g.player.y+=70;if(id==='sunleaf-03')g.player.x-=70;g.state='playing';if(stage==='GUARD')g.startStoryStage();
   a.refresh();for(const d of document.querySelectorAll('dialog[open]'))d.close();g.state='playing';a.renderer.draw();},{id,stage,loadout,site});
  await page.waitForTimeout(id==='sunleaf-04'?2500:500);
  for(const time of ['day','night']){
   await page.evaluate(async(time)=>{const a=window.campaignApp;Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);a.refresh();a.renderer.draw();},time);
   await page.screenshot({path:`output/playwright/story-campaign/scene-${id}-${time}.png`});
   const sample=await page.evaluate(async()=>{const a=window.campaignApp;return (await import('/src/rendering/visual-review.js')).inspectStoryCampaign(a.game,document);});
   if(sample.chapter!==id||sample.art.bytes>sample.art.limit)throw Error('章节或资源预算不符');samples.push({id,time,width,...sample});
  }
 }
 // 命名选项在最窄屏幕可见，点选后气泡会读出真实名字。
 await page.setViewportSize({width:320,height:568});
 await page.evaluate(async()=>{const a=window.campaignApp,g=a.game;g.leaveStory();g.progress.story.run=null;g.state='playing';Object.assign(g.player,{x:900,y:700});g.enterStory('sunleaf-04');g.advanceStoryDialogue(true);g.chooseStoryLoadout('little-team');g.startStoryStage();Object.assign(g.story,{stageId:'NAME',phase:'prepare'});Object.assign(g.player,{x:480,y:1540});g.state='story';a.refresh();});
 await page.locator('[data-story-option="lamp"]').waitFor({state:'visible'});await page.screenshot({path:'output/playwright/story-campaign/name-choice-320.png'});
 await page.locator('[data-story-option="lamp"]').click();await page.locator('#story-speech').waitFor({state:'visible'});
 if(!(await page.locator('#story-speech-text').textContent()).includes('小灯'))throw Error('对白未使用所选名字');
 await page.screenshot({path:'output/playwright/story-campaign/named-bubble-320.png'});
 await page.evaluate(()=>{const a=window.campaignApp;a.game.leaveStory();a.game.progress.story.run=null;a.save();a.refresh();});
 if(errors.length)throw Error(errors.join('\n'));return {passed:true,samples,errors};
}
