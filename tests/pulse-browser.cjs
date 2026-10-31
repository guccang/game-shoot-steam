// 独立浏览器验证重型武器购买、蓄能实战、持有者退步和锁定中点镜头，不改用户日常存档。
async (page) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(async () => {
    (await import('/src/main.js')).application.destroy();
    localStorage.setItem(
      'forest-patrol-v1',
      JSON.stringify({
        version: 1,
        coins: 20000,
        wood: 9000,
        heroes: [1, 0],
        hero: 0,
        weapon: 8,
        weapons: [1, 0, 0, 0, 0, 0, 0, 0, 1],
        bosses: 9,
      }),
    );
    localStorage.setItem(
      'forest-patrol-environment-v1',
      JSON.stringify({ time: 'day', weather: 'sun', autoTime: false, autoWeather: false }),
    );
  });
  await page.reload();
  await page.locator('#weapons-button').click();
  const buy = page.locator('[data-action="buy"][data-index="9"]');
  if (!(await buy.isDisabled())) throw Error('十领主门槛失效');
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    a.game.progress.bosses = 10;
    a.refresh();
  });
  await buy.click();
  await page.locator('[data-action="upgrade"][data-index="9"]').click();
  const card = page
    .locator('.item-card')
    .filter({ has: page.getByRole('heading', { name: /雷霆重型脉冲枪/ }) });
  await card.scrollIntoViewIfNeeded();
  if (!(await card.innerText()).includes('293') || !(await card.innerText()).includes('820'))
    throw Error('成长数值不正确');
  await page.screenshot({ path: 'output/playwright/pulse-shop.png' });
  await page.locator('#close-camp').click();
  await page.reload();
  if (
    (await page.evaluate(() => JSON.parse(localStorage.getItem('forest-patrol-v1')))).weapon !== 9
  )
    throw Error('刷新装备丢失');
  await page.locator('#start').click();
  const result = await page.evaluate(async () => {
    const { application: a } = await import('/src/main.js');
    const { createEnemyAttack } = await import('/src/combat/enemy-attack.js');
    const { CombatCamera } = await import('/src/rendering/camera.js');
    a.destroy();
    const g = a.game,
      r = a.renderer;
    // 重置战场，消除点击开始到停止动画循环之间的不确定帧数。
    g.reset();
    window.pulseView = { a, g, r };
    g.state = 'playing';
    g.aimLock = null;
    g.random = () => 0.5;
    g.progress.weapons[9] = 1;
    Object.assign(g.player, { x: 900, y: 950 });
    g.spawnTimer = 999;
    g.trees = g.trees.filter((t) => Math.abs(t.x - 900) > 90);
    for (const y of [875, 800, 725]) g.addTree(900, y, { hp: 55, maxHp: 55 });
    g.enemies = [650, 600].map((y, i) => ({
      id: 2000 + i,
      x: 900,
      y,
      type: 'enemy',
      hp: 60,
      maxHp: 60,
      radius: 17,
      mass: 1,
      speed: 0,
      phase: 0,
      biome: 'pine',
      level: 4,
      rank: 0,
      assault: createEnemyAttack(),
    }));
    r.camera = new CombatCamera();
    const sheet = document.createElement('canvas');
    sheet.width = 1560;
    sheet.height = 900;
    const c = sheet.getContext('2d');
    c.fillStyle = '#203e3c';
    c.fillRect(0, 0, 1560, 900);
    let time = 0,
      chargeSeen = false,
      launched = false;
    for (const [i, end] of [0.35, 1.12, 1.31, 1.48].entries()) {
      while (time < end - 1e-8) {
        const dt = Math.min(1 / 120, end - time);
        g.update(dt);
        r.draw();
        time += dt;
      }
      a.refresh();
      r.draw();
      if (i === 1) chargeSeen = g.pulse.charge > 0.9 && !g.projectiles.length;
      if (i === 2) launched = g.projectiles.some((b) => b.kind === 'pulse');
      c.drawImage(r.canvas, 0, 0, r.canvas.width, r.canvas.height, i * 390, 44, 390, 844);
      c.fillStyle = '#d7fff0';
      c.font = 'bold 16px sans-serif';
      c.fillText(
        [
          '初段蓄能 · 能量汇聚',
          '满蓄待发 · 枪身震动',
          '粗束贯穿 · 持有者后退',
          '冲击波扩散 · 沿途余辉',
        ][i],
        i * 390 + 12,
        28,
      );
    }
    if (!chargeSeen || !launched || g.chopped !== 3 || g.kills !== 2 || g.player.y < 992)
      throw Error(`实战失败 ${chargeSeen}/${launched}/${g.chopped}/${g.kills}/${g.player.y}`);
    sheet.id = 'pulse-sheet';
    sheet.style = 'position:fixed;inset:0;z-index:9999;width:1560px;height:900px';
    document.body.append(sheet);
    return {
      chargeSeen,
      launched,
      trees: g.chopped,
      kills: g.kills,
      retreat: g.player.y - 950,
      particles: g.fx.items.length,
    };
  });
  await page.setViewportSize({ width: 1560, height: 900 });
  await page.screenshot({ path: 'output/playwright/pulse-sequence.png' });
  await page.evaluate(() => document.getElementById('pulse-sheet').remove());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    pulseView.r.resize();
    pulseView.r.draw();
  });
  await page.screenshot({ path: 'output/playwright/pulse-impact.png' });
  const vibration = await page.evaluate(async () => {
    const {drawCat}=await import('/src/rendering/characters.js');
    const {pulseChargePose}=await import('/src/rendering/pulse.js');
    const canvas=document.createElement('canvas');canvas.width=canvas.height=240;
    const c=canvas.getContext('2d');
    // 相同角色与动作仅改变蓄能相位，确保变化发生在枪手区域而不是脚底。
    const capture=(time,reduced)=>{
      c.clearRect(0,0,240,240);
      drawCat(c,90,150,0,0,1,0,9,null,1,pulseChargePose(.95,time,reduced));
      return c.getImageData(0,0,240,240).data.slice();
    };
    const a=capture(.61,false),b=capture(.63,false),lowA=capture(.61,true),lowB=capture(.63,true);
    if(!a.some((v,i)=>v!==b[i]))throw Error('枪身未随蓄能震动');
    for(let y=155;y<163;y++)for(let x=72;x<82;x++)for(let k=0;k<4;k++){const i=(y*240+x)*4+k;if(a[i]!==b[i])throw Error('枪身震动影响脚底');}
    if(!lowA.every((v,i)=>v===lowB[i]))throw Error('减少动态模式仍在震动');
    return {gunVibration:true,feetStable:true,reducedStable:true};
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => {
    pulseView.r.draw();
  });
  await page.reload();
  await page.setViewportSize({ width: 320, height: 568 });
  await page.locator('#weapons-button').click();
  await page.locator('[data-action="upgrade"][data-index="9"]').scrollIntoViewIfNeeded();
  if (
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth > innerWidth ||
        document.documentElement.scrollHeight > innerHeight,
    )
  )
    throw Error('窄屏溢出');
  await page.screenshot({ path: 'output/playwright/pulse-shop-320.png' });
  if (errors.length) throw Error(errors.join(';'));
  return { ...result, ...vibration, saved: true, mobileOverflow: false, errors };
}
