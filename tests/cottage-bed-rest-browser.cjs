// 床边休息实机检查：真实键盘移动、自动弹窗、两种睡眠选择及手机昼夜适配。
async page=>{
 if(new URL(page.url()).port!=='4276')throw Error('仅限隔离验收端口4276');
 const errors=[],views=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress();
  p.arrival={version:2,phase:'complete',keys:true,parked:false};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;g.spawnTimer=g.fireClock=999;Object.assign(g.player,(await import('/src/config/cottage.js')).COTTAGE.door);if(!(await import('/src/core/cottage.js')).enterCottage(g))throw Error('入屋失败');});
 // 用位置条件结束真实按键，避免慢帧下固定按键时长尚未抵达。
 async function walk(key,condition){await page.keyboard.down(key);try{await page.waitForFunction(condition);}finally{await page.keyboard.up(key);}}
 await walk('ArrowLeft',()=>a.game.player.x<=119);await walk('ArrowUp',()=>a.game.player.y<=205);
 await page.waitForFunction(()=>a.game.cottage.restElapsed>0);
 if(!(await page.locator('#cottage-notice').innerText()).includes('准备休息'))throw Error('床边倒计时缺失');
 await walk('ArrowDown',()=>a.game.player.y>=245);
 if(!await page.evaluate(()=>a.game.cottage.restElapsed===0&&!a.game.cottage.restOpen))throw Error('移开未取消');
 await walk('ArrowUp',()=>a.game.player.y<=205);await page.waitForFunction(()=>a.game.cottage.restElapsed>=1);
 // 冻结正式计时样本拍摄倒计时，恢复后继续由核心计时自然打开选项。
 await page.evaluate(()=>{window.bedTick=a.game.update.bind(a.game);a.game.update=()=>{};});
 for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(phase=>{a.game.progress.living.calendar.elapsed=phase==='night'?260000:93750;a.renderer.draw();a.refresh();},phase);
  await page.screenshot({path:`output/playwright/cottage-rest-time/countdown-${width}-${phase}.png`});
  if(!await page.locator('#cottage-notice').evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&n.scrollWidth<=n.clientWidth;}))throw Error('倒计时文字溢出');
 }
 await page.evaluate(()=>a.game.update=window.bedTick);await page.locator('#cottage-rest-dialog').waitFor({state:'visible'});
 const position=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(200);await page.keyboard.up('ArrowRight');
 if(!await page.evaluate(p=>a.game.player.x===p.x&&a.game.player.y===p.y,position))throw Error('选择期间角色仍移动');
 for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(phase=>{a.game.progress.living.calendar.elapsed=phase==='night'?260000:93750;a.renderer.draw();a.refresh();},phase);
  // 同一渲染帧读取文案，检查当前时刻与两个选项均来自正式历法。
  const times=await page.evaluate(phase=>{
   a.game.progress.living.calendar.elapsed=phase==='night'?260000:93750;a.refresh();
   return ['#cottage-rest-description','#cottage-phase-time','#cottage-morning-time'].map(id=>document.querySelector(id).textContent);
  },phase);
  const expected=phase==='night'?['当前游戏时间 02:00 · 夜晚','06:00 · 跳过4小时','06:00 · 跳过4小时']:['当前游戏时间 13:30 · 白昼','18:00 · 跳过4小时30分','06:00 · 跳过16小时30分'];
  if(JSON.stringify(times)!==JSON.stringify(expected))throw Error('休息时间文案错误：'+JSON.stringify(times));
  const fit=await page.locator('#cottage-rest-dialog').evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&n.scrollWidth<=n.clientWidth&&[...n.querySelectorAll('button')].every(b=>b.getBoundingClientRect().height>=44);});
  if(!fit)throw Error('休息选项溢出或按钮过小');
  await page.screenshot({path:`output/playwright/cottage-rest-time/options-${width}-${phase}.png`});
  views.push({width,phase,fit,times,...await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectCampHome(a.game,document))});
 }
 await page.keyboard.press('Escape');await page.locator('#cottage-rest-dialog').waitFor({state:'hidden'});await page.waitForTimeout(500);
 if(!await page.evaluate(()=>!a.game.cottage.restOpen&&a.game.cottage.restElapsed===0))throw Error('取消后重复弹出');
 // 每次都实际离开床边再返回，确认醒来和取消的防重复锁可以解除。
 async function returnToBed(){await walk('ArrowRight',()=>a.game.player.x>=200);await walk('ArrowLeft',()=>a.game.player.x<=135);await page.locator('#cottage-rest-dialog').waitFor({state:'visible'});}
 await returnToBed();
 const next=await page.evaluate(async()=>{const g=a.game;g.progress.living.calendar.elapsed=1000;return 1000+(await import('/src/world/living-calendar.js')).calendarView(g.progress.living.calendar).remaining;});
 await page.locator('#cottage-sleep-phase').click();await page.waitForFunction(()=>!a.game.cottage.sleep);
 if(await page.evaluate(()=>a.game.progress.living.calendar.elapsed)!==next)throw Error('下一时段选择错误');
 if(await page.locator('#cottage-rest-dialog').isVisible())throw Error('睡醒立即重弹');
 await returnToBed();const day=await page.evaluate(()=>a.game.progress.living.calendar.day);
 await page.locator('#cottage-sleep-morning').click();await page.waitForFunction(()=>!a.game.cottage.sleep);
 if(!await page.evaluate(day=>a.game.progress.living.calendar.day===day+1&&a.game.progress.living.calendar.elapsed===0,day))throw Error('明早选择错误');
 await returnToBed();await page.locator('#cottage-rest-cancel').click();await page.locator('#cottage-rest-dialog').waitFor({state:'hidden'});
 // 新弹窗不会破坏原三秒自动出门。
 await walk('ArrowRight',()=>a.game.player.x>=180);await walk('ArrowDown',()=>a.game.player.y>=332);
 await page.waitForFunction(()=>!a.game.cottage,null,{timeout:10000});
 if(errors.length)throw Error(errors.join('\n'));
 return {designCriterion:'camp-home-parking',countdown:'通过',cancel:'通过',sleepOptions:'两种选择通过',exit:'通过',views,errors};
}
