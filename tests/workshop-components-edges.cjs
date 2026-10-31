// 草稿上的无效拖动、满级、错误恢复与资源预算，覆盖连续交互边界。
async page=>{
  if(new URL(page.url()).port!=='4186')throw Error('隔离端口错误');
  await page.reload();await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.progress.weaponParts[0].capacity=1;a.game.progress.weaponParts[0].rate=1;a.workshop.open('weapons',0);});
  await page.locator('[data-ws-upgrade="capacity"]').click();await page.locator('#ws-socket').click();
  const socket=await page.locator('#ws-socket').evaluate(e=>e.style.left+':'+e.style.top),image=await page.locator('#ws-stage').evaluate(c=>c.toDataURL());
  await page.locator('[data-ws-upgrade="rate"]').dragTo(page.locator('#ws-name'));
  const after=await page.locator('#ws-socket').evaluate(e=>e.style.left+':'+e.style.top);
  if(socket!==after||image!==await page.locator('#ws-stage').evaluate(c=>c.toDataURL()))throw Error('无效放置没有恢复原草稿与连接点');
  await page.locator('#ws-tool').focus();await page.keyboard.press('Enter');await page.keyboard.down('Space');await page.waitForTimeout(1800);await page.keyboard.up('Space');
  const levels=await page.evaluate(async()=>{const p=(await import('/src/main.js')).application.game.progress;return p.weaponParts[0];});
  if(levels.capacity!==2||levels.rate!==1)throw Error('无效拖动后施工升级了错误部件');
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.progress.weaponParts[0].rate=5;a.workshop.open('weapons',0);});
  await page.locator('[data-ws-upgrade="rate"]').click();await page.locator('#ws-socket').click();
  if(await page.locator('#ws-construction-tools').isVisible()||!(await page.locator('#ws-feedback').innerText()).includes('满级'))throw Error('满级仍能施工');
  // 模拟单次画布绘制异常，下一次选择必须恢复，不能遗留缩放或裁剪。
  await page.evaluate(()=>{const c=document.getElementById('ws-stage').getContext('2d'),arc=c.roundRect;let first=true;c.roundRect=function(...args){if(first){first=false;throw Error('模拟预览异常');}return arc.apply(this,args);};});
  await page.locator('[data-ws-item="14"]').click();
  if(!(await page.locator('#ws-feedback').innerText()).includes('预览失败'))throw Error('绘制异常没有明确提示');
  // 下一次真实选择应清除异常留下的裁剪和保存栈。
  await page.locator('[data-ws-item="0"]').click();await page.locator('[data-ws-mode="vehicle"]').click();await page.locator('[data-ws-mode="weapons"]').click();
  const matrix=await page.locator('#ws-stage').evaluate(c=>{const m=c.getContext('2d').getTransform();return [m.a,m.b,m.c,m.d,m.e,m.f];});if(matrix.join(',')!=='1,0,0,1,0,0')throw Error('异常后画布无法恢复');
  const budget=await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application;let maximum=0;
    for(let n=0;n<20;n++){a.workshop.open(n%2?'weapons':'vehicle',n%2?3:n%4);maximum=Math.max(maximum,[...document.querySelectorAll('#workshop-dialog canvas')].reduce((sum,c)=>sum+c.width*c.height*4,0));document.getElementById('ws-close').click();}
    return {maximum,dialogs:document.querySelectorAll('#workshop-dialog').length,ghosts:document.querySelectorAll('.ws-drag-ghost').length,ground:a.renderer.diagnosticInfo().groundCache.count};
  });
  if(budget.maximum>5*1024*1024||budget.dialogs!==1||budget.ghosts||budget.ground>32)throw Error('预算或资源清理异常');
  await page.emulateMedia({reducedMotion:'no-preference'});return budget;
}
