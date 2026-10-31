// 手机施工调整后的昼夜同屏回归，使用正式角色、怪物、载具、建筑与 UI。
async page => {
  if(new URL(page.url()).port!=='4197')throw Error('仅允许隔离端口');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.reload();await page.setViewportSize({width:1280,height:960});
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;
    const {catSprites}=await import('/src/rendering/cat-animation.js');if(!await catSprites.load())throw Error('正式角色图集缺失');
    g.progress.weapon=15;g.progress.weaponParts[15].coordination=8;g.progress.mechanicalLoadout=null;g.progress.vehicleLoadouts[0]=13;
    g.reset();g.start();g.updateWaves=()=>{};g.hurt=()=>{};g.enemies=[];
    Object.assign(g.player,{x:1030,y:710,invincible:0});
    for(const [x,y] of [[1110,710],[1060,780],[980,775]]){const e=g.spawnEnemy(0,0,{x,y});e.hp=e.maxHp=1e8;e.speed=0;e.damage=0;e.flying=false;}
    g.progress.vehicleWeapons[13]=1;g.configureVehicle(13);g.summonVehicle();a.refresh();
  });
  // 使用真实环境入口同步图标与时段，测试夹具不绕过面板状态。
  await page.locator('#settings-button').click();await page.locator('#environment-button').click();
  await page.locator('#auto-time').uncheck();await page.locator('#auto-weather').uncheck();
  await page.locator('button[data-forest-season="summer"]').click();await page.locator('button[data-weather="sun"]').click();
  await page.locator('#close-environment').click();if(await page.locator('#close-settings').isVisible())await page.locator('#close-settings').click();
  const budgets=[];
  for(const width of [320,390,1280]) {
    await page.setViewportSize({width,height:width===1280?960:844});
    for(const time of ['day','night']) {
      const label=time==='day'?'白昼':'夜晚';
      for(let i=0;i<3&&(await page.locator('#time-picture-label').innerText())!==label;i++)await page.locator('#time-picture').click();
      if((await page.locator('#time-picture-label').innerText())!==label)throw Error('昼夜图片未同步');
      await page.evaluate(async time=>{
        const a=(await import('/src/main.js')).application;
        const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
        Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,forestSeason:'summer'});
        a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);a.renderer.camera.time=null;a.renderer.resize();a.refresh();
      },time);
      await page.waitForTimeout(700);await page.screenshot({path:`output/playwright/workshop-touch-construction/scene-${width}-${time}.png`});
      await page.locator('.world-workshop-entry').click();
      if(await page.evaluate(async()=>(await import('/src/main.js')).application.game.state)!=='paused')throw Error('建筑未暂停');
      await page.locator('[data-ws-item="0"]').click();
      await page.screenshot({path:`output/playwright/workshop-touch-construction/workshop-${width}-${time}.png`});
      const bytes=await page.locator('#workshop-dialog canvas').evaluateAll(nodes=>nodes.reduce((n,c)=>n+c.width*c.height*4,0));
      if(await page.evaluate(async()=>(await import('/src/main.js')).application.renderer.diagnosticInfo().groundCache.count)>32)throw Error('地面缓存超限');
      if(bytes>5*1024*1024)throw Error('工坊画布超限');budgets.push({width,time,bytes});
      await page.locator('#ws-close').click();
      if(await page.evaluate(async()=>(await import('/src/main.js')).application.game.state)!=='playing')throw Error('关闭未恢复');
    }
  }
  if(errors.length)throw Error(errors.join('\n'));return budgets;
}
