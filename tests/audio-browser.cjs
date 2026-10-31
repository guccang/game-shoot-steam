// 隔离端口检查真实 WebAudio、手机设置、三种载具、暂停和刷新后的音量偏好。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.evaluate(async () => {
    (await import('/src/main.js')).application.destroy(); localStorage.clear();
  });
  await page.reload();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#start').click();
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    a.game.update = () => {}; a.game.enemies = [];
  });
  await page.locator('#settings-button').click();
  if(await page.locator('#sound').getAttribute('aria-pressed')!=='true') await page.locator('#sound').click();
  await page.waitForFunction(() => document.getElementById('sound').getAttribute('aria-label') === '关闭声音');
  await page.locator('#music-volume').fill('30');
  await page.locator('#effects-volume').fill('55');
  for (const width of [320, 390, 580]) {
    await page.setViewportSize({ width, height: 844 });
    const layout = await page.locator('#settings-dialog').evaluate(el => ({
      width: el.clientWidth, scroll: el.scrollWidth,
      sliders: [...el.querySelectorAll('input[type=range]')].slice(0, 2).map(x => x.getBoundingClientRect().width),
    }));
    if (layout.scroll > layout.width + 1 || layout.sliders.some(w => w < 70))
      throw Error(`声音设置布局异常 ${width}: ${JSON.stringify(layout)}`);
    await page.screenshot({ path: `output/playwright/forest-audio/settings-${width}.png` });
  }
  await page.locator('#close-settings').click();
  await page.waitForFunction(async () => (await import('/src/main.js')).application.audio.diagnostics.music);
  const initial = await page.evaluate(async () => (await import('/src/main.js')).application.audio.diagnostics);
  if (initial.contextState !== 'running') throw Error('设备未真正运行');
  const weaponSounds = await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    const { WEAPONS } = await import('/src/config/weapons.js');
    const result = [];
    for (const w of WEAPONS) {
      const before = a.audio.diagnostics.cached;
      a.game.onEvent('shot', { kind: w.id });
      result.push({ kind: w.id, cached: a.audio.diagnostics.cached >= before });
    }
    return result;
  });
  const vehicles = [];
  for (let index = 0; index < 3; index++) {
    await page.evaluate(async index => {
      const a = (await import('/src/main.js')).application, g = a.game;
      g.dismountVehicle(); g.progress.vehicleHulls[index] = 1;
      if (g.progress.vehicleIndex !== index) g.selectVehicle(index);
      g.summonVehicle(); g.player.walkPhase = 2;
    }, index);
    await page.waitForFunction(async index =>
      (await import('/src/main.js')).application.audio.diagnostics.vehicle === index, index);
    vehicles.push(await page.evaluate(async () => (await import('/src/main.js')).application.audio.diagnostics));
  }
  await page.locator('#settings-button').click();
  await page.waitForFunction(async () => {
    const d = (await import('/src/main.js')).application.audio.diagnostics;
    return d.music && d.vehicle === -1;
  });
  await page.locator('#close-settings').click();
  await page.waitForFunction(async () => (await import('/src/main.js')).application.audio.diagnostics.music);
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    a.game.onEvent('hurt'); a.game.onEvent('victory');
    a.save();
  });
  await page.reload();
  const restored = await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    return { preferences: a.audio.preferences, diagnostics: a.audio.diagnostics };
  });
  if (restored.preferences.music !== 0.3 || restored.preferences.effects !== 0.55 ||
      !restored.preferences.enabled || restored.diagnostics.unlocked)
    throw Error(`刷新恢复异常 ${JSON.stringify(restored)}`);
  await page.locator('#start').click();
  await page.waitForFunction(async () => (await import('/src/main.js')).application.audio.diagnostics.music);
  await page.locator('#settings-button').click();
  await page.locator('#sound').click();
  await page.waitForFunction(async () => (await import('/src/main.js')).application.audio.diagnostics.voices === 0);
  await page.evaluate(async () => (await import('/src/main.js')).application.destroy());
  if (errors.length) throw Error(errors.join('\n'));
  return { initial, weaponSounds, vehicles, restored, paused: true, muted: true, errors };
}
