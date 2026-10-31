// 手机实际触控拖拽、施工取消与尺寸稳定；仅隔离端口。
async page => {
  if(new URL(page.url()).port!=='4175')throw Error('隔离端口错误');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.reload();
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
  // 从可见元素发出真实触摸事件，不直接调用业务安装函数。
  async function touch(type,x,y) {await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{x,y}]});}
  // 开始拖动后读取更新后的连接点，再把零件或工具放过去。
  async function drag(selector,hold=0,cancel=false) {
    await page.locator(selector).scrollIntoViewIfNeeded();
    const b=await page.locator(selector).boundingBox();
    await touch('touchStart',b.x+b.width/2,b.y+b.height/2);
    await touch('touchMove',b.x+b.width/2,b.y+b.height/2-12);
    const s=await page.locator('#ws-socket').boundingBox();
    for(let i=1;i<=10;i++)await touch('touchMove',b.x+b.width/2+(s.x+s.width/2-b.x-b.width/2)*i/10,b.y+b.height/2+(s.y+s.height/2-b.y-b.height/2)*i/10);
    if(hold)await page.waitForTimeout(hold);
    await touch(cancel?'touchCancel':'touchEnd');
  }
  // 读取资源与部件，仅作为取消和提交的断言。
  const state=()=>page.evaluate(async()=>JSON.parse(JSON.stringify((await import('/src/main.js')).application.game.progress)));
  for(const width of [320,390]) {
    await page.setViewportSize({width,height:844});
    await page.evaluate(async()=>{(await import('/src/main.js')).application.workshop.open('weapons',0);});
    const before=await state();
    await drag('[data-ws-upgrade="damage"]');await page.waitForTimeout(1200);
    const socket=await page.locator('#ws-socket').boundingBox(),tool=await page.locator('#ws-tool').boundingBox();
    if(socket.y<0||tool.y+tool.height>844)throw Error('手机工具和连接点无法同屏');
    await page.screenshot({path:`output/playwright/workshop-components/mobile-${width}-draft.png`});
    await drag('#ws-tool',400,true);
    if(JSON.stringify(await state())!==JSON.stringify(before))throw Error('touchCancel 扣费');
    await drag('#ws-tool');
    const hold=await page.locator('#ws-hold').boundingBox();
    await touch('touchStart',hold.x+hold.width/2,hold.y+hold.height/2);await page.waitForTimeout(1800);await touch('touchEnd');
    if((await state()).weapons[0]!==before.weapons[0]+1)throw Error('真实触控施工失败');
    await drag('[data-ws-upgrade="damage"]');await page.waitForTimeout(1200);
    await page.locator('#ws-resources [data-resource-info]').first().click();if(!await page.locator('#resource-help-dialog').isVisible())throw Error('资源来源无法展开');await page.locator('#close-resource-help').click();
    await page.locator('#ws-close').click();if(await page.locator('#workshop-dialog').isVisible())throw Error('关闭仍然拦截');await page.evaluate(async()=>(await import('/src/main.js')).application.workshop.open('weapons',0));
    await page.locator('[data-ws-mode="vehicle"]').click();if(await page.locator('#ws-discard').isVisible())throw Error('页签切换拦截');
    const b=await page.locator('#workshop-dialog').boundingBox(),s=await page.locator('#ws-stage').boundingBox();
    await page.locator('#ws-kits-tab').click();await page.locator('[data-ws-part="0"]').click();await page.locator('#ws-turret-upgrade').click();
    const after=await page.locator('#workshop-dialog').boundingBox(),stage=await page.locator('#ws-stage').boundingBox();
    if(b.width!==after.width||b.y!==after.y||s.height!==stage.height)throw Error('手机炮塔面板整体变大');
    await page.screenshot({path:`output/playwright/workshop-components/mobile-${width}-turret.png`});
    await page.locator('#ws-close').click();
  }
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
  if(errors.length)throw Error(errors.join('\n'));console.log('320/390 真实触控、取消、施工、资源帮助、退出与炮塔稳定尺寸通过');
}
