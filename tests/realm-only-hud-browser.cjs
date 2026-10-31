// 隔离端口验证四种秘境的真实入口、局内 HUD、焦点与森林界面恢复。
async (page) => {
  if(new URL(page.url()).port!=='4218')throw Error('仅允许隔离验收端口');
  const errors=[],checks=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();});
  await page.reload();
  await page.evaluate(async()=>{await (await import('/src/main.js')).application.ready;});
  await page.locator('#start').click();
  // 正式复核入口检查显示节点，弹窗阶段同时检查其后的 HUD 状态。
  async function inspect(label){
    const result=await page.evaluate(async()=> (await import('/src/rendering/visual-review.js')).inspectRealmHud(document));
    if(!result.active||result.menu.join()!=='realm-button'||result.forestVisible.length||result.toggle)
      throw Error(label+JSON.stringify(result));
    checks.push({label,...result});
  }
  // 实际点击菜单，兼容森林的手机折叠和秘境的直接入口。
  async function open(){
    if(!await page.locator('#realm-button').isVisible())await page.locator('#field-menu-toggle').click();
    await page.locator('#realm-button').click();
  }
  for(const width of [320,390,1280]){
    await page.setViewportSize({width,height:844});
    for(const mode of ['rogue','tower','guardian','football']){
      await open();
      await page.locator(`[data-enter-realm="${mode}"]`).click();
      await inspect(`${width}-${mode}-entry`);
      if(mode==='rogue'){
        for(const kind of ['weapon','vehicle','turret'])await page.locator(`[data-realm-roll="${kind}"]`).click();
        await page.locator('[data-realm-ready]').click();
        await inspect(`${width}-blessing`);
        await page.locator('[data-realm-blessing]').first().click();
      }
      if(mode==='football')await page.locator('[data-football-start]').click();
      if(mode==='guardian'){
        if(!await page.getByRole('button',{name:'开始第一波',exact:true}).isVisible())throw Error('缺少布防开波操作');
        await page.getByRole('button',{name:'开始第一波',exact:true}).click();
      }
      await page.evaluate(async()=>{
        const a=(await import('/src/main.js')).application;
        a.game.player.invincible=999;
        for(let i=0;i<100;i++)a.game.update(.05,{x:0,y:0});
        a.refresh();
      });
      await inspect(`${width}-${mode}-combat`);
      if(await page.locator('.player-hud').isVisible() === (mode==='football'))throw Error('局内生命信息显隐错误');
      if(mode==='rogue')for(const time of ['day','night']){
        await page.evaluate(async time=>{
          const a=(await import('/src/main.js')).application;
          const {EnvironmentTransition}=await import('/src/world/environment.js');
          const {SceneTone}=await import('/src/rendering/scene-tone.js');
          Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});
          a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);
          a.renderer.resize();a.refresh();a.renderer.draw();
        },time);
        await page.screenshot({path:`output/playwright/realm-only-hud/rogue-${width}-${time}.png`});
      }
      else if(width===390)await page.screenshot({path:`output/playwright/realm-only-hud/${mode}-390.png`});
      await open();await inspect(`${width}-${mode}-paused`);
      await page.locator('[data-realm-resume]').click();
      await page.waitForFunction(()=>document.activeElement?.id==='realm-button');
      await open();
      await page.locator('[data-realm-exit]').click();
      await page.waitForFunction(()=>!document.getElementById('realm-dialog').open);
      if(!await page.locator('.hud-resources').isVisible())throw Error('森林资源栏未恢复');
      if(width<=600){
        if(await page.locator('#realm-button').isVisible())throw Error('森林菜单未收起');
        await page.locator('#field-menu-toggle').click();
      }
      for(const id of ['story','realm','map','heroes','weapons','vehicles'])
        if(!await page.locator(`#${id}-button`).isVisible())throw Error('入口未恢复 '+id);
      if(width<=600)await page.locator('#field-menu-toggle').click();
    }
  }
  if(errors.length)throw Error(errors.join('\n'));
  return {checks,errors};
}
