// 开局数量专项验收：真实自动射击清波、详情计数、手机桌面昼夜；仅操作隔离端口。
async page=>{
  if(new URL(page.url()).port!=='4248')throw Error('仅允许隔离端口4248');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(async()=>{
    (await import('/src/main.js')).application.destroy();
    const {freshProgress}=await import('/src/progression/progress.js');
    localStorage.clear();localStorage.setItem('forest-patrol-v1',JSON.stringify(freshProgress()));
  });
  await page.reload();await page.setViewportSize({width:390,height:844});
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application;await a.ready;window.openingWaveApp=a;
    let seed=11;a.game.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
    const original=a.game.onEvent;window.openingEvents=[];
    a.game.onEvent=(type,data)=>{if(type==='wave-clear'||type==='wave-start')openingEvents.push({type,wave:a.game.wave,seconds:a.game.time,kills:a.game.waveKills});original(type,data);};
  });
  await page.locator('#start').click();await page.locator('#wave-help').click();
  if(await page.locator('#wave-help-count').textContent()!=='0 / 12')throw Error('首波详情不是12只');
  await page.screenshot({path:'output/playwright/opening-wave-first.png'});
  await page.locator('#wave-help-close').click();
  // 保留真实RAF、伤害、出生位置和装填，站定自动射击，不注入击杀或无敌。
  await page.waitForFunction(()=>openingWaveApp.game.wave===2||openingWaveApp.game.state==='dead',null,{timeout:90000});
  const combat=await page.evaluate(()=>({wave:openingWaveApp.game.wave,state:openingWaveApp.game.state,hp:openingWaveApp.game.player.hp,events:openingEvents}));
  if(combat.wave!==2||combat.state!=='playing'||combat.events.filter(e=>e.type==='wave-clear'&&e.wave===1&&e.kills===12).length!==1)throw Error('首波未真实清完 '+JSON.stringify(combat));
  await page.locator('#wave-help').click();
  if(!await page.locator('#wave-help-count').textContent().then(t=>t.endsWith(' / 18')))throw Error('第二波详情未同步18只');
  await page.locator('#wave-help-close').click();
  // 以下仅为同屏视觉夹具，不计入上面的清波时长与生存结果。
  await page.evaluate(()=>{
    const a=openingWaveApp,g=a.game;g.attackTimer=999;
    Object.assign(g.player,{x:1030,y:710,invincible:0,hp:100000});g.enemies=[];
    g.summonVehicle();g.vehicle.module.cooldown=999;
    const enemy=g.spawnEnemy(0,0,{x:1130,y:790});Object.assign(enemy,{speed:0,hp:100000,maxHp:100000,damage:0});
  });
  await page.waitForFunction(()=>openingWaveApp.game.enemies.some(e=>e.hp>0&&e.wave===2));
  const checks=[];
  for(const [width,height] of [[1280,900],[390,844],[320,568]])for(const time of ['day','night']){
    await page.setViewportSize({width,height});
    await page.evaluate(async time=>{
      const a=openingWaveApp;Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});
      a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);a.refresh();
    },time);
    await page.waitForTimeout(250);await page.locator('#wave-help').click();
    const check=await page.evaluate(()=>{
      const d=document.getElementById('wave-help-dialog'),r=d.getBoundingClientRect();
      return {count:document.getElementById('wave-help-count').textContent,contained:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,overflow:d.scrollWidth>d.clientWidth+1,paused:openingWaveApp.game.state==='paused'};
    });
    if(!check.count.endsWith(' / 18')||!check.contained||check.overflow||!check.paused)throw Error(JSON.stringify(check));
    await page.screenshot({path:`output/playwright/opening-wave-detail-${width}-${time}.png`});
    await page.keyboard.press('Escape');await page.screenshot({path:`output/playwright/opening-wave-scene-${width}-${time}.png`});
    checks.push({width,time,...check});
  }
  if(errors.length)throw Error(errors.join('\n'));
  return {combat,checks,errors};
}
