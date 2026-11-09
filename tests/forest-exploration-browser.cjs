// 由 playwright-cli 执行，独立 4254 端口；实际点击与按键验证，摆位仅用于隔离场景与截图。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const phase=await page.evaluate(()=>Number(sessionStorage.getItem('exploration-qa'))||0);
 if(phase===0){
  await page.setViewportSize({width:1280,height:900});
  await page.getByRole('button',{name:'开始游戏',exact:true}).click();
  await page.waitForTimeout(1800);
  await page.screenshot({path:'output/playwright/forest-exploration/scenic-ride.png'});
  await page.locator('#arrival-skip').click();
  const result=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return {phase:a.game.progress.arrival.phase,pistol:a.game.progress.weapons[0],wood:a.game.progress.wood};});
  if(result.phase!=='letter'||result.pistol||result.wood)throw Error('跳过越过了实际教学 '+JSON.stringify(result));
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.living.position={x:690,y:1080};p.fireDispatch.next=600;localStorage.setItem('forest-patrol-v1',JSON.stringify(p));sessionStorage.setItem('exploration-qa','1');});
  await page.reload();return {phase,result,errors};
 }
 await page.getByRole('button',{name:'继续游戏',exact:true}).click();
 await page.waitForTimeout(900);
 // 门前真实行走，不能只检查配置坐标。
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.mainlineTalkDelay=999;Object.assign(a.game.player,{x:690,y:1080});a.refresh();});
 await page.keyboard.down('ArrowDown');await page.waitForTimeout(1100);await page.keyboard.up('ArrowDown');
 const walked=await page.evaluate(async()=>(await import('/src/main.js')).application.game.player.y);
 if(walked<=1145)throw Error('木门实际无法通过 '+walked);
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;Object.assign(a.game.player,{x:690,y:1080});a.living.open();});
 await page.locator('#living-patrol').click();
 await page.waitForTimeout(300);
 if(await page.locator('#quest').isVisible())throw Error('营地仍显示清缴波次');
 const before=await page.evaluate(async()=>(await import('/src/main.js')).application.game.waveWarning);
 await page.waitForTimeout(500);
 if(await page.evaluate(async()=>(await import('/src/main.js')).application.game.waveWarning)!==before)throw Error('营地仍在倒计时');
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;Object.assign(a.game.player,((s)=>({x:s.x,y:s.y}))((await import('/src/progression/story/clearing-site.js')).clearingSite(a.game.progress)));a.refresh();});
 await page.waitForTimeout(450);if(!await page.locator('#quest').isVisible())throw Error('清缴场缺少波次节点');
 await page.screenshot({path:'output/playwright/forest-exploration/clearing.png'});
 const samples=[];
 // 同屏包含正式猫、邻居怪物、原载具、建筑与新增围栏，昼夜与手机独立采样。
 for(const width of [1280,390,320]){
  await page.setViewportSize({width,height:900});
  for(const time of ['day','night']){
   await page.evaluate(async time=>{const a=(await import('/src/main.js')).application,g=a.game;
    Object.assign(g.player,{x:650,y:1940});g.enemies=[];g.progress.living.patrolActive=false;g.mainlineTalkDelay=999;
    g.progress.living.calendar={day:1,elapsed:time==='day'?500000:1000000};a.environment.weather='sun';a.environment.autoWeather=false;
    const {livingResidents}=await import('/src/core/camp/living-world.js');livingResidents(g);
    a.refresh();
   },time);
   await page.waitForTimeout(1200);
   await page.screenshot({path:`output/playwright/forest-exploration/world-${width}-${time}.png`});
  }
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;Object.assign(a.game.player,{x:650,y:1840});a.living.open();});
  await page.screenshot({path:`output/playwright/forest-exploration/neighbors-${width}.png`});
  const check=await page.locator('#living-dialog').evaluate(n=>({width:n.clientWidth,scroll:n.scrollWidth,buttons:[...n.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().height).map(b=>({text:b.textContent,h:b.getBoundingClientRect().height}))}));
  if(check.scroll>check.width||check.buttons.some(b=>b.h<44))throw Error('手机排版或触控范围错误 '+JSON.stringify(check));samples.push({width,...check});
  await page.locator('#living-close').click();
 }
 // 领取邻居请求与下一步按钮使用真实点击。
 await page.evaluate(async()=>(await import('/src/main.js')).application.living.open());
 await page.locator('[data-living-accept="neighbors-lunch"]').click();
 await page.evaluate(async()=>(await import('/src/main.js')).application.living.open());
 if(await page.locator('.living-current').count()!==1)throw Error('缺少单一当前行动');
 await page.screenshot({path:'output/playwright/forest-exploration/current-favor-320.png'});
 await page.locator('#living-close').click();
 const result=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return {stage:a.game.progress.living.requests['neighbors-lunch'].stage,frameErrors:a.game.profiler.events.filter(e=>e.type==='frame-error')};});
 if(errors.length||result.frameErrors.length)throw Error(JSON.stringify({errors,result}));
 return {phase,walked,samples,result,errors};
}
