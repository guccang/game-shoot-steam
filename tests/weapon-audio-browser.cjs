// 隔离浏览器验证电锯静默、喷火循环、停火与暂停，避免只测合成数组。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    a.destroy(); localStorage.clear();
  });
  await page.reload();
  await page.locator('#start').click();
  await page.locator('#settings-button').click();
  if(await page.locator('#sound').getAttribute('aria-pressed')!=='true') await page.locator('#sound').click();
  await page.locator('#music-volume').fill('0');
  await page.locator('#close-settings').click();
  await page.waitForFunction(async () =>
    (await import('/src/main.js')).application.audio.diagnostics.contextState === 'running');
  const results = [];
  for (const [index, kind] of [[14, 'chainsaw'], [7, 'flame'], [0, 'pistol'], [8, 'sniper'], [9, 'pulse']]) {
    await page.evaluate(async ({ index }) => {
      const a = (await import('/src/main.js')).application, g = a.game;
      g.progress.weapons[index] = 1; g.progress.weapon = index;
      g.reset(); g.start(); g.random = () => 0.5;
      g.player.invincible = 999; g.spawnTimer = 999;
      g.trees = []; g.enemies = []; g.boss = null;
      g.addTree(g.player.x + (index === 14 ? 55 : 110), g.player.y, { hp: 1e8, maxHp: 1e8 });
      g.attackTimer = 0; a.refresh();
      window.audioShots = [];
      const fire = g.onEvent;
      // 监听实际战斗事件，不绕过攻击来直接调用声音服务。
      g.onEvent = (type, data) => { if (type === 'shot') window.audioShots.push(data.kind); fire(type, data); };
    }, { index });
    await page.waitForFunction(kind => window.audioShots.includes(kind), kind);
    if (kind==='chainsaw') {
      await page.waitForTimeout(1100);
      const during=await page.evaluate(async()=>(await import('/src/main.js')).application.audio.diagnostics);
      if(during.weapons.length||during.voices)throw Error('电锯仍创建声源');
      results.push({kind,during,muted:true});
    } else if (kind==='flame') {
      await page.waitForFunction(async kind =>
        (await import('/src/main.js')).application.audio.diagnostics.weapons.includes(kind), kind);
      await page.waitForTimeout(1100);
      const during = await page.evaluate(async () => (await import('/src/main.js')).application.audio.diagnostics);
      if (during.weapons.length !== 1 || during.weapons[0] !== kind) throw Error('连续声中断或叠加');
      await page.locator('#settings-button').click();
      await page.waitForFunction(async () =>
        (await import('/src/main.js')).application.audio.diagnostics.weapons.length === 0);
      await page.locator('#close-settings').click();
      await page.waitForFunction(async kind =>
        (await import('/src/main.js')).application.audio.diagnostics.weapons.includes(kind), kind);
      // 移除目标后，实际攻击停止，声源应在短尾音后释放。
      await page.evaluate(async () => { (await import('/src/main.js')).application.game.trees = []; });
      await page.waitForFunction(async () =>
        (await import('/src/main.js')).application.audio.diagnostics.weapons.length === 0);
      results.push({ kind, during, stop: true, pause: true });
    } else {
      results.push(await page.evaluate(async kind => {
        const a = (await import('/src/main.js')).application;
        const { renderSound } = await import('/src/platform/audio-sounds.js');
        const offline = new OfflineAudioContext(1, 44100 * 2, 44100);
        const buffer = renderSound(offline, kind), source = offline.createBufferSource();
        source.buffer = buffer; source.connect(offline.destination); source.start();
        const rendered = (await offline.startRendering()).getChannelData(0);
        const peak = rendered.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0);
        if (!(peak > 0.05 && peak < 1)) throw Error('真实音频输出异常');
        return { kind, duration: buffer.duration, peak, diagnostics: a.audio.diagnostics };
      }, kind));
    }
  }
  await page.locator('#settings-button').click();
  await page.locator('#sound').click();
  await page.waitForFunction(async () => (await import('/src/main.js')).application.audio.diagnostics.voices === 0);
  if (errors.length) throw Error(errors.join(';'));
  return { results, muted: true, errors };
}
