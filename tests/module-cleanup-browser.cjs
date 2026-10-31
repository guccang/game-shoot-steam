// 模块整理实机回归：公开入口、施工、试射取消、秘境旧面板与重复挂载。
async page=>{
  if(new URL(page.url()).port!=='4206')throw Error('仅允许隔离验收端口');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.keyboard.up('Space');await page.reload();await page.setViewportSize({width:1280,height:960});
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application;if(!await a.ready)throw Error('素材未就绪');window.cleanupApp=a;
    if(a.game.realm)a.game.leaveRealm();
    const p=a.game.progress;p.coins=p.wood=100000;p.weapons.fill(1);p.vehicleWeapons.fill(1);p.vehicleHulls.fill(1);p.mastery.fill(100);
    p.materials={parts:10000,core:10000,crystal:10000};a.game.reset();a.refresh();
  });
  if(await page.locator('#start').isVisible())await page.locator('#start').click();
  else await page.evaluate(()=>{cleanupApp.game.start();cleanupApp.refresh();});
  await page.evaluate(()=>{const a=cleanupApp,g=a.game;g.updateWaves=()=>{};g.enemies=[];g.boss=null;g.player.invincible=999;Object.assign(g.player,{x:1010,y:780});a.refresh();});
  // 地形同步绘制入口重用原图元，昼夜截图用于检查无缺图。
  for(const time of ['day','night']) {
    await page.evaluate(async time=>{Object.assign(cleanupApp.environment,{time,weather:'sun',autoTime:false,autoWeather:false});cleanupApp.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(cleanupApp.environment);cleanupApp.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(cleanupApp.environment);cleanupApp.refresh();},time);
    await page.waitForTimeout(300);await page.screenshot({path:`output/playwright/module-cleanup/desktop-${time}.png`});
  }
  await page.locator('#weapons-button').click();
  if(await page.evaluate(()=>cleanupApp.game.state)!=='paused')throw Error('工坊没有暂停战斗');
  const names=[];
  for(const item of await page.locator('[data-ws-item]').evaluateAll(nodes=>nodes.map(n=>n.dataset.wsItem))) {
    await page.locator(`[data-ws-item="${item}"]`).click();names.push(await page.locator('#ws-name').innerText());
    if(!(await page.locator('#ws-stats').innerText()).trim())throw Error('属性展示为空');
  }
  // 四种车体的脉冲炮预览、试射和切换都经过真实控制器。
  for(let i=0;i<4;i++) {
    await page.evaluate(i=>cleanupApp.workshop.open('vehicle',i,9),i);
    await page.locator('#ws-socket').focus();await page.keyboard.press('Enter');
    await page.locator('#ws-test').click();await page.waitForFunction(()=>!document.getElementById('ws-trial').hidden);
    await page.waitForTimeout(100);await page.locator('[data-ws-mode="weapons"]').click();
    if(await page.locator('#ws-trial').isVisible())throw Error('切换后试射残留');
  }
  // 键盘完成一次付费施工，确认模块迁移没有断开报价或提交入口。
  await page.evaluate(()=>cleanupApp.workshop.open('weapons',0));
  await page.locator('[data-ws-upgrade="damage"]').focus();await page.keyboard.press('Enter');
  await page.locator('#ws-socket').focus();await page.keyboard.press('Enter');await page.waitForTimeout(1200);await page.waitForFunction(()=>document.getElementById('ws-bench').dataset.replacing==='false');
  await page.locator('#ws-tool').focus();await page.keyboard.press('Enter');await page.keyboard.down('Space');
  await page.waitForFunction(()=>!document.getElementById('ws-result').hidden);await page.keyboard.up('Space');
  if(await page.evaluate(()=>cleanupApp.game.progress.weapons[0])!==2)throw Error('施工提交失败');
  await page.waitForTimeout(1200);await page.screenshot({path:'output/playwright/module-cleanup/desktop-workshop.png'});
  const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
  for(const width of [390,320]) {
    await page.setViewportSize({width,height:844});await page.evaluate(()=>cleanupApp.workshop.open('weapons',0));
    await page.locator('[data-ws-upgrade="rate"]').scrollIntoViewIfNeeded();
    const box=await page.locator('[data-ws-upgrade="rate"]').boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    const slot=await page.locator('#ws-socket').boundingBox();
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:slot.x+slot.width/2,y:slot.y+slot.height/2}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(1200);await page.waitForFunction(()=>document.getElementById('ws-bench').dataset.replacing==='false');
    if(!await page.locator('#ws-part-compare').isVisible())throw Error('触摸试装未生效');
    await page.screenshot({path:`output/playwright/module-cleanup/workshop-${width}.png`});
    await page.locator('[data-ws-mode="vehicle"]').click();
    if(await page.locator('#ws-discard').isVisible())throw Error('切换误弹草稿确认');
  }
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
  await page.locator('#ws-close').click();await page.waitForTimeout(100);
  if(await page.evaluate(()=>cleanupApp.game.state)!=='playing')throw Error('工坊关闭未恢复');
  await page.evaluate(async()=>{cleanupApp.environment.time='day';cleanupApp.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(cleanupApp.environment);cleanupApp.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(cleanupApp.environment);cleanupApp.refresh();});await page.waitForTimeout(200);
  await page.screenshot({path:'output/playwright/module-cleanup/mobile-day.png'});
  await page.evaluate(async()=>{cleanupApp.environment.time='night';cleanupApp.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(cleanupApp.environment);cleanupApp.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(cleanupApp.environment);cleanupApp.refresh();});await page.waitForTimeout(200);
  await page.screenshot({path:'output/playwright/module-cleanup/mobile-night.png'});
  await page.setViewportSize({width:1280,height:960});
  await page.evaluate(()=>{if(!cleanupApp.game.enterRealm('tower'))throw Error('秘境未进入');cleanupApp.refresh();});
  // 秘境隐藏武器导航；程序触发兼容入口只验证路由放行，车库仍走可见按钮。
  await page.evaluate(()=>document.getElementById('weapons-button').click());
  if(!await page.locator('#camp-dialog').isVisible()||await page.locator('#workshop-dialog').isVisible())throw Error('秘境旧武器页被误删');
  await page.locator('#close-camp').click();await page.locator('#vehicles-button').click();
  if(!await page.locator('#vehicle-collection-dialog').isVisible())throw Error('秘境车库失效');
  await page.keyboard.press('Escape');await page.evaluate(()=>{cleanupApp.game.leaveRealm();cleanupApp.refresh();});
  // 销毁后重新挂载，确保事件和试射帧没有保留旧实例。
  await page.evaluate(async()=>{cleanupApp.destroy();cleanupApp=(await import('/src/app/create-app.js')).createApplication();if(!await cleanupApp.ready)throw Error('重挂载素材失败');});
  await page.locator('#weapons-button').click();
  if(await page.locator('#workshop-dialog').count()!==1||!await page.locator('#workshop-dialog').isVisible())throw Error('重复挂载未清理');
  await page.locator('#ws-test').click();await page.waitForFunction(()=>!document.getElementById('ws-trial').hidden);
  await page.locator('#ws-close').click();
  if(errors.length)throw Error(errors.join('\n'));
  return {weaponCount:names.length,vehicleCount:4,widths:[1280,390,320],errors};
}
