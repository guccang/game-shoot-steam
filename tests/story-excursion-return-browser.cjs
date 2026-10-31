// 秘境直达交付及设置唯一返回入口：正式界面在手机与桌面昼夜下操作。
async page=>{
 if(new URL(page.url()).port!=='4227')throw Error('仅允许隔离端口4227');
 await page.addInitScript(()=>localStorage.clear());
 const errors=[],samples=[];page.on('pageerror',error=>errors.push(error.message));
 // 从真实DOM校验无多余返回按钮，同时核对领取页没有对白或水平溢出。
 async function inspect(){return page.evaluate(async()=>{const result=(await import('/src/rendering/visual-review.js')).inspectRealmDelivery(document,app.game);if(result.home.some(n=>!n.settings)||document.querySelector('#overlay-home,[data-menu-home]'))throw Error('设置外仍有返回主菜单');if(result.overflow)throw Error('页面水平溢出');return result;});}
 for(const width of [320,390,1280])for(const time of ['day','night']){
  const mode=time==='day'?'guardian':'rogue',failure=time==='day';
  await page.setViewportSize({width,height:width===1280?900:844});await page.reload();
  await page.evaluate(async()=>{window.app=(await import('/src/main.js')).application;await app.ready;});await page.locator('#start').click();
  await page.evaluate(async({mode,time})=>{const g=app.game;g.progress.story.chapters['sunleaf-01'].completed=true;g.state='playing';Object.assign(g.player,{x:970,y:790});
   Object.assign(app.environment,{time,weather:'sun',autoTime:false,autoWeather:false});app.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(app.environment,performance.now()-20000);
   if(!g.enterStory(mode==='rogue'?'sunleaf-side-expedition':'sunleaf-side-guardian'))throw Error('无法接取');g.advanceStoryDialogue(true);app.refresh();}, {mode,time});
  await page.locator('[data-story-command="excursion"]').click();
  if(failure)await page.evaluate(()=>{app.game.continueRealm();app.game.hurtGoddess(99999);app.refresh();});
  else {if(!await page.locator('[data-realm-exit]').isVisible())await page.locator('#realm-button').click();await page.locator('[data-realm-exit]').click();}
  await page.locator('[data-story-command="claim"]').waitFor({state:'visible'});
  const state=await inspect();if(state.realm||state.stage!=='END'||state.phase!=='prepare'||state.dialogue||!state.claim.visible)throw Error('未直达领取');
  if(await page.locator('[data-story-command="enter"]').count())throw Error('仍要求继续本章');
  await page.screenshot({path:`output/playwright/realm-direct-delivery/claim-${width}-${time}.png`});
  // 领取页可通过设置保存并返回，再继续时仍是未领取状态。
  if(width===390){
   await page.locator('#story-close').click();await page.locator('#settings-button').click();await page.locator('#settings-home').click();await page.locator('#start').click();
   if(!await page.locator('#story-button').isVisible())await page.locator('#field-menu-toggle').click();await page.locator('#story-button').click();
   await page.locator('[data-story-command="claim"]').waitFor({state:'visible'});
  }
  // 写失败留在领取页，重试仍走原事务。
  if(width===320&&time==='day'){
   await page.evaluate(()=>{window.originalPersist=app.game.storyPersist;app.game.storyPersist=()=>false;});await page.locator('[data-story-command="claim"]').click();
   if(!(await page.locator('#story-content').innerText()).includes('保存失败'))throw Error('保存失败未显示');
   await page.evaluate(()=>{app.game.storyPersist=window.originalPersist;});
  }
  await page.locator('[data-story-command="claim"]').click();
  const result=await page.evaluate(mode=>({done:app.game.progress.story.chapters[mode==='rogue'?'sunleaf-side-expedition':'sunleaf-side-guardian'].completed,pending:app.game.progress.story.run}),mode);
  if(!result.done||result.pending)throw Error('领取未完成');samples.push({width,time,state,result});
  // 奖励结算关闭即恢复巡林，不再出现目录和额外暂停页。
  await page.locator('#task-reward-dialog').waitFor({state:'visible'});await page.locator('#task-reward-close').click();await page.waitForFunction(()=>app.game.state==='playing');
  // 暂停与死亡共用遮罩，均只保留设置和玩法入口。
  await page.evaluate(()=>{const g=app.game;g.state='playing';g.summonVehicle();g.spawnEnemy(0,0,{x:g.player.x+110,y:g.player.y+25});g.pause();app.refresh();});
  await page.screenshot({path:`output/playwright/realm-direct-delivery/pause-${width}-${time}.png`});await inspect();
  await page.locator('#overlay-settings').click();await page.locator('#settings-home').click();await page.locator('#start').click();
   if(!await page.locator('#story-button').isVisible())await page.locator('#field-menu-toggle').click();await page.locator('#story-button').click();
  await page.evaluate(()=>{app.game.state='dead';app.game.player.hp=0;app.refresh();});await inspect();
  await page.screenshot({path:`output/playwright/realm-direct-delivery/death-${width}-${time}.png`});
  await page.locator('#overlay-settings').click();await page.locator('#settings-home').click();await page.locator('#start').click();
   if(!await page.locator('#story-button').isVisible())await page.locator('#field-menu-toggle').click();await page.locator('#story-button').click();
  if(await page.evaluate(()=>app.game.state)!=='dead')throw Error('返回菜单改变死亡状态');
 }
 // 消防接警页同属秘境弹窗，不再注入底部返回主菜单。
 await page.reload();await page.evaluate(async()=>{window.app=(await import('/src/main.js')).application;await app.ready;});await page.locator('#start').click();
 await page.evaluate(()=>{app.game.enterRealm('fire');app.refresh();});await page.locator('[data-fire-start]').waitFor({state:'visible'});
 await inspect();await page.screenshot({path:'output/playwright/realm-direct-delivery/fire-ready.png'});
 await page.locator('#realm-settings').click();await page.locator('#settings-home').click();await page.locator('#start').click();
   if(!await page.locator('#story-button').isVisible())await page.locator('#field-menu-toggle').click();await page.locator('#story-button').click();
 await page.locator('[data-fire-start]').waitFor({state:'visible'});
 if(errors.length)throw Error(errors.join('\n'));return {passed:true,samples,errors};
}
