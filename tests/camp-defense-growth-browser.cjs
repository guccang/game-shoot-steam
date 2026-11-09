// 隔离浏览器验证兽潮新属性、场次文案、真实战斗及桌面手机昼夜同屏。
async page=>{
 if(new URL(page.url()).port!=='4282')throw Error('仅允许4282隔离端口');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application;a.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();
  p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS;p.mainline.phase='complete';
  p.weapon=2;p.weapons[2]=5;p.heroes[0]=5;p.vehicleIndex=0;p.vehicleHulls[0]=5;p.vehicleWeapons[17]=5;p.vehicleLoadouts[0]=17;
  const gate=(await import('/src/config/camp-defense.js')).CAMP_GATES[0];p.living.position={x:gate.x,y:gate.y+50};
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.setViewportSize({width:390,height:900});await page.locator('#start').click();
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;const g=a.game;g.mainlineSpeech=null;g.mainlineTalkDelay=99999;
  Object.assign(g.player,(await import('/src/core/vehicles/camp-parking.js')).vehicleParkingSite(g,0));if(!g.summonVehicle())throw Error('上车失败');Object.assign(g.player,(await import('/src/config/camp-defense.js')).CAMP_GATES[0]);a.refresh();});
 await page.locator('[data-camp-gate="top"]').dispatchEvent('click',{detail:0});await page.locator('#camp-defense-dialog').waitFor({state:'visible'});
 const entry=await page.locator('#camp-content').textContent();if(!entry.includes('第 1 次兽潮 · 已结算 0 次'))throw Error('首场记录文案错误');
 await page.screenshot({path:'output/playwright/horde-growth/entry.png'});await page.locator('#camp-primary').click();
 await page.waitForFunction(async()=>(await import('/src/main.js')).application.game.state==='playing');
 const opening=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game,r=g.campDefense;g.attackTimer=999;g.vehicle.module.cooldown=999;r.timer=0;
  (await import('/src/core/camp/camp-defense.js')).updateCampDefense(g,.01);const e=g.enemies[0];return {hp:e.maxHp,damage:e.damage,speed:e.speed,rounds:r.rounds,vehicle:g.vehicle.active,x:g.player.x};});
 if(opening.hp!==27||opening.damage!==4||opening.speed!==42||!opening.vehicle)throw Error('首波属性错误 '+JSON.stringify(opening));
 await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;g.attackTimer=g.vehicle.module.cooldown=0;});
 await page.keyboard.down('KeyD');await page.waitForTimeout(400);await page.keyboard.up('KeyD');await page.waitForTimeout(5000);
 const combat=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return {state:g.state,kills:g.campDefense.kills,x:g.player.x,phase:g.campDefense.phase};});
 if(combat.state!=='playing'||combat.kills<1||Math.abs(combat.x-opening.x)<5)throw Error('正式移动或射击失败 '+JSON.stringify(combat));
 // 检查点只准备十波已完成状态，领主出生、受伤与领取仍通过正式入口。
 const boss=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game,r=g.campDefense,core=await import('/src/core/camp/camp-defense.js');
  g.enemies=[];Object.assign(r,{wave:10,waveKills:86,spawned:86,kills:590,timer:0});core.updateCampDefense(g,.01);
  const result={hp:g.boss.maxHp,damage:g.boss.damage,skill:g.boss.blastDamage,speed:g.boss.speed};g.hit(g.boss,g.boss.hp);a.refresh();return result;});
 if(boss.hp!==1900||boss.skill!==60||boss.speed!==45)throw Error('首场领主属性错误');
 await page.locator('.camp-grade').waitFor({state:'visible'});await page.locator('#camp-primary').click();
 // 领取会排队弹出奖励回执，先正常关闭回执再操作营门。
 await page.locator('#task-reward-dialog').waitFor({state:'visible'});await page.locator('#task-reward-close').click();
 await page.waitForFunction(async()=>{const g=(await import('/src/main.js')).application.game;return !g.campDefense&&g.state==='playing';});
 await page.locator('#camp-defense-dialog').waitFor({state:'hidden'});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;Object.assign(a.game.player,(await import('/src/config/camp-defense.js')).CAMP_GATES[0]);a.refresh();});
 await page.locator('[data-camp-gate="top"]').dispatchEvent('click',{detail:0});await page.locator('#camp-defense-dialog').waitFor({state:'visible'});
 const next=await page.locator('#camp-content').textContent();if(!next.includes('第 2 次兽潮 · 已结算 1 次'))throw Error('结算后次数错误 '+next);
 await page.screenshot({path:'output/playwright/horde-growth/second-entry.png'});await page.locator('#camp-primary').click();
 await page.waitForFunction(async()=>(await import('/src/main.js')).application.game.state==='playing');
 const second=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;g.attackTimer=999;g.vehicle.module.cooldown=999;g.campDefense.timer=0;(await import('/src/core/camp/camp-defense.js')).updateCampDefense(g,.01);return {hp:g.enemies[0].maxHp,damage:g.enemies[0].damage,rounds:g.campDefense.rounds,runs:g.progress.campDefense.runs};});
 if(second.hp!==28||second.rounds!==1||second.runs!==1)throw Error('下一场成长错误 '+JSON.stringify(second));
 for(const phase of ['day','night']){
  await page.evaluate(async phase=>{const a=(await import('/src/main.js')).application,g=a.game,r=g.campDefense;
   g.state='playing';g.enemies=[];Object.assign(r,{wave:10,waveKills:0,spawned:0,timer:0});g.attackTimer=g.vehicle.module.cooldown=999;
   const core=await import('/src/core/camp/camp-defense.js');for(let i=0;i<25;i++)core.updateCampDefense(g,.17);
   g.pause();const timing=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase);g.progress.living.calendar={day:1,elapsed:timing.start+timing.duration/2};
   (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);a.environment.weather='sun';a.environment.autoWeather=false;a.refresh();
  },phase);await page.waitForTimeout(16000);
  for(const width of [320,390,1280]){
   await page.setViewportSize({width,height:900});await page.locator('#resume').click();await page.waitForTimeout(250);
   const sample=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game,review=(await import('/src/rendering/visual-review.js')).inspectCampDefense(g,document);return {...review,phase:a.environment.time,night:a.renderer.light.sample(performance.now()).night,overlay:!document.getElementById('overlay').hidden,vehicle:g.vehicle.active,hp:g.enemies.find(e=>e.hp>0)?.maxHp};});
   if(sample.overflow||sample.overlappingHud||sample.overlay||!sample.vehicle||sample.phase!==phase||Math.abs(sample.night-Number(phase==='night'))>.01||sample.hp!==32)throw Error('同屏验收失败 '+JSON.stringify(sample));
   samples.push({width,...sample});await page.screenshot({path:`output/playwright/horde-growth/${width}-${phase}.png`});
   await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;if(a.game.state==='playing')a.game.pause();a.refresh();});
  }
 }
// 详情显示持久场次，在窄屏与桌面检查新增中文文案的换行和边界。
 await page.locator('#resume').click();await page.locator('#camp-help').click();await page.locator('#camp-defense-dialog').waitFor({state:'visible'});
 const details=[];
 for(const width of [320,1280]){
  await page.setViewportSize({width,height:900});
  const detail=await page.locator('#camp-defense-dialog').evaluate(node=>({text:node.textContent,overflow:node.scrollWidth>node.clientWidth+1,left:node.getBoundingClientRect().left,right:node.getBoundingClientRect().right}));
  if(!detail.text.includes('第 2 次兽潮 · 已结算 1 次')||detail.overflow||detail.left<0||detail.right>width+1)throw Error('场次详情换行或边界错误 '+JSON.stringify(detail));
  details.push({width,...detail});await page.screenshot({path:`output/playwright/horde-growth/details-${width}.png`});
 }
 if(errors.length)throw Error(errors.join(';'));return {entry,opening,combat,boss,next,second,samples,details,errors};
}
