// 完成反馈边界：保存失败、取消、键盘完成后松键和收回阶段切换。
async page=>{
  if(new URL(page.url()).port!=='4197')throw Error('仅允许隔离端口');
  await page.reload();await page.setViewportSize({width:320,height:844});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,p=(await import('/src/progression/progress.js')).freshProgress();p.coins=p.wood=100000;p.weapons.fill(1);p.vehicleWeapons.fill(1);p.vehicleHulls.fill(1);p.mastery.fill(40);a.game.progress=p;a.game.reset();a.game.state='ready';a.save();a.refresh();a.workshop.open('weapons',9);});
  // 使用键盘选择部件和装入连接位。
  async function prepare(){await page.locator('[data-ws-upgrade="rate"]').focus();await page.keyboard.press('Enter');await page.locator('#ws-socket').focus();await page.keyboard.press('Enter');await page.waitForTimeout(1200);await page.locator('#ws-tool').focus();await page.keyboard.press('Enter');}
  await prepare();const balance=await page.evaluate(async()=>(await import('/src/main.js')).application.game.progress.coins);
  await page.keyboard.down('Space');await page.waitForTimeout(350);await page.keyboard.up('Space');
  if(await page.locator('#ws-result').isVisible())throw Error('暂停产生成功反馈');
  // 仅隔离存档键模拟磁盘失败，finally 必须恢复原函数。
  await page.evaluate(()=>{window.originalStorageWrite=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='forest-patrol-v1')throw Error('测试保存失败');return window.originalStorageWrite.call(this,key,value);};});
  try {await page.keyboard.down('Space');await page.waitForTimeout(1700);await page.keyboard.up('Space');if(!(await page.locator('#ws-feedback').textContent()).includes('保存失败')||await page.locator('#ws-result').isVisible())throw Error('失败被当作成功');if(await page.evaluate(async()=>(await import('/src/main.js')).application.game.progress.coins)!==balance)throw Error('失败扣费');}
  finally {await page.evaluate(()=>{Storage.prototype.setItem=window.originalStorageWrite;delete window.originalStorageWrite;});}
  await page.waitForTimeout(400);await page.locator('#ws-tool').focus();await page.keyboard.press('Enter');await page.keyboard.down('Space');
  await page.waitForFunction(()=>document.getElementById('ws-bench').dataset.completionPhase==='settled');await page.keyboard.up('Space');
  await page.screenshot({path:'output/playwright/workshop-completion/320-pulse-keyboard.png'});
  const overflow=await page.locator('#ws-result-fields b').evaluateAll(ns=>ns.some(n=>n.scrollWidth>n.clientWidth+1));if(overflow)throw Error('320 脉冲三列溢出');
  const saved=await page.evaluate(async()=>(await import('/src/main.js')).application.game.progress.coins);
  await page.keyboard.down('Space');await page.waitForTimeout(1600);await page.keyboard.up('Space');if(await page.evaluate(async()=>(await import('/src/main.js')).application.game.progress.coins)!==saved)throw Error('完成后重复扣费');
  await page.locator('#ws-close').click();await page.setViewportSize({width:1280,height:960});
  await page.evaluate(async()=>(await import('/src/main.js')).application.workshop.open('weapons',0));await prepare();
  // 鼠标按下方施工区完成，在工具收回阶段立即换页。
  const hold=await page.locator('#ws-hold').boundingBox();await page.mouse.move(hold.x+hold.width/2,hold.y+hold.height/2);await page.mouse.down();
  await page.waitForFunction(()=>document.getElementById('ws-bench').dataset.completionPhase==='retract');await page.mouse.up();
  // 原施工会话的防误触窗口结束后，仍在描边动画期间切换。
  await page.waitForTimeout(360);await page.locator('[data-ws-mode="vehicle"]').click();await page.waitForTimeout(1400);
  if(await page.locator('#ws-result').isVisible()||await page.locator('#ws-bench').getAttribute('data-completed')==='true')throw Error('旧完成回调覆盖新目标');
  await page.locator('#ws-close').click();if(errors.length)throw Error(errors.join('\n'));return {saved,overflow,errors};
}
