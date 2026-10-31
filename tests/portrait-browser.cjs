// 竖版入口回归：视口铺满、角色养成事务、弹窗暂停恢复、装备保存与摇杆操作。
async (page) => {
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.evaluate(()=>sessionStorage.removeItem('portrait-test-seeded'));
  await page.addInitScript(()=>{
    if(sessionStorage.getItem('portrait-test-seeded'))return;
    localStorage.setItem('forest-patrol-v1',JSON.stringify({version:1,coins:2000,wood:900,hero:0,weapon:0,heroes:[1,0],weapons:[1,0],bosses:2}));
    localStorage.setItem('forest-patrol-environment-v1',JSON.stringify({time:'day',weather:'sun',autoTime:false,autoWeather:false}));sessionStorage.setItem('portrait-test-seeded','1');
  });
  await page.setViewportSize({width:1440,height:1000});await page.reload();
  // 宽屏保持居中竖版，纵向完全占满，无页面滚动。
  const desktop=await page.locator('#game-frame').boundingBox();if(desktop.height!==1000||desktop.width>=desktop.height)throw Error('桌面竖版尺寸错误');
  await page.screenshot({path:'output/playwright/portrait-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  const mobile=await page.locator('#game-frame').boundingBox();if(mobile.width!==390||mobile.height!==844)throw Error('手机战场未铺满');
  await page.locator('#start').click();await page.locator('#heroes-button').click();
  if(await page.locator('#auto-label').innerText()!=='巡游已暂停')throw Error('角色面板未暂停战斗');
  if(await page.locator('#camp-title').innerText()!=='角色养成')throw Error('角色入口打开错误分类');
  const funds=Number((await page.locator('#coins').innerText()).replaceAll(',',''));
  await page.locator('[data-action="buy"][data-index="1"]').click();
  await page.locator('[data-action="upgrade"][data-index="1"]').click();
  if(Number((await page.locator('#coins').innerText()).replaceAll(',',''))!==funds-175)throw Error('招募升级扣费错误');
  if(!(await page.locator('#player-name').innerText()).includes('薄荷 · Lv.2'))throw Error('角色属性未同步');
  if(await page.locator('#camp-feedback').innerText()!=='薄荷升级成功')throw Error('弹窗反馈缺失');
  await page.locator('#camp-dialog').evaluate(el=>el.scrollTop=0);
  await page.screenshot({path:'output/playwright/portrait-heroes.png'});
  await page.locator('[data-action="equip"][data-index="0"]').click();
  if(!(await page.locator('#player-name').innerText()).includes('栗子'))throw Error('切换角色失败');
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>document.getElementById('auto-label').textContent==='自动攻击中');
  await page.locator('#weapons-button').click();
  if(await page.locator('#camp-title').innerText()!=='武器工坊')throw Error('武器入口失效');
  await page.locator('[data-action="buy"][data-index="1"]').click();
  await page.locator('#close-camp').click();
  await page.waitForFunction(()=>document.getElementById('auto-label').textContent==='自动攻击中');
  // 手动暂停之后打开养成，再关闭时仍维持手动暂停。
  await page.locator('#pause').click();await page.locator('#heroes-button').click();await page.locator('#close-camp').click();
  if(await page.locator('#auto-label').innerText()!=='巡游已暂停')throw Error('错误恢复了手动暂停');
  await page.locator('#resume').click();
  const stick=await page.locator('#joystick').boundingBox();await page.mouse.move(stick.x+stick.width/2,stick.y+stick.height/2);await page.mouse.down();await page.mouse.move(stick.x+stick.width/2+28,stick.y+stick.height/2+5);await page.waitForTimeout(200);
  if(await page.locator('#stick').evaluate(el=>el.style.transform)==='')throw Error('摇杆无法拖动');await page.mouse.up();
  if(await page.locator('#stick').evaluate(el=>el.style.transform)!=='')throw Error('摇杆没有复位');
  await page.screenshot({path:'output/playwright/portrait-mobile.png'});
  // 窄屏下入口和摇杆可触达，角色弹窗只滚动自身。
  await page.setViewportSize({width:320,height:568});await page.locator('#heroes-button').click();
  const overflow=await page.evaluate(()=>({body:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight,dialog:document.getElementById('camp-dialog').scrollWidth>document.getElementById('camp-dialog').clientWidth}));
  if(overflow.body||overflow.dialog)throw Error('窄屏溢出');
  await page.locator('#camp-done').click();
  await page.screenshot({path:'output/playwright/portrait-small.png'});
  await page.reload();await page.locator('#heroes-button').click();
  if(!(await page.locator('.item-card').nth(1).locator('.level').innerText()).includes('2'))throw Error('角色成长未保存');
  await page.locator('#tab-weapons').click();if(!(await page.locator('.item-card.equipped h3').innerText()).includes('萤火'))throw Error('武器装备未保存');
  await page.locator('#close-camp').click();
  if(await page.locator('#auto-label').innerText()!=='准备出发')throw Error('准备状态被弹窗意外启动');
  // 用户手势进入根节点全屏时，原生养成弹窗仍能正常打开和关闭。
  let fullscreen=false;
  if(await page.evaluate(()=>document.fullscreenEnabled)){
    await page.locator('#fullscreen').click();await page.waitForFunction(()=>!!document.fullscreenElement,null,{timeout:3000});
    await page.locator('#heroes-button').click();if(!await page.locator('#camp-dialog').evaluate(el=>el.open))throw Error('全屏时无法打开角色');
    await page.locator('#close-camp').click();await page.locator('#fullscreen').click();await page.waitForFunction(()=>!document.fullscreenElement);fullscreen=true;
  }
  if(errors.length)throw Error(errors.join('; '));return {desktop,mobile,characterPurchase:true,upgrade:true,switchHero:true,weaponPurchase:true,pauseResume:true,joystick:true,persistence:true,fullscreen,overflow,errors};
}
