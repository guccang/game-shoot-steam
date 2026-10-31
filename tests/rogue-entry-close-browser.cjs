// 肉鸽入场退出入口验收：真实抽取与关闭、帮助嵌套、键盘及昼夜手机布局。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';p.restoration.repaired.push('rogue');a.game.progress=p;a.game.reset();a.game.start();a.game.mainlineSpeech=null;a.game.mainlineTalkDelay=999999;a.game.fireClock=999999;window.forestPlayer=a.game.player;window.forestWeapon=a.game.progress.weapon;a.refresh();});
  // 正式核心入口建立森林快照；所有领取、帮助和关闭动作均使用真实按钮。
  async function enter(){await page.evaluate(()=>{a.game.state='playing';if(!a.game.enterRealm('rogue'))throw Error('进入失败');a.refresh();});await page.locator('#realm-dialog').waitFor({state:'visible'});}
  async function exited(){await page.waitForFunction(()=>!a.game.realm&&!document.querySelector('#realm-dialog').open);if(await page.evaluate(()=>a.game.player!==forestPlayer||a.game.progress.weapon!==forestWeapon||a.game.progress.realms.run!==null||a.game.state!=='paused'))throw Error('未完整恢复森林');}
  await enter();
  for(const [width,height] of [[320,568],[390,844],[844,390],[1280,900]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.draw();},time);
   const close=await page.locator('#close-realm').boundingBox(),help=await page.locator('#realm-help').boundingBox();
   if(!close||!help||close.width<44||close.height<44||help.x+help.width>close.x||close.x+close.width>width||close.y<0||await page.locator('#realm-dialog [data-realm-exit]').count())throw Error('关闭按钮布局或重复退出入口错误');
   await page.screenshot({path:`output/playwright/rogue-entry-close/${width}-${time}.png`});
  }
  await page.setViewportSize({width:390,height:844});await page.locator('#realm-help').tap();await page.locator('#close-realm-help').tap();if(await page.evaluate(()=>a.game.realm?.phase!=='loadout'))throw Error('帮助退出了挑战');
  await page.locator('#close-realm').tap();await exited();
  await enter();await page.locator('[data-realm-roll="weapon"]').tap();await page.locator('#close-realm').tap();await exited();await page.waitForTimeout(2500);if(await page.locator('#realm-dialog').isVisible())throw Error('抽取回调重开面板');
  await enter();for(const kind of ['weapon','vehicle','turret'])await page.locator(`[data-realm-roll="${kind}"]`).tap();await page.locator('[data-realm-ready]:enabled').waitFor();
  await page.locator('#close-realm').focus();await page.keyboard.press('Enter');await exited();
  // 完成补给后仍进入必选祝福，不能通过普通关闭跳过选择。
  await enter();for(const kind of ['weapon','vehicle','turret'])await page.locator(`[data-realm-roll="${kind}"]`).tap();await page.locator('[data-realm-ready]').tap();
  if(await page.evaluate(()=>a.game.realm.phase!=='choice')||await page.locator('#close-realm').isVisible())throw Error('祝福流程被改变');await page.locator('[data-realm-blessing]').first().tap();
  await page.waitForFunction(()=>a.game.realm?.phase==='combat'&&!document.querySelector('#realm-dialog').open);
  if(errors.length)throw Error(errors.join('\n'));return {layouts:8,exitBeforeRoll:true,exitWhileRolling:true,keyboardExitAfterRoll:true,help:true,blessing:true,errors};
 }finally{await context.close();}
}
