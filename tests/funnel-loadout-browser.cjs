// 隔离端口验证真实配置交互、暂停归属、存档和混装作战的窄屏画面。
async (page) => {
  if(new URL(page.url()).port!=='4174')throw Error('仅允许隔离端口');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application;a.destroy();
    const {freshProgress}=await import('/src/game.js');const p=freshProgress();p.weapon=12;
    for(const i of [0,1,2,3,6,7,8,9,12])p.weapons[i]=1;
    localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
  });
  await page.reload();await page.locator('#start').click();await page.locator('#weapons-button').click();
  await page.locator('[data-funnel-config]').click();
  if(!await page.locator('#funnel-dialog').isVisible())throw Error('独立配置页未打开');
  if(await page.locator('[data-loadout-weapon="4"]').count())throw Error('未拥有枪可配置');
  if(await page.locator('[data-loadout-weapon="13"]').count())throw Error('递归无人机可配置');
  for(const [slot,index] of [[0,1],[1,6],[2,9]]){
    await page.locator(`[data-funnel-slot="${slot}"]`).click();
    await page.locator(`[data-loadout-weapon="${index}"]`).click();
    if(await page.locator(`[data-loadout-weapon="${index}"]`).getAttribute('aria-pressed')!=='true')throw Error('槽位配置没有更新');
  }
  const chosen=await page.evaluate(()=>JSON.parse(localStorage.getItem('forest-patrol-v1')).funnelLoadout);
  if(JSON.stringify(chosen)!=='[1,6,9]')throw Error('配置没有持久保存');
  await page.locator('[data-funnel-slot="2"]').press('ArrowRight');
  if(await page.locator('[data-funnel-slot="0"]').getAttribute('aria-selected')!=='true')throw Error('键盘切槽失败');
  for(const size of [{width:320,height:568},{width:390,height:844},{width:580,height:928}]){
    await page.setViewportSize(size);
    await page.locator('#funnel-dialog').evaluate(el=>el.scrollTop=0);
    const overflow=await page.locator('#funnel-dialog').evaluate(el=>el.scrollWidth>el.clientWidth+1);
    if(overflow)throw Error('配置页横向溢出');
    await page.screenshot({path:`output/playwright/funnel-config-${size.width}.png`});
  }
  await page.locator('#funnel-done').click();
  if(await page.evaluate(async()=>(await import('/src/main.js')).application.game.state)!=='paused')throw Error('关闭子页提前恢复战斗');
  await page.locator('#camp-done').click();
  if(await page.evaluate(async()=>(await import('/src/main.js')).application.game.state)!=='playing')throw Error('关闭工坊未恢复战斗');
  await page.reload();
  if((await page.locator('#intro-weapon-ammo').innerText())!=='20 / 24 / 3')throw Error('开始页未展示混装容量');
  const results=[];
  for(const size of [{width:320,height:568},{width:390,height:844},{width:580,height:928}]){
    await page.setViewportSize(size);
    for(const mode of ['mixed','supply','night','flame-shotgun','triple-pulse']){
      const result=await page.evaluate(async({size,mode})=>{
        const a=(await import('/src/main.js')).application;a.destroy();const g=a.game,r=a.renderer;
        const {EnvironmentTransition}=await import('/src/world/environment.js');
        g.progress.weapons.fill(1);g.progress.mods.fill(0);g.progress.mastery.fill(0);g.progress.weapon=12;
        g.progress.funnelLoadout=mode==='flame-shotgun'?[7,3,2]:mode==='triple-pulse'?[9,9,9]:[1,6,9];
        g.reset();g.start();g.setViewport(size.width,size.height);g.random=()=>.5;g.spawnTimer=999;g.enemies=[];g.reducedMotion=false;
        g.trees=g.trees.filter(t=>Math.hypot(t.x-g.player.x,t.y-g.player.y)>900);
        for(const angle of [-2.4,-1.57,-.6]){g.spawnEnemy(angle,170);const e=g.enemies.at(-1);e.speed=0;e.hp=e.maxHp=1e7;}
        for(let k=0;k<170;k++)g.update(1/120);
        if(mode==='supply'){
          const n=g.funnel.nodes[0];Object.assign(n.magazine,{ammo:0,remaining:n.weapon.reloadTime});
          for(let k=0;k<150;k++)g.update(1/120);
        }
        const night=mode==='night';Object.assign(a.environment,{time:night?'night':'day',weather:night?'rain':'sun',autoTime:false,autoWeather:false});
        r.light=new EnvironmentTransition(a.environment,performance.now());r.resize();r.draw();a.refresh();
        document.getElementById('environment-button').textContent=night?'☾ 夜晚 · 小雨':'☀ 白昼 · 晴朗';
        const v=r.view;if(Math.abs((g.player.x-v.x)*v.zoom-r.width/2)>.01)throw Error('挂载改变镜头');
        const menu=document.querySelector('.field-menu').getBoundingClientRect(),hud=document.querySelector('.player-hud').getBoundingClientRect();
        if(menu.bottom>hud.top-6)throw Error('供给面板被遮挡');
        if(document.documentElement.scrollWidth>innerWidth)throw Error('战场横向溢出');
        const rings=[...document.querySelectorAll('.supply-node')].map(el=>el.getBoundingClientRect());
        if(rings.length!==3||rings.some(r=>r.left<hud.left||r.right>hud.right))throw Error('混装圆环溢出');
        const snapshot=JSON.stringify(g.funnel);g.pause();g.update(.05);r.draw();if(JSON.stringify(g.funnel)!==snapshot)throw Error('暂停推进技能');g.pause();
        r.draw();a.refresh();
        return {width:size.width,mode,ammo:g.funnel.nodes.map(n=>n.magazine.ammo),modules:g.funnel.nodes.map(n=>n.weapon.id)};
      },{size,mode});
      results.push(result);await page.screenshot({path:`output/playwright/funnel-loadout-${size.width}-${mode}.png`});
    }
  }
  // 真实混装战斗不额外修改炮体位置；单独绘制阵列检查蓄力核心没有出屏。
  const pixels=await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;
    const {drawFunnelArray}=await import('/src/rendering/funnel.js');
    let samples=0;
    for(const size of [{width:320,height:568},{width:390,height:844},{width:580,height:928}]){
      g.setViewport(size.width,size.height);const canvas=document.createElement('canvas');canvas.width=canvas.height=800;
      const c=canvas.getContext('2d',{willReadFrequently:true});
      for(let k=0;k<250;k++){
        g.update(1/120);if(k%20)continue;
        const s=structuredClone(g.funnel);s.nodes.forEach(n=>n.lockFlash=0);c.clearRect(0,0,800,800);drawFunnelArray(c,{x:400,y:400},s,false);
        const pixels=c.getImageData(0,0,800,800).data,zoom=size.width<500?.6:.75;
        for(let y=0;y<800;y++)for(let x=0;x<800;x++)if(pixels[(y*800+x)*4+3]>3){
          const sx=size.width/2+(x-400)*zoom,sy=size.height/2+(y-400)*zoom;
          if(sx<5||sx>size.width-5||sy<5||sy>size.height-5)throw Error('混装炮体或蓄能光效出屏');
        }
        samples++;
      }
    }
    return {samples};
  });
  if(errors.length)throw Error(errors.join(';'));
  return {saved:chosen,dialogPause:true,results,pixels,errors};
}
