// 隔离端口上的真实按钮、战斗与昼夜同屏验收，失败直接报告，不以替代素材通过。
async page => {
  if (new URL(page.url()).port !== '4187') throw Error('仅允许隔离验收端口');
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 320, height: 568 });
  await page.reload();
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application, g = a.game;
    if (g.realm) g.leaveRealm();
    g.state = 'playing'; g.progress.weapons.fill(1); g.progress.vehicleHulls.fill(1);
    g.enterRealm('guardian'); g.continueRealm(); g.realm.warning = 120;
    document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
    a.renderer.resize(); a.renderer.draw(); a.refresh();
  });
  await page.locator('[data-guardian-slot="0"]').click();
  await page.locator('[data-guardian-equipment="weapon:0"]').click();
  const deployed = await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application, g = a.game;
    if (g.state !== 'playing' || g.realm.defenses.length !== 1 || g.realm.realmCoins !== 100) throw Error('战中建造失败');
    if (!document.querySelector('.guardian-build-panel').hidden) throw Error('部署后未收起');
    return { level: g.realm.defenses[0].level, coins: g.realm.realmCoins };
  });
  await page.locator('[data-guardian-slot="0"]').click();
  await page.locator('[data-guardian-stat="damage"]').click();
  await page.evaluate(async () => {
    const g = (await import('/src/main.js')).application.game;
    if (g.realm.defenses[0].level !== 2 || g.realm.realmCoins !== 60) throw Error('战中升级失败');
  });
  await page.locator('[data-guardian-action="remove"]').click();
  await page.locator('[data-guardian-slot="5"]').click();
  await page.locator('[data-guardian-equipment="weapon:0"]').click();
  await page.locator('[data-guardian-slot="5"]').click();
  await page.evaluate(async () => {
    const g = (await import('/src/main.js')).application.game;
    if (g.realm.defenses[0].kind !== 'weapon' || g.realm.realmCoins !== 100) throw Error('战中枪械部署失败');
  });
  // 属性详情现在可滚动，先关闭再进入设置，缩放后重新点选格位。
  await page.getByRole('button', { name: '关闭建造面板' }).click();
  const baseline = await page.evaluate(async () => (await import('/src/main.js')).application.renderer.view.zoom);
  await page.locator('#settings-button').click();
  await page.getByRole('button', { name: '拉近视角', exact: true }).click();
  await page.evaluate(async baseline => {
    const a = (await import('/src/main.js')).application;
    if (a.renderer.view.zoom <= baseline) throw Error('加号未放大');
  }, baseline);
  await page.getByRole('button', { name: '拉远视角', exact: true }).click();
  await page.getByRole('slider', { name: '视角缩放' }).fill('3');
  await page.locator('#close-settings').click();
  await page.locator('[data-guardian-slot="5"]').click();
  await page.locator('[data-guardian-stat="damage"]').click();
  await page.getByRole('button', { name: '关闭建造面板' }).click();
  await page.locator('#settings-button').click();
  await page.getByRole('button', { name: '全景', exact: true }).click();
  await page.locator('#close-settings').click();
  const pressure = await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application, g = a.game;
    if (g.realm.defenses[0].level !== 2) throw Error('缩放后点错格位');
    g.realm.warning = 0; g.attackTimer = 999;
    // 正式刷怪时钟连续运行，保留真实选点、寻路和碰撞。
    for (let i = 0; i < 120; i++) g.update(.05);
    if (g.realm.spawned < 18) throw Error('怪潮密度不足');
    return { spawned: g.realm.spawned, alive: g.enemies.filter(e => e.hp > 0).length };
  });
  // 同屏样本包含枪械格位、玩家驾驶载具、浮游炮与无人机的正式运行时。
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application, g = a.game;
    g.realm.realmCoins = 3000;g.summonVehicle();
    for (const [slot, kind, index, weapon] of [[0,'weapon',2,2],[1,'weapon',1,1],[2,'weapon',12,12],[3,'weapon',0,0],[4,'weapon',3,3],[6,'weapon',6,6],[7,'weapon',13,13]]) g.guardianDefense('deploy',slot,kind,index,weapon);
    for (const e of g.enemies) { e.hp = e.maxHp = 10000; e.damage = 0; }
    g.realm.spawnTimer = 999; g.player.invincible = 999;
    for (let i = 0; i < 20; i++) g.update(.05);
    a.refresh();
  });
  const views = [];
  for (const [width, height] of [[320,568], [390,844], [1280,900]]) {
    await page.setViewportSize({ width, height });
    for (const time of ['day', 'night']) {
      views.push(await page.evaluate(async time => {
        const a = (await import('/src/main.js')).application, r = a.renderer, g = a.game;
        const { EnvironmentTransition } = await import('/src/world/environment.js');
        const { SceneTone } = await import('/src/rendering/scene-tone.js');
        Object.assign(r.environment, { time, weather:'sun', autoTime:false, autoWeather:false });
        r.light = new EnvironmentTransition(r.environment, 0); r.tone = new SceneTone(r.environment, 0);
        r.resize(); g.setViewport(r.width, r.height); r.draw(); a.refresh();
        const before = r.ground.stats().builds;
        for (let i = 0; i < 3; i++) r.draw();
        const rebuilds = r.ground.stats().builds - before;
        if (rebuilds !== 0) throw Error('广角地形缓存反复重建');
        const pads = [...document.querySelectorAll('[data-guardian-slot]')];
        for (const pad of pads) {
          const box = pad.getBoundingClientRect();
          if (box.width < 44 || box.height < 44 || document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) !== pad) throw Error('全景方格遮挡或尺寸不足');
        }
        if (document.documentElement.scrollWidth > innerWidth) throw Error('页面横向溢出');
        return { width: r.width, height: r.height, time, zoom: r.view.zoom, rebuilds };
      }, time));
      await page.screenshot({ path:`output/playwright/horde-${width}-${time}.png` });
    }
  }
  const samples = await page.evaluate(async () => {
    const { renderVisualCase } = await import('/src/rendering/visual-review.js');
    const canvas = document.createElement('canvas'); canvas.width = 480; canvas.height = 420;
    const result = {};
    for (const id of ['guardian-field-day', 'guardian-field-night']) {
      const frames = [];
      for (let i = 0; i < 8; i++) {
        canvas.getContext('2d').clearRect(0,0,480,420);
        await renderVisualCase(canvas.getContext('2d'), id, i / 12);
        frames.push(canvas.toDataURL());
      }
      result[id] = new Set(frames).size;
      if (result[id] < 6) throw Error('连续动作帧未变化');
    }
    return result;
  });
  if (errors.length) throw Error(errors.join(';'));
  return { designCriterion:['guardian-live-build','guardian-battlefield-overview','guardian-world-build-hit-targets','guardian-day-night','guardian-defense-motion'], deployed, pressure, views, samples, errors };
}
