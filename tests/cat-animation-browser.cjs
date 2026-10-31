// 浏览器验收真实视频图集、游戏接入、八方向握枪、暂停、载具与手机画面。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.reload();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const checks = await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application, g = a.game;
    a.destroy(); g.start(); const trees = g.trees; g.enemies = []; g.trees = []; g.spawnTimer = g.attackTimer = 999;
    const { catSprites } = await import('/src/rendering/cat-animation.js');
    if (!await catSprites.load()) throw Error('真实图集未能加载');
    const { drawCat } = await import('/src/rendering/characters.js');
    const { createCatMotion } = await import('/src/core/cat-motion.js');
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 180;
    const c = canvas.getContext('2d'), signatures = [];
    for (const hero of [0, 1]) {
      const hashes = [];
      for (const moveWeight of [0, 1]) for (const time of [0, 0.25, 0.5]) {
        c.clearRect(0, 0, 180, 180);
        catSprites.draw(c, hero, { idleTime: time, moveTime: time, moveWeight }, { bodyX: 80, bodyY: 125 });
        hashes.push(canvas.toDataURL());
      }
      if (new Set(hashes).size < 5) throw Error('待机或移动没有实际帧变化');
      signatures.push(new Set(hashes).size);
      const state = { idleTime: 0.3, moveTime: 0.5, moveWeight: 0.6 };
      const before = JSON.stringify(state);
      for (let direction = 0; direction < 8; direction++) {
        c.clearRect(0, 0, 180, 180);
        drawCat(c, 90, 125, hero, direction * Math.PI / 4, 1.6, 0.5, 8, { kick: 2, rise: 0.1, flash: 0 }, 1, null, 0, false, false, state);
      }
      if (JSON.stringify(state) !== before) throw Error('绘制推进了动画状态');
      c.clearRect(0, 0, 180, 180); catSprites.draw(c, hero, state, { bodyX: 80, bodyY: 125 }, true);
      const reduced = canvas.toDataURL();
      c.clearRect(0, 0, 180, 180); catSprites.draw(c, hero, { idleTime: 88, moveTime: 92, moveWeight: 1 }, { bodyX: 80, bodyY: 125 }, true);
      if (canvas.toDataURL() !== reduced) throw Error('减少动态仍在播放主体');
    }
    g.player.bodyAnimation = createCatMotion();
    for (let i = 0; i < 40; i++) g.update(1 / 60, { x: 1, y: 0 });
    if (g.player.bodyAnimation.moveWeight < 0.99) throw Error('游戏移动未切换主体');
    g.pause(); const frozen = JSON.stringify(g.player.bodyAnimation); g.update(0.05, { x: 1, y: 0 });
    if (JSON.stringify(g.player.bodyAnimation) !== frozen) throw Error('暂停后仍推进主体');
    g.pause(); g.summonVehicle();
    for (let i = 0; i < 40; i++) g.update(1 / 60, { x: 1, y: 0 });
    if (g.player.bodyAnimation.moveWeight !== 0) throw Error('载具内仍迈步');
    g.dismountVehicle();
    g.trees = trees;
    return { signatures, stats: catSprites.stats(), pause: true, mountedIdle: true, reduced: true };
  });
  for (const width of [390, 320, 580]) {
    await page.setViewportSize({ width, height: 844 });
    for (const hero of width === 390 ? [0, 1] : [0]) {
      await page.evaluate(async ({ hero, width }) => {
        const a = (await import('/src/main.js')).application, g = a.game, r = a.renderer;
        const { EnvironmentTransition } = await import('/src/world/environment.js');
        const { SceneTone } = await import('/src/rendering/scene-tone.js');
        const env = { time: 'day', weather: 'sun', autoTime: false, autoWeather: false };
        Object.assign(a.environment, env); r.light = new EnvironmentTransition(env); r.tone = new SceneTone(env);
        g.progress.hero = hero; g.state = 'playing';
        Object.assign(g.player, { x: 900, y: 845, angle: -0.4, walkPhase: 1, invincible: 0 });
        Object.assign(g.player.bodyAnimation, { idleTime: 0.3, moveTime: 0.4, moveWeight: 1 });
        r.resize(); g.setViewport(r.width, r.height); a.refresh(); r.draw();
        if (document.documentElement.scrollWidth > width) throw Error('手机横向溢出');
      }, { hero, width });
      await page.screenshot({ path: `output/cat-front/game-${hero}-${width}.png` });
    }
  }
  // 在独立预览画布展示主体走停和任意方向握枪，录制的帧来自正式 drawCat 链。
  await page.setViewportSize({ width: 720, height: 420 });
  await page.evaluate(async () => {
    const { drawCat } = await import('/src/rendering/characters.js');
    const { createCatMotion, updateCatMotion } = await import('/src/core/cat-motion.js');
    const { createRecoil, triggerRecoil, updateRecoil } = await import('/src/combat/recoil.js');
    const canvas = document.createElement('canvas'); canvas.id = 'cat-animation-review';
    canvas.width = 720; canvas.height = 420; canvas.style.cssText = 'position:fixed;inset:0;z-index:99999;width:720px;height:420px';
    document.body.append(canvas); const c = canvas.getContext('2d');
    const motion = createCatMotion(), recoil = createRecoil();
    // 使用固定步长导出预览，减少浏览器调度抖动对动作观察的影响。
    window.drawCatReview = frame => {
      const time = frame / 24, moving = time >= 1 && time < 3.4;
      updateCatMotion(motion, 1 / 24, moving ? 150 : 0, moving);
      if (frame % 18 === 0) triggerRecoil(recoil, 0); updateRecoil(recoil, 0, 1 / 24);
      c.fillStyle = '#e9eedb'; c.fillRect(0, 0, 720, 420);
      c.fillStyle = '#355142'; c.font = 'bold 22px sans-serif'; c.fillText('正面主体 · 小手独立瞄准', 30, 40);
      c.font = '16px sans-serif'; c.fillText(moving ? '移动：交替迈步，主体始终正面' : '待机：呼吸、眨眼、轻微摆尾', 30, 70);
      for (const hero of [0, 1]) drawCat(c, 190 + hero * 330, 330, hero, time * 1.6 - 1, 3.5,
        moving ? time * 12 : 0, 0, recoil, 1, null, 0, false, false, motion);
    };
    window.drawCatReview(36);
  });
  await page.locator('#cat-animation-review').screenshot({ path: 'output/cat-front/preview.png' });
  const downloadPromise = page.waitForEvent('download');
  await page.evaluate(async () => {
    const canvas = document.querySelector('#cat-animation-review'), stream = canvas.captureStream(0);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 1800000 });
    const chunks = []; recorder.ondataavailable = event => chunks.push(event.data);
    const stopped = new Promise(resolve => recorder.onstop = resolve); recorder.start();
    for (let frame = 0; frame < 108; frame++) {
      window.drawCatReview(frame); stream.getVideoTracks()[0].requestFrame();
      await new Promise(resolve => setTimeout(resolve, 1000 / 24));
    }
    recorder.stop(); await stopped; stream.getTracks().forEach(track => track.stop());
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
    link.download = 'cat-front-preview.webm'; link.click();
  });
  await (await downloadPromise).saveAs('output/cat-front/preview.webm');
  await page.locator('#cat-animation-review').evaluate(node => node.remove());
  if (errors.length) throw Error(errors.join('; '));
  return { checks, errors, preview: 'output/cat-front/preview.webm' };
}
