// 从真实入场直接开始移动，记录期间新增的同步地块补算次数。
async (page) => {
  await page.setViewportSize({width:390,height:900}); await page.reload(); await page.bringToFront();
  await page.evaluate(async () => { const a=(await import('/src/main.js')).application; if(!await a.ready)throw Error('入场失败'); });
  if (await page.locator('#start').isVisible()) await page.locator('#start').click();
  else await page.locator('#resume').click();
  const start=await page.evaluate(async () => { const a=(await import('/src/main.js')).application; a.game.player.invincible=1e6; return {x:a.game.player.x,y:a.game.player.y,cache:a.renderer.ground.stats()}; });
  await page.keyboard.down('KeyS'); await page.waitForTimeout(3500); await page.keyboard.up('KeyS');
  const end=await page.evaluate(async () => { const a=(await import('/src/main.js')).application; return {x:a.game.player.x,y:a.game.player.y,cache:a.renderer.ground.stats(),nav:a.navigationWarmup.stats(),errors:a.renderer.profiler.events.filter(e=>e.type==='frame-error')}; });
  if(end.errors.length||Math.hypot(end.x-start.x,end.y-start.y)<100)throw Error(JSON.stringify({start,end}));
  return {start,end,additionalSyncMisses:end.cache.syncMisses-start.cache.syncMisses};
}
