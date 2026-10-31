// 奖励面板实机验收：正式主线交付、邻里结算、三秒关闭、队列与昼夜小屏。
async page=>{
 if(new URL(page.url()).port!=='4270')throw Error('仅限隔离验收端口4270');
 const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true,parked:false};p.mainline.phase='report';p.mainline.seen.map=1;p.mainline.distance=80;localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.locator('#start').click();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;g.enemies=[];g.spawnTimer=999;g.fireClock=999;Object.assign(g.player,{x:1030,y:850,vx:0,vy:0});g.mainlineSpeech={id:'first-map',phase:'report',elapsed:0,paused:true};a.renderer.camera.time=null;a.refresh();});
 await page.setViewportSize({width:390,height:844});
 await page.locator('.mainline-begin').click();await page.locator('#task-reward-dialog').waitFor({state:'visible'});
 const started=Date.now(),text=await page.locator('#task-reward-items').innerText();if(!text.includes('+60')||!text.includes('+20'))throw Error('主线到账数额不符：'+text);
 if(await page.locator('#task-reward-countdown').getAttribute('data-seconds')!=='3')throw Error('未从3秒开始');
 await page.screenshot({path:'output/playwright/task-reward/mainline.png'});
 await page.waitForFunction(()=>document.querySelector('#task-reward-countdown').dataset.seconds==='1');
 await page.locator('#task-reward-dialog').waitFor({state:'hidden',timeout:5000});const elapsed=Date.now()-started;
 if(elapsed<2600||elapsed>4300||!await page.evaluate(()=>a.game.state==='playing'))throw Error('自动关闭或恢复失败：'+elapsed);
 results.push({mainline:text,autoCloseMs:elapsed});
 // 邻里最后一步由正式面板点击，奖励覆盖当前对白但不会错误恢复底层暂停。
 await page.evaluate(async()=>{const g=a.game,{MAINLINE_IDS}=await import('/src/config/mainline.js');g.progress.mainline.completed=[...MAINLINE_IDS];g.progress.mainline.phase='complete';g.mainlineSpeech=null;
  const {LIVING_REQUESTS}=await import('/src/config/living-world.js'),{livingRequestTarget}=await import('/src/core/living-world.js'),spec=LIVING_REQUESTS[0];g.progress.living.requests[spec.id].stage=spec.steps.length-1;g.progress.taskTracking={kind:'living',id:spec.id};Object.assign(g.player,livingRequestTarget(g,spec),{vx:0,vy:0});a.renderer.camera.time=null;});
 await page.locator('#living-dialog').waitFor({state:'visible'});await page.locator('[data-living-do="neighbors-lunch"]').click();
 await page.locator('#task-reward-dialog').waitFor({state:'visible'});if(!(await page.locator('#task-reward-items').innerText()).includes('+300'))throw Error('邻居奖励遗漏');
 await page.locator('#task-reward-dialog').waitFor({state:'hidden',timeout:5000});
 if(!await page.evaluate(()=>document.querySelector('#living-dialog').open&&a.game.state==='paused'))throw Error('底层邻里对话被提前恢复');
 await page.locator('#living-close').click();await page.waitForFunction(()=>a.game.state==='playing');results.push({living:'实领奖励、嵌套弹窗暂停正确'});
 // 连续到达的通知各有三秒，不覆盖上一份；展示本身不能改钱包。
 const wallet=await page.evaluate(()=>{const g=a.game;g.onEvent('task-reward',{title:'队列一',reward:{coins:12}});g.onEvent('task-reward',{title:'队列二',reward:{wood:8}});return g.progress.coins;});
 await page.waitForFunction(()=>document.querySelector('#task-reward-title').textContent==='队列一'&&document.querySelector('#task-reward-dialog').open);
 await page.waitForFunction(()=>document.querySelector('#task-reward-title').textContent==='队列二',null,{timeout:5000});
 if(await page.locator('#task-reward-countdown').getAttribute('data-seconds')!=='3')throw Error('第二份计时未重置');
 await page.keyboard.press('Escape');await page.locator('#task-reward-dialog').waitFor({state:'hidden'});if(!await page.evaluate(wallet=>a.game.progress.coins===wallet&&a.game.state==='playing',wallet))throw Error('展示影响钱包或暂停');
 // 六种画面使用正式渲染与资源图标，不为截图绘制替代场景。
 for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(async phase=>{const g=a.game;Object.assign(g.player,{x:500,y:740,vx:0,vy:0});g.progress.living.calendar.elapsed=phase==='night'?220000:1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);g.vehicle=g.vehicles[0];g.progress.vehicleHulls[0]=1;g.vehicle.active=true;g.enemies=[];const e=g.spawnEnemy(0,900);Object.assign(e,{x:g.player.x+120,y:g.player.y+70,speed:0});a.renderer.camera.time=null;a.renderer.draw();g.onEvent('task-reward',{title:'邻居的谢礼',reward:{coins:300,wood:80,parts:12},equipment:[{kind:'vehicle',index:3}]});},phase);
  await page.locator('#task-reward-dialog').waitFor({state:'visible'});await page.screenshot({path:`output/playwright/task-reward/reward-${width}-${phase}.png`});
  const bounds=await page.locator('#task-reward-dialog').boundingBox();if(bounds.x<0||bounds.y<0||bounds.x+bounds.width>width||bounds.y+bounds.height>height)throw Error('奖励面板超出屏幕');
  await page.locator('#task-reward-close').click();await page.locator('#task-reward-dialog').waitFor({state:'hidden'});
 }
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'task-reward-popup',results,errors};
}
