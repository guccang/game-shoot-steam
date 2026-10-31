// 隔离页面验收紧凑 Boss HUD、图像分类、战中波次冻结与死亡后的挑战存档。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application; a.destroy();
    const {freshProgress} = await import('/src/game.js'); const p=freshProgress();
    p.weapons.fill(1);p.weapon=9;p.coins=20000;p.wood=10000;
    localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
  });
  await page.reload();await page.locator('#weapons-button').click();
  if(await page.locator('[data-category="all"]').getAttribute('aria-pressed')!=='true')throw Error('默认不是全部');
  if(await page.locator('#inventory [data-portrait]').count()!==14)throw Error('全部列表不完整');
  if(await page.locator('#inventory [data-portrait]').first().getAttribute('data-portrait')!=='9')throw Error('当前武器未置顶');
  const labels=await page.locator('#weapon-categories button').evaluateAll(nodes=>nodes.map(n=>({label:n.getAttribute('aria-label'),text:n.textContent.trim(),image:!!n.querySelector('canvas'),title:n.title})));
  if(labels.length!==6||labels.some(n=>n.text||!n.image||!n.label||!n.title))throw Error('图像分类不符合要求');
  const layouts=[];
  for(const width of [320,390,580]) {
    await page.setViewportSize({width,height:width===320?568:width===580?928:844});
    await page.locator('#camp-dialog').evaluate(n=>n.scrollTop=0);
    if(!await page.locator('#camp-dialog').evaluate(n=>n.scrollWidth<=n.clientWidth))throw Error('工坊横向溢出');
    await page.screenshot({path:`output/playwright/boss-waves-arsenal/workshop-${width}.png`});
  }
  await page.locator('[data-category="heavy"]').click();await page.locator('#close-camp').click();
  await page.locator('#weapons-button').click();
  if(await page.locator('[data-category="all"]').getAttribute('aria-pressed')!=='true')throw Error('重开工坊未重置全部');
  await page.locator('[data-category="vehicles"]').click();
  if(!await page.locator('#vehicle-turrets-panel').isVisible())throw Error('载具图标没有打开炮塔页');
  await page.keyboard.press('Escape');
  if(!await page.locator('#camp-dialog').isVisible())throw Error('没有返回工坊');
  await page.locator('[data-category="elemental"]').click();await page.locator('#tab-heroes').click();await page.locator('#tab-weapons').click();
  if(await page.locator('[data-category="all"]').getAttribute('aria-pressed')!=='true')throw Error('角色切回工坊没有默认全部');
  await page.keyboard.press('Escape');await page.locator('#start').click();
  await page.evaluate(async () => {
    const a=(await import('/src/main.js')).application,g=a.game;
    const {waveDifficulty}=await import('/src/config/waves.js');
    g.enemies=[];g.trees=g.trees.filter(t=>Math.hypot(t.x-g.player.x,t.y-g.player.y)>240);
    g.wave=6;g.waveKills=g.waveSpawned=0;g.progress.bosses=2;g.kills=12;g.spawnTimer=g.attackTimer=999;
    for(let i=0;i<waveDifficulty(6).total;i++)g.spawnEnemy(i*.4,160);
    a.refresh();
  });
  await page.locator('#boss-button').click();
  const first=await page.evaluate(async () => {
    const a=(await import('/src/main.js')).application,g=a.game;
    const stats=JSON.parse(JSON.stringify(g.progress.bossChallenge));
    if(JSON.parse(localStorage.getItem('forest-patrol-v1')).bossChallenge.maxHp!==stats.maxHp)throw Error('首次挑战未保存');
    g.boss.attack=999;g.boss.speed=0;
    for(const e of g.enemies)g.hit(e,1e9);
    g.updateWaves(100);
    g.transact('weapons',0,'equip');g.attackTimer=999;
    g.numbers=[];g.remnants=[];g.drops=[];g.shots=[];g.fx.items=[];a.refresh();
    if(g.wave!==6||g.waveRest!==0||g.waveKills!==32)throw Error('Boss 战清怪推进波次');
    return stats;
  });
  await page.waitForFunction(()=>!document.querySelector('#toast').classList.contains('visible'));
  for(const width of [320,390,580]) {
    await page.setViewportSize({width,height:width===320?568:width===580?928:844});
    const bounds=await page.locator('#boss-hud').evaluate(n=>{const r=n.getBoundingClientRect();return {height:r.height,width:r.width,left:r.left,right:r.right,overflow:n.scrollWidth>n.clientWidth};});
    if(bounds.height>44||bounds.overflow||bounds.left<0||bounds.right>width)throw Error('Boss HUD 不够紧凑或溢出');
    if(await page.locator('#boss-tactic').count()||await page.locator('#quest').isVisible())throw Error('仍有冗余机制描述');
    await page.screenshot({path:`output/playwright/boss-waves-arsenal/boss-${width}.png`});layouts.push({viewport:width,...bounds});
  }
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.player.invincible=0;a.game.hurt(1e9);a.refresh();});
  await page.locator('#resume').click();
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.enemies=[];a.game.kills=12;a.game.spawnTimer=a.game.attackTimer=999;a.refresh();});
  await page.locator('#boss-button').click();
  const retry=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return {snapshot:g.progress.bossChallenge,hp:g.boss.maxHp,wave:g.wave,recovery:g.recoveryRun};});
  if(JSON.stringify(retry.snapshot)!==JSON.stringify(first)||retry.hp!==first.maxHp||retry.wave!==3||!retry.recovery)throw Error('死亡后 Boss 强度变化');
  await page.reload();await page.locator('#start').click();
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.kills=12;a.refresh();});
  await page.locator('#boss-button').click();
  if(!await page.evaluate(async expected=>{const g=(await import('/src/main.js')).application.game;return g.boss.maxHp===expected.maxHp&&g.boss.damage===expected.damage&&g.boss.speed===expected.speed;},first))throw Error('刷新丢失 Boss 强度');
  if(errors.length)throw Error(errors.join('\n'));
  return {labels,layouts,defaultAll:true,vehicleTab:true,bossWaveFrozen:true,deathRetryStable:true,savedChallenge:true,errors};
}
