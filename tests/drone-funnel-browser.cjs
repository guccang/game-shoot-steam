// 隔离浏览器验收：旧档恢复、两种工坊、三炮混合状态与窄屏实际像素边界。
async (page) => {
  if(new URL(page.url()).port!=='4174')throw Error('仅允许隔离端口');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application;a.destroy();
    const {freshProgress}=await import('/src/game.js');const p=freshProgress();
    p.weapons=p.weapons.slice(0,13);p.mastery=p.mastery.slice(0,13);p.mods=p.mods.slice(0,13);
    Object.assign(p,{weapon:12,coins:50000,wood:20000,bosses:18});p.weapons[12]=3;p.mastery[12]=40;
    localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
  });
  await page.reload();
  if(await page.locator('#intro-weapon-name').innerText()!=='星环浮游炮')throw Error('旧装备丢失');
  if(!(await page.locator('#intro-weapon-ammo').innerText()).includes('3 × 12'))throw Error('独立容量缺失');
  await page.locator('#weapons-button').click();
  await page.locator('[data-category="all"]').click();
  const order=await page.locator('[data-portrait]').evaluateAll(nodes=>nodes.map(n=>+n.dataset.portrait));
  if(order.length!==14||order[0]!==12||order.at(-1)!==13)throw Error('顺序不正确');
  const funnel=page.locator('.item-card').filter({has:page.locator('[data-portrait="12"]')});
  const drone=page.locator('.item-card').filter({has:page.locator('[data-portrait="13"]')});
  for(const s of ['每炮能源','返航补给'])if(!(await funnel.innerText()).includes(s))throw Error('浮游炮工坊缺少'+s);
  if(!(await drone.innerText()).includes('共享能源'))throw Error('无人机共享容量丢失');
  await page.locator('[data-action="buy"][data-index="13"]').click();
  let p=await page.evaluate(()=>JSON.parse(localStorage.getItem('forest-patrol-v1')));
  if(p.weapon!==13||p.coins!==40000||p.wood!==16400||p.weapons[12]!==3)throw Error('购买或旧养成错误');
  await drone.scrollIntoViewIfNeeded();await page.screenshot({path:'output/playwright/drone-workshop.png'});
  await page.locator('[data-action="equip"][data-index="12"]').click();
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application;
    Object.assign(a.game.magazines[12].modules[0],{ammo:0,remaining:2});
    a.game.magazines[12].modules[1].ammo=5;a.refresh();
  });
  await page.locator('[data-weapon-details="12"] summary').click();
  await page.locator('[data-mod="1"][data-index="12"]').click();
  await page.locator('[data-action="upgrade"][data-index="12"]').click();
  const supply=await page.evaluate(async()=>(await import('/src/main.js')).application.game.magazines[12].modules);
  if(supply[0].remaining!==2||supply[1].ammo!==5)throw Error('养成重置供给');
  await funnel.scrollIntoViewIfNeeded();await page.screenshot({path:'output/playwright/funnel-independent-workshop.png'});
  await page.reload();
  if(await page.locator('#intro-weapon-name').innerText()!=='星环浮游炮')throw Error('切换未保存');
  const checks=[];
  for(const size of [{width:320,height:568},{width:390,height:844},{width:580,height:928}]){
    await page.setViewportSize(size);
    for(const kind of ['funnel','drone']){
      await page.evaluate(async({size,kind})=>{
        const a=(await import('/src/main.js')).application;a.destroy();const g=a.game,r=a.renderer;
        const {EnvironmentTransition}=await import('/src/world/environment.js');
        g.progress.weapon=kind==='funnel'?12:13;g.progress.weapons[g.progress.weapon]=1;
        g.progress.mods.fill(0);g.progress.mastery.fill(0);g.reset();g.start();g.setViewport(size.width,size.height);
        g.random=()=>.5;g.enemies=[];g.spawnTimer=999;g.reducedMotion=false;
        g.trees=g.trees.filter(t=>Math.hypot(t.x-g.player.x,t.y-g.player.y)>460);
        for(const angle of [-2.4,-1.57,-.6]){g.spawnEnemy(angle,330);const e=g.enemies.at(-1);e.speed=0;e.hp=e.maxHp=100000;}
        for(let i=0;i<240;i++)g.update(1/120);
        Object.assign(a.environment,{time:'day',weather:'sun',autoTime:false,autoWeather:false});
        r.light=new EnvironmentTransition(a.environment,performance.now());
        document.getElementById('environment-button').textContent='☀ 白昼 · 晴朗';
        if(kind==='funnel')Object.assign(g.funnel.nodes[0].magazine,{ammo:0,remaining:3.2});
        else Object.assign(g.magazines[13],{ammo:0,remaining:3.2});
        for(let i=0;i<18;i++)g.update(1/120);
        r.resize();r.draw();a.refresh();
      },{size,kind});
      if(kind==='funnel'){
        if(!await page.locator('#funnel-supply').isVisible()||await page.locator('#magazine-hud').isVisible())throw Error('独立HUD缺失');
        const rows=await page.locator('.supply-node').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')));
        if(!rows[0].includes('返航')||rows.slice(1).some(t=>!/(弹药|能源)/.test(t)))throw Error('一炮回收其余射击状态错误');
      }else{
        if(await page.locator('#funnel-supply').isVisible()||!await page.locator('#magazine-hud').isVisible())throw Error('共享HUD错误');
        if(!(await page.locator('#magazine-hud').getAttribute('aria-label')).includes('充能'))throw Error('无人机充能提示错误');
      }
      const layout=await page.evaluate(()=>{
        const menu=document.querySelector('.field-menu').getBoundingClientRect(),hud=document.querySelector('.player-hud').getBoundingClientRect();
        return {menuBottom:menu.bottom,hudTop:hud.top,overflow:document.documentElement.scrollWidth>innerWidth};
      });
      if(layout.overflow||layout.menuBottom>layout.hudTop-6)throw Error('武器按钮与供给面板重叠');
      await page.screenshot({path:`output/playwright/${kind}-supply-${size.width}-return.png`});
      const result=await page.evaluate(async({size,kind})=>{
        const a=(await import('/src/main.js')).application,g=a.game,r=a.renderer;
        const {EnvironmentTransition}=await import('/src/world/environment.js');
        const {drawFunnelArray}=await import('/src/rendering/funnel.js');
        for(let i=0;i<180;i++)g.update(1/120);
        if(kind==='funnel'&&(g.funnel.nodes[0].flight.mode!=='dock'||g.funnel.nodes[0].magazine.remaining>=3.2))throw Error('未到泊位补给');
        Object.assign(a.environment,{time:'night',weather:'rain'});r.light=new EnvironmentTransition(a.environment,performance.now());
        r.draw();a.refresh();
        document.getElementById('environment-button').textContent='☾ 夜晚 · 小雨';
        // 检查炮体和供给环真实像素；移除仅指向敌人的锁线后采样，不改变飞行位置。
        const s=structuredClone(g[kind]);s.nodes.forEach(n=>n.lockFlash=0);
        const canvas=document.createElement('canvas');canvas.width=canvas.height=700;
        const c=canvas.getContext('2d',{willReadFrequently:true});drawFunnelArray(c,{x:350,y:350},s);
        const data=c.getImageData(0,0,700,700).data,zoom=size.width<500?.6:.75;
        for(let y=0;y<700;y++)for(let x=0;x<700;x++)if(data[(y*700+x)*4+3]>3){
          const sx=size.width/2+(x-350)*zoom,sy=size.height/2+(y-350)*zoom;
          if(sx<10||sx>size.width-10||sy<10||sy>size.height-10)throw Error('炮体或供给环超出屏幕');
        }
        const state=JSON.stringify([g.magazines,g[kind]]);g.pause();g.update(.05);r.draw();
        if(JSON.stringify([g.magazines,g[kind]])!==state)throw Error('暂停推进了供给');g.pause();
        return {kind,width:size.width,modes:g[kind].nodes.map(n=>n.flight.mode)};
      },{size,kind});
      checks.push(result);
      await page.screenshot({path:`output/playwright/${kind}-supply-${size.width}-night.png`});
      if(kind==='funnel'&&(await page.locator('.supply-node').first().getAttribute('data-state'))!=='reloading')throw Error('补给进度环缺失');
    }
  }
  if(errors.length)throw Error(errors.join(';'));
  return {oldSave:true,purchase:true,upgrade:true,checks,errors};
}
