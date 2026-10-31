// 真实浏览器验证密集方向锁定与最远目标中点镜头，近怪抢占和前排死亡不甩镜头。
async (page) => {
  await page.reload();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const result = await page.evaluate(async () => {
    const { application: a } = await import('/src/main.js');
    a.destroy();
    const g = a.game,
      r = a.renderer;
    const { updateAimLock } = await import('/src/combat/targeting.js');
    const { CombatCamera } = await import('/src/rendering/camera.js');
    g.state = 'playing';
    g.progress.weapon = 9;
    g.progress.weapons[9] = 1;
    g.aimLock = null;
    g.boss = null;
    Object.assign(g.player, { x: 900, y: 800 });
    g.trees = g.trees.filter((t) => Math.abs(t.x - 900) > 100);
    // 高血量静止目标保持图像可重复；仅通过生产目标选择代码建立锁定。
    const enemy = (id, x, y) => ({
      id,
      type: 'enemy',
      x,
      y,
      hp: 2000,
      maxHp: 2000,
      radius: 17,
      mass: 1,
      phase: 0,
      rank: 0,
      biome: 'pine',
    });
    g.enemies = [enemy(1, 900, 500), enemy(2, 900, 400), enemy(3, 900, 300), enemy(4, 830, 800)];
    updateAimLock(g, 0);
    r.camera = new CombatCamera();
    r.draw();
    a.refresh();
    const first = { ...r.view };
    if (g.findAttackTarget().id !== 1 || Math.abs(first.y + first.h / 2 - 550) > 0.01)
      throw Error('未选择密集方向或中点错误');
    window.laneView = { a, g, r };
    g.enemies[0].hp = 0;
    g.enemies.push(...[700, 650, 600, 550, 500].map((x, i) => enemy(10 + i, x, 800)));
    for (let i = 1; i <= 180; i++) {
      g.time = g.previewTime = i / 60;
      updateAimLock(g, 1 / 60);
      g.fx.shake = { life: 0.1, duration: 0.22, strength: 5, x: 1, y: 1 };
      r.draw();
      if (
        g.aimLock.memberIds.some((id) => ![2, 3].includes(id)) ||
        JSON.stringify(r.view) !== JSON.stringify(first)
      )
        throw Error('近怪或前排死亡抢走了锁定');
    }
    return {
      lockedFrames: 180,
      focus: g.aimLock.focus,
      center: { x: first.x + first.w / 2, y: first.y + first.h / 2 },
      zoom: first.zoom,
      noShake: true,
    };
  });
  await page.screenshot({ path: 'output/playwright/target-lock-midpoint.png' });
  return result;
}
