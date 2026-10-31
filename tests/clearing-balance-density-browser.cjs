// 隔离存档验收清缴接取、后期密度及昼夜同屏；战斗属性和攻击由正式运行时执行。
async page=>{
 if(new URL(page.url()).port!=='4278')throw Error('只允许4278隔离测试端口');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application;a.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress();
  p.bosses=15;p.weapon=2;p.weapons[2]=20;p.heroes[0]=20;
  p.vehicleHulls[0]=20;p.vehicleIndex=0;p.vehicleWeapons[17]=20;p.vehicleLoadouts[0]=17;
  p.mainline.completed=['first-map'];p.mainline.phase='doing';p.living.position={x:810,y:965};
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
  localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{await (await import('/src/main.js')).application.ready;});
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.mainlineSpeech=null;g.mainlineTalkDelay=999;Object.assign(g.player,{x:810,y:965});a.refresh();});
 await page.keyboard.press('KeyE');await page.locator('#clearing-dialog').waitFor({state:'visible'});
 const label=await page.locator('.clearing-loot').textContent();if(!label.includes('强敌分批入场'))throw Error('进阶说明未更新');
 await page.screenshot({path:'output/playwright/clearing-growth/board.png'});
 await page.locator('#clearing-accept').click();
 // 用正式波次调度装满现场，随后恢复真实自动射击，验证补兵与移动可用。
 const initial=await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application,g=a.game;
  Object.assign(g.player,{x:1600,y:400});g.wave=80;g.waveGroupStart=76;g.bossWave=80;
  g.waveKills=g.waveSpawned=g.waveWarning=g.waveRest=0;g.enemies=[];g.vehicle.active=true;
  for(let i=0;i<120;i++)g.updateWaves(.5);
  a.refresh();return {alive:g.enemies.filter(e=>e.hp>0).length,total:(await import('/src/config/waves.js')).waveDifficulty(g.wave).total,x:g.player.x};
 });
 if(initial.alive!==24||initial.total!==40)throw Error('后期密度错误 '+JSON.stringify(initial));
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(450);await page.keyboard.up('ArrowRight');
 await page.waitForTimeout(6000);
 const combat=await page.evaluate(async()=>{
  const g=(await import('/src/main.js')).application.game;
  return {alive:g.enemies.filter(e=>e.hp>0).length,kills:g.waveKills,spawned:g.waveSpawned,state:g.state,x:g.player.x,hp:g.player.hp};
 });
 if(combat.state!=='playing'||combat.kills<=0||combat.alive>24||Math.abs(combat.x-initial.x)<5)throw Error('正式战斗或移动失败 '+JSON.stringify(combat));
 // 等待昼夜过渡时暂停；截图前实际点击继续游戏，确保暂停菜单不会遮挡角色与战车。
 for(const phase of ['day','night']){
  await page.evaluate(async phase=>{
   const a=(await import('/src/main.js')).application,g=a.game;
   g.state='playing';g.wave=80;g.waveKills=g.waveSpawned=g.waveWarning=g.waveRest=0;g.bossReady=false;g.boss=null;g.enemies=[];
   Object.assign(g.player,{x:1600,y:400});for(let i=0;i<120;i++)g.updateWaves(.5);g.state='paused';
   const timing=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase);
   g.progress.living.calendar={day:1,elapsed:timing.start+timing.duration/2};
   (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);
   a.environment.weather='sun';a.environment.autoWeather=false;a.refresh();
  },phase);
  await page.waitForTimeout(16000);
  for(const width of [320,390,1280]){
   await page.setViewportSize({width,height:900});await page.locator('#resume').click();await page.waitForTimeout(250);
   const sample=await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game,rect=document.getElementById('quest').getBoundingClientRect();
    return {alive:g.enemies.filter(e=>e.hp>0).length,phase:a.environment.time,night:a.renderer.light.sample(performance.now()).night,overlay:!document.getElementById('overlay').hidden,overflow:document.documentElement.scrollWidth>innerWidth,questRight:rect.right,vehicle:g.vehicle.active};
   });
   if(sample.alive>24||sample.phase!==phase||sample.overlay||sample.overflow||sample.questRight>width+1||!sample.vehicle||Math.abs(sample.night-Number(phase==='night'))>.01)throw Error('同屏检查失败 '+JSON.stringify(sample));
   samples.push({width,...sample});await page.screenshot({path:`output/playwright/clearing-growth/${width}-${phase}.png`});
   await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;if(a.game.state==='playing')a.game.pause();a.refresh();});
  }
 }
 if(errors.length)throw Error(errors.join(';'));
 return {label,initial,combat,samples,errors};
}
