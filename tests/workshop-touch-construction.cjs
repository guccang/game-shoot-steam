// 手机避让施工实机回归：真实触摸、暂停续作、取消、鼠标与键盘。
async page => {
  if(new URL(page.url()).port!=='4197')throw Error('只允许隔离端口 4197');
  await page.reload();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,p=(await import('/src/progression/progress.js')).freshProgress();
    p.coins=p.wood=100000;p.weapons.fill(1);p.vehicleWeapons.fill(1);p.vehicleHulls.fill(1);p.mastery.fill(40);
    p.materials={parts:10000,crystal:10000,core:10000};a.game.progress=p;a.game.reset();a.game.state='ready';a.save();a.refresh();
  });
  const cdp=await page.context().newCDPSession(page);
  // CDP 发送真实触摸，业务只通过页面事件执行。
  async function touch(type,x,y){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:['touchEnd','touchCancel'].includes(type)?[]:[{x,y}]});}
  // 工具或零件从实际可见位置拖入装配位。
  async function drag(selector,wait=0,cancel=false,invalid=false){
    const b=await page.locator(selector).boundingBox();await touch('touchStart',b.x+b.width/2,b.y+b.height/2);
    await touch('touchMove',b.x+b.width/2,b.y+b.height/2-12);
    const s=await page.locator('#ws-socket').boundingBox();const x=invalid?20:s.x+s.width/2,y=invalid?200:s.y+s.height/2;
    for(let i=1;i<=8;i++)await touch('touchMove',b.x+b.width/2+(x-b.x-b.width/2)*i/8,b.y+b.height/2+(y-b.y-b.height/2)*i/8);
    if(wait)await page.waitForTimeout(wait);await touch(cancel?'touchCancel':'touchEnd');
  }
  // 下方控制区按住，截图保留操作位置与连接点同时可见的画面。
  async function hold(ms,cancel=false,shot){
    const b=await page.locator('#ws-hold').boundingBox();await touch('touchStart',b.x+b.width/2,b.y+b.height/2);
    await page.waitForTimeout(ms);if(shot)await page.screenshot({path:`output/playwright/workshop-touch-construction/${shot}.png`});
    await touch(cancel?'touchCancel':'touchEnd');
  }
  // 仅读取正式状态验证扣费，不通过测试函数提交施工。
  const state=()=>page.evaluate(async()=>JSON.parse(JSON.stringify((await import('/src/main.js')).application.game.progress)));
  // 切回武器台确保前次试装已取消。
  async function open(index=0){await page.evaluate(async index=>(await import('/src/main.js')).application.workshop.open('weapons',index),index);}
  // 键盘安装部件也使用页面原生焦点与按键。
  async function draft(key='damage'){
    await page.waitForTimeout(350);
    await page.locator(`[data-ws-upgrade="${key}"]`).focus();await page.keyboard.press('Enter');
    await page.locator('#ws-socket').focus();await page.keyboard.press('Enter');await page.waitForTimeout(1200);
  }
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
  for(const width of [320,390]){
    await page.setViewportSize({width,height:844});await open();const before=await state();
    await drag('[data-ws-upgrade="damage"]');await page.waitForTimeout(1200);
    await drag('#ws-tool',0,false,true);if(!await page.locator('#ws-hold').isDisabled())throw Error('无效放置启用施工');
    await drag('#ws-tool',1800);if(JSON.stringify(await state())!==JSON.stringify(before))throw Error('触摸遮挡位置意外扣费');
    if(await page.locator('#ws-hold').isDisabled())throw Error('工具未就位');
    const stage=await page.locator('#ws-stage').boundingBox(),h=await page.locator('#ws-hold').boundingBox();
    if(h.y<stage.y+stage.height+20||h.y+h.height>844||stage.y<0||h.height<48)throw Error('施工区没有避让或无法同屏');
    await hold(400,false,`active-${width}`);const paused=await page.locator('#ws-work-progress').textContent();
    if(!paused.includes('已暂停')||parseInt(paused)<10)throw Error('施工没有暂停进度');
    await page.waitForTimeout(300);if(await page.locator('#ws-work-progress').textContent()!==paused)throw Error('松开仍施工');
    if(JSON.stringify(await state())!==JSON.stringify(before))throw Error('暂停扣费');
    await hold(1300);const after=await state();
    if(after.weapons[0]!==before.weapons[0]+1||after.coins!==before.coins-35*before.weapons[0]||after.wood!==before.wood-15*before.weapons[0])throw Error('续作结算不一致');
    await page.waitForTimeout(250);if(JSON.stringify(await state())!==JSON.stringify(after))throw Error('重复扣费');
    await draft('rate');await drag('#ws-tool');await hold(350,true);
    if(!await page.locator('#ws-hold').isDisabled()||JSON.stringify(await state())!==JSON.stringify(after))throw Error('取消未清理或扣费');
    await page.emulateMedia({reducedMotion:'reduce'});await drag('#ws-tool');await hold(450,false,`wrench-${width}`);
    await page.locator('[data-ws-mode="vehicle"]').click();await page.waitForTimeout(1700);
    if(JSON.stringify(await state())!==JSON.stringify(after))throw Error('切换未取消施工');
    await page.emulateMedia({reducedMotion:'no-preference'});
    await draft('armor');await drag('#ws-tool');await hold(400,false,`vehicle-${width}`);await hold(1300);
    if((await state()).vehicleHulls[0]!==after.vehicleHulls[0]+1)throw Error('载具下方触控施工失败');
    await page.locator('#ws-close').click();
    console.log(`${width}: 触控避让、无效放置、暂停续作、取消、切换通过；舞台底 ${stage.y+stage.height}，按住区顶 ${h.y}`);
  }
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
  await page.setViewportSize({width:1280,height:960});await open();await draft('rate');const before=await state();
  const t=await page.locator('#ws-tool').boundingBox(),s=await page.locator('#ws-socket').boundingBox();
  await page.mouse.move(t.x+t.width/2,t.y+t.height/2);await page.mouse.down();await page.mouse.move(s.x+s.width/2,s.y+s.height/2,{steps:10});
  await page.waitForTimeout(500);await page.screenshot({path:'output/playwright/workshop-touch-construction/desktop.png'});
  await page.waitForTimeout(1200);await page.mouse.up();
  if((await state()).weaponParts[0].rate!==before.weaponParts[0].rate+1)throw Error('桌面鼠标施工失败');
  await draft('capacity');await page.locator('#ws-tool').focus();await page.keyboard.press('Enter');
  await page.locator('#ws-hold').focus();await page.keyboard.down('Space');await page.waitForTimeout(1700);await page.keyboard.up('Space');
  if((await state()).weaponParts[0].capacity!==before.weaponParts[0].capacity+1)throw Error('下方键盘施工失败');
  await draft('reload');await page.locator('#ws-tool').focus();await page.keyboard.press('Enter');
  await page.keyboard.down('Space');await page.waitForTimeout(1700);await page.keyboard.up('Space');
  if((await state()).weaponParts[0].reload!==before.weaponParts[0].reload+1)throw Error('连接点键盘施工失败');
  const bytes=await page.locator('#workshop-dialog canvas').evaluateAll(ns=>ns.reduce((s,c)=>s+c.width*c.height*4,0));
  if(bytes>5*1024*1024)throw Error('画布预算超限');await page.locator('#ws-close').click();
  if(errors.length)throw Error(errors.join('\n'));return {touchWidths:[320,390],mouse:true,keyboard:true,canvasBytes:bytes,errors};
}
