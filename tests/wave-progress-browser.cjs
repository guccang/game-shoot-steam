// 波次HUD专项实机：显式进度夹具缩短清波，实际点击领主和键盘移动检验交互。
async(page)=>{
 if(new URL(page.url()).port!=='4232')throw Error('仅允许隔离端口4232');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();});await page.reload();
 await page.evaluate(async()=>{window.waveApp=(await import('/src/main.js')).application;await waveApp.ready;});
 await page.locator('#start').click();
 await page.evaluate(()=>{
  const a=waveApp,g=a.game;Object.assign(g,{wave:3,waveGroupStart:1,bossWave:5,waveKills:18,waveSpawned:18,waveWarning:0,waveRest:0,spawnTimer:999,attackTimer:999});
  Object.assign(g.player,{x:780,y:900});g.enemies=[];const e=g.spawnEnemy(0,0,{x:700,y:1020});e.speed=0;e.hp=e.maxHp=100000;
  // 同屏截图固定敌人位置，暂停本次车炮射击以免击退把敌人推出画面。
  g.summonVehicle();g.vehicle.module.cooldown=999;a.refresh();
 });
 for(const [width,height] of [[1280,900],[390,844],[320,568]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async time=>{const a=waveApp;Object.assign(a.environment,{time,season:'spring',weather:'sun',autoTime:false,autoWeather:false});
   a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);a.renderer.draw();a.refresh();},time);
  await page.waitForTimeout(450);
  const s=await page.evaluate(async()=> (await import('/src/rendering/visual-review.js')).inspectWaveProgress(document));
  if(s.nodes.length!==5||s.nodes[0].state!=='done'||s.nodes[2].state!=='current'||!s.touchSize||!s.contained||!s.toastClear||s.overflow||!s.disabled||s.progress<=40||s.progress>=60)throw Error('轨道异常 '+JSON.stringify(s));
  samples.push({width,time,...s});await page.screenshot({path:'output/playwright/wave-progress/'+width+'-'+time+'.png'});
 }
 // 保存与重新加载仍显示原组五个节点及两个完成勾。
 await page.evaluate(()=>waveApp.save());await page.reload();
 await page.evaluate(async()=>{window.waveApp=(await import('/src/main.js')).application;await waveApp.ready;});
 await page.locator('#resume').click();
 const restored=await page.evaluate(async()=> (await import('/src/rendering/visual-review.js')).inspectWaveProgress(document));
 if(restored.nodes.length!==5||restored.nodes.filter(n=>n.state==='done').length!==2)throw Error('刷新丢失组进度');
 // 最后一只使用真实命中和波次调度，确认没有自动开始Boss。
 await page.evaluate(async()=>{
  const g=waveApp.game,{waveDifficulty}=await import('/src/config/waves.js');
  g.enemies=[];g.wave=g.bossWave;g.waveRest=0;g.waveWarning=0;g.waveKills=g.waveSpawned=waveDifficulty(g.wave).total-1;
  const e=g.spawnEnemy(0,120);g.hit(e,1e9);g.updateWaves(.01);waveApp.refresh();
 });
 await page.waitForFunction(()=>!document.getElementById('boss-button').disabled);
 if(!await page.evaluate(()=>waveApp.game.bossReady&&!waveApp.game.boss))throw Error('Boss被自动启动');
 await page.screenshot({path:'output/playwright/wave-progress/boss-ready.png'});
 await page.locator('#boss-button').click();await page.waitForFunction(()=>!!waveApp.game.boss);
 if(!await page.locator('#boss-hud').isVisible())throw Error('Boss血条未接替');
 await page.screenshot({path:'output/playwright/wave-progress/boss-active.png'});
 const victory=await page.evaluate(()=>{
  const g=waveApp.game,b=g.boss,before=g.progress.coins;g.hit(b,1e9);g.hit(b,1e9);waveApp.refresh();
  return {reward:g.progress.coins-before,start:g.waveGroupStart,wave:g.wave,completed:[...document.querySelectorAll('.wave-node[data-state="done"]')].length};
 });
 if(victory.reward!==180||victory.start!==victory.wave+1||victory.completed!==0)throw Error('新组或奖励错误');
 await page.screenshot({path:'output/playwright/wave-progress/next-group.png'});
 // 正式剧情/秘境往返检验旧任务正文仍显示、轨道隐藏。
 for(const mode of ['story','realm']){
  await page.evaluate(mode=>{const g=waveApp.game;g.state='playing';if(mode==='story')g.enterStory();else g.enterRealm('tower');waveApp.refresh();},mode);
  if(!await page.locator('#wave-track').isHidden())throw Error(mode+'仍显示普通波次轨道');
  await page.evaluate(mode=>{const g=waveApp.game;if(mode==='story')g.leaveStory();else g.leaveRealm();g.start();waveApp.refresh();},mode);
 }
 await page.evaluate(()=>{const g=waveApp.game;g.enemies=[];g.spawnTimer=999;g.player.invincible=999;g.attackTimer=999;g.state='playing';});
 const before=await page.evaluate(()=>({x:waveApp.game.player.x,y:waveApp.game.player.y}));
 await page.keyboard.down('s');await page.waitForTimeout(700);await page.keyboard.up('s');
 const distance=await page.evaluate(p=>Math.hypot(waveApp.game.player.x-p.x,waveApp.game.player.y-p.y),before);
 if(distance<10)throw Error('移动受阻');
 if(errors.length)throw Error(errors.join('\n'));
 return {passed:true,designCriterion:'wave-progress-track',samples,restored,victory,distance,errors};
}
