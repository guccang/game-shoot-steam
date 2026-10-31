// 面板阅读保留验收：正式事件、真实鼠标/触屏/键盘输入及队列恢复，不跳过关闭时钟。
async page=>{
 if(new URL(page.url()).port!=='4285')throw Error('仅限隔离端口4285');
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true,parked:false};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.locator('#start').click();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;a.game.enemies=[];a.game.spawnTimer=a.game.fireClock=999;Object.assign(a.game.player,{x:500,y:740});});
 const dialog=page.locator('#task-reward-dialog'),badge=page.locator('#task-reward-countdown');
 // 通知只提供已经到账的快照；显示过程不能改变钱包。
 const show=async(title)=>{await page.evaluate(title=>a.game.onEvent('task-reward',{title,reward:{coins:20},equipment:[{kind:'weapon',index:0}]}),title);await dialog.waitFor({state:'visible'});};
 const wallet=await page.evaluate(()=>a.game.progress.coins);
 await show('未操作仍自动关闭');const started=Date.now();await dialog.waitFor({state:'hidden',timeout:5000});
 if(Date.now()-started<2600)throw Error('未满三秒即关闭');checks.push('自动聚焦不取消原有三秒关闭');
 await show('点击保留第一份');await page.evaluate(()=>a.game.onEvent('task-reward',{title:'后续奖励重新计时',reward:{wood:8}}));
 const bounds=await page.locator('#task-reward-title').boundingBox();await page.mouse.move(bounds.x+10,bounds.y+8);await page.mouse.down();
 const closeBefore=await page.locator('#task-reward-close').boundingBox();await page.waitForTimeout(3300);
 if(!await dialog.isVisible()||await badge.isVisible())throw Error('按下后仍自动关闭或仍显示倒计时');
 await page.mouse.up();await page.mouse.move(5,5);await page.waitForTimeout(300);
 if(await page.locator('#task-reward-title').innerText()!=='点击保留第一份')throw Error('排队通知覆盖正在阅读的面板');
 const closeAfter=await page.locator('#task-reward-close').boundingBox();if(closeBefore.y!==closeAfter.y)throw Error('取消计时引起关闭按钮位移');
 await page.locator('#task-reward-close').click();await page.waitForFunction(()=>document.querySelector('#task-reward-title').textContent==='后续奖励重新计时');
 if(!await badge.isVisible())throw Error('下一份奖励未恢复倒计时');await dialog.waitFor({state:'hidden',timeout:5000});
 checks.push('按下即保留、移开不续计时、队列不覆盖、新面板重新自动关闭');
 for(const interaction of ['wheel','keyboard']){
  await show('主动阅读 '+interaction);
  if(interaction==='wheel'){await page.locator('#task-reward-title').hover();await page.mouse.wheel(0,120);}else await page.keyboard.press('Tab');
  await page.waitForTimeout(3200);if(!await dialog.isVisible()||await badge.isVisible())throw Error(interaction+'未取消倒计时');
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});checks.push(interaction+' 保留与 Esc 关闭');
 }
 // 隐去徽记保留原占位，手机/桌面昼夜仍使用同一正式面板与装备画像。
 for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(phase=>{a.game.progress.living.calendar.elapsed=phase==='night'?260000:75000;a.environment.time=phase==='day'?'night':'day';},phase);
  await page.waitForFunction(phase=>a.environment.time===phase,phase);
  await page.evaluate(async()=>{a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.draw();});
  await show('邻居的谢礼');await page.locator('.task-reward-portrait').click();
  const rect=await page.locator('.task-reward-panel').boundingBox();if(rect.x<0||rect.y<0||rect.x+rect.width>width||rect.y+rect.height>height)throw Error('面板越界');
  if(await badge.isVisible())throw Error('点击图片未取消倒计时');
  await page.screenshot({path:`output/playwright/pause-panel-dismiss/reading-${width}-${phase}.png`});
  await page.locator('#task-reward-close').click();await dialog.waitFor({state:'hidden'});
 }
 // 新建触屏上下文，用浏览器真实触摸输入验证挑战结算的同一行为。
 const seed=await page.evaluate(()=>localStorage.getItem('forest-patrol-v1'));
 const context=await page.context().browser().newContext({hasTouch:true,isMobile:true,viewport:{width:390,height:844}});
 try{
  const mobile=await context.newPage();mobile.on('pageerror',e=>errors.push(e.message));
  await mobile.addInitScript(seed=>{localStorage.setItem('forest-patrol-v1',seed);localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));},seed);
  await mobile.goto('http://localhost:4285');await mobile.locator('#start').tap();
  await mobile.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;a.game.spawnTimer=a.game.fireClock=999;a.game.onEvent('task-reward',{title:'清缴完成',challenge:{...(await import('/src/config/economy.js')).challengeProgress({...a.game.progress,bosses:1}),previousTier:0}});});
  await mobile.locator('#task-reward-challenge').tap();await mobile.waitForTimeout(3300);
  if(!await mobile.locator('#task-reward-dialog').isVisible()||await mobile.locator('#task-reward-countdown').isVisible())throw Error('触屏挑战结算仍自动关闭');
  if((await mobile.locator('#task-reward-dialog').innerText()).includes('undefined'))throw Error('挑战快照字段不完整');
  await mobile.screenshot({path:'output/playwright/pause-panel-dismiss/challenge-touch.png'});
  await mobile.locator('#task-reward-close').tap();await mobile.locator('#task-reward-dialog').waitFor({state:'hidden'});checks.push('真实触屏挑战结算保持打开，点关闭正常退出');
 }finally{await context.close();}
 if(!await page.evaluate(wallet=>a.game.progress.coins===wallet&&a.game.state==='playing',wallet))throw Error('阅读改变钱包或未恢复游戏');
 if(errors.length)throw Error(errors.join('\n'));return {checks,screenshots:7,errors};
}
