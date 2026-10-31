// 在正式游戏中保留三十只怪物直到下一次稀疏采样；只用于诊断样本，不改运行时规则。
async page => {
  await page.evaluate(()=>{
    const g=a.game;delete g.update;g.enemies=[];g.vehicle.active=false;g.player.invincible=1e6;g.attackTimer=999;
    for(let i=0;i<30;i++){const angle=i*Math.PI/15,e=g.spawnEnemy(0,i%3,{x:g.player.x+Math.cos(angle)*130,y:g.player.y+Math.sin(angle)*130});e.hp=e.maxHp=1e8;e.speed=0;}
    window.sampleStart=a.diagnostics.monitor.totalFrames;
  });
  await page.waitForFunction(()=>a.renderer.commands.samples.some(s=>s.frame>sampleStart),{},{timeout:30000});
  return await page.evaluate(()=>{
    const report=a.diagnostics.report();return {version:report.version,enemies:a.game.enemies.length,sections:report.summary.sections,
      sample:report.rendering.canvasCommands.samples.at(-1),logicFps:report.summary.logicFps,frameTiming:report.rendering.frameTiming};
  });
}
