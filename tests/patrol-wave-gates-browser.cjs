// 隔离实机验证新节点交互；只用最后一只低血怪的显式夹具缩短清波，不宣称完整通关。
async(page)=>{
 if(new URL(page.url()).port!=='4227')throw Error('仅允许隔离测试端口4227');
 const errors=[],shots=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1280,height:900});
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();});await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.gatesApp=(await import('/src/main.js')).application;await gatesApp.ready;});
 const initial=await page.evaluate(()=>({target:gatesApp.game.bossWave,ready:gatesApp.game.bossReady}));
 if(initial.target<3||initial.target>5||initial.ready||!await page.locator('#boss-button').isDisabled())throw Error('初始组或按钮错误');
 await page.waitForFunction(()=>gatesApp.game.enemies.filter(e=>e.wave===gatesApp.game.wave&&!e.ambient).length>=5);
 const spawned=await page.evaluate(()=>gatesApp.game.enemies.filter(e=>e.wave===gatesApp.game.wave&&!e.ambient).map(e=>({x:e.x,y:e.y,wave:e.wave})));
 // 固定到本组最后一波的最后一只，使用正常自动射击触发清空与节点事件。
 await page.evaluate(async()=>{const a=gatesApp,g=a.game,{waveDifficulty}=await import('/src/config/waves.js');
  g.enemies=[];g.wave=g.bossWave;g.waveKills=g.waveSpawned=waveDifficulty(g.wave).total-1;g.waveWarning=0;g.spawnTimer=999;g.waveRest=0;
  g.player.invincible=999;g.attackTimer=0;g.spawnEnemy(0,120).hp=1;a.refresh();});
 await page.waitForFunction(()=>gatesApp.game.bossReady);await page.locator('#boss-button').waitFor({state:'visible'});
 await page.waitForFunction(()=>!document.getElementById('boss-button').disabled);
 const wave=await page.evaluate(()=>gatesApp.game.wave);await page.waitForTimeout(1500);
 if(!await page.evaluate(w=>gatesApp.game.wave===w&&!gatesApp.game.boss&&!gatesApp.game.enemies.some(e=>e.hp>0),wave))throw Error('等待时自动刷怪或自动开Boss');
 // 改变视口与光照只用于界面同屏检查，仍读取正式游戏HUD与绘制器。
 for(const [width,height] of [[1280,900],[390,844],[320,568]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(async time=>{const a=gatesApp;Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);a.renderer.draw();a.refresh();},time);
  await page.waitForTimeout(120);
  const s=await page.evaluate(()=>({title:document.getElementById('quest-title').textContent,detail:document.getElementById('quest-detail').textContent,overflow:document.documentElement.scrollWidth>innerWidth,button:document.getElementById('boss-button').getBoundingClientRect().toJSON()}));
  if(s.overflow||!s.title.includes('领主节点')||s.button.width<44)throw Error('节点界面异常');shots.push({width,time,...s});await page.screenshot({path:`output/playwright/patrol-wave-gates/${width}-${time}.png`});
 }
 await page.reload();await page.evaluate(async()=>{window.gatesApp=(await import('/src/main.js')).application;await gatesApp.ready;});
 if(await page.locator('#resume').isVisible())await page.locator('#resume').click();
 if(!await page.evaluate(()=>gatesApp.game.bossReady&&!gatesApp.game.boss))throw Error('刷新绕过手动节点');
 await page.locator('#boss-button').click();await page.waitForFunction(()=>!!gatesApp.game.boss);
 await page.evaluate(()=>{gatesApp.game.player.invincible=999;});await page.waitForTimeout(2000);
 await page.screenshot({path:'output/playwright/patrol-wave-gates/manual-boss.png'});
 // 末击用显式伤害夹具验证奖励与下一组衔接，避免重跑领主战斗专项。
 const after=await page.evaluate(()=>{const a=gatesApp,g=a.game,old=g.boss,before=g.progress.coins;g.hit(old,1e9);g.hit(old,1e9);a.refresh();return {reward:g.progress.coins-before,target:g.bossWave,wave:g.wave,ready:g.bossReady};});
 if(after.reward!==180||after.ready||after.target-after.wave<3||after.target-after.wave>5)throw Error('胜利节点衔接错误');
 await page.waitForFunction(w=>gatesApp.game.wave===w+1,after.wave);await page.waitForFunction(()=>gatesApp.game.enemies.some(e=>e.hp>0&&e.wave===gatesApp.game.wave&&!e.ambient));
 await page.screenshot({path:'output/playwright/patrol-wave-gates/next-group.png'});
 if(errors.length)throw Error(errors.join('\n'));return {passed:true,initial,spawned,after,shots,errors};
}
