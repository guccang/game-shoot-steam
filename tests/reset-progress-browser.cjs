// 真实浏览器验证清空确认、取消、存储失败、暂停恢复及刷新后不复活旧存档。
async (page)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:320,height:568});
  await page.evaluate(()=>sessionStorage.setItem('reset-progress-fixture','1'));
  // 在新页面初始化时写入测试档，避免退出保存覆盖夹具；只影响隔离浏览器。
  await page.addInitScript(()=>{if(!sessionStorage.getItem('reset-progress-fixture'))return;sessionStorage.removeItem('reset-progress-fixture');localStorage.setItem('forest-patrol-v1',JSON.stringify({version:1,coins:9000,wood:3000,hero:1,weapon:2,bosses:4,heroes:[5,7],weapons:[4,2,3,1,2,5]}));localStorage.setItem('forest-patrol-environment-v1',JSON.stringify({time:'night',weather:'rain',autoTime:false,autoWeather:false}));});
  await page.reload();await page.locator('#start').click();await page.locator('#settings-button').click();
  if(await page.locator('#auto-label').innerText()!=='巡游已暂停')throw Error('打开设置未暂停');
  const before=await page.evaluate(()=>localStorage.getItem('forest-patrol-v1'));
  await page.locator('#help').click();await page.locator('#help-ok').click();
  if(!await page.locator('#settings-dialog').evaluate(el=>el.open))throw Error('说明关闭后丢失设置');
  await page.locator('#reset-progress').click();
  if(await page.evaluate(()=>document.activeElement.id)!=='cancel-reset')throw Error('确认页默认焦点不是取消');
  await page.screenshot({path:'output/playwright/reset-confirmation-mobile.png'});
  await page.locator('#cancel-reset').click();await page.locator('#reset-progress').click();await page.keyboard.press('Escape');
  if(await page.locator('#reset-confirmation').isVisible())throw Error('Esc未取消确认');
  if(await page.evaluate(()=>localStorage.getItem('forest-patrol-v1'))!==before)throw Error('取消改动了进度');
  await page.locator('#settings-done').click();await page.waitForFunction(()=>document.getElementById('auto-label').textContent==='自动攻击中');
  await page.locator('#pause').click();await page.locator('#settings-button').click();await page.locator('#close-settings').click();
  if(await page.locator('#auto-label').innerText()!=='巡游已暂停')throw Error('设置错误恢复手动暂停');
  await page.locator('#settings-button').click();await page.locator('#reset-progress').click();
  // 模拟浏览器拒绝存储，确认旧进度保留且显示错误；恢复后允许重试。
  await page.evaluate(()=>{window.resetTestSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='forest-patrol-v1')throw new DOMException('Quota exceeded','QuotaExceededError');return window.resetTestSetItem.call(this,key,value);};});
  await page.locator('#confirm-reset').click();if(!await page.locator('#reset-error').isVisible())throw Error('写入失败缺少提示');
  if(await page.locator('#player-name').innerText()!=='薄荷 · Lv.7')throw Error('写入失败仍清空内存');
  await page.evaluate(()=>{Storage.prototype.setItem=window.resetTestSetItem;delete window.resetTestSetItem;});
  await page.locator('#confirm-reset').click();await page.waitForFunction(()=>document.getElementById('auto-label').textContent==='准备出发');
  const state=await page.evaluate(async()=>{const {freshProgress}=await import('/src/game.js');return {saved:JSON.parse(localStorage.getItem('forest-patrol-v1')),fresh:freshProgress(),environment:JSON.parse(localStorage.getItem('forest-patrol-environment-v1'))};});
  if(JSON.stringify(state.saved)!==JSON.stringify(state.fresh))throw Error('存档未完全清空');
  if(state.environment.time!=='night'||state.environment.weather!=='rain')throw Error('清空意外改变环境');
  if(await page.locator('#player-name').innerText()!=='栗子 · Lv.1'||await page.locator('#player-health').innerText()!=='120 / 120')throw Error('角色未刷新');
  if(await page.locator('[data-coins]').innerText()!=='60'||await page.locator('[data-wood]').innerText()!=='30')throw Error('资源未刷新');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight);if(overflow)throw Error('窄屏溢出');
  await page.reload();await page.locator('#weapons-button').click();if(await page.locator('[data-action="buy"]:disabled').count()!==7)throw Error('刷新后旧枪或战绩恢复');
  await page.locator('#close-camp').click();await page.locator('#start').click();await page.waitForFunction(()=>document.getElementById('auto-label').textContent==='自动攻击中');
  if(errors.length)throw Error(errors.join(';'));
  return {cancelSafe:true,pauseResume:true,storageFailureSafe:true,resetAndPersistence:true,environmentPreserved:true,mobileOverflow:false,errors};
}
