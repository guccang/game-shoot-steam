// 共用绘制器补验：施工、候门、出门和最窄屏试射，沿用主验收已启动的正式应用。
async page=>{
 if(new URL(page.url()).port!=='4281')throw Error('仅限隔离端口4281');
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(()=>{window.countdownTick=a.game.update.bind(a.game);a.game.update=()=>{};a.game.enemies=[];a.game.vehicle.active=false;a.game.cottage=null;a.game.parking=null;a.game.mainlineSpeech=null;});
 for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async phase=>{const g=a.game;Object.assign(g.player,{x:500,y:650});Object.assign(g.progress.arrival,{phase:'repairing',elapsed:2.2});g.progress.living.calendar.elapsed=phase==='night'?260000:75000;g.arrivalScene=null;a.environment.time=phase==='day'?'night':'day';},phase);
  await page.waitForFunction(phase=>a.environment.time===phase,phase);
  await page.evaluate(async()=>{a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.renderer.draw();a.refresh();});
  await page.screenshot({path:`output/playwright/trial-manual-close-countdown/build-${width}-${phase}.png`});
  await page.evaluate(async()=>{const g=a.game,{COTTAGE}=await import('/src/config/cottage.js');g.progress.arrival.phase='complete';Object.assign(g.player,COTTAGE.door);g.cottageEntry=1.5;a.renderer.camera.time=null;a.renderer.draw();a.refresh();});
  await page.screenshot({path:`output/playwright/trial-manual-close-countdown/entry-${width}-${phase}.png`});
  await page.evaluate(async()=>{const g=a.game,{COTTAGE}=await import('/src/config/cottage.js');if(!(await import('/src/core/home/cottage.js')).enterCottage(g))throw Error('进入小屋失败');Object.assign(g.player,COTTAGE.exit);g.cottage.exitElapsed=1.5;a.renderer.draw();a.refresh();});
  await page.screenshot({path:`output/playwright/trial-manual-close-countdown/exit-${width}-${phase}.png`});
  await page.locator('#cottage-exit').click();checks.push({width,phase,build:true,entry:true,exit:true});
 }
 // 320 宽下由真实试射按钮启动，再用键盘主动结束；主线报告不能抢先关窗。
 await page.evaluate(async()=>{const g=a.game,{MAINLINE_IDS}=await import('/src/config/mainline.js');g.progress.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('pistol-parts'));g.progress.mainline.phase='report';g.progress.mainline.seen.trial=1;a.workshop.open('weapons',0);a.refresh();});
 await page.locator('#ws-test').click();await page.locator('#ws-trial').waitFor({state:'visible'});await page.waitForTimeout(1500);
 await page.screenshot({path:'output/playwright/trial-manual-close-countdown/trial-320.png'});
 const bounds=await page.locator('#ws-trial-stop').boundingBox();if(bounds.x<0||bounds.x+bounds.width>320)throw Error('试射结束按钮超出屏幕');
 await page.locator('#ws-trial-stop').focus();await page.keyboard.press('Enter');await page.locator('#ws-trial').waitFor({state:'hidden'});
 await page.locator('#ws-close').click();checks.push({mobileTrial:'键盘主动结束，未自动关窗'});
 // 挑战结算也使用同一奖励外壳，徽记保持位于卡片上方。
 await page.evaluate(async()=>{const challenge=(await import('/src/config/economy.js')).challengeProgress({...a.game.progress,bosses:1});a.game.onEvent('task-reward',{title:'清缴完成',reward:{coins:300},challenge:{...challenge,previousTier:0}});});
 await page.locator('#task-reward-dialog').waitFor({state:'visible'});await page.screenshot({path:'output/playwright/trial-manual-close-countdown/challenge-320.png'});
 const layout=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectActionCountdown(document));if(layout.badge.bottom>=layout.panel.top||layout.overflow)throw Error('挑战结算徽记布局错误');
 if(await page.locator('#operation-guide').isVisible())throw Error('主线提示遮挡奖励倒计时');
 await page.locator('#task-reward-close').click();await page.evaluate(()=>{a.game.update=window.countdownTick;});
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'trial-manual-close-countdown',checks,errors};
}
