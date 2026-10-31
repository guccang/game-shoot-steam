// 正式场景昼夜与实体动作验收，使用真实角色图集、地形、载具与 UI。
async page => {
  if(new URL(page.url()).port!=='4197')throw Error('仅允许隔离端口');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.reload();await page.setViewportSize({width:1280,height:960});
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;
    const {catSprites}=await import('/src/rendering/cat-animation.js');if(!await catSprites.load())throw Error('正式角色图集缺失');
    g.progress.weapon=15;g.progress.weaponParts[15].coordination=8;
    g.reset();g.start();g.updateWaves=()=>{};g.hurt=()=>{};g.enemies=[];
    Object.assign(g.player,{x:1030,y:710,invincible:0});
    for(const [x,y] of [[1110,710],[1060,780],[980,775]]){const e=g.spawnEnemy(0,0,{x,y});e.hp=e.maxHp=1e8;e.speed=0;}
    g.progress.vehicleWeapons[1]=1;g.configureVehicle(1);g.summonVehicle();a.refresh();
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
      await page.waitForTimeout(700);await page.screenshot({path:`output/playwright/mechanical-core/scene-${width}-${time}.png`});
      await page.locator('.world-workshop-entry').click();
      if(await page.evaluate(async()=>(await import('/src/main.js')).application.game.state)!=='paused')throw Error('建筑未暂停');
      await page.locator('[data-ws-item="15"]').click();
      await page.screenshot({path:`output/playwright/mechanical-core/workshop-${width}-${time}.png`});
      const bytes=await page.locator('#workshop-dialog canvas').evaluateAll(nodes=>nodes.reduce((n,c)=>n+c.width*c.height*4,0));
      if(bytes>5*1024*1024)throw Error('工坊画布超限');budgets.push({width,time,bytes});
      await page.locator('#ws-close').click();
      if(await page.evaluate(async()=>(await import('/src/main.js')).application.game.state)!=='playing')throw Error('关闭未恢复');
    }
  }
  // 真正按键移动，检查各猫独立脚步相位和地面边界，不用仅移动绘图模型替代。
  const before=await page.evaluate(async()=>structuredClone((await import('/src/main.js')).application.game.mechanical.nodes));
  for(const key of ['ArrowLeft','ArrowDown','ArrowRight','ArrowUp']) {await page.keyboard.down(key);await page.waitForTimeout(450);await page.keyboard.up(key);}
  await page.waitForTimeout(600);
  const scene=await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game,{blocked}=await import('/src/physics/motion.js');
    for(const n of g.mechanical.nodes.filter(n=>n.ready&&n.active))if(blocked(n.x,n.y,9,g.trees,n))throw Error('猫穿入树干或地形');
    return {nodes:structuredClone(g.mechanical.nodes),cache:a.renderer.diagnosticInfo().groundCache};
  });
  if(scene.nodes.every((n,i)=>n.walkPhase===before[i].walkPhase))throw Error('移动没有驱动关节时钟');
  if(scene.cache.count>32)throw Error('地面缓存超限');
  await page.screenshot({path:'output/playwright/mechanical-core/scene-after-move.png'});
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(300);
  await page.screenshot({path:'output/playwright/mechanical-core/scene-reduced.png'});
  await page.emulateMedia({reducedMotion:'no-preference'});
  // 原地停止和减少动态仍绘制同一猫体，重置装备回到三只时不残留多余召唤物。
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.progress.weaponParts[15].coordination=1;a.refresh();});
  await page.waitForTimeout(250);await page.screenshot({path:'output/playwright/mechanical-core/scene-three.png'});
  if(await page.evaluate(async()=>(await import('/src/main.js')).application.game.mechanical.nodes.filter(n=>n.active).length)!==3)throw Error('回到三猫残留');
  if(errors.length)throw Error(errors.join('\n'));return {budgets,groundCache:scene.cache};
}
