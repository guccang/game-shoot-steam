// 球场查看入口验收：未修复仍提示修复，已修复先看原玩法卡，主动进入才开局。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';p.restoration.repaired=[];p.realms.records.football.best=37;p.wood=0;const g=a.game;g.progress=p;g.reset();g.start();g.mainlineSpeech=null;g.update=()=>{};const f=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.find(f=>f.id==='football');Object.assign(g.player,f.site);a.renderer.camera.time=null;a.refresh();window.forestPlayer=g.player;});
  await page.locator('#nearby-interaction').filter({hasText:'修复林间球场'}).tap();await page.locator('#restoration-dialog').waitFor({state:'visible'});
  if(await page.locator('#restoration-repair').isEnabled()||await page.evaluate(()=>!!a.game.realm))throw Error('未修复球场错误开放');
  // 旧修复页的使用功能入口也先展示玩法卡，避免仍从另一入口直接开局。
  await page.locator('#restoration-close').tap();await page.waitForFunction(()=>a.game.state==='playing');
  await page.evaluate(()=>{a.game.progress.restoration.repaired.push('football');a.game.requestFacility('football');});await page.locator('#restoration-repair').tap();await page.locator('.realm-football').waitFor({state:'visible'});
  if(await page.evaluate(()=>!!a.game.realm)||await page.locator('#restoration-dialog').isVisible())throw Error('使用功能未转到玩法预览');
  await page.locator('#close-realm').tap();await page.waitForFunction(()=>a.game.state==='playing');
  await page.locator('#nearby-interaction').filter({hasText:'查看林间球场'}).tap();
  if(await page.locator('#restoration-dialog').isVisible()||await page.evaluate(()=>!!a.game.realm)||await page.locator('#realm-content .realm-card').count()!==1)throw Error('查看未直接展示单项卡片');
  if(!(await page.locator('.realm-record').textContent()).includes('37'))throw Error('最高纪录未展示');
  for(const [width,height]of [[320,568],[390,844],[844,390],[1280,900]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.draw();},time);
   await page.locator('[data-enter-realm="football"]').scrollIntoViewIfNeeded();const r=await page.locator('[data-enter-realm="football"]').boundingBox();
   if(!r||r.width<44||r.height<44||r.x<0||r.y<0||r.x+r.width>width||r.y+r.height>height)throw Error('进入按钮不可达');
   await page.screenshot({path:`output/playwright/football-entry-card/${width}-${time}.png`});
  }
  await page.setViewportSize({width:390,height:844});await page.locator('#realm-help').tap();if(await page.locator('#realm-help-content').getByRole('heading',{name:'滚滚史莱姆',exact:true}).count()!==1)throw Error('帮助不是足球规则');await page.locator('#close-realm-help').tap();
  await page.locator('#close-realm').tap();await page.waitForFunction(()=>a.game.state==='playing');if(await page.evaluate(()=>!!a.game.realm||a.game.player!==forestPlayer))throw Error('查看关闭改变了森林');
  // 通用娱乐入口应恢复完整目录，单项过滤不泄漏到后续菜单。
  if(!await page.locator('#realm-button').isVisible())await page.locator('#field-menu-toggle').tap();await page.locator('#realm-button').tap();if(await page.locator('#realm-content .realm-card').count()!==6)throw Error('娱乐目录残留过滤');await page.locator('#close-realm').tap();await page.waitForFunction(()=>a.game.state==='playing');
  await page.locator('#nearby-interaction').tap();await page.locator('[data-enter-realm="football"]').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>a.game.realm?.mode==='football'&&a.game.realm.phase==='build');
  await page.locator('[data-realm-exit]').tap();await page.waitForFunction(()=>!a.game.realm);await page.evaluate(()=>{a.game.state='playing';a.refresh();});await page.locator('#nearby-interaction').tap();await page.locator('[data-enter-realm="football"]').tap();await page.waitForFunction(()=>a.game.realm?.mode==='football');
  if(errors.length)throw Error(errors.join('\n'));return {unrepaired:true,directCard:true,noAutoEntry:true,layouts:8,closePreservesForest:true,fullMenu:true,keyboardEntry:true,touchEntry:true,errors};
 }finally{await context.close();}
}
