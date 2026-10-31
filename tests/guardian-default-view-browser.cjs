// 正式开局、默认镜头、手机布防与手势验收，只操作隔离端口存档。
async page=>{
  if(new URL(page.url()).port!=='4220')throw Error('只允许隔离验收端口');
  const errors=[],views=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();});
  await page.reload();await page.evaluate(async()=>{await (await import('/src/main.js')).application.ready;});
  await page.locator('#start').click();
  if(!await page.locator('#realm-button').isVisible())await page.locator('#field-menu-toggle').click();
  await page.locator('#realm-button').click();await page.locator('[data-enter-realm="guardian"]').click();
  await page.getByRole('button',{name:'开始第一波',exact:true}).click();
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application;window.guardianReview=a;
    // 固定采样时刻，仍用正式更新方法执行每一帧，不加伤害、补给或无敌。
    window.guardianTick=a.game.update.bind(a.game);a.game.update=()=>{};
    for(let i=0;i<200;i++)window.guardianTick(.05,{x:0,y:0});a.refresh();
  });
  for(const [width,height] of [[320,568],[390,844],[844,390],[1280,900]]){
    await page.setViewportSize({width,height});
    for(const time of ['day','night']){
      views.push(await page.evaluate(async time=>{
        const a=window.guardianReview,r=a.renderer,g=a.game;
        const {CombatCamera}=await import('/src/rendering/camera.js');
        const {inspectGuardianStart}=await import('/src/rendering/visual-review.js');
        const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
        Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});
        r.light=new EnvironmentTransition(a.environment);r.tone=new SceneTone(a.environment);r.resize();r.draw();a.refresh();
        const normal=new CombatCamera().update(g.player,r.width,r.height),v=r.view;
        if(v.zoom!==normal.zoom||Math.abs(v.w-normal.w)>1e-8)throw Error('不是普通战斗倍率');
        const builds=r.ground.stats().builds;r.draw();r.draw();
        if(r.ground.stats().builds!==builds)throw Error('重复重建地形缓存');
        return {...inspectGuardianStart(g,r),time};
      },time));
      await page.screenshot({path:`output/playwright/guardian-gentle-start/${width}-${time}.png`});
    }
  }
  const first=await page.evaluate(()=>{
    const a=window.guardianReview,g=a.game;let steps=0;
    while(g.realm.phase==='combat'&&steps++<1800)window.guardianTick(.05,{x:0,y:0});
    a.refresh();if(g.realm.phase!=='rest'||g.realm.kills!==12)throw Error('初始手枪未完成第一波');
    return {kills:g.realm.kills,hp:g.player.hp,goddess:g.realm.goddess.hp,defenses:g.realm.defenses.length};
  });
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{const a=window.guardianReview;a.renderer.resize();a.renderer.draw();a.refresh();});
  const slot=await page.locator('[data-guardian-slot]').evaluateAll(nodes=>{
    const n=nodes.find(n=>{const b=n.getBoundingClientRect();return b.left>15&&b.right<innerWidth-15&&b.top>180&&b.bottom<innerHeight-200;});
    if(!n)throw Error('近景没有可点击的布防格位');return n.dataset.guardianSlot;
  });
  await page.locator(`[data-guardian-slot="${slot}"]`).click();
  await page.locator('[data-guardian-equipment="weapon:0"]').click();
  await page.evaluate(slot=>{const g=window.guardianReview.game;if(!g.realm.defenses.some(t=>t.slot===Number(slot)))throw Error('布防命中错位');},slot);
  await page.locator('.guardian-next-wave').click();
  // 真实按键驱动应用循环，验证近景跟随与布防不会吞掉移动。
  const before=await page.evaluate(()=>{const a=window.guardianReview;a.game.update=window.guardianTick;return a.game.player.x;});
  await page.keyboard.down('d');await page.waitForTimeout(300);await page.keyboard.up('d');
  await page.evaluate(before=>{const a=window.guardianReview;a.game.update=()=>{};if(a.game.player.x<=before)throw Error('移动未生效');},before);
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  const initial=await page.evaluate(()=>window.guardianReview.renderer.view.zoom);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:150,y:260},{id:2,x:240,y:260}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:130,y:260},{id:2,x:260,y:260}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.evaluate(initial=>{if(window.guardianReview.renderer.view.zoom<=initial)throw Error('双指拉近失效');},initial);
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
  // 同局暂停保留手动倍率，新局才恢复普通倍率。
  const zoom=await page.evaluate(()=>window.guardianReview.renderer.view.zoom);
  await page.locator('#realm-button').click();await page.locator('[data-realm-resume]').click();
  await page.evaluate(zoom=>{const a=window.guardianReview;a.renderer.draw();if(a.renderer.view.zoom!==zoom)throw Error('暂停重置了倍率');},zoom);
  await page.locator('#realm-button').click();await page.locator('[data-realm-exit]').click();
  await page.locator('#field-menu-toggle').click();await page.locator('#realm-button').click();
  await page.locator('[data-enter-realm="guardian"]').click();
  await page.evaluate(()=>{const a=window.guardianReview;a.renderer.draw();if(a.renderer.view.zoom!==.85)throw Error('新局未恢复默认');});
  if(errors.length)throw Error(errors.join(';'));
  return {views,first,build:true,movement:true,pinch:true,errors,designCriterion:'guardian-default-view'};
}
