// 正式场景昼夜、建筑绕行、连续动作和部件图鉴，禁止用独立预览替代实机验收。
async (page) => {
  if (new URL(page.url()).port !== '4186') throw Error('仅允许隔离端口');
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.reload();
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application, g = a.game;
    const { catSprites } = await import('/src/rendering/cat-animation.js');
    if (!await catSprites.load()) throw Error('正式角色图集缺失');
    g.progress.weapons[0]=8;g.progress.vehicleHulls[0]=8;g.progress.vehicleParts[0].engine=4;
    for(const parts of [g.progress.weaponParts[0],g.progress.turretParts[1]])for(const key of Object.keys(parts))parts[key]=4;
    const {createVehicle}=await import('/src/combat/vehicle.js');g.vehicles=g.progress.vehicleHulls.map((_,i)=>createVehicle(g.progress,g.maxHp(),i));g.vehicle=g.vehicles[g.progress.vehicleIndex];
    g.start(); g.progress.vehicleWeapons.fill(1); g.configureVehicle(1);
    g.summonVehicle(); g.player.invincible = 0; g.hurt = () => {};
    g.enemies = []; g.spawnEnemy(0, 0, { x: 1140, y: 730 });
    g.enemies[0].hp = g.enemies[0].maxHp = 1e8; g.enemies[0].speed = 0;
    g.updateWaves = () => {};
    Object.assign(g.player, { x: 1030, y: 710 });
    a.refresh();
  });
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: width === 1280 ? 960 : 844 });
    for (const time of ['day', 'night']) {
      const stats = await page.evaluate(async time => {
        const a = (await import('/src/main.js')).application;
        const { EnvironmentTransition } = await import('/src/world/environment.js');
        const { SceneTone } = await import('/src/rendering/scene-tone.js');
        Object.assign(a.environment, { time, weather: 'sun', autoTime: false, autoWeather: false, forestSeason: 'green' });
        Object.assign(a.game.player, { x: 1030, y: 710, invincible: 0 });
        Object.assign(a.game.enemies[0], { x: 1140, y: 730, hp: 1e8 });
        a.renderer.light = new EnvironmentTransition(a.environment); a.renderer.tone = new SceneTone(a.environment);
        a.renderer.camera.time = null; a.renderer.resize(); a.renderer.draw(); a.refresh();
        return a.renderer.diagnosticInfo();
      }, time);
      if (stats.groundCache.count > 32) throw Error('地面缓存超过预算');
      await page.screenshot({ path: 'output/playwright/workshop-components/scene-' + width + '-' + time + '.png' });
      await page.locator('.world-workshop-entry').click();
      if (!await page.locator('#workshop-dialog').isVisible()) throw Error('世界工坊入口未打开');
      if (await page.evaluate(async () => (await import('/src/main.js')).application.game.state) !== 'paused') throw Error('工坊未暂停');
      await page.locator('[data-ws-mode="vehicle"]').click();
      await page.screenshot({ path: 'output/playwright/workshop-components/workbench-' + width + '-' + time + '.png' });
      const bytes = await page.locator('#workshop-dialog canvas').evaluateAll(nodes => nodes.reduce((sum, c) => sum + c.width * c.height * 4, 0));
      if (bytes > 5 * 1024 * 1024) throw Error('工坊画布预算超限 ' + bytes);
      await page.locator('#ws-close').click();
      if (await page.evaluate(async () => (await import('/src/main.js')).application.game.state) !== 'playing') throw Error('关闭工坊未恢复');
    }
  }
  // 真实走位记录屋前、屋后和侧面遮挡；不是只移动预览模型。
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    a.game.dismountVehicle(); Object.assign(a.game.player, { x: 1000, y: 610, invincible: 0 });
  });
  for (const [key, duration, name] of [['w', 650, 'behind'], ['d', 550, 'side'], ['s', 750, 'front']]) {
    await page.keyboard.down(key); await page.waitForTimeout(duration); await page.keyboard.up(key);
    await page.screenshot({ path: 'output/playwright/workshop-components/walk-' + name + '.png' });
  }
  // 点击建筑主体也能进入，不依赖门牌按钮。
  const hit = await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application, v = a.renderer.view, r = a.renderer.canvas.getBoundingClientRect();
    return { x: r.left + (1010 - v.x) / v.w * r.width, y: r.top + (530 - v.y) / v.h * r.height };
  });
  await page.mouse.click(hit.x, hit.y);
  if (!await page.locator('#workshop-dialog').isVisible()) throw Error('建筑主体点击无效');
  await page.locator('#ws-close').click();
  // 图鉴逐项调用合同的正式绘制器，原厂和两分支不得输出相同像素。
  await page.setViewportSize({ width: 1080, height: 1440 });
  for (const group of [0, 1]) {
    await page.evaluate(async group => {
      const { renderVisualCase } = await import('/src/rendering/visual-review.js');
      const { WEAPONS } = await import('/src/config/weapons.js');
      let gallery = document.getElementById('ws-gallery');
      if (!gallery) { gallery = document.createElement('canvas'); gallery.id = 'ws-gallery'; document.body.append(gallery); }
      gallery.width = 1080; gallery.height = 1440;
      gallery.style.cssText = 'position:fixed;inset:0;width:1080px;height:1440px;z-index:99999;background:#ede8c9';
      const c = gallery.getContext('2d'); c.fillStyle = '#ede8c9'; c.fillRect(0, 0, 1080, 1440);
      for (let row = 0; row < 8; row++) {
        const index = group * 8 + row; if (index >= WEAPONS.length) break;
        const hashes = [];
        for (const phase of [0, 1, 2]) {
          const tile = document.createElement('canvas'); tile.width = 340; tile.height = 145;
          await renderVisualCase(tile.getContext('2d'), 'workshop-weapon-' + index, phase);
          hashes.push(tile.toDataURL()); c.drawImage(tile, phase * 360 + 10, row * 180 + 20);
          c.fillStyle = '#315c43'; c.font = '14px sans-serif'; c.fillText(WEAPONS[index].name + ' · ' + ['原厂', '套件一', '套件二'][phase], phase * 360 + 20, row * 180 + 18);
        }
        if (new Set(hashes).size !== 3) throw Error('改装结构未变化 ' + index);
      }
    }, group);
    await page.screenshot({ path: 'output/playwright/workshop-components/weapon-gallery-' + group + '.png' });
  }
  const motion = await page.evaluate(async () => {
    document.getElementById('ws-gallery').remove();
    const { renderVisualCase } = await import('/src/rendering/visual-review.js');
    const tile = document.createElement('canvas'); tile.width = 500; tile.height = 350;
    const counts = [];
    for (let index = 0; index < 4; index++) {
      const frames = new Set();
      for (let phase = 0; phase < 3; phase += 0.25) {
        await renderVisualCase(tile.getContext('2d'), 'workshop-vehicle-' + index, phase); frames.add(tile.toDataURL());
      }
      counts.push(frames.size);
      if (frames.size < 3) throw Error('载具炮塔无变化');
      if (index === 2 && frames.size < 6) throw Error('旋翼没有连续变化');
    }
    return counts;
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(async () => (await import('/src/main.js')).application.workshop.open('weapons', 9));
  await page.locator('#ws-test').click();
  await page.waitForFunction(() => document.getElementById('ws-trial-time').textContent.startsWith('1.'));
  await page.screenshot({ path: 'output/playwright/workshop-components/reduced-trial.png' });
  await page.locator('#ws-close').click();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  if (errors.length) throw Error(errors.join('\n'));
  console.log('正式视觉案例通过；载具连续帧种类 ' + motion.join(','));
}
