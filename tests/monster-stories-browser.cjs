// 实机专项：真实点击接取/对白/整备/交付/选奖；路点移动与清场为显式加速夹具。
async(page)=>{
 if(new URL(page.url()).port!=='4230')throw Error('仅允许隔离端口4230');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1280,height:900});
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();});await page.reload();
 await page.evaluate(async()=>{window.neighborApp=(await import('/src/main.js')).application;await neighborApp.ready;});
 if(await page.locator('#start').isVisible())await page.locator('#start').click();else if(await page.locator('#resume').isVisible())await page.locator('#resume').click();
 await page.evaluate(()=>{const a=neighborApp,g=a.game;Object.assign(g.player,{x:650,y:1840,invincible:999});g.enemies=[];g.waveWarning=0;g.spawnTimer=999;g.encounterTimer=999;a.renderer.camera.time=null;a.renderer.draw();a.refresh();});
 await page.locator('[data-story-post="monster-neighbors"]').click();
 if(await page.locator('[data-story-chapter]').count()!==3)throw Error('本地故事目录数量错误');
 if(!await page.locator('[data-story-prize="firefly"]').isDisabled())throw Error('未完成时可以领取');
 await page.screenshot({path:'output/playwright/monster-stories/catalog-desktop.png'});
 // 各篇独立选择，最后一篇交付必须自动回到同一委托板展示可领奖状态。
 for(const id of ['neighbors-lunch','neighbors-night','neighbors-market']){
  await page.locator('[data-story-chapter="'+id+'"]').click();await page.locator('[data-story-command="enter"]').click();
  let iterations=0;
  while(await page.evaluate(()=>!!neighborApp.game.story)){
   if(++iterations>25)throw Error('故事流程挂起 '+id);
   const state=await page.evaluate(()=>({dialogue:neighborApp.game.story.dialogue,phase:neighborApp.game.story.phase,stage:neighborApp.game.story.stageId}));
   if(state.dialogue){
    await page.locator('#story-speech').waitFor({state:'visible'});
    if(state.stage==='SERVE'||state.stage==='ASK'){
     await page.screenshot({path:'output/playwright/monster-stories/'+id+'-dialogue.png'});
    }
    await page.locator('#story-speech-skip').click();
   }else if(state.phase==='prepare'){
    if(state.stage==='END'){await page.locator('[data-story-command="claim"]').click();}
    else {await page.locator('[data-story-loadout]').first().click();await page.locator('[data-story-command="start"]').click();}
   }else{
    await page.evaluate(async()=>{
     const a=neighborApp,g=a.game,{updateStory}=await import('/src/core/story-manager.js'),{storyDefinition}=await import('/src/core/story-definition.js');
     for(let i=0;i<5000&&g.story?.phase==='active';i++){
      g.state='playing';g.player.invincible=999;const o=g.storyObjective();Object.assign(g.player,storyDefinition(g).world.sites[o.site]);
      for(const e of g.enemies)if(e.hp>0)g.hit(e,1e6);g.enemies=g.enemies.filter(e=>e.hp>0);
      if(o.action&&!g.story.interacting)g.interactStory();updateStory(g,.1);
     }
     a.renderer.camera.time=null;a.renderer.draw();a.refresh();
    });
   }
  }
 }
 if(await page.locator('[data-story-prize="hovercraft"]').isDisabled())throw Error('完成整组后谢礼仍锁定');
 await page.setViewportSize({width:390,height:844});
 await page.locator('.story-collection').scrollIntoViewIfNeeded();await page.screenshot({path:'output/playwright/monster-stories/rewards-390.png'});
 await page.locator('[data-story-prize="hovercraft"]').click();
 if(!(await page.locator('#story-content').textContent()).includes('已永久获得'))throw Error('领取结果缺失');
 const reward=await page.evaluate(()=>{const g=neighborApp.game;return {coins:g.progress.coins,wood:g.progress.wood,materials:g.progress.materials,choice:g.progress.story.boardRewards['monster-neighbors'],hull:g.progress.vehicleHulls[3],cannon:g.progress.vehicleWeapons[20]};});
 if(reward.coins!==1160||reward.wood!==330||reward.choice!=='hovercraft'||reward.hull!==1||reward.cannon!==1)throw Error('奖励入账异常 '+JSON.stringify(reward));
 await page.reload();await page.evaluate(async()=>{window.neighborApp=(await import('/src/main.js')).application;await neighborApp.ready;});
 if(await page.locator('#start').isVisible())await page.locator('#start').click();else if(await page.locator('#resume').isVisible())await page.locator('#resume').click();
 await page.evaluate(()=>{const a=neighborApp,g=a.game;Object.assign(g.player,{x:650,y:1840,invincible:999});g.enemies=[];g.waveWarning=0;g.spawnTimer=999;g.encounterTimer=999;g.selectVehicle(3);g.summonVehicle();a.renderer.camera.time=null;a.renderer.draw();a.refresh();});
 if(!await page.evaluate(()=>neighborApp.game.vehicle.active&&neighborApp.game.progress.vehicleWeapon===20))throw Error('重载后赠送载具不能驾驶');
 // 正式 WASD 验证入口前后与侧面通行，保留怪物区原来的地形边界。
 const before=await page.evaluate(()=>neighborApp.game.player.y);
 await page.keyboard.down('w');await page.waitForTimeout(650);await page.keyboard.up('w');
 const behind=await page.evaluate(()=>neighborApp.game.player.y);
 await page.keyboard.down('s');await page.waitForTimeout(650);await page.keyboard.up('s');
 if(behind>=before-10)throw Error('委托板前后通行受阻');
 // 固定同屏夹具仅用于昼夜视觉检查，不冒充自然战斗通关。
 for(const [width,height] of [[1280,900],[390,844],[320,568]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async time=>{
   const a=neighborApp,g=a.game;Object.assign(g.player,{x:650,y:1910,invincible:999});g.enemies=[];g.spawnEnemy(0,0,{x:780,y:1860});g.enemies.forEach(e=>{e.speed=0;e.hp=e.maxHp=100000;});g.state='playing';
   Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});
   a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);a.renderer.camera.time=null;a.renderer.draw();a.refresh();
  },time);
  await page.waitForTimeout(150);await page.screenshot({path:'output/playwright/monster-stories/world-'+width+'-'+time+'.png'});
  const sample=await page.evaluate(async()=>{const a=neighborApp;return (await import('/src/rendering/visual-review.js')).inspectMonsterStories(a.game,document);});
  if(sample.overflow)throw Error('小屏横向溢出');samples.push({width,time,...sample});
  await page.evaluate(()=>{const a=neighborApp;Object.assign(a.game.player,{x:650,y:1840});a.renderer.camera.time=null;a.renderer.draw();a.refresh();});
  await page.locator('[data-story-post="monster-neighbors"]').click();
  if(!await page.locator('[data-story-prize="hovercraft"]').isDisabled())throw Error('已领谢礼再次开放');
  await page.screenshot({path:'output/playwright/monster-stories/board-'+width+'-'+time+'.png'});await page.locator('#story-close').click();
 }
 if(errors.length)throw Error(errors.join('\n'));
 return {passed:true,reward,samples,errors};
}
