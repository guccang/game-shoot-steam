// 手机任务卡远程查看：禁用原因、引导气泡、抵达后恢复与真实领取。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(new URL(original.url()||'http://localhost:4175').origin);
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;a.menu.enter();await a.ready;});await page.waitForFunction(()=>a.menu.page==='game');
  await page.evaluate(async()=>{
   const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js'),{TOWN_RESTORATIONS}=await import('/src/config/town-restoration.js');
   window.post=(await import('/src/config/clearing.js')).CLEARING_APPROACH;
   const p=freshProgress();p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('first-patrol'));p.mainline.currentId='first-patrol';p.mainline.phase='doing';
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.mainlineTalkDelay=99999;g.enemies=[];g.boss=null;g.update=()=>{};Object.assign(g.player,{x:post.x,y:post.y-350});a.renderer.camera.time=null;a.refresh();a.renderer.draw();
  });
  // 回到长屏再检查一次，验证弹窗重开及尺寸变化后原因仍保持可见。
  for(const [width,height,time] of [[390,844,'day'],[320,568,'night'],[390,844,'day']]){
   await page.setViewportSize({width,height});
   await page.evaluate(async time=>{
    a.game.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time).start+1000;
    (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();a.renderer.draw();
   },time);
   await page.locator('#mainline-hud').tap();await page.locator('#clearing-dialog').waitFor({state:'visible'});
   const reason=await page.locator('#clearing-blocked-reason').innerText();if(!/靠近.*清缴告示牌/.test(reason))throw Error('未说明距离原因 '+reason);
   if(!await page.locator('#clearing-accept').isDisabled())throw Error('远程接取未禁用');
   await page.waitForFunction(()=>!document.getElementById('operation-guide')||document.getElementById('operation-guide').hidden);
   await page.locator('#clearing-dialog .ui-panel__body').evaluate(el=>{el.scrollTop=el.scrollHeight;});
   const box=await page.locator('#clearing-blocked-reason').boundingBox();if(!box||box.y<0||box.y+box.height>height)throw Error('禁用原因未固定在可见操作栏');
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('页面横向溢出');
   await page.waitForTimeout(400);await page.screenshot({path:`output/playwright/clearing-disabled-reason/far-${width}-${time}.png`});await page.locator('#clearing-close').tap();
  }
  await page.evaluate(()=>{Object.assign(a.game.player,post);a.renderer.camera.time=null;a.refresh();a.renderer.draw();});await page.locator('#mainline-hud').tap();
  if(await page.locator('#clearing-accept').isDisabled()||await page.locator('#clearing-blocked-reason').isVisible())throw Error('抵达后禁用状态未清理');
  await page.evaluate(()=>{window.persist=a.game.livingPersist;a.game.livingPersist=()=>false;});await page.locator('#clearing-accept').tap();
  if(!/保存|存储/.test(await page.locator('#clearing-error').innerText()))throw Error('事务错误被通用提示遮盖');
  await page.evaluate(()=>{a.game.livingPersist=window.persist;});await page.locator('#clearing-accept').tap();
  await page.waitForFunction(()=>a.game.progress.living.patrolActive&&!document.getElementById('clearing-dialog').open);
  if(errors.length)throw Error(errors.join('\n'));return {passed:true,errors};
 }finally{await context.close();}
}
