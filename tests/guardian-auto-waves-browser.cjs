// 隔离浏览器验证：无常驻状态栏、真实倒计时按钮、地面建造和昼夜同屏。
async page => {
  if(new URL(page.url()).port!=='4187')throw Error('仅允许隔离端口');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844});
  await page.reload();
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;
    window.guardianAutoApp=a;
    if(g.realm)g.leaveRealm();g.state='playing';g.enterRealm('guardian');
    document.querySelectorAll('dialog[open]').forEach(d=>d.close());
    a.renderer.resize();a.renderer.draw();a.refresh();
  });
  await page.getByRole('button',{name:'开始第一波',exact:true}).click();
  await page.locator('[data-guardian-slot="0"]').click();
  await page.locator('[data-guardian-equipment="weapon:0"]').click();
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;
    if(g.realm.defenses.length!==1||g.state!=='playing')throw Error('移除状态栏后地面建造失效');
    if(document.querySelector('.guardian-command-bar')||!document.querySelector('.guardian-wave-controls').hidden)throw Error('战斗仍显示常驻状态栏');
    const {updateRealm}=await import('/src/core/realm-manager.js');
    g.enemies=[];g.realm.kills=g.realm.spec.total;updateRealm(g,0);a.refresh();
    if(g.realm.restRemaining!==20||g.realm.offers.length)throw Error('未进入20秒无祝福休整');
  });
  await page.waitForFunction(()=>{
    const g=window.guardianAutoApp.game;
    return g.realm.restRemaining<19;
  });
  await page.locator('#settings-button').click();
  const frozen=await page.evaluate(async()=>{
    const g=(await import('/src/main.js')).application.game;
    if(g.state!=='paused')throw Error('弹窗未暂停倒计时');return g.realm.restRemaining;
  });
  await page.waitForTimeout(300);
  await page.evaluate(async frozen=>{
    if((await import('/src/main.js')).application.game.realm.restRemaining!==frozen)throw Error('暂停仍在计时');
  },frozen);
  await page.locator('#settings-done').click();
  await page.locator('.guardian-next-wave').click();
  const start=await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;
    if(g.realm.stage!==2||g.realm.phase!=='combat')throw Error('点击倒计时没有开波');
    if(document.querySelector('dialog[open]'))throw Error('开波仍打开祝福弹窗');
    const {updateRealm}=await import('/src/core/realm-manager.js');
    g.enemies=[];g.realm.kills=g.realm.spec.total;updateRealm(g,0);a.refresh();
    return performance.now();
  });
  // 使用真实浏览器帧循环等待完整二十秒，不能直接修改剩余时间冒充自动开波。
  await page.waitForFunction(()=>{
    const g=window.guardianAutoApp.game;
    return g.realm.stage===3&&g.realm.phase==='combat';
  },null,{timeout:45000});
  const elapsed=await page.evaluate(start=>performance.now()-start,start);
  if(elapsed<19900)throw Error(`二十秒计时过早结束：${elapsed}ms`);
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;
    const {updateRealm}=await import('/src/core/realm-manager.js');
    g.enemies=[];g.realm.kills=g.realm.spec.total;updateRealm(g,0);a.refresh();
  });
  const results=[];
  for(const [width,height]of [[320,568],[1280,900]]){
    await page.setViewportSize({width,height});
    for(const time of ['day','night']){
      results.push(await page.evaluate(async time=>{
        const a=(await import('/src/main.js')).application,r=a.renderer;
        const {EnvironmentTransition}=await import('/src/world/environment.js');
        const {SceneTone}=await import('/src/rendering/scene-tone.js');
        Object.assign(r.environment,{time,weather:'sun',autoTime:false,autoWeather:false});
        r.light=new EnvironmentTransition(r.environment,0);r.tone=new SceneTone(r.environment,0);
        r.resize();r.draw();a.refresh();
        const button=document.querySelector('.guardian-next-wave'),b=button.getBoundingClientRect();
        if(button.hidden||b.height<44||document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)!==button)throw Error('倒计时按钮遮挡');
        if(document.querySelector('.realm-choices')||document.documentElement.scrollWidth>innerWidth)throw Error('祝福选择残留或横向溢出');
        return {width:innerWidth,time,button:button.textContent};
      },time));
      await page.screenshot({path:`output/playwright/guardian-auto-${width}-${time}.png`});
    }
  }
  if(errors.length)throw Error(errors.join(';'));
  return {designCriterion:['guardian-auto-wave','guardian-panel-dismiss','guardian-day-night'],elapsed,results,errors};
}
