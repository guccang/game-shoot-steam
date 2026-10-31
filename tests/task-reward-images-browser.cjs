// 奖励装备画像实机验收：仅在隔离端口覆盖目录、三秒关闭与昼夜小屏。
async page=>{
 if(new URL(page.url()).port!=='4271')throw Error('仅限隔离验收端口4271');
 const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true,parked:false};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.locator('#start').click();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;g.enemies=[];g.spawnTimer=999;g.fireClock=999;Object.assign(g.player,{x:500,y:740,vx:0,vy:0});});
 // 每种装备走正式奖励事件与弹窗画像，不另造预览画布绕过界面。
 const catalog=await page.evaluate(async()=>[...(await import('/src/config/weapons.js')).WEAPONS.map((w,index)=>({kind:'weapon',index,name:w.name})),...(await import('/src/config/vehicles.js')).COLLECTED_VEHICLES.map((v,index)=>({kind:'vehicle',index,name:v.name}))]);
 for(const item of catalog){
  await page.evaluate(item=>a.game.onEvent('task-reward',{title:'装备谢礼',equipment:[item]}),item);
  await page.locator('#task-reward-dialog').waitFor({state:'visible'});
  const portrait=await page.locator('.task-reward-portrait').evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let pixels=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)pixels++;return {pixels,label:c.getAttribute('aria-label'),width:c.width,height:c.height};});
  if(portrait.pixels<100||portrait.label!==item.name+'图片'||portrait.width!==220||portrait.height!==170)throw Error('装备画像缺失：'+item.name);
  if(!(await page.locator('#task-reward-items').innerText()).includes(item.name))throw Error('图片名称不匹配');
  results.push({...item,...portrait});
  await page.locator('#task-reward-close').click();await page.locator('#task-reward-dialog').waitFor({state:'hidden'});
 }
 // 正式世界的角色、载具、怪物及地形保留在奖励面板后方，分别采样昼夜。
 for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(async phase=>{const g=a.game;Object.assign(g.player,{x:500,y:740,vx:0,vy:0});g.progress.living.calendar.elapsed=phase==='night'?220000:1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);g.vehicle=g.vehicles[0];g.progress.vehicleHulls[0]=1;g.vehicle.active=true;g.enemies=[];const e=g.spawnEnemy(0,900);Object.assign(e,{x:g.player.x+120,y:g.player.y+70,speed:0});a.renderer.camera.time=null;a.renderer.draw();g.onEvent('task-reward',{title:'邻居的谢礼',reward:{coins:300},equipment:[{kind:'weapon',index:1},{kind:'vehicle',index:3}]});},phase);
  await page.locator('#task-reward-dialog').waitFor({state:'visible'});
  await page.screenshot({path:`output/playwright/task-reward-images/reward-${width}-${phase}.png`});
  const fits=await page.locator('#task-reward-dialog').evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&n.scrollWidth<=n.clientWidth&&[...n.querySelectorAll('canvas,li span,li strong,footer')].every(e=>{const b=e.getBoundingClientRect();return b.left>=r.left&&b.right<=r.right&&b.bottom<=r.bottom;});});
  if(!fits)throw Error('图片、名称或倒计时超出屏幕：'+width+phase);
  await page.locator('#task-reward-close').click();await page.locator('#task-reward-dialog').waitFor({state:'hidden'});
 }
 // 图片同步完成绘制，不推迟三秒可见倒计时，也不改变钱包。
 const wallet=await page.evaluate(()=>{const g=a.game;g.onEvent('task-reward',{title:'武器谢礼',equipment:[{kind:'weapon',index:12}]});return g.progress.coins;});
 await page.locator('#task-reward-dialog').waitFor({state:'visible'});const started=Date.now();
 if(await page.locator('#task-reward-countdown').getAttribute('data-seconds')!=='3')throw Error('起始倒计时错误');
 await page.locator('#task-reward-dialog').waitFor({state:'hidden',timeout:5000});const elapsed=Date.now()-started;
 if(elapsed<2600||elapsed>4300||!await page.evaluate(wallet=>a.game.state==='playing'&&a.game.progress.coins===wallet,wallet))throw Error('三秒关闭、恢复或钱包异常');
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'task-reward-popup',catalog:results,autoCloseMs:elapsed,screenshots:6,errors};
}
