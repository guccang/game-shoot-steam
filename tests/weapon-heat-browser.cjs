// 隔离页面按真实战斗时间采样红管，验证低弹量停火与换弹的渐变画面。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({width:390, height:844});
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    a.destroy();
    const {freshProgress} = await import('/src/game.js');
    const p = freshProgress(); p.weapons[2] = 1; p.weapon = 2;
    localStorage.setItem('forest-patrol-v1', JSON.stringify(p));
  });
  await page.reload();
  await page.locator('#start').click();
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application, g = a.game;
    a.destroy();
    g.reset(); g.start();
    g.enemies = []; g.trees = []; g.spawnTimer = 999; g.attackTimer = 0;
    g.addTree(g.player.x + 150, g.player.y, {hp:1e9, maxHp:1e9});
    a.renderer.draw(); a.refresh();
  });
  const states = [];
  for (const stage of ['cold', 'hot', 'one-round-cooled', 'reload-start', 'reload-half', 'reload-end']) {
    const result = await page.evaluate(async (stage) => {
      const a = (await import('/src/main.js')).application, g = a.game, m = g.magazines[2];
      const {gatlingHeat} = await import('/src/combat/weapon-heat.js');
      // 使用固定生产步长，只人为隔离随机怪物和靶子死亡。
      const step = seconds => { for (let t = 0; t < seconds - 1e-8; t += 1/120) g.update(1/120); };
      if (stage === 'hot') step(4.2);
      if (stage === 'one-round-cooled') {
        g.trees = []; m.ammo = 1; step(3.3);
      }
      if (stage === 'reload-start') {
        m.ammo = 80; g.attackTimer = 0;
        g.addTree(g.player.x + 150, g.player.y, {hp:1e9, maxHp:1e9});
        step(4.2); m.ammo = 1; g.attack(); g.trees = [];
      }
      if (stage === 'reload-half' || stage === 'reload-end') step(1.5);
      a.renderer.draw(); a.refresh();
      return {stage, heat:gatlingHeat(g.weapon(), m), ammo:m.ammo, remaining:m.remaining};
    }, stage);
    states.push(result);
    await page.screenshot({path:`output/playwright/gatling-runtime-heat/${stage}.png`});
  }
  if (states[0].heat !== 0 || states[1].heat < 0.99 || states[2].heat !== 0 || states[2].ammo !== 1) throw Error('开火或停火热度错误：' + JSON.stringify(states));
  if (states[3].heat < 0.99 || Math.abs(states[4].heat - 0.5) > 0.01 || states[5].heat !== 0 || states[5].ammo !== 80) throw Error('换弹没有平滑冷却：' + JSON.stringify(states));
  if (errors.length) throw Error(errors.join('\n'));
  return {states, errors};
}
