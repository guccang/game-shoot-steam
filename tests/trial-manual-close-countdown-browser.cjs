// 正式试射命中后的自主退出，以及共用徽记的真实计时与多尺寸昼夜验收。
async page=>{
 if(new URL(page.url()).port!=='4281')throw Error('仅限隔离端口4281');
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1280,height:800});
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress(),{MAINLINE_IDS}=await import('/src/config/mainline.js');p.arrival={version:2,phase:'complete',keys:true,parked:false};p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('pistol-parts'));p.mainline.phase='doing';p.weaponParts[0].capacity=p.weaponParts[0].reload=2;localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.enemies=[];g.spawnTimer=g.fireClock=999;Object.assign(g.player,{x:1350,y:1050});a.workshop.open('weapons',0);a.refresh();});
 await page.locator('#ws-test').click();await page.locator('#ws-trial').waitFor({state:'visible'});
 await page.waitForFunction(()=>a.game.progress.mainline.seen.trial===1,null,{timeout:20000});
 const before=await page.locator('#ws-trial-time').innerText();await page.waitForTimeout(4500);
 if(!await page.locator('#ws-trial').isVisible()||!await page.locator('#workshop-dialog').isVisible())throw Error('击毁靶子后试射被自动关闭');
 const after=await page.locator('#ws-trial-time').innerText();if(before===after)throw Error('达标后试射停止运行');
 if(!(await page.locator('.operation-tip').innerText()).includes('可继续体验'))throw Error('未明确提示自主结束');
 await page.screenshot({path:'output/playwright/trial-manual-close-countdown/trial-earned.png'});
 await page.locator('#ws-trial-stop').click();await page.locator('#ws-trial').waitFor({state:'hidden'});await page.waitForTimeout(1300);
 if(!await page.locator('#workshop-dialog').isVisible())throw Error('结束试射后仍强制关闭工坊');
 await page.locator('#ws-close').click();await page.locator('#workshop-dialog').waitFor({state:'hidden'});
 checks.push({trial:'正式命中后持续运行，手动结束及关闭工坊',before,after});
 // 三秒自动关闭从正式奖励事件启动；徽记在卡片外，连续收据各自重新计时。
 await page.evaluate(async()=>{const g=a.game;g.progress.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];g.progress.mainline.phase='complete';g.mainlineSpeech=null;g.onEvent('task-reward',{title:'第一份谢礼',reward:{coins:20}});g.onEvent('task-reward',{title:'第二份谢礼',equipment:[{kind:'vehicle',index:3}]});});
 await page.locator('#task-reward-dialog').waitFor({state:'visible'});const started=Date.now();
 const first=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectActionCountdown(document));
 if(first.seconds!=='3'||first.badge.bottom>=first.panel.top)throw Error('徽记未位于卡片正上方 '+JSON.stringify(first));
 await page.waitForFunction(()=>document.querySelector('#task-reward-countdown').dataset.seconds==='1');
 await page.screenshot({path:'output/playwright/trial-manual-close-countdown/reward-last-second.png'});
 await page.waitForFunction(()=>document.querySelector('#task-reward-title').textContent==='第二份谢礼');const elapsed=Date.now()-started;
 if(elapsed<2600||elapsed>4300)throw Error('奖励三秒计时异常 '+elapsed);
 if(await page.locator('#task-reward-countdown').getAttribute('data-seconds')!=='3')throw Error('下一份未重新计时');
 await page.locator('#task-reward-close').click();await page.waitForFunction(()=>a.game.state==='playing');checks.push({rewardAutoCloseMs:elapsed,queueReset:true});
 // 火警使用自己的十秒时钟，点开详情暂停，返回继续；徽记不增设独立计时。
 await page.evaluate(()=>{Object.assign(a.game.player,{x:1460,y:1170});a.game.requestFireRescue('random');a.refresh();});
 await page.waitForFunction(()=>Number(document.querySelector('[data-fire-countdown]').dataset.seconds)<=9);
 await page.locator('#fire-notice [data-fire-open]').click();const remaining=await page.evaluate(()=>a.game.fireRescue.offerRemaining);await page.waitForTimeout(1500);
 if(!await page.evaluate(r=>a.game.fireRescue.offerRemaining===r,remaining))throw Error('查看详情时火警计时仍推进');
 await page.locator('#fire-dialog .fire-dialog-head [data-fire-close]').click();await page.waitForFunction(()=>!a.game.fireRescue,null,{timeout:15000});checks.push({firePausedRemaining:remaining,fireAutoClosed:true});
 // 仅冻结世界模拟取样；全部画面仍使用正式人物、载具、怪物与界面绘制器。
 await page.evaluate(()=>{window.savedTick=a.game.update.bind(a.game);a.game.update=()=>{};});
 for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(async phase=>{const g=a.game;Object.assign(g.player,{x:1460,y:1170});g.cottage=null;g.vehicle.active=true;g.enemies=[];const e=g.spawnEnemy(0,0,{x:1570,y:1230},{ambient:true});Object.assign(e,{speed:0,damage:0});g.progress.living.calendar.elapsed=phase==='night'?260000:75000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);g.requestFireRescue('random');g.fireRescue.offerRemaining=6.5;g.parking={phase:'waiting',elapsed:1.5};a.renderer.camera.time=null;a.renderer.draw();a.refresh();a.environment.time=phase==='day'?'night':'day';},phase);
  await page.waitForTimeout(150);
  await page.screenshot({path:`output/playwright/trial-manual-close-countdown/world-${width}-${phase}.png`});
  const fire=await page.locator('#fire-notice').boundingBox();if(fire.x<0||fire.x+fire.width>width)throw Error('火警越界');
  await page.evaluate(()=>a.game.onEvent('task-reward',{title:'邻居的谢礼',reward:{coins:300,wood:80,parts:12},equipment:[{kind:'weapon',index:0},{kind:'vehicle',index:3}]}));
  await page.locator('#task-reward-dialog').waitFor({state:'visible'});
  const view=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectActionCountdown(document));
  if(view.overflow||view.badge.top<0||view.badge.bottom>=view.panel.top||view.panel.bottom>height||view.panel.left<0||view.panel.right>width)throw Error('奖励位置或滚动异常 '+JSON.stringify(view));
  await page.screenshot({path:`output/playwright/trial-manual-close-countdown/reward-${width}-${phase}.png`});
  await page.locator('#task-reward-close').click();
  // 小屋床边采用同一个徽记，底部仅保留取消提示，不叠加第二个文字秒数。
  await page.evaluate(async()=>{const g=a.game;g.dismissFireRescue();g.vehicle.active=false;g.parking=null;const {COTTAGE}=await import('/src/config/cottage.js');Object.assign(g.player,COTTAGE.door);if(!(await import('/src/core/cottage.js')).enterCottage(g))throw Error('未能进入小屋');Object.assign(g.player,COTTAGE.bed);g.cottage.restElapsed=1.5;a.renderer.draw();a.refresh();});
  await page.screenshot({path:`output/playwright/trial-manual-close-countdown/cottage-${width}-${phase}.png`});
  if((await page.locator('#cottage-notice').innerText()).includes('倒计时'))throw Error('还在页面里显示文字倒计时');
  await page.locator('#cottage-exit').click();checks.push({width,phase,badgeAbovePanel:true,panelBottom:view.panel.bottom});
 }
 await page.evaluate(()=>{a.game.update=window.savedTick;});
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'trial-manual-close-countdown',checks,errors};
}
