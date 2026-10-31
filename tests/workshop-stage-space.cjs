// 中央展示空间实机复核：窗口缩放、装配热点、炮塔尺寸与画布预算。
async page => {
  if (new URL(page.url()).port !== '4197') throw Error('仅允许隔离端口 4197');
  await page.reload();
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    const p = (await import('/src/progression/progress.js')).freshProgress();
    p.coins = p.wood = 100000; p.bosses = 100;
    p.materials = {parts:10000,crystal:10000,core:10000};
    p.weapons.fill(1); p.vehicleWeapons.fill(1); p.vehicleHulls.fill(1); p.mastery.fill(40);
    p.vehicleLoadouts = [0,3,8,9]; a.game.progress = p; a.save();
  });
  await page.reload();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const sizes = [];
  for (const [width, height] of [[1024,1100],[1280,960],[1920,1080],[390,844],[320,844]]) {
    await page.setViewportSize({width,height});
    await page.evaluate(async () => (await import('/src/main.js')).application.workshop.open('weapons',13));
    await page.waitForTimeout(150);
    const geometry = await page.locator('#ws-stage').evaluate(c => {
      const b = c.getBoundingClientRect();
      return {width:b.width,height:b.height,ratio:c.width/c.height,bytes:[...document.querySelectorAll('#workshop-dialog canvas')].reduce((s,c)=>s+c.width*c.height*4,0)};
    });
    if (Math.abs(geometry.width/geometry.height-geometry.ratio)>.015) throw Error('舞台比例与像素不一致');
    if (geometry.bytes>5*1024*1024) throw Error('画布预算超限');
    if (width<=700 && geometry.width<width-70) throw Error('手机画布未撑满工作台');
    if (width>700 && geometry.height<height-480) throw Error('未利用纵向空间');
    sizes.push({viewport:width+'×'+height,...geometry});
    await page.screenshot({path:`output/playwright/workshop-stage-space/preview-${width}.png`});
    await page.locator('[data-ws-upgrade="rate"]').focus(); await page.keyboard.press('Enter');
    await page.locator('#ws-socket').click(); await page.waitForTimeout(1200);
    await page.screenshot({path:`output/playwright/workshop-stage-space/draft-${width}.png`});
    await page.locator('[data-ws-mode="vehicle"]').click();
    const before = await page.locator('#ws-stage').boundingBox();
    await page.locator('#ws-kits-tab').click(); await page.locator('[data-ws-part="9"]').click();
    await page.locator('#ws-turret-upgrade').click();
    const after = await page.locator('#ws-stage').boundingBox();
    if (before.width!==after.width || before.height!==after.height) throw Error('检修改变舞台尺寸');
    await page.screenshot({path:`output/playwright/workshop-stage-space/vehicle-${width}.png`});
    await page.locator('#ws-close').click();
  }
  // 保留试装跨越桌面/手机断点，新的画布和连接点仍可继续施工。
  await page.setViewportSize({width:1280,height:960});
  await page.evaluate(async () => (await import('/src/main.js')).application.workshop.open('weapons',0));
  await page.locator('[data-ws-upgrade="rate"]').focus(); await page.keyboard.press('Enter');
  await page.locator('#ws-socket').click(); await page.waitForTimeout(1200);
  await page.setViewportSize({width:390,height:844}); await page.waitForTimeout(150);
  const matched = await page.locator('#ws-stage').evaluate(c => Math.abs(c.width/c.height-c.clientWidth/c.clientHeight)<.015);
  if (!matched) throw Error('打开状态下缩放未同步画布');
  await page.locator('#ws-tool').focus(); await page.keyboard.press('Enter');
  await page.keyboard.down('Space'); await page.waitForTimeout(1800); await page.keyboard.up('Space');
  const level = await page.evaluate(async () => (await import('/src/main.js')).application.game.progress.weaponParts[0].rate);
  if (level!==2) throw Error('窗口缩放后草稿无法继续施工');
  await page.locator('#ws-close').click();
  if (errors.length) throw Error(errors.join('\n'));
  return sizes;
}
