// 隔离端口检查完整出击过程、屏幕安全、返航、暂停与减少动态，输出实战动作帧。
async (page) => {
  if(new URL(page.url()).port!=='4174')throw Error('仅允许隔离端口 4174');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.emulateMedia({reducedMotion:'no-preference'});await page.reload();
  const results=[];
  for(const size of [{width:320,height:568},{width:390,height:844},{width:580,height:928}]) {
    await page.setViewportSize(size);
    await page.evaluate(async size=>{
      const a=(await import('/src/main.js')).application;a.destroy();const g=a.game,r=a.renderer;
      const {EnvironmentTransition}=await import('/src/world/environment.js');
      g.progress.weapon=12;g.progress.weapons[12]=1;g.progress.mods[12]=0;g.progress.mastery[12]=0;
      g.reset();g.start();g.setViewport(size.width,size.height);g.random=()=>.5;g.enemies=[];g.boss=null;g.spawnTimer=999;g.reducedMotion=false;
      g.trees=g.trees.filter(t=>Math.hypot(t.x-g.player.x,t.y-g.player.y)>460);
      Object.assign(a.environment,{time:'day',weather:'sun',autoTime:false,autoWeather:false});r.light=new EnvironmentTransition(a.environment,performance.now());
      document.getElementById('environment-button').textContent='☀ 白昼 · 晴朗';
      for(let k=0;k<120;k++)g.update(1/120);
      r.resize();r.draw();a.refresh();document.getElementById('toast').hidden=true;
      window.__sortieFrames=[structuredClone(g.funnel)];
    },size);
    await page.screenshot({path:`output/playwright/funnel-sortie-${size.width}-formation.png`});
    for(const phase of ['launch','station','recall','dock']) {
      const check=await page.evaluate(async({phase,size})=>{
        const a=(await import('/src/main.js')).application,g=a.game,r=a.renderer;
        const {drawFunnelArray}=await import('/src/rendering/funnel.js');
        const {EnvironmentTransition}=await import('/src/world/environment.js');
        if(phase==='launch') for(const angle of [-2.4,-1.57,-.6]){g.spawnEnemy(angle,330);const e=g.enemies.at(-1);e.speed=0;e.hp=e.maxHp=100000;}
        if(phase==='recall') {
          g.magazines[12].modules.forEach(m=>Object.assign(m,{ammo:0,remaining:3.2}));
          Object.assign(a.environment,{time:'night',weather:'rain'});r.light=new EnvironmentTransition(a.environment,performance.now());
          document.getElementById('environment-button').textContent='☾ 夜晚 · 小雨';
        }
        const count=phase==='launch'?36:phase==='station'?240:phase==='recall'?30:180;
        const sheet=document.createElement('canvas');sheet.width=sheet.height=700;
        const c=sheet.getContext('2d',{willReadFrequently:true});let extent=0,samples=0;
        for(let k=0;k<count;k++){
          g.update(1/120);
          if(k%12===0){
            const s=structuredClone(g.funnel);s.nodes.forEach(n=>n.lockFlash=0);
            const before=JSON.stringify(s);c.clearRect(0,0,700,700);drawFunnelArray(c,{x:350,y:350},s,false);
            if(JSON.stringify(s)!==before)throw Error('渲染更新了飞控');
            const pixels=c.getImageData(0,0,700,700).data,zoom=size.width<500?.6:.75;
            for(let y=0;y<700;y++)for(let x=0;x<700;x++)if(pixels[(y*700+x)*4+3]>3){
              const sx=size.width/2+(x-350)*zoom,sy=size.height/2+(y-350)*zoom;
              if(sx<12||sx>size.width-12||sy<12||sy>size.height-12)throw Error('飞行或光效超出屏幕');
              extent=Math.max(extent,Math.hypot(x-350,y-350));
            }
            samples++;
          }
          if(phase==='station'&&k>120&&g.funnel.nodes.every(n=>n.flight.mode==='attack'))break;
        }
        if(phase==='station'&&!g.funnel.nodes.some(n=>Math.hypot(n.x,n.y)>135))throw Error('仍然只在头顶摆动');
        if(phase==='dock'&&!g.funnel.nodes.every(n=>Math.hypot(n.x,n.y)<82))throw Error('充能未归队');
        window.__sortieFrames.push(structuredClone(g.funnel));
        r.resize();r.draw();a.refresh();document.getElementById('toast').hidden=true;
        const v=r.view;if(Math.abs((g.player.x-v.x)*v.zoom-r.width/2)>.01)throw Error('镜头被出击拖走');
        const before=JSON.stringify(g.funnel);g.pause();g.update(.05);r.draw();if(before!==JSON.stringify(g.funnel))throw Error('暂停未冻结');g.pause();
        return {width:size.width,phase,extent,samples,modes:g.funnel.nodes.map(n=>n.flight.mode)};
      },{phase,size});
      results.push(check);
      await page.screenshot({path:`output/playwright/funnel-sortie-${size.width}-${phase}.png`});
    }
    await page.evaluate(async()=>{
      const a=(await import('/src/main.js')).application,g=a.game;
      g.reducedMotion=true;g.update(.01);const before=g.funnel.nodes.map(n=>[n.x,n.y]);
      for(let k=0;k<10;k++)g.update(.01);
      if(JSON.stringify(before)!==JSON.stringify(g.funnel.nodes.map(n=>[n.x,n.y])))throw Error('低动态仍在飞行');
      if(g.funnel.nodes.some(n=>n.flight.trail.length))throw Error('低动态仍显示飞行轨迹');
    });
  }
  // 五张实际模拟帧使用相同尺度展示离队距离，不额外编排炮体位置。
  await page.evaluate(async()=>{
    const {drawFunnelArray}=await import('/src/rendering/funnel.js');const {drawCat}=await import('/src/rendering/characters.js');
    const sheet=document.createElement('canvas');sheet.id='sortie-sheet';sheet.width=1800;sheet.height=390;
    sheet.style='position:fixed;inset:0;z-index:9999;width:1800px;height:390px';document.body.append(sheet);
    const c=sheet.getContext('2d');c.fillStyle='#f4f1e1';c.fillRect(0,0,1800,390);
    const labels=['01 · 固定待机编队','02 · 错峰离队出击','03 · 远端驻点攻击','04 · 返航收拢','05 · 归队充能'];
    for(const [i,s]of window.__sortieFrames.entries()){
      c.save();c.translate(i*360,0);c.fillStyle=i>=3?'#315560':'#aec58c';c.fillRect(8,48,344,330);
      c.fillStyle='#315347';c.font='bold 16px Microsoft YaHei';c.fillText(labels[i],16,30);
      c.translate(180,275);c.scale(.58,.58);s.nodes.forEach(n=>n.lockFlash=0);
      drawCat(c,0,0,0,-1.5,1.05,0,12);drawFunnelArray(c,{x:0,y:0},s,false);c.restore();
    }
  });
  await page.setViewportSize({width:1800,height:390});await page.screenshot({path:'output/playwright/funnel-sortie-overview.png'});
  await page.evaluate(()=>document.getElementById('sortie-sheet').remove());
  // 使用仍挂载的真实 ResizeObserver 验证暂停缩屏，不用测试直接调用替代应用入口。
  await page.setViewportSize({width:580,height:928});await page.reload();
  await page.evaluate(async()=>{
    const g=(await import('/src/main.js')).application.game;
    g.progress.weapon=12;g.progress.weapons[12]=1;g.start();g.pause();
    g.magazines[12].modules.forEach(m=>Object.assign(m,{ammo:0,remaining:2.2}));
    g.funnel.nodes.forEach(n=>{n.x=220;n.y=-210;n.cooldown=.7;});
  });
  await page.setViewportSize({width:320,height:568});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;
    const {funnelFlightBounds}=await import('/src/combat/funnel-movement.js');
    if(g.viewport.width!==320)throw Error('应用未同步缩屏');
    const b=funnelFlightBounds(g.viewport);
    if(g.funnel.nodes.some(n=>n.x>b.maxX||n.y<b.minY))throw Error('暂停缩屏炮体未收回');
    if(g.magazines[12].modules.some(m=>m.remaining!==2.2)||g.funnel.nodes.some(n=>n.cooldown!==.7))throw Error('缩屏推进了战斗时间');
    a.destroy();
  });
  if(errors.length)throw Error(errors.join(';'));
  return {results,pause:true,reducedMotion:true,resizeObserver:true,errors};
}
