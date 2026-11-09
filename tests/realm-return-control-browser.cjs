// 使用正式应用、售货员和退出按钮验证接待厅恢复，覆盖手机昼夜及其他秘境。
async page=>{
 if(new URL(page.url()).port!=='4175')throw Error('请使用本地验收端口4175');
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{
  const {application}=await import('/src/main.js');(window.realmApp||application).destroy();
  for(const d of document.querySelectorAll('dialog[open]'))d.close();localStorage.clear();
  const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js'),{TOWN_RESTORATIONS}=await import('/src/config/town-restoration.js');
  const p=freshProgress();p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.vehicleHulls[0]=1;p.vehicleIndex=0;
  const {createSaveStore}=await import('/src/platform/storage.js');createSaveStore().saveProgress(p);
  const {createApplication}=await import('/src/app/create-app.js');window.realmApp=createApplication();
 });
 await page.locator('#start').click();await page.waitForFunction(()=>realmApp.menu.page==='game');
 for(const time of ['day','night']){
  await page.evaluate(async time=>{
   const a=realmApp,g=a.game;Object.assign(a.environment,{time,autoTime:false,autoWeather:false,weather:'sun'});
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
   a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);
   g.progress.living.calendar.elapsed=time==='night'?1100000:400000;
   const {WORKSHOP_INTERIORS}=await import('/src/config/workshop-interiors.js'),{enterWorkshop}=await import('/src/core/home/cottage.js');
   g.state='playing';g.mainlineSpeech=null;g.cottage=null;g.vehicle.active=false;g.enemies=[];g.trees=[];
   g.spawnTimer=g.fireClock=g.parkingVisitTimer=999;g.player.invincible=999;
   Object.assign(g.player,WORKSHOP_INTERIORS.tower.door);if(!enterWorkshop(g,'tower'))throw Error('接待厅进入失败');a.refresh();
  },time);
  await page.locator('[data-room-item="shopkeeper"]').focus();await page.keyboard.press('Enter');
  await page.locator('[data-enter-realm="tower"]').click();
  await page.waitForFunction(()=>realmApp.game.realm?.mode==='tower'&&!document.querySelector('#realm-dialog').open);
  if(!await page.evaluate(()=>realmApp.game.vehicle.active))throw Error('入塔缺少载具');
  await page.screenshot({path:`output/playwright/realm-return/tower-${time}.png`});
  await page.locator('#realm-button').click();await page.locator('[data-realm-exit]').click();
  await page.waitForFunction(()=>!realmApp.game.realm&&realmApp.game.cottage?.kind==='tower'&&realmApp.game.state==='playing'&&!document.querySelector('dialog[open]'));
  const x=await page.evaluate(()=>realmApp.game.player.x);
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(350);await page.keyboard.up('ArrowRight');
  if(!await page.evaluate(x=>realmApp.game.player.x>x,x))throw Error('退出后键盘无法移动');
  // 手机触控通过浏览器真实触摸事件进入现有摇杆，不直接改写游戏输入。
  if(time==='night'){
   const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
   const before=await page.evaluate(()=>realmApp.game.player.x);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:140,y:660}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:85,y:660}]});
   await page.waitForTimeout(400);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   if(!await page.evaluate(x=>realmApp.game.player.x<x,before))throw Error('退出后触屏无法移动');
   await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
   checks.push('接待厅退出后手机触控拖动正常');
  }
  await page.screenshot({path:`output/playwright/realm-return/lobby-${time}.png`});
  checks.push(`时空之塔${time}：售货员进入、载具、主动退出、室内真实输入移动`);
 }
 for(const mode of ['guardian','rogue','football','race']){
  await page.evaluate(async mode=>{
   const g=realmApp.game;g.cottage=null;g.state='playing';Object.assign(g.player,{x:900,y:800,vx:0,vy:0});
   if(!g.enterRealm(mode))throw Error('进入失败：'+mode);realmApp.refresh();
  },mode);
  if(!await page.locator('#realm-dialog').isVisible())await page.locator('#realm-button').click();
  if(mode==='rogue')await page.locator('#close-realm').click();else await page.locator('[data-realm-exit]').click();
  await page.waitForFunction(()=>!realmApp.game.realm&&realmApp.game.state==='playing'&&!document.querySelector('dialog[open]'));
  const x=await page.evaluate(()=>realmApp.game.player.x);
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(300);await page.keyboard.up('ArrowRight');
  if(!await page.evaluate(x=>realmApp.game.player.x>x,x))throw Error(mode+'退出后无法移动');
  checks.push(mode+'：准备阶段退出后恢复真实移动');
 }
 if(errors.length)throw Error(errors.join('\n'));return {checks,errors};
}
