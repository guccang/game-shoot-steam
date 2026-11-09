// 阶段夹具采样正式昼夜绘制与触控；不把定位或清场夹具当作自然通关。
async page=>{
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.reload();await page.locator('#start').click();await page.evaluate(async()=>await (await import('/src/main.js')).application.ready);
 // 每种手机尺寸检查一项实际购买条件与触控下限，另保留桌面中的原竖版容器。
 for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[844,390],[1280,900]]){
  await page.setViewportSize({width,height});
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;for(const d of document.querySelectorAll('dialog[open]'))d.close();g.state='playing';g.mainlineTalkDelay=999;a.workshop.open('vehicle',6);a.refresh();});
  const layout=await page.locator('#workshop-dialog').evaluate(el=>{const c=el.querySelector('#ws-story-condition'),b=el.querySelector('#ws-purchase'),r=c.getBoundingClientRect(),p=b.getBoundingClientRect();return {height:r.height,button:p.height,overlap:r.left<p.right-1&&r.right>p.left+1&&r.top<p.bottom-1&&r.bottom>p.top+1,overflow:el.scrollWidth>el.clientWidth+2};});
  if(layout.height<44||layout.button<44||layout.overlap||layout.overflow)throw Error('工坊布局异常 '+JSON.stringify({width,height,...layout}));
  await page.screenshot({path:`output/playwright/equipment-quests/vehicle-condition-${width}x${height}.png`});samples.push({width,height,layout});
 }
 const scenes=[['equipment-gravity','CLEAR'],['equipment-water','WATER'],['equipment-frost','COOL'],['equipment-spider','FIRST'],['equipment-red-wolf','TIMBER'],['equipment-jinbei','CLEAR']];
 for(const [id,stage] of scenes)for(const time of ['day','night']){
  await page.setViewportSize({width:time==='day'?390:320,height:time==='day'?844:640});
  await page.evaluate(async({id,stage,time})=>{const a=(await import('/src/main.js')).application,g=a.game;
   for(const d of document.querySelectorAll('dialog[open]'))d.close();if(g.story)g.leaveStory();g.progress.story.run=null;g.state='playing';g.enemies=[];g.boss=null;g.mainlineTalkDelay=999;
   const {STORY_CAMPAIGN}=await import('/src/config/story-campaign.js'),def=STORY_CAMPAIGN[id];for(const key of def.requires)g.progress.story.chapters[key].completed=true;
   const posts=await import('/src/core/story/story-posts.js');Object.assign(g.player,posts.storyPostApproach(posts.storyPostForChapter(g,id)));
   if(!g.enterStory(id))throw Error('接取失败 '+id);g.advanceStoryDialogue(true);g.chooseStoryLoadout(def.loadouts[0].id);g.startStoryStage();
   (await import('/src/core/story/story-manager.js')).runStoryActions(g,[{type:'stage',id:stage,phase:'active'}]);const site=def.world.sites[def.nodes[stage].objective.site];Object.assign(g.player,{x:site.x,y:site.y+65});
   Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);a.refresh();a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);a.renderer.draw();
  },{id,stage,time});
  if(['WATER','COOL'].includes(stage)){await page.locator('#story-interact').click();await page.waitForTimeout(250);}else await page.waitForTimeout(2200);
  await page.screenshot({path:`output/playwright/equipment-quests/${id}-${time}.png`});
  const sample=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return {...(await import('/src/rendering/visual-review.js')).inspectEquipmentNeighborStories(a.game,document),spider:!!a.game.spider?.mother.ready,crew:a.game.vehicle?.crew?.nodes?.filter(n=>n.ready).length};});
  if(sample.overflow)throw Error('场景横向溢出');samples.push({id,time,...sample});
 }
 // 真实触摸拖动仍能驾驶金杯，不因故事UI或战斗圈失去控制。
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 const before=await page.evaluate(async()=>{const p=(await import('/src/main.js')).application.game.player;return {x:p.x,y:p.y};});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:60,y:460}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:100,y:460}]});await page.waitForTimeout(500);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
 const moved=await page.evaluate(async b=>{const p=(await import('/src/main.js')).application.game.player;return Math.hypot(p.x-b.x,p.y-b.y);},before);if(moved<5)throw Error('手机触控驾驶失效');
 if(errors.length)throw Error(errors.join(';'));return {samples,moved,errors};
}
