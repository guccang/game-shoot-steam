// 隔离存档验收真实播种耗尽、触摸重新选种、库存全空和鼠标键盘入口，默认本地4175。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';p.farm.wildMaps=['forest'];p.farm.lessonRewarded=true;p.farm.delivery.nextAt=Date.now()+3600000;
   p.farm.plots=[0,1,2,3].map(id=>({id,mapId:'forest',x:893+id%2*56,y:2752+Math.floor(id/2)*52,crop:null,plantedAt:0,readyAt:0,watered:false}));p.farm.nextId=4;p.farm.seeds.fill(0);p.farm.seeds[0]=1;p.farm.seeds[1]=2;p.farm.unlocked[0]=true;p.farm.unlocked[1]=false;
   g.progress=p;g.mapId='forest';g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.fireClock=g.spawnTimer=999999;g.enemies=[];g.vehicle.active=false;
   Object.assign(g.player,{x:921,y:2855,vx:0,vy:0});for(const d of document.querySelectorAll('dialog[open]'))d.close();a.renderer.camera.time=null;a.refresh();
  });
  const cell=id=>page.locator(`[data-farm-cell="${id}"]`),seed=id=>page.locator(`[data-farm-seed="${id}"]`),picker=page.locator('#farm-picker');
  // 等待正式角色走近和落点结算，不能通过直接修改库存模拟耗尽。
  async function planted(id,crop){await page.waitForFunction(({id,crop})=>a.game.progress.farm.plots.find(p=>p.id===id)?.crop===crop&&!a.game.farmWork.job&&!a.game.farmWork.queue.length,{id,crop},{timeout:20000});}
  // 选择界面弹出后不能误排播种或留下拖动锁，耗尽品种不可点击。
  async function checkPicker(emptyCrop){await picker.waitFor({state:'visible'});if(!await seed(emptyCrop).isDisabled()||!await page.evaluate(()=>!a.game.farmDragging&&!a.game.farmWork.job&&!a.game.farmWork.queue.length))throw Error('耗尽后仍可播种或手势未释放');}
  await cell(0).tap();await picker.waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('[data-farm-seed="0"]').disabled);await seed(0).tap();await cell(0).tap();await planted(0,0);
  if(await page.evaluate(()=>a.game.progress.farm.seeds[0])!==0)throw Error('最后一粒种子未真实消耗');
  await cell(1).tap();await checkPicker(0);if(await seed(1).isDisabled())throw Error('礼物种子不可选');await page.screenshot({path:'output/playwright/farm-empty-seed-picker/change-seed.png'});
  await seed(1).tap();await cell(1).tap();await planted(1,1);
  await cell(2).tap();await planted(2,1);if(await picker.isVisible())throw Error('仍有库存时错误打断连续播种');
  await page.setViewportSize({width:320,height:568});await cell(3).tap();await checkPicker(1);
  if(!await page.locator('[data-farm-shop]').isVisible()||await picker.locator('[data-farm-seed]:not(:disabled)').count())throw Error('全空时缺少购种入口或可用状态错误');
  await page.screenshot({path:'output/playwright/farm-empty-seed-picker/empty-320.png'});
  // 键盘和鼠标分别走点击及指针分支，均从空种子袋状态重新打开选择界面。
  for(const method of ['keyboard','mouse']){
   await page.locator('#farm-hoe').tap();await page.evaluate(async()=>{(await import('/src/core/farm.js')).setFarmTool(a.game,'seed');a.refresh();});
   if(method==='keyboard'){await cell(3).focus();await page.keyboard.press('Enter');}else await cell(3).click();await checkPicker(1);
  }
  const crops=await page.evaluate(()=>a.game.progress.farm.plots.map(p=>p.crop));if(JSON.stringify(crops)!=='[0,1,1,null]')throw Error('切换种子改动了其他田块');
  await page.locator('[data-farm-shop]').tap();await page.locator('#seed-shop-dialog').waitFor({state:'visible'});
  if(errors.length)throw Error(errors.join('\n'));return {lastSeedConsumed:true,reselect:true,continuousPlanting:true,allEmptyShop:true,keyboard:true,mouse:true,crops,errors};
 }finally{await context.close();}
}
