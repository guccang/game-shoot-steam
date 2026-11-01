// 紧凑仪表真实交互、供给数据和手机画面验收，仅操作隔离端口存档。
async (page)=>{
 if(new URL(page.url()).port!=='4174')throw Error('只允许隔离端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.destroy();const {freshProgress}=await import('/src/game.js');const p=freshProgress();p.weapons.fill(1);p.vehicleWeapons=p.weapons.map((n,i)=>i<12?n:0);p.vehicleLoadouts[p.vehicleIndex||0]=0;localStorage.setItem('forest-patrol-v1',JSON.stringify(p));});
 await page.reload();await page.locator('#start').click();
 if(await page.locator('#vehicle-dialog, #vehicle-hud, #weapon-status').count())throw Error('旧面板仍存在');
 await page.locator('#vehicle-button').click();
 if(!await page.evaluate(async()=>(await import('/src/main.js')).application.game.vehicle.active))throw Error('按钮未召唤');
 if(await page.locator('dialog[open]').count())throw Error('召唤打开了页面');
 await page.locator('#weapons-button').click();await page.locator('[data-category="vehicles"]').click();
 if(await page.locator('[data-turret-card]').count()!==12)throw Error('武器选项含自动系统或遗漏');
 await page.locator('[data-turret-card="6"] [data-turret-action="equip"]').click();
 await page.screenshot({path:'output/playwright/compact-hud/vehicle-workshop.png'});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;if(a.game.state!=='paused')throw Error('工坊未暂停');a.game.enemies=[];a.game.spawnTimer=999;a.game.vehicle.hp=90;});
 if(await page.locator('#vehicle-collection-dialog').evaluate(n=>n.open))await page.locator('#close-vehicle-collection').click();await page.locator('#close-camp').click();
 await page.locator('#vehicle-button').click();await page.locator('#vehicle-button').click();
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;if(a.game.vehicle.hp!==90)throw Error('主动上下车修复');a.game.player.invincible=0;a.game.hurt(1000);a.game.pause();a.refresh();});
 if(await page.locator('#vehicle-button .ring-count').textContent()!=='30')throw Error('毁坏后冷却缺失');
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;const {updateVehicle}=await import('/src/combat/vehicle.js');const hp=g.player.hp;
 g.state='playing';for(let i=0;i<599;i++)updateVehicle(g,.05);if(g.summonVehicle())throw Error('提前召唤');updateVehicle(g,.05);if(g.vehicle.active)throw Error('自动上车');if(g.player.hp!==hp)throw Error('冷却修改人物生命');g.pause();a.refresh();});
 await page.locator('#resume').click();await page.locator('#vehicle-button').click();
 if(!await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return g.vehicle.active&&g.vehicle.hp===g.vehicle.maxHp;}))throw Error('未满血召唤');
 await page.reload();await page.locator('#start').click();await page.locator('#weapons-button').click();
 if(!await page.evaluate(async()=>(await import('/src/main.js')).application.game.progress.vehicleLoadouts[(await import('/src/main.js')).application.game.progress.vehicleIndex||0]===6))throw Error('配置未保存');
 if(await page.locator('#vehicle-collection-dialog').evaluate(n=>n.open))await page.locator('#close-vehicle-collection').click();await page.locator('#close-camp').click();
 const shots=[];
 for(const width of [320,390,580]){
  await page.setViewportSize({width,height:width===320?568:width===580?928:844});
  for(const mode of ['pistol','funnel','supply','night','destroyed']){
   await page.evaluate(async({mode})=>{
    const a=(await import('/src/main.js')).application,g=a.game;a.destroy();
    g.progress.weapon=mode==='pistol'?0:12;g.progress.funnelLoadout=[3,0,9];g.progress.vehicleLoadouts[g.progress.vehicleIndex||0]=6;g.reset();g.state='playing';g.enemies=[];g.spawnTimer=999;g.summonVehicle();
    g.trees=g.trees.filter(t=>Math.hypot(t.x-g.player.x,t.y-g.player.y)>500);
    a.renderer.resize();g.setViewport(a.renderer.width,a.renderer.height);
    for(let i=0;i<30;i++)g.update(.02,{x:0,y:0});
    if(mode==='supply'||mode==='night'){
     const nodes=g.funnel.nodes;
     Object.assign(nodes[0].magazine,{ammo:0,remaining:1.1});nodes[0].charging=true;nodes[0].flight.mode='dock';
     Object.assign(nodes[1].magazine,{ammo:8,remaining:0});nodes[1].charging=false;
     Object.assign(nodes[2].magazine,{ammo:0,remaining:3.2});nodes[2].charging=true;nodes[2].flight.mode='return';
     g.vehicle.hp=g.vehicle.maxHp/2;Object.assign(g.vehicle.module.magazine,{ammo:0,remaining:1.2});
    }
    if(mode==='destroyed'){g.player.invincible=0;g.hurt(9999);g.vehicle.cooldown=15;}
    Object.assign(a.environment,{time:mode==='night'?'night':'day',weather:mode==='night'?'rain':'sun',autoTime:false,autoWeather:false});
    document.getElementById('game-frame').dataset.time=a.environment.time;document.getElementById('game-frame').dataset.weather=a.environment.weather;document.getElementById('environment-button').textContent=mode==='night'?'☾ 夜晚 · 小雨':'☀ 白昼 · 晴朗';
    const {EnvironmentTransition}=await import('/src/world/environment.js');a.renderer.light=new EnvironmentTransition(a.environment,performance.now());a.renderer.draw();a.refresh();
   },{mode});
   const rects=await page.evaluate(({mode})=>{
    const hud=document.querySelector('.player-hud'),p=hud.getBoundingClientRect(),v=document.getElementById('vehicle-button').getBoundingClientRect(),j=document.getElementById('joystick').getBoundingClientRect();
    const rings=[...document.querySelectorAll('.status-ring')].filter(n=>n.getBoundingClientRect().width>0),r=rings.map(n=>n.getBoundingClientRect());
    if(p.height>90)throw Error('HUD没有压缩 '+p.height);
    if(r.length!==(mode==='pistol'?2:4))throw Error('仪表数量不正确');
    if(r.some(n=>n.left<p.left||n.right>p.right||n.top!==v.top||n.bottom>p.bottom))throw Error('图标未在同一行或超出HUD');
    if(j.right>p.left||document.querySelector('.field-menu').getBoundingClientRect().bottom>p.top-6)throw Error('覆盖操作区');
    if(document.getElementById('auto-label').textContent.trim())throw Error('自动攻击仍有文字');
    if(document.documentElement.scrollWidth>innerWidth)throw Error('横向溢出');
    if(mode==='supply'||mode==='night'){
     const nodes=document.querySelectorAll('.supply-node');
     if(nodes[0].dataset.fill!=='50.00'||nodes[0].dataset.state!=='reloading'||nodes[1].querySelector('.ring-count').textContent!=='8'||nodes[2].dataset.state!=='returning'||nodes[2].dataset.fill!=='0.00')throw Error('独立供给环不同步');
     if(document.getElementById('vehicle-button').dataset.fill!=='50.00')throw Error('耐久环不匹配');
    }
    if(mode==='destroyed'&&(document.getElementById('vehicle-button').dataset.fill!=='50.00'||!document.getElementById('vehicle-button').disabled))throw Error('修复状态不匹配');
    return {height:p.height,hudWidth:p.width,rings:r.length};
   },{mode});
   await page.screenshot({path:`output/playwright/compact-hud/${width}-${mode}.png`});shots.push({width,mode,...rects});
  }
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 const frozen=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.pause();a.refresh();const before=[...document.querySelectorAll('.status-ring')].map(n=>n.dataset.fill).join();for(let i=0;i<120;i++)g.update(.05);a.refresh();if([...document.querySelectorAll('.status-ring')].map(n=>n.dataset.fill).join()!==before)throw Error('暂停仍推进仪表');return true;});
 await page.emulateMedia({reducedMotion:'no-preference'});await page.reload();
 if(errors.length)throw Error(errors.join('\n'));
 return {manualSummon:true,armor:true,exactCooldown:true,save:true,frozen,shots,errors};
}
