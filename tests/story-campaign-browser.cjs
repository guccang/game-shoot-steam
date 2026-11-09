// 故事目录与真实游玩专项：隔离端口；自然水路/飞行/部署与检查点清场夹具明确分开。
async(page)=>{
  // 章节内目标仍用原交互按钮；世界目录入口改为可见的故事菜单。
  async function openWorldStory(){
    if(!await page.locator('#story-button').isVisible())await page.getByRole('button',{name:'展开功能菜单'}).click();
    await page.locator('#story-button').click();
  }
 if(new URL(page.url()).port!=='4224')throw Error('仅允许隔离端口4224');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();});await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.campaignApp=(await import('/src/main.js')).application;});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.progress.story.chapters['sunleaf-01'].completed=true;a.save();});
 await openWorldStory();
 if(await page.locator('[data-story-chapter]').count()!==8)throw Error('目录缺少故事');
 if(!await page.locator('[data-story-chapter="sunleaf-03"]').isDisabled())throw Error('未完成前章却开放后章');
 if(!await page.locator('.story-catalog').evaluate(n=>n.open))await page.locator('.story-catalog summary').click();await page.screenshot({path:'output/playwright/story-campaign/catalog.png'});
 // 公开意图与正式配额清场夹具用于走完重复战斗，不把这些击杀记为自然试射。
 await page.evaluate(async()=>{
  window.finishStoryFixture=async()=>{const a=(await import('/src/main.js')).application,g=a.game;
   const {storyDefinition,storyNode}=await import('/src/core/story/story-definition.js'),{updateStory}=await import('/src/core/story/story-manager.js');
   for(const d of document.querySelectorAll('dialog[open]'))d.close();
   for(let i=0;i<20000&&g.story;i++){const r=g.story,n=storyNode(g),def=storyDefinition(g);
    if(r.dialogue){g.advanceStoryDialogue(true);continue;}
    if(r.phase==='prepare'){
     if(n.claimWhen){if(!g.claimStory())throw Error('交付失败');continue;}
     if(n.choice){g.chooseStoryOption('echo');continue;}
     if(n.routeChoice&&!r.routeId){g.chooseStoryRoute('bank');continue;}
     if(n.loadout){g.chooseStoryLoadout(r.loadoutId||def.loadouts[0].id);g.startStoryStage();continue;}
     throw Error('未知准备状态 '+r.stageId);
    }
    g.state='playing';Object.assign(g.player,def.world.sites[g.storyObjective().site]);
    if(n.task.type==='landing'&&g.vehicle.active)g.dismountVehicle();
    for(const e of g.enemies)if(e.hp>0)g.hit(e,1e6);g.enemies=g.enemies.filter(e=>e.hp>0);
    if(g.storyObjective().action&&!r.interacting)g.interactStory();updateStory(g,.1);
   }
   if(g.story)throw Error('故事未结束');a.save();a.refresh();return {story:g.story,props:(await import('/src/rendering/story-props.js')).storyObjects(g).length};
  };
 });
 // 五个新主线从目录真实接取；每章都观察正式剧情气泡。
 for(const [id,loadout,width,height] of [['sunleaf-02','tide-arc',390,844],['sunleaf-03','frost-guard',320,568],['sunleaf-04','little-team',1280,900],['sunleaf-05','canopy-light',390,844],['sunleaf-06','line-patrol',1280,900]]){
  await page.setViewportSize({width,height});
  if(!await page.locator('#story-dialog').evaluate(n=>n.open)){
   await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.state='playing';Object.assign(a.game.player,{x:900,y:700});a.refresh();});
   await page.locator('#story-interact').click();
  }
  if(!await page.locator('.story-catalog').evaluate(n=>n.open))await page.locator('.story-catalog summary').click();
  await page.locator(`[data-story-chapter="${id}"]`).click();await page.locator('[data-story-command="enter"]').click();await page.locator('#story-speech').waitFor({state:'visible'});
  for(const time of ['day','night']){
   await page.evaluate(async(time)=>{const a=(await import('/src/main.js')).application;Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);a.renderer.draw();a.refresh();},time);
   await page.screenshot({path:`output/playwright/story-campaign/${id}-${time}.png`});
  }
  await page.locator('#story-speech-skip').click();await page.locator(`[data-story-loadout="${loadout}"]`).click();await page.locator('[data-story-command="start"]').click();
  if(id==='sunleaf-02'){
   // 只把玩家放到渡口交谈点，试航由真实键盘连续移动完成。
   await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;Object.assign(a.game.player,{x:1050,y:1000});a.refresh();});
   await page.locator('#story-interact').click();await page.locator('#story-speech').waitFor({state:'visible'});await page.locator('#story-speech-skip').click();
   await page.waitForTimeout(250);await page.keyboard.down('KeyD');await page.waitForFunction(()=>(window.campaignApp.game.story.waypoint||0)===1,null,{timeout:6000});await page.keyboard.up('KeyD');
   const water=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return {x:g.player.x,amphibious:g.player.amphibious};});if(!water.amphibious||water.x<1170)throw Error('没有实际进入水面');
   await page.screenshot({path:'output/playwright/story-campaign/actual-water.png'});
   await page.keyboard.down('KeyA');await page.waitForFunction(()=>window.campaignApp.game.story.stageId==='ROUTE',null,{timeout:6000});await page.keyboard.up('KeyA');
   await page.locator('[data-story-route="water"]').click();
   await page.waitForTimeout(250);await page.keyboard.down('KeyD');await page.waitForFunction(()=>window.campaignApp.game.story.stageId==='SHORE',null,{timeout:7000});await page.keyboard.up('KeyD');
   if(!await page.locator('#map-button').isVisible())await page.getByRole('button',{name:'展开功能菜单'}).click();await page.locator('#map-button').click();if(!(await page.locator('#map-description').textContent()).includes('药箱'))throw Error('地图仍读取第一章');await page.screenshot({path:'output/playwright/story-campaign/ferry-map.png'});await page.locator('#map-done').click();samples.push({id,water});
  }
  if(id==='sunleaf-04'){
   // 正式机械部署与近战命中；靶标仅固定位置和生命，事件不直接注入。
   await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;Object.assign(g.player,{x:630,y:1040});const e=g.spawnEnemy(0,0,{x:g.player.x+50,y:g.player.y},{bossOwner:'story'});Object.assign(e,{story:true,football:true,flying:false,species:'slime',mass:1000,hp:2000,maxHp:2000,damage:0,speed:0});a.refresh();});
   await page.waitForFunction(()=>window.campaignApp.game.story.experiences?.['team-strike'],null,{timeout:15000});
   const deployed=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return {active:g.mechanical.nodes.filter(n=>n.ready).length,experience:g.story.experiences['team-strike']};});samples.push({id,deployed});
   await page.screenshot({path:'output/playwright/story-campaign/actual-team.png'});
  }
  if(id==='sunleaf-05'){
   // 飞行从河西出发，真实按键飞越水域，到落点后用正式载具按钮下机。
   await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;Object.assign(a.game.player,{x:1050,y:1000});a.refresh();});
   await page.waitForTimeout(250);await page.keyboard.down('KeyD');await page.waitForFunction(()=>window.campaignApp.game.story.stageId==='LAND',null,{timeout:7000});await page.keyboard.up('KeyD');
   await page.screenshot({path:'output/playwright/story-campaign/actual-flight.png'});await page.locator('#vehicle-button').click();
   await page.waitForFunction(()=>window.campaignApp.game.story.stageId==='REPORT');
   const landing=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return {flying:g.player.flying,active:g.vehicle.active};});samples.push({id,landing});
  }
  const completion=await page.evaluate(()=>window.finishStoryFixture());samples.push({id,completion});
  if(completion.story||completion.props)throw Error('完成后残留章节实体');
 }
 // 命名及完成账本在刷新后继续存在；后续目录全部可选。
 await page.reload();await page.evaluate(async()=>{await (await import('/src/main.js')).application.ready;});
 const saved=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return g.progress.story;});
 for(const id of ['sunleaf-02','sunleaf-03','sunleaf-04','sunleaf-05','sunleaf-06'])if(!saved.chapters[id].completed)throw Error('完成记录未保存 '+id);
 if(saved.chapters['sunleaf-04'].choices.companion!=='echo')throw Error('名字丢失');
 if(errors.length)throw Error(errors.join('\n'));
 return {passed:true,samples,errors};
}
