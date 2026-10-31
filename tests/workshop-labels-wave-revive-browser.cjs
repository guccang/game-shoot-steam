// 门牌拖动与死亡波次的实际浏览器回归，仅运行隔离服务器，不修改用户存档。
async page=>{
 if(new URL(page.url()).port!=='4232')throw Error('仅允许隔离端口4232');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();});await page.reload();
 await page.evaluate(async()=>{
  window.labelApp=(await import('/src/main.js')).application;await labelApp.ready;
  const g=labelApp.game;g.progress.arrival={...g.progress.arrival,phase:'complete'};g.progress.weapons[0]=1;g.reset();labelApp.menu.enter();g.start();
  Object.assign(g,{wave:3,waveGroupStart:1,bossWave:5,waveKills:7,waveSpawned:7,kills:60,waveWarning:0,waveRest:0,spawnTimer:999,attackTimer:999});
  // 只在真实输入时推进正式运动，使昼夜截图及死亡比较不受额外刷怪影响。
  window.labelTick=Object.getPrototypeOf(g).update.bind(g);g.update=(dt,move)=>{if(move&&(move.x||move.y))labelTick(dt,move);};
  g.player.invincible=999;g.spawnEnemy(0,0,{x:490,y:820});g.enemies[0].speed=0;g.enemies[0].hp=1e8;labelApp.refresh();
 });
 // 统一读取正式波次展示，不用伪造DOM验证进度。
 const wave=()=>page.evaluate(async()=>{const g=labelApp.game;return {state:(await import('/src/ui/wave-progress.js')).waveProgressState(g),kills:g.waveKills,boss:g.bossWave};});
 for(const width of [1280,390,320])for(const time of ['day','night']){
  await page.setViewportSize({width,height:844});
  await page.evaluate(async time=>{
   const a=labelApp;Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,autoSeason:false,forestSeason:'summer'});
   a.renderer.seasons.reset('summer',performance.now());a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();
  },time);
  for(const kind of ['weapons','vehicle']){
   await page.evaluate(kind=>{const g=labelApp.game;Object.assign(g.player,{x:kind==='vehicle'?285:480,y:735,invincible:999});g.attackTimer=999;g.spawnTimer=999;labelApp.renderer.camera.time=null;labelApp.renderer.resize();labelApp.refresh();},kind);
   await page.waitForTimeout(300);const button=page.locator(`[data-workshop-kind="${kind}"].world-workshop-entry`);await button.waitFor({state:'visible'});
   await page.screenshot({path:`output/playwright/workshop-labels-wave-revive/${kind}-${width}-${time}.png`});
   const b=await button.boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;
   const before=await page.evaluate(()=>({x:labelApp.game.player.x,y:labelApp.game.player.y}));
   if(width===1280){await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+48,y,{steps:6});await page.waitForTimeout(350);await page.mouse.up();}
   else{
    const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+48,y}]});await page.waitForTimeout(350);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
   }
   const after=await page.evaluate(()=>({x:labelApp.game.player.x,y:labelApp.game.player.y}));
   if(Math.hypot(after.x-before.x,after.y-before.y)<10||await page.locator('#workshop-dialog').isVisible())throw Error('门牌拖动未移动或误打开 '+kind+' '+width);
   await page.waitForTimeout(150);await button.click();
   if(!await page.locator('#workshop-dialog').isVisible()||await page.locator('#workshop-title').textContent()!==(kind==='vehicle'?'载具工坊':'武器工坊'))throw Error('短按未进入对应工坊');
   await page.locator('#ws-close').click();await button.press('Enter');await page.locator('#ws-close').click();
  }
  const before=await wave();
  await page.evaluate(()=>{const g=labelApp.game;g.player.invincible=0;g.hurt(1e9);labelApp.refresh();});
  if(!await page.locator('#overlay-text').textContent().then(s=>s.includes('进度已保留')))throw Error('死亡仍提示回退');
  await page.locator('#resume').click();
  if(JSON.stringify(await wave())!==JSON.stringify(before))throw Error('死亡复活丢失波次');
  await page.evaluate(()=>{Object.assign(labelApp.game.player,{x:415,y:735,invincible:999});labelApp.renderer.camera.time=null;labelApp.renderer.resize();labelApp.refresh();});await page.waitForTimeout(100);
  const s=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectWorkshopPatrol(document));
  if(s.wave.nodes.filter(n=>n.state==='done').length!==2||s.wave.nodes[2].state!=='current'||s.wave.overflow)throw Error('复活轨道错误');
  samples.push({width,time,...s});await page.screenshot({path:`output/playwright/workshop-labels-wave-revive/revived-${width}-${time}.png`});
 }
 // 死亡后刷新再继续也保留同一节点，不只验证内存中的重新出发。
 const before=await wave();await page.evaluate(()=>{labelApp.game.player.invincible=0;labelApp.game.hurt(1e9);labelApp.save();});await page.reload();
 await page.evaluate(async()=>{window.labelApp=(await import('/src/main.js')).application;await labelApp.ready;labelApp.game.update=()=>{};});await page.locator('#start').click();
 if(JSON.stringify(await wave())!==JSON.stringify(before))throw Error('死后重载丢失进度');
 if(await page.evaluate(()=>labelApp.game.state)==='dead')await page.locator('#resume').click();
 if(JSON.stringify(await wave())!==JSON.stringify(before))throw Error('重载复活丢失进度');
 if(errors.length)throw Error(errors.join('\n'));return {samples,reloaded:true,errors};
}
