// 用真实浏览器检查射击姿态分解、两种武器实战与移动端后坐渲染。
async (page) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  // 在新页面脚本执行前准备测试装备，避免离页保存覆盖测试存档。
  await page.evaluate(() => sessionStorage.setItem('recoil-test-weapon', '0'));
  await page.addInitScript(() => {
    const progress = JSON.parse(localStorage.getItem('forest-patrol-v1')) || { version:1, coins:60, wood:30, hero:0, heroes:[1,0], bosses:0 };
    progress.weapons = [1,1]; progress.weapon = Number(sessionStorage.getItem('recoil-test-weapon') || 0);
    localStorage.setItem('forest-patrol-v1', JSON.stringify(progress));
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.reload();
  // 使用生产绘制函数生成姿态联系图，核对枪口抬升、左右镜像和回弹终点。
  const poses = await page.evaluate(async () => {
    const { drawCat } = await import('/src/render.js');
    const { createRecoil, triggerRecoil, updateRecoil, weaponPose } = await import('/src/combat/recoil.js');
    const canvas = document.createElement('canvas'); canvas.id = 'recoil-review'; canvas.width = 1150; canvas.height = 720;
    canvas.style.cssText = 'position:absolute;z-index:100;top:0;left:0;display:block;max-width:100%;height:auto'; document.body.append(canvas);
    const c = canvas.getContext('2d'); c.fillStyle = '#f5f5ed'; c.fillRect(0, 0, 1150, 720);
    const labels = ['待机', '开火瞬间', '45 ms · 后坐峰值附近', '150 ms · 回弹', '450 ms · 回正'];
    const values = [];
    for (let row = 0; row < 4; row++) {
      const weapon = Math.floor(row / 2), angle = row % 2 ? Math.PI : 0;
      for (let col = 0; col < 5; col++) {
        const state = createRecoil(); if (col) triggerRecoil(state, weapon);
        let duration = [0, 0, .045, .15, .45][col];
        while (duration > 0) { const step = Math.min(1 / 120, duration); updateRecoil(state, weapon, step); duration -= step; }
        const x = col * 230 + 105, y = row * 180 + 142;
        c.strokeStyle = '#dce3d1'; c.beginPath(); c.moveTo(col * 230 + 15, y + 23); c.lineTo(col * 230 + 215, y + 23); c.stroke();
        drawCat(c, x, y, weapon, angle, 2.35, 0, weapon, state);
        c.fillStyle = '#405e40'; c.font = '11px Microsoft YaHei'; c.textAlign = 'center';
        c.fillText(`${weapon ? '激光步枪' : '手枪'} ${row % 2 ? '向左' : '向右'} · ${labels[col]}`, col * 230 + 115, row * 180 + 18);
        if (col === 2) values.push(weaponPose(angle, weapon, state));
      }
    }
    if (values.some(pose => !Number.isFinite(pose.muzzleX) || !Number.isFinite(pose.muzzleY))) throw Error('姿态出现无效坐标');
    return values.map(pose => ({ kick: pose.kick, rise: pose.rise, muzzleX: pose.muzzleX, muzzleY: pose.muzzleY }));
  });
  await page.locator('#recoil-review').screenshot({ path: 'output/playwright/recoil-poses.png' });
  await page.locator('#recoil-review').evaluate(element => element.remove()); await page.evaluate(() => scrollTo(0, 0));
  await page.getByRole('button', { name: '开始巡游 ↗' }).click();
  await page.waitForFunction(() => Number(document.getElementById('kills').textContent) > 0, null, { timeout: 18000 });
  await page.keyboard.down('a'); await page.waitForTimeout(500); await page.keyboard.up('a');
  await page.screenshot({ path: 'output/playwright/recoil-pistol-battle.png' });
  // 独立浏览器测试存档仅解锁第二把枪，便于检查真实装备与连射路径。
  await page.evaluate(() => sessionStorage.setItem('recoil-test-weapon', '1'));
  await page.reload(); await page.locator('#weapons-button').click();
  if (!(await page.locator('.item-card.equipped h3').innerText()).includes('萤火激光步枪')) throw Error('激光步枪测试装备未生效');
  await page.locator('#close-camp').click();
  await page.getByRole('button', { name: '开始巡游 ↗' }).click();
  await page.waitForFunction(() => Number(document.getElementById('kills').textContent) > 0, null, { timeout: 18000 });
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(600);
  await page.screenshot({ path: 'output/playwright/recoil-rifle-mobile.png', fullPage: true });
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.waitForTimeout(600);
  await page.getByRole('button', { name: '暂停游戏', exact: true }).click();
  if (await page.locator('#auto-label').innerText() !== '巡游已暂停') throw Error('暂停未生效');
  if (errors.length) throw Error(errors.join('; '));
  return { poses, pistolBattle: true, rifleBattle: true, mobile: true, reducedMotion: true, errors };
}
