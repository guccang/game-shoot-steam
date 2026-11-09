// 红狼使用真实键盘驾驶碾压三棵任务树，炮火不能抢先完成；昼夜截图来自正式绘制器。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.reload();await page.locator('#start').click();await page.evaluate(async()=>await(await import('/src/main.js')).application.ready);await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;for(const d of document.querySelectorAll('dialog[open]'))d.close();if(g.story)g.leaveStory();g.progress.story.run=null;g.state='playing';g.mainlineTalkDelay=999;
  const def=(await import('/src/config/story-campaign.js')).STORY_CAMPAIGN['equipment-red-wolf'];for(const key of def.requires)g.progress.story.chapters[key].completed=true;
  const posts=await import('/src/core/story/story-posts.js');Object.assign(g.player,posts.storyPostApproach(posts.storyPostForChapter(g,def.id)));if(!g.enterStory(def.id))throw Error('接取失败');g.advanceStoryDialogue(true);g.chooseStoryLoadout(def.loadouts[0].id);g.startStoryStage();
  (await import('/src/core/story/story-manager.js')).runStoryActions(g,[{type:'stage',id:'TIMBER',phase:'active'}]);const site=def.world.sites.FIRST;Object.assign(g.player,{x:site.x,y:site.y+65});a.refresh();
 });
 await page.waitForTimeout(2500);
 const samples=[];for(const time of ['day','night']){
  await page.evaluate(async time=>{const a=(await import('/src/main.js')).application;Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);a.renderer.draw();},time);
  await page.screenshot({path:`output/playwright/equipment-quests/equipment-red-wolf-${time}.png`});
  const sample=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return(await import('/src/rendering/visual-review.js')).inspectEquipmentNeighborStories(a.game,document);});
  if(sample.taskTrees.length!==3||sample.taskTrees.some(t=>t.hp<=0))throw Error('驾驶前任务树被毁');samples.push({time,...sample});
 }
 // 每帧读取下一棵活树方向，以键盘控制实际移动，不直接改坐标或生命值。
 let steps=0;while(steps++<100){
  const d=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game,t=g.story?.timberTrees?.find(t=>t.hp>0);return t?{x:t.x-g.player.x,y:t.y-g.player.y}:null;});if(!d)break;
  const keys=[];if(Math.abs(d.x)>15)keys.push(d.x>0?'ArrowRight':'ArrowLeft');if(Math.abs(d.y)>15)keys.push(d.y>0?'ArrowDown':'ArrowUp');
  if(!keys.length)throw Error('到达树干仍未碾碎');for(const key of keys)await page.keyboard.down(key);await page.waitForTimeout(100);for(const key of keys)await page.keyboard.up(key);
 }
 const result=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return {stage:g.story?.stageId,roadCleared:g.story?.flags.roadCleared,trees:g.story?.timberTrees?.map(t=>t.hp)};});
 if(!result.roadCleared||result.stage!=='CLEAR'||errors.length)throw Error(JSON.stringify({result,errors,steps}));await page.screenshot({path:'output/playwright/equipment-quests/red-wolf-cleared.png'});return{samples,result,steps,errors};
}
