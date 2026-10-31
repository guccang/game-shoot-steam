// 隔离端口验收旧档、材料工坊、追踪跳转、真实掉落与手机布局，不访问玩家正式存档。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application; a.destroy();
    const { freshProgress } = await import('/src/game.js'), p = freshProgress();
    p.coins = 50000; p.wood = 30000; p.bosses = 30;
    p.weapons[8] = 4; p.mastery[8] = 120; p.mods[8] = 1; p.vehicleHulls[2] = 2;
    delete p.materials; delete p.materialPity; delete p.materialBosses; delete p.equipmentGoal;
    localStorage.clear(); localStorage.setItem('forest-patrol-v1', JSON.stringify(p));
  });
  await page.reload(); await page.locator('#start').click();
  await page.evaluate(async () => {
    const g = (await import('/src/main.js')).application.game;
    if (g.progress.weapons[8] !== 4 || g.progress.vehicleHulls[2] !== 2 ||
        g.progress.materials.parts !== 0 || g.progress.coins !== 50000)
      throw Error('旧档被扣费或重新锁定');
    g.attackTimer = g.spawnTimer = 999; g.player.invincible = 999;
  });
  await page.locator('#field-menu-toggle').click();
  await page.locator('#weapons-button').click();
  const saw = page.locator('#inventory article').filter({ has: page.locator('[data-track-kind="weapons"][data-track-index="14"]') });
  if (!await saw.locator('[data-action="buy"]').isDisabled()) throw Error('材料不足仍可购买');
  await saw.locator('[data-track-kind]').click();
  await page.locator('#camp-done').click();
  if (!await page.locator('#equipment-goal').isVisible()) throw Error('战场无追踪');
  await page.locator('#equipment-goal').click();
  if (!await page.locator('#goal-details [data-resource-art="parts"]').count()) throw Error('缺少材料需求');
  await page.locator('#goal-workshop').click();
  if (!await page.locator('#camp-dialog').isVisible()) throw Error('未跳转工坊');
  await page.locator('#camp-done').click();
  await page.waitForFunction(async () => (await import('/src/main.js')).application.game.state === 'playing');
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application, g = a.game;
    const e = g.spawnEnemy(0, 300); e.rank = 2; e.biome = 'pine';
    g.hit(e, 1e9); g.hit(e, 1e9); a.refresh();
    if (g.progress.materials.parts !== 3 || g.progress.materials.crystal !== 2)
      throw Error('击杀掉落重复或未到账');
  });
  if (!await page.locator('#equipment-goal').innerText().then(s => s.includes('可解锁')))
    throw Error('追踪未提示材料已齐');
  await page.locator('#equipment-goal').click(); await page.locator('#goal-workshop').click();
  await page.locator('#inventory [data-action="buy"][data-index="14"]').click();
  if (!await page.evaluate(async () => {
    const p = (await import('/src/main.js')).application.game.progress;
    return p.weapons[14] === 1 && p.materials.parts === 1 && p.equipmentGoal === null;
  })) throw Error('首次购买扣费或自动清除目标错误');
  await page.locator('[data-track-kind="weapons"][data-track-index="12"]').click();
  for (const width of [320, 390, 580]) {
    await page.setViewportSize({ width, height: 844 });
    const card = page.locator('#inventory article').filter({ has: page.locator('[data-track-index="12"]') });
    await card.locator('.equipment-requirements').scrollIntoViewIfNeeded();
    const details = card.locator('.material-sources');
    if (!await details.evaluate(n => n.open)) await details.locator('summary').click();
    if (await page.locator('#camp-dialog').evaluate(n => n.scrollWidth > n.clientWidth + 1))
      throw Error(`武器工坊 ${width} 横向溢出`);
    await card.locator('.equipment-requirements').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `output/playwright/materials/workshop-${width}.png` });
  }
  await page.locator('#camp-done').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'output/playwright/materials/goal-field.png' });
  await page.reload();
  if (!await page.evaluate(async () => {
    const p = (await import('/src/main.js')).application.game.progress;
    return p.equipmentGoal?.index === 12 && p.materials.parts === 1 && p.weapons[14] === 1;
  })) throw Error('刷新丢失材料、购买或目标');
  await page.locator('#field-menu-toggle').click(); await page.locator('#vehicles-button').click();
  await page.locator('[data-vehicle-preview="1"]').click();
  await page.locator('[data-track-kind="vehicle"][data-track-index="1"]').click();
  if (!await page.locator('#vehicle-board').isDisabled()) throw Error('车体绕过材料');
  await page.setViewportSize({ width: 320, height: 844 });
  await page.locator('#vehicle-material-requirements').scrollIntoViewIfNeeded();
  if (await page.locator('#vehicle-collection-dialog').evaluate(n => n.scrollWidth > n.clientWidth + 1))
    throw Error('车体面板溢出');
  await page.screenshot({ path: 'output/playwright/materials/vehicle-320.png' });
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    a.game.progress.materials = { parts: 71, crystal: 12, core: 2 }; a.refresh();
  });
  await page.locator('[data-vehicle-preview="1"]').click();
  await page.locator('#vehicle-board').click();
  if (!await page.evaluate(async () => {
    const p = (await import('/src/main.js')).application.game.progress;
    return p.vehicleHulls[1] === 1 && p.materials.parts === 1 &&
      p.materials.core === 0 && p.equipmentGoal === null;
  })) throw Error('车体购买未扣除材料或未完成目标');
  await page.locator('#vehicle-tab-turrets').click();
  await page.locator('[data-track-kind="turret"][data-track-index="14"]').click();
  const turret = page.locator('[data-turret-card="14"]');
  if (!await turret.locator('[data-turret-action="buy"]').isDisabled()) throw Error('炮塔绕过材料');
  await turret.locator('.equipment-requirements').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'output/playwright/materials/turret-320.png' });
  await page.locator('#vehicle-collection-done').click();
  await page.locator('#equipment-goal').click(); await page.locator('#goal-workshop').click();
  if (!await page.locator('#vehicle-turrets-panel').isVisible()) throw Error('炮塔目标未导航正确页签');
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    a.game.progress.materials = { parts: 5, crystal: 0, core: 0 }; a.refresh();
  });
  await page.locator('#vehicle-tab-turrets').click();
  await page.locator('[data-turret-card="0"] [data-turret-action="buy"]').click();
  await page.locator('[data-turret-card="0"] [data-turret-action="equip"]').click();
  if (!await page.evaluate(async () => {
    const p = (await import('/src/main.js')).application.game.progress;
    return p.vehicleWeapons[0] === 1 && p.vehicleWeapon === 0 && p.materials.parts === 1 &&
      p.equipmentGoal?.kind === 'turret' && p.equipmentGoal.index === 14;
  })) throw Error('炮塔购买安装或无关目标保留错误');
  await page.locator('#vehicle-collection-done').click();
  await page.locator('#resume').click();
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application, g = a.game;
    g.wave = 15; g.player.invincible = 0; g.hurt(1e9); a.refresh();
  });
  await page.locator('#resume').click(); await page.reload();
  if (!await page.evaluate(async () => {
    const g = (await import('/src/main.js')).application.game;
    return g.wave === 12 && g.progress.materials.parts === 1 &&
      g.progress.equipmentGoal?.kind === 'turret' && g.progress.equipmentGoal.index === 14;
  })) throw Error('死亡续游清除了材料或目标');
  await page.locator('#settings-button').click();
  await page.locator('#reset-progress').click(); await page.locator('#confirm-reset').click();
  await page.reload();
  if (!await page.evaluate(async () => {
    const p = (await import('/src/main.js')).application.game.progress;
    return p.materials.parts === 0 && p.materials.core === 0 && p.equipmentGoal === null &&
      p.materialBosses.length === 0 && p.materialPity.parts === 0;
  })) throw Error('清档未重置材料系统');
  if (errors.length) throw Error(errors.join('; '));
  return { migrated: true, dropOnce: true, purchase: true, tracking: true,
    layouts: [320, 390, 580], persisted: true, deathRollback: true, reset: true, errors };
}
