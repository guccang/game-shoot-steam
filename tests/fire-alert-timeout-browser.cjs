// 火警图标实机验收：正式十秒计时、真实点击和暂停、刷新及昼夜多尺寸显示。
async page=>{
 if(new URL(page.url()).port!=='4280')throw Error('仅限隔离验收端口4280');
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true,parked:false};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.locator('#start').click();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.spawnTimer=g.fireClock=999;Object.assign(g.player,{x:1460,y:1170});});
 // 不修改时间或剩余秒数，等待正式游戏模拟自动收起。
 await page.evaluate(()=>{window.offerStarted=performance.now();if(!a.game.requestFireRescue('random'))throw Error('火警创建失败');a.refresh();});
 await page.locator('.fire-alert-icon').waitFor({state:'visible'});
 if(await page.locator('#fire-notice [data-fire-dismiss]').count())throw Error('仍有必须点击的拒绝按钮');
 await page.screenshot({path:'output/playwright/fire-alert-icon-timeout/start.png'});
 await page.waitForFunction(()=>!a.game.fireRescue,{},{timeout:20000});
 const elapsed=await page.evaluate(()=>performance.now()-window.offerStarted);
 if(elapsed<9900||elapsed>16000)throw Error('十秒自动关闭时长异常 '+elapsed);
 await page.locator('#fire-notice').waitFor({state:'hidden'});
 if(!await page.evaluate(()=>!a.game.progress.fireDispatch.run&&a.game.fireClock>100))throw Error('过期未清理或进入冷却');
 checks.push({automaticCloseMs:elapsed});await page.screenshot({path:'output/playwright/fire-alert-icon-timeout/closed.png'});
 // 点火警进入详情后正常暂停，跨过十秒仍保留决定；关闭后继续原余时。
 await page.evaluate(()=>{a.game.requestFireRescue('random');a.refresh();});await page.waitForTimeout(1200);
 await page.locator('#fire-notice [data-fire-open]').click();await page.locator('#fire-dialog').waitFor({state:'visible'});
 const remaining=await page.evaluate(()=>a.game.fireRescue.offerRemaining);await page.waitForTimeout(10500);
 if(!await page.evaluate(before=>a.game.fireRescue?.phase==='offered'&&a.game.state==='paused'&&a.game.fireRescue.offerRemaining===before,remaining))throw Error('详情被计时误关');
 await page.locator('#fire-dialog [data-fire-accept]').click();await page.locator('#fire-dialog').waitFor({state:'hidden'});
 if(!await page.evaluate(()=>a.game.fireActive&&a.game.fireRescue.phase!=='offered'))throw Error('接受没有开始救援');
 await page.waitForFunction(()=>!document.querySelector('#fire-notice').classList.contains('fire-notice-alert'));
 checks.push({detailPausedSeconds:remaining,accepted:true});await page.screenshot({path:'output/playwright/fire-alert-icon-timeout/accepted.png'});
 // 结束测试救援后新建邀请，保存剩余四秒并刷新，确认不重置为十秒。
 await page.evaluate(async()=>{const g=a.game;for(let i=0;i<4000&&g.fireTransit;i++)(await import('/src/core/activities/fire-rescue.js')).updateFireRescue(g,.05);if(!g.dismissFireRescue())throw Error('测试救援无法结束');g.requestFireRescue('random');(await import('/src/core/activities/fire-rescue.js')).updateFireRescue(g,6);a.save();});
 await page.reload();await page.locator('#start').click();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;window.savedFireTick=a.game.update.bind(a.game);a.game.update=()=>{};a.game.mainlineSpeech=null;a.game.mainlineTalkDelay=999;});
 const restored=await page.evaluate(()=>a.game.fireRescue?.offerRemaining);if(!(restored>3&&restored<=4))throw Error('刷新后余时错误 '+restored);checks.push({restored});
 // 画面采样冻结模拟，不改变正式图标、角色、载具或场景绘制入口。
 for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(async phase=>{const g=a.game;g.fireRescue.offerRemaining=10;Object.assign(g.player,{x:1460,y:1170});g.vehicle.active=true;g.enemies=[];const e=g.spawnEnemy(0,0,{x:1570,y:1230},{ambient:true});Object.assign(e,{speed:0,damage:0});g.numbers=[];g.progress.living.calendar.elapsed=phase==='night'?260000:75000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.renderer.draw();a.refresh();},phase);await page.waitForTimeout(200);
  const s=await page.evaluate(async()=>{const state=(await import('/src/rendering/visual-review.js')).inspectFireAlert(a.game,document),rect=state.rect;const overlaps=[...document.querySelectorAll('#player-hud,#mobile-menu-toggle,#vehicle-button')].filter(n=>!n.hidden&&n.getBoundingClientRect().width>0).filter(n=>{const b=n.getBoundingClientRect();return b.left<rect.right&&b.right>rect.left&&b.top<rect.bottom&&b.bottom>rect.top;}).map(n=>n.id);return {...state,overlaps};});
  if(!s.icon||s.dismiss||s.countdown!=='10'||s.rect.width>80||s.rect.width<44||s.rect.left<0||s.rect.right>width||s.overflow||s.overlaps.length)throw Error('火警图标布局错误 '+JSON.stringify(s));
  await page.screenshot({path:`output/playwright/fire-alert-icon-timeout/icon-${width}-${phase}.png`});checks.push({width,phase,...s});
 }
 // 最窄屏实际点击仍能查看详情，手动关闭后倒计时继续。
 await page.locator('#fire-notice [data-fire-open]').click();await page.locator('#fire-dialog').waitFor({state:'visible'});await page.screenshot({path:'output/playwright/fire-alert-icon-timeout/detail-320.png'});await page.locator('#fire-dialog .fire-dialog-head [data-fire-close]').click();
 await page.evaluate(()=>{a.game.update=window.savedFireTick;a.game.fireRescue.offerRemaining=.2;});await page.waitForFunction(()=>!a.game.fireRescue);checks.push({closeThenExpire:true});
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'fire-alert-icon-timeout',checks,errors};
}
