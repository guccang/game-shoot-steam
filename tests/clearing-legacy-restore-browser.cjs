// 隔离端口载入缺少生活记录的旧领主存档，检查真实进入游戏、续战及昼夜同屏。
async page=>{
 if(new URL(page.url()).port!=='4175')throw Error('游戏测试使用4175端口');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(String(e)));
 page.on('response',r=>{if(r.status()>=400&&r.url().includes('/assets/'))errors.push(`资源加载失败：${r.status()} ${r.url()}`);});
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application;a.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress();
  p.bosses=4;p.coins=3456;p.wood=789;p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
  delete p.living;
  const n=12,maxHp=Math.round(2250*(1+.24*n+.025*n*n));
  p.bossChallenge={bosses:4,maxHp,damage:Math.round(18*(1+.16*n+.015*n*n)),blastDamage:Math.round(30*(1+.16*n+.015*n*n)),speed:60*(1+.055*n)};
  p.patrol={version:1,state:'active',wave:10,waveKills:7,kills:180,chopped:80,roundBosses:4,bossKillsAt:165,playerHp:100,bossHp:maxHp*.4};
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
  localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.locator('#start').click();
 const restored=await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application;await a.ready;const g=a.game;
  const state={active:g.progress.living.patrolActive,position:{x:g.player.x,y:g.player.y},boss:g.boss&&{hp:g.boss.hp,maxHp:g.boss.maxHp,x:g.boss.x,y:g.boss.y},savedHp:g.progress.patrol.bossHp,allowed:(await import('/src/core/camp/living-safety.js')).livingWaveAllowed(g)};
  g.pause();a.refresh();return state;
 });
 if(!restored.active||!restored.allowed||Math.hypot(restored.position.x-1600,restored.position.y-400)>2||restored.boss?.maxHp!==1600||restored.savedHp!==640)throw Error('旧档恢复失败 '+JSON.stringify(restored));
 for(const phase of ['day','night']){
  await page.evaluate(async phase=>{
   const a=(await import('/src/main.js')).application,timing=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase);
   a.game.progress.living.calendar={day:1,elapsed:timing.start+timing.duration/2};
   (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);
   a.environment.weather='sun';a.environment.autoWeather=false;a.refresh();
  },phase);
  await page.waitForTimeout(16000);
  for(const width of [390,1280]){
   await page.setViewportSize({width,height:900});await page.locator('#resume').click();await page.waitForTimeout(300);
   const sample=await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;
    return {state:g.state,phase:a.environment.time,night:a.renderer.light.sample(performance.now()).night,boss:!!g.boss,overlay:!document.getElementById('overlay').hidden,overflow:document.documentElement.scrollWidth>innerWidth};
   });
   if(sample.state!=='playing'||sample.phase!==phase||sample.overlay||sample.overflow||!sample.boss||Math.abs(sample.night-Number(phase==='night'))>.01)throw Error('续战同屏异常 '+JSON.stringify(sample));
   samples.push({width,...sample});await page.screenshot({path:`output/playwright/clearing-legacy-restore/${width}-${phase}.png`});
   await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.pause();a.refresh();});
  }
 }
 // 从真实暂停按钮继续，观察玩家能够移动且领主战处于可进行状态。
 await page.locator('#resume').click();
 const before=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return {x:g.player.x,hp:g.boss.hp};});
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(400);await page.keyboard.up('ArrowRight');
 const continued=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;const result={state:g.state,x:g.player.x,bossHp:g.boss?.hp,allowed:(await import('/src/core/camp/living-safety.js')).livingWaveAllowed(g)};g.pause();a.refresh();return result;});
 if(continued.state!=='playing'||!continued.allowed||Math.abs(continued.x-before.x)<5||continued.bossHp>before.hp)throw Error('恢复后不能继续战斗 '+JSON.stringify(continued));
 if(errors.length)throw Error(errors.join(';'));
 return {restored,samples,before,continued,errors};
}
