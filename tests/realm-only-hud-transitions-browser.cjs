// 补查秘境续玩、屏幕切换、触摸与键盘入口，以及休整和失败阶段的 HUD。
async (page)=>{
  if(new URL(page.url()).port!=='4218')throw Error('仅允许隔离验收端口');
  const checks=[];
  // 每个状态均从正式复核入口读取，不用独立测试页面模拟显示。
  async function inspect(label){
    const r=await page.evaluate(async()=> (await import('/src/rendering/visual-review.js')).inspectRealmHud(document));
    if(!r.active||r.menu.join()!=='realm-button'||r.forestVisible.length||r.toggle)throw Error(label+JSON.stringify(r));
    checks.push(label);
  }
  if(await page.locator('[data-realm-exit]').isVisible())await page.locator('[data-realm-exit]').click();
  if(!await page.locator('#realm-button').isVisible())await page.locator('#field-menu-toggle').click();
  await page.locator('#realm-button').click();
  await page.locator('[data-enter-realm="tower"]').click();
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.save();});
  await page.reload();
  await page.evaluate(async()=>{await (await import('/src/main.js')).application.ready;});
  await inspect('reload');
  for(const width of [390,1280,320]){
    await page.setViewportSize({width,height:844});
    await inspect(`resize-${width}`);
  }
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
  const box=await page.locator('#realm-button').boundingBox();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.locator('[data-realm-resume]').waitFor({state:'visible'});
  await page.locator('[data-realm-resume]').click();
  await page.waitForFunction(()=>document.activeElement?.id==='realm-button');
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
  await page.keyboard.press('Enter');
  await page.locator('[data-realm-resume]').waitFor({state:'visible'});
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.getElementById('realm-dialog').open);
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;
    if(g.state==='paused')g.pause();
    for(let i=0;i<3000&&g.realm.phase==='combat';i++){
      g.updateWaves(.05);for(const e of g.enemies)if(e.hp>0)g.hit(e,100000);
      if(g.boss)g.hit(g.boss,1000000);
    }
    if(g.realm.phase!=='rest')throw Error('未进入休整');a.refresh();
  });
  await inspect('rest');
  await page.locator('#realm-button').click();
  await page.locator('#realm-dialog [data-realm-next]').click();
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;
    g.player.invincible=0;g.hurt(100000);a.refresh();
    if(g.realm.phase!=='lost')throw Error('未进入结算');
  });
  await inspect('lost');
  await page.screenshot({path:'output/playwright/realm-only-hud/result-320.png'});
  await page.locator('[data-realm-exit]').click();
  if(!await page.locator('#field-menu-toggle').isVisible())throw Error('退出未恢复菜单');
  return {checks,touch:true,keyboard:true};
}
