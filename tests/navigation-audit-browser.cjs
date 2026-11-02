// 从正式巡林簿点击自选体验，核对 HUD、插值目标和可达路线，不替换导航实现。
async page=>{
 if(new URL(page.url()).port!=='4175')throw Error('请使用本任务的 4175 测试服务');
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.setViewportSize({width:390,height:844});
 if(await page.locator('#start').isVisible())await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;
  window.navModule=await import('/src/core/world-navigation.js');window.mainModule=await import('/src/core/mainline-manager.js');
  // 只提供已接取后再次从任务簿恢复的检查点，任务选择始终通过真实按钮。
  window.navigationCheckpoint=async id=>{
   const g=a.game;g.progress=(await import('/src/progression/progress.js')).freshProgress();
   g.progress.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);g.progress.restoration.cottageRested=true;
   g.progress.mainline.completed=['first-map','first-patrol'];g.progress.mainline.currentId='first-letter';g.progress.mainline.phase='doing';
   g.progress.mainline.suspended[id]={phase:'doing',gardening:{taskId:id}};
   g.reset();g.campActors=null;g.campRoutine=null;g.state='playing';g.vehicle.active=false;g.enemies=[];g.boss=null;g.update=()=>{};
   Object.assign(g.player,(await import('/src/config/mainline.js')).MAINLINE_SITES.garage);a.renderer.camera.time=null;a.refresh();
  };
 });
 const results=[];
 for(const id of ['long-patrol','pistol-upgrade','upgrade-harvest']){
  await page.evaluate(id=>navigationCheckpoint(id),id);
  await page.locator('#mainline-hud').click();await page.locator('#mainline-dialog').waitFor({state:'visible'});
  await page.locator('#mainline-choices summary').click();await page.locator(`[data-mainline-select="${id}"]`).click();
  const selected=await page.evaluate(()=>a.game.progress.mainline.currentId);if(selected!==id)throw Error('选择错误任务：'+selected);
  await page.locator('#mainline-close').click();await page.waitForTimeout(150);
  if(id==='pistol-upgrade')await page.evaluate(()=>{a.game.progress.weapons[0]=3;a.refresh();});
  if(id==='upgrade-harvest')await page.evaluate(async()=>{(await import('/src/core/wild-farm.js')).ensureWildFarms(a.game);a.refresh();});
  await page.waitForTimeout(200);
  const state=await page.evaluate(async id=>{
   const g=a.game,nav=navModule.worldNavigationObjective(g),action=mainModule.mainlineAction(g),expected=id==='long-patrol'?'garageEntry':id==='upgrade-harvest'?'harvest-plot-':null;
   if(expected&&!nav?.key.startsWith(expected))throw Error('目标错误：'+JSON.stringify(nav));
   if(!expected&&(nav!==null||action?.id!=='heroes-button'))throw Error('角色升级不应指向工坊');
   const target=(await import('/src/rendering/story-guidance.js')).storyGuidanceState(a.renderer.renderGame).target;
   if(JSON.stringify(target)!==JSON.stringify(nav?.site||null))throw Error('画面和逻辑目标不同');
   let route=null;if(nav){const {storyRouteState}=await import('/src/core/story-route.js');for(let i=0;i<400;i++){g.time+=.025;route=storyRouteState(g);if(route?.reachable)break;}if(!route?.reachable)throw Error('真实路线不可达');}
   return {id,key:nav?.key||null,action:action?.id||action?.type,reachable:route?.reachable??null,hud:document.getElementById('mainline-hud').dataset.taskId};
  },id);
  if(state.hud!==id)throw Error('HUD 未跟随选择');results.push(state);
  await page.screenshot({path:`output/playwright/navigation-audit/${id}.png`});
  if(id==='pistol-upgrade'){
   await page.locator('#mainline-hud').click();await page.locator('#current-cat-dialog').waitFor({state:'visible'});
   await page.locator('#current-cat-dialog button[aria-label*="关闭"]').click();
  }
 }
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
