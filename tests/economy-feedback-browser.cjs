// 正式工坊追赶价、关键等级、双路线资格与昼夜同屏验收，使用隔离存档。
async page=>{
  if(new URL(page.url()).port!=='4174')throw Error('仅允许隔离端口');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(()=>localStorage.removeItem('forest-patrol-v1'));
  await page.goto('http://localhost:4174/');
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,{freshProgress}=await import('/src/progression/progress.js'),p=freshProgress();
    await a.ready;
    p.weapons[0]=20;p.weapons[3]=14;p.heroes[0]=5;p.vehicleWeapons[0]=5;p.vehicleHulls[1]=8;p.vehicleIndex=1;
    p.vehicleLoadouts[1]=0;p.coins=p.wood=100000;p.materials={parts:10000,crystal:10000,core:100};p.realms.records.tower.best=40;
    a.game.progress=p;a.game.reset();a.game.start();a.game.summonVehicle();
    Object.assign(a.game.player,{x:1030,y:710});
    const e=a.game.spawnEnemy(0,100);Object.assign(e,{x:1130,y:790,hp:100000,maxHp:100000});
    a.refresh();
    if(!await(await import('/src/rendering/cat-animation.js')).catSprites.load())throw Error('角色动作资源缺失');
  });
  const checks=[];
  for(const width of [1440,390,320])for(const time of ['day','night']){
    await page.setViewportSize({width,height:width===1440?960:844});
    await page.evaluate(async time=>{
      const a=(await import('/src/main.js')).application,{EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
      Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});
      a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);
      a.renderer.resize();a.game.player.hp=a.game.maxHp();a.game.start();a.refresh();
    },time);
    await page.waitForTimeout(1500);
    await page.screenshot({path:'output/playwright/economy-scene-'+width+'-'+time+'.png'});
    await page.evaluate(async()=>{(await import('/src/main.js')).application.workshop.open('weapons',3);});
    await page.locator('[data-ws-upgrade="damage"]').click();
    const read=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectEconomyFeedback(document));
    if(!read.cost.includes('3折')||!read.cost.includes('关键等级'))throw Error('缺少追赶价或关键等级反馈');
    if(!read.cost.includes('升级封顶价'))throw Error('缺少正式封顶价格反馈');
    if(read.overflow)throw Error('工坊横向溢出');
    checks.push({width,time,...read});
    await page.screenshot({path:'output/playwright/economy-workshop-'+width+'-'+time+'.png'});
    await page.locator('#ws-close').click();
  }
  // 键盘就位与按住施工，真正提交一次追赶升级。
  await page.evaluate(async()=>{(await import('/src/main.js')).application.workshop.open('weapons',3);});
  await page.locator('[data-ws-upgrade="damage"]').click();
  await page.locator('#ws-socket').focus();await page.keyboard.press('Enter');await page.waitForTimeout(1200);
  await page.locator('#ws-tool').focus();await page.keyboard.press('Enter');
  const before=await page.evaluate(async()=>{const p=(await import('/src/main.js')).application.game.progress;return {coins:p.coins,level:p.weapons[3]};});
  await page.locator('#ws-hold').focus();await page.keyboard.down('Space');
  await page.waitForTimeout(1900);
  await page.keyboard.up('Space');
  const after=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,p=a.game.progress;return {coins:p.coins,level:p.weapons[3],ledger:p.economyLog};});
  if(after.coins>=before.coins||after.level!==before.level+1)throw Error('施工未真实扣费升级');
  if(before.coins-after.coins!==135)throw Error('450封顶后30%追赶应扣135金币');
  await page.locator('#ws-close').click();
  // 已满足秘境条件的未拥有装备，用正式购买界面显示两条资格路线。
  await page.evaluate(async()=>{(await import('/src/main.js')).application.workshop.open('weapons',12);});
  if(!await page.locator('#ws-purpose').innerText().then(t=>t.includes('秘境')))throw Error('未展示秘境资格路线');
  if(await page.locator('#ws-purchase').isDisabled())throw Error('秘境40层仍不能购买');
  await page.locator('#ws-purchase').click();
  if(!await page.evaluate(async()=>(await import('/src/main.js')).application.game.progress.weapons[12]>0))throw Error('购买未提交');
  await page.locator('#ws-close').click();
  await page.locator('#settings-button').click();await page.locator('#debug-toggle').click();
  const d=page.waitForEvent('download');await page.locator('#export-economy').click();await(await d).saveAs('output/playwright/economy-live-report.json');
  if(errors.length)throw Error(errors.join('\n'));
  return {checks,transaction:{before,after},errors};
}

