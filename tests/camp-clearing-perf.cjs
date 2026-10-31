// 交替提交新旧正式绘制器：各自使用真实地图布局、相同怪物及动画状态，避免截图时刻噪声。
// 基线 src 从 c614787 导出到 output/playwright/camp-clearing/baseline，猫猫已处理图集放到同目录 assets。
async (page) => {
  if (new URL(page.url()).port !== '4186') throw Error('仅允许隔离端口');
  await page.reload();
  return page.evaluate(async () => {
    (await import('/src/main.js')).application.destroy();
    const base = '/output/playwright/camp-clearing/baseline';
    const versions = await Promise.all([base, ''].map(async root => ({
      Renderer: (await import(root+'/src/rendering/renderer.js')).Renderer,
      Game: (await import(root+'/src/core/game.js')).Game,
      fresh: (await import(root+'/src/progression/progress.js')).freshProgress,
      sprites: (await import(root+'/src/rendering/cat-animation.js')).catSprites,
    })));
    for (const v of versions) if (!await v.sprites.load()) throw Error('正式动画资源缺失，不能用备用画面测量');
    const results = [];
    for (const scene of ['camp', 'bridge', 'night', 'combat']) {
      const env = {time:scene==='night'?'night':'day',weather:scene==='night'?'rain':'sun',autoTime:false,autoWeather:false};
      const pair = versions.map(v => {
        const g = new v.Game(v.fresh(), () => 0.42); g.start(); g.enemies=[]; g.boss=null;
        Object.assign(g.player, {x:scene==='camp'?900:1130,y:scene==='camp'?790:820,angle:-0.25});
        Object.assign(g.player.bodyAnimation,{idleTime:0.3,moveTime:0.4,moveWeight:0});
        g.time=g.previewTime=12;
        for(let i=0;i<(scene==='combat'?30:3);i++) g.spawnEnemy(0,100,{x:g.player.x-170+(i%5)*30,y:g.player.y+75+Math.floor(i/5)*40});
        const canvas=document.createElement('canvas');canvas.width=780;canvas.height=1688;
        const r=new v.Renderer(canvas,g,env);r.width=390;r.height=844;r.dpr=2;
        return r;
      });
      for(let i=0;i<30;i++) for(const r of pair)r.draw();
      const timings=[[],[]],builds=pair.map(r=>r.ground.stats().builds);
      for(let n=0;n<180;n++) for(const i of n%2?[1,0]:[0,1]){
        const r=pair[i];r.game.time=r.game.previewTime=12+n/60;
        const begin=performance.now();r.draw();timings[i].push(performance.now()-begin);
      }
      const stats=pair.map((r,i)=>{
        if(r.ground.stats().builds!==builds[i])throw Error('固定镜头重复重建背景');
        const t=timings[i].sort((a,b)=>a-b);
        return {mean:t.reduce((a,b)=>a+b)/t.length,p95:t[Math.floor(t.length*.95)],diagnostics:r.diagnosticInfo()};
      });
      results.push({scene,before:stats[0],after:stats[1]});
    }
    return {css:[390,844],dpr:2,framesPerScene:180,results};
  });
}
