// 战场累计次数验收：正式HUD、双环、领取续档及真实移动射击，保留昼夜同屏证据。
async page=>{
 if(new URL(page.url()).port!=='4283')throw Error('仅允许4283隔离端口');
 const errors=[],states=[],samples=[];page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application;a.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();
  p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS;p.mainline.phase='complete';p.campDefense.runs=9;
  p.weapon=2;p.weapons[2]=5;p.heroes[0]=5;p.vehicleIndex=0;p.vehicleHulls[0]=5;p.vehicleWeapons[17]=5;p.vehicleLoadouts[0]=17;
  const gate=(await import('/src/config/camp-defense.js')).CAMP_GATES[0];p.living.position={x:gate.x,y:gate.y+50};
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.setViewportSize({width:390,height:900});await page.locator('#start').click();
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;const g=a.game;g.mainlineSpeech=null;g.mainlineTalkDelay=99999;
  Object.assign(g.player,(await import('/src/core/vehicles/camp-parking.js')).vehicleParkingSite(g,0));if(!g.summonVehicle())throw Error('上车失败');Object.assign(g.player,(await import('/src/config/camp-defense.js')).CAMP_GATES[0]);a.refresh();});
 await page.locator('[data-camp-gate="top"]').dispatchEvent('click',{detail:0});await page.locator('#camp-primary').click();
 await page.waitForFunction(async()=>(await import('/src/main.js')).application.game.state==='playing');
 // 状态边界采样临时冻结战斗输入；正式调度、文本与圆环仍由原实现计算。
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;window.hordeHudUpdate=a.game.update;a.game.update=()=>{};a.game.campDefense.timer=3;a.refresh();});
 // 正式审核入口读取累计次数、子项边界和双环，避免隐藏文本通过验收。
 async function inspect(label,expected){
  const s=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,v=await import('/src/rendering/visual-review.js');return {...v.inspectCompactHordeHud(document),phase:a.environment.time,night:a.renderer.light.sample(performance.now()).night,visible:!document.getElementById('camp-defense-hud').hidden,vehicle:a.game.vehicle.active};});
  if(s.hud.height>48||s.overflow||s.completedOverflow||s.completed!==expected||s.completedLabel!==`已完成兽潮${expected}次`||(s.visible&&(s.completedBox.width<=0||s.completedBox.height<=0)))throw Error('累计显示或布局错误 '+JSON.stringify(s));
  if(s.order.join(',')!=='camp-hp,camp-boss,camp-wave-status,camp-help'||s.items.some(b=>b.left<s.hud.left||b.right>s.hud.right+1))throw Error('排列或边界错误');
  states.push({label,...s});return s;
 }
 let s=await inspect('首帧',9);if(s.wave!=='1'||s.time!==0||s.kills!==0)throw Error('初始波次错误');
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;(await import('/src/core/camp/camp-defense.js')).updateCampDefense(a.game,1.5);a.refresh();});
 s=await inspect('等待半程',9);if(s.timeOffset!==50||s.killOffset!==100)throw Error('双环等待错误');
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.state='paused';(await import('/src/core/camp/camp-defense.js')).updateCampDefense(a.game,2);a.refresh();});
 s=await inspect('暂停',9);if(s.timeOffset!==50)throw Error('暂停推进计时');
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game,c=await import('/src/core/camp/camp-defense.js');g.state='playing';g.campDefense.timer=0;
  for(let i=0;i<200&&g.campDefense.waveKills<16;i++){c.updateCampDefense(g,.2);for(const e of g.enemies)if(e.hp>0&&g.campDefense.waveKills<16)g.hit(e,e.hp);}a.refresh();});
 s=await inspect('清怪半程',9);if(s.killOffset!==50||s.kills!==16)throw Error('清怪环进度错误');
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game,c=await import('/src/core/camp/camp-defense.js');
  for(let i=0;i<200&&g.campDefense.wave===1;i++){c.updateCampDefense(g,.2);for(const e of g.enemies)if(e.hp>0)g.hit(e,e.hp);}a.refresh();});
 s=await inspect('实际清完第一波',9);if(s.wave!=='2'||s.kills!==0||s.killOffset!==100)throw Error('换波与次数混淆');
 await page.setViewportSize({width:320,height:900});
 for(const completed of [0,10,999999]){
  await page.evaluate(async completed=>{const a=(await import('/src/main.js')).application;a.game.progress.campDefense.runs=completed;a.refresh();},completed);
  await inspect('数字宽度'+completed,completed);if(completed===999999)await page.screenshot({path:'output/playwright/horde-completed-hud/max-count.png'});
 }
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.progress.campDefense.runs=9;g.update=window.hordeHudUpdate;g.attackTimer=g.vehicle.module.cooldown=0;a.refresh();});
 const before=await page.evaluate(async()=>(await import('/src/main.js')).application.game.player.x);
 await page.keyboard.down('KeyD');await page.waitForTimeout(400);await page.keyboard.up('KeyD');await page.waitForTimeout(5000);
 const combat=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return {x:g.player.x,kills:g.campDefense.kills,state:g.state};});
 if(combat.state!=='playing'||combat.kills<=32||Math.abs(combat.x-before)<5)throw Error('实际射击或移动失败 '+JSON.stringify(combat));
 for(const phase of ['day','night']){
  await page.evaluate(async phase=>{const a=(await import('/src/main.js')).application,g=a.game,r=g.campDefense;
   g.state='playing';g.enemies=[];Object.assign(r,{wave:5,waveKills:0,spawned:0,timer:0});g.attackTimer=g.vehicle.module.cooldown=999;
   const core=await import('/src/core/camp/camp-defense.js');for(let i=0;i<24;i++)core.updateCampDefense(g,.17);
   g.pause();const timing=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase);g.progress.living.calendar={day:1,elapsed:timing.start+timing.duration/2};
   (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);a.environment.weather='sun';a.environment.autoWeather=false;a.refresh();
  },phase);await page.waitForTimeout(16000);
  for(const width of [320,390,1280]){
   await page.setViewportSize({width,height:900});await page.locator('#resume').click();await page.waitForTimeout(250);
   const sample=await inspect(phase+'-'+width,9);if(!sample.visible||!sample.vehicle||sample.phase!==phase||Math.abs(sample.night-Number(phase==='night'))>.01)throw Error('昼夜现场不完整');
   samples.push({width,...sample});await page.screenshot({path:`output/playwright/horde-completed-hud/${width}-${phase}.png`});
   await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;if(a.game.state==='playing')a.game.pause();a.refresh();});
  }
 }
 await page.setViewportSize({width:390,height:900});await page.locator('#resume').click();
 // 用实际触摸点击问号，验证新增文本不挤占原详情按钮。
 const help=await page.locator('#camp-help').boundingBox(),touch=await page.context().newCDPSession(page);
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:help.x+help.width/2,y:help.y+help.height/2}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
 await page.locator('#camp-defense-dialog').waitFor({state:'visible'});await page.locator('#camp-close').click();await page.waitForFunction(async()=>(await import('/src/main.js')).application.game.state==='playing');
 // 末波检查点验证领奖前不加次数，真实领取后下一场更新到十次。
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game,r=g.campDefense;g.enemies=[];Object.assign(r,{wave:10,waveKills:86,spawned:86,kills:590,timer:0});(await import('/src/core/camp/camp-defense.js')).updateCampDefense(g,.01);g.pause();a.refresh();});
 s=await inspect('领主尚未结算',9);if(s.wave!=='10'||s.boss!=='active')throw Error('领主波次错误');await page.screenshot({path:'output/playwright/horde-completed-hud/boss.png'});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.state='playing';a.game.hit(a.game.boss,a.game.boss.hp);a.refresh();});
 await page.locator('.camp-grade').waitFor({state:'visible'});await inspect('待领奖不加次数',9);await page.locator('#camp-primary').click();
 await page.locator('#task-reward-dialog').waitFor({state:'visible'});await page.locator('#task-reward-close').click();await page.waitForFunction(async()=>(await import('/src/main.js')).application.game.state==='playing');
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;Object.assign(a.game.player,(await import('/src/config/camp-defense.js')).CAMP_GATES[0]);a.refresh();});
 await page.locator('[data-camp-gate="top"]').dispatchEvent('click',{detail:0});await page.locator('#camp-primary').click();await page.waitForFunction(async()=>(await import('/src/main.js')).application.game.state==='playing');
 await inspect('下一场已完成十次',10);
 await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;(await import('/src/core/camp/camp-defense.js')).syncCampDefense(g);localStorage.setItem('forest-patrol-v1',JSON.stringify(g.progress));});
 await page.reload();await page.locator('#start').click();await page.evaluate(async()=>{await (await import('/src/main.js')).application.ready;});await page.locator('#camp-defense-hud').waitFor({state:'visible'});
 s=await inspect('续档仍为十次',10);await page.screenshot({path:'output/playwright/horde-completed-hud/restored.png'});
 if(errors.length)throw Error(errors.join(';'));return {states,samples,combat,errors};
}
