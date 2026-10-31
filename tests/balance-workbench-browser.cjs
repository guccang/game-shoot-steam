// 浏览器验收真实工作台控件、Worker、下载和小屏布局，仅允许隔离端口。
async page=>{
  if(new URL(page.url()).port!=='4174')throw Error('仅允许隔离端口');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:4174/balance.html');
  await page.setViewportSize({width:1440,height:1000});
  const storage=await page.evaluate(()=>localStorage.getItem('forest-patrol-v1'));
  await page.locator('#run').click();
  await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('模拟完成'),null,{timeout:180000});
  if(!await page.locator('#completion-label').innerText().then(t=>t==='100/100 组完成'))throw Error('批次未完成');
  // 车型自带独立主炮后的固定种子基线：保留全部样本与后期最大空档。
  if(!await page.locator('#metrics').innerText().then(t=>t.includes('11.21 分钟')&&t.includes('0 / 100')))throw Error('后期指标不是全部100种子结果');
  if(await page.locator('#rate-workshopMinutes').inputValue()!=='5'||await page.locator('#rate-expeditionMinutes').inputValue()!=='6')throw Error('缺少真实回访路线参数');
  await page.locator('#pin-report').click();
  if(!await page.locator('#comparison table').count())throw Error('对照表缺失');
  await page.screenshot({path:'output/playwright/balance-workbench-desktop.png',fullPage:true});
  const downloadPromise=page.waitForEvent('download');await page.locator('#export-config').click();
  const file=await downloadPromise;await file.saveAs('output/playwright/balance-config.json');
  await page.locator('#config-file').setInputFiles('output/playwright/balance-config.json');
  await page.waitForFunction(()=>document.getElementById('status').textContent==='配置已导入。');
  if(!await page.locator('#config-json').inputValue().then(t=>JSON.parse(t).version===2&&JSON.parse(t).upgrades.ceilings.vehicle===450))throw Error('版本2费用上限未往返');
  await page.locator('#config-file').setInputFiles('docs/balance-reports/previous-config.json');
  await page.waitForFunction(()=>JSON.parse(document.getElementById('config-json').value).upgrades.ceilings?.vehicle===10000000);
  await page.locator('#config-file').setInputFiles('output/playwright/balance-config.json');
  await page.waitForFunction(()=>JSON.parse(document.getElementById('config-json').value).upgrades.ceilings?.vehicle===450);
  const csvPromise=page.waitForEvent('download');await page.locator('#export-csv').click();
  await (await csvPromise).saveAs('output/playwright/balance-report.csv');
  await page.locator('#benchmark').click();
  await page.waitForFunction(()=>document.querySelectorAll('#benchmark-table tr').length>=6,null,{timeout:180000});
  if(!await page.locator('#benchmark-table').innerText().then(t=>t.includes('领主耐久靶')))throw Error('正式试射缺失');
  await page.locator('#run').click();await page.locator('#cancel').click();
  if(await page.locator('#run').isDisabled())throw Error('取消后仍锁定');
  for(const width of [320,390]){
    await page.setViewportSize({width,height:844});
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('小屏横向溢出 '+width);
    await page.screenshot({path:'output/playwright/balance-workbench-'+width+'.png',fullPage:true});
  }
  // 低效率也通过真实Worker，截图只取摘要以保持手机数值可读。
  await page.locator('#efficiency').selectOption('.65');await page.locator('#run').click();
  await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('模拟完成'),null,{timeout:180000});
  if(!await page.locator('#completion-label').innerText().then(t=>t==='100/100 组完成')||!await page.locator('#metrics').innerText().then(t=>t.includes('14.3 小时')&&t.includes('11.20 分钟')&&t.includes('0 / 100')))throw Error('低效率结果不符合专属主炮基线');
  await page.locator('#summary-panel').screenshot({path:'output/playwright/balance-low-summary-390.png'});
  await page.locator('#config-file').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"version":99}')});
  await page.waitForFunction(()=>document.getElementById('status').dataset.error==='true');
  if(await page.evaluate(()=>localStorage.getItem('forest-patrol-v1'))!==storage)throw Error('工具修改了玩家存档');
  if(errors.length)throw Error(errors.join('\n'));
  console.log({passed:true,viewports:[1440,390,320],downloads:true,worker:true,benchmark:true,storageIsolated:true});
}

