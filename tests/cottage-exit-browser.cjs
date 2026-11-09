// 小屋与两工坊一秒出门实机验收：默认4175，允许隔离worktree使用4176。
async page=>{
 if(!['4175','4176'].includes(new URL(page.url()).port))throw Error('请使用本地验收端口');
 const errors=[],views=[];page.on('pageerror',e=>errors.push(e.message));
 await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
  const g=a.game;g.progress=(await import('/src/progression/progress.js')).freshProgress();g.progress.restoration.repaired=['garage','cottage'];g.progress.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();g.reset();g.state='playing';g.vehicle.active=false;g.spawnTimer=g.fireClock=999;g.mainlineSpeech=null;g.mainlineTalkDelay=999;
  window.roomModule=await import('/src/core/home/cottage.js');window.roomConfig=await import('/src/config/workshop-interiors.js');window.originalUpdate=g.update.bind(g);
 });
 for(const kind of ['cottage','weapons','vehicle']){
  await page.evaluate(kind=>{
   const g=a.game;g.update=originalUpdate;g.vehicle.active=false;g.enemies=[];g.cottageDoorLatch=false;g.mainlineSpeech=null;g.mainlineTalkDelay=999;Object.assign(g.player,roomConfig.interiorLayout({kind}).door);
   if(!(kind==='cottage'?roomModule.enterCottage(g):roomModule.enterWorkshop(g,kind)))throw Error('入室失败');
  },kind);
  // 从出生点实际按键走到门垫，并在倒计时开始后冻结，避免截图耗时消耗一秒窗口。
  await page.keyboard.down('ArrowDown');
  await page.waitForFunction(()=>{if(a.game.cottage?.exitElapsed>.15){a.game.update=()=>{};return true;}return false;});
  await page.keyboard.up('ArrowDown');
  await page.locator('#cottage-exit').waitFor({state:'visible'});
  if(!(await page.locator('#cottage-notice').innerText()).includes('即将出门'))throw Error('缺少倒计时说明');
  for(const [width,height] of [[320,568],[390,844],[1280,800]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});
   await page.evaluate(async time=>{a.game.progress.living.calendar.elapsed=time==='day'?400000:1100000;Object.assign(a.environment,{time,autoTime:false});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.refresh();},time);
   await page.waitForTimeout(100);
   const result=await page.evaluate(()=>{const b=a.renderer.actionCountdownView,r=document.querySelector('#cottage-controls footer').getBoundingClientRect();return {badge:b,notice:document.querySelector('#cottage-notice').textContent,fits:r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,overflow:document.documentElement.scrollWidth>innerWidth};});
   if(!result.fits||result.overflow||result.badge?.icon!=='exit'||result.badge?.label!==1)throw Error(JSON.stringify(result));
   await page.screenshot({path:`output/playwright/room-exit-countdown/${kind}-${width}-${time}.png`});views.push({kind,width,time,...result});
  }
  // 移开取消后重新走入出口，正式时钟自动完成离开，不点击或直接调用出门。
  await page.evaluate(()=>{a.game.update=originalUpdate;});await page.keyboard.down('ArrowUp');
  await page.waitForFunction(()=>a.game.cottage?.exitElapsed===0);await page.keyboard.up('ArrowUp');
  await page.keyboard.down('ArrowDown');await page.waitForFunction(()=>!a.game.cottage,null,{timeout:5000});await page.keyboard.up('ArrowDown');
  await page.locator('#cottage-controls').waitFor({state:'hidden'});
  await page.waitForTimeout(200);if(await page.evaluate(()=>!!a.game.cottage))throw Error('出门后立即返回屋内');
 }
 if(errors.length)throw Error(errors.join('\n'));return {views:views.length,exit:'三栋建筑一秒自动退出及移开取消通过',errors};
}
