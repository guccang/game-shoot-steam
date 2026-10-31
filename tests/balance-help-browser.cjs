// 实际页面验收内嵌说明：键盘展开、参数重绘、说明方向与手机布局，不改正式玩家存档。
async page=>{
  if(new URL(page.url()).port!=='4174')throw Error('仅允许隔离端口');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:4174/balance.html');
  await page.setViewportSize({width:1440,height:1000});
  const storage=await page.evaluate(()=>localStorage.getItem('forest-patrol-v1'));
  const guide=page.locator('#usage-guide');
  await guide.locator(':scope > summary').focus();await page.keyboard.press('Enter');
  if(await guide.getAttribute('open')!==null)throw Error('指南不能键盘收起');
  await page.keyboard.press('Enter');
  await page.locator('.tuning-guide > summary').click();
  if(!await page.locator('.tuning-guide').innerText().then(t=>t.includes('一个增加产出')||t.includes('产出、一个减少消耗')))throw Error('缺少反向木材说明');
  await page.locator('.guide-wrap').screenshot({path:'output/playwright/help-guide-desktop.png'});
  await page.locator('.tuning-guide > summary').click();
  const checks=[];
  // 试射说明增加高度后，武器与等级输入仍保持同一水平起点。
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});
    const weapon=await page.locator('#bench-weapon').boundingBox(),level=await page.locator('#bench-level').boundingBox();
    if(Math.abs(weapon.y-level.y)>2)throw Error('试射输入错位');
    await page.locator('#benchmark').locator('xpath=ancestor::section').screenshot({path:'output/playwright/help-bench-'+width+'.png'});
  }
  // 检查每个经济输入都关联可读说明，并且模拟路线假设独立显示。
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:1000});
    const check=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectBalanceHelp(document));
    if(check.overflow||check.guideSteps!==6||!check.parameters||check.explained!==check.parameters)throw Error('说明覆盖或布局不合格 '+JSON.stringify(check));
    checks.push({width,...check});
    if(width!==1440)await page.locator('.guide-wrap').screenshot({path:'output/playwright/help-guide-'+width+'.png'});
  }
  await page.locator('#parameter-editor > details > summary').filter({hasText:'升级费用'}).click();
  const exponent=page.locator('#help-param-upgrades-exponent details');
  await exponent.locator('summary').focus();await page.keyboard.press('Enter');
  if(!await exponent.innerText().then(t=>t.includes('后期费用')&&t.includes('上限')))throw Error('指数影响未解释封顶条件');
  await page.locator('#parameter-editor summary').filter({hasText:'单次金币费用上限'}).click();
  await page.locator('#help-param-upgrades-ceilings-weapons summary').click();
  if(!await page.locator('#help-param-upgrades-ceilings-weapons').innerText().then(t=>t.includes('调低')&&t.includes('追赶折扣之前')))throw Error('费用上限说明缺失');
  await page.locator('#param-upgrades-ceilings-weapons').fill('400');
  if(!await page.locator('#config-json').inputValue().then(t=>JSON.parse(t).upgrades.ceilings.weapons===400))throw Error('说明破坏参数编辑');
  await page.locator('#parameter-section').screenshot({path:'output/playwright/help-parameters-320.png'});
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('#parameter-section').screenshot({path:'output/playwright/help-parameters-desktop.png'});
  await page.locator('#preset').selectOption('original');
  if(!await page.locator('#help-param-growth-weapon').textContent().then(t=>t.includes('原版对照')))throw Error('旧规则提示未随重绘更新');
  await page.locator('#preset').selectOption('recommended');
  if(!await page.locator('#help-param-growth-weapon').textContent().then(t=>t.includes('1.08')))throw Error('推荐说明未恢复');
  if(!await page.locator('#help-param-drops-crystal-favoredPity').textContent().then(t=>t.includes('调低更早保底')))throw Error('保底方向错误');
  if(!await page.locator('#help-rate-workshopMinutes').textContent().then(t=>t.includes('没有升级冷却')))throw Error('回访假设未区分正式规则');
  if(!await page.locator('#target-route .route-item').last().inputValue().then(v=>v==='12'))throw Error('中文目标选择没有保留默认路线');
  await page.locator('#run').click();
  await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('模拟完成'),null,{timeout:180000});
  await page.locator('.result-help > summary').click();
  await page.locator('#summary-panel').screenshot({path:'output/playwright/help-results-desktop.png'});
  if(!await page.locator('#completion-label').innerText().then(t=>t==='100/100 组完成'))throw Error('指南接入后默认模拟异常');
  if(await page.evaluate(()=>localStorage.getItem('forest-patrol-v1'))!==storage)throw Error('工作台改变了玩家存档');
  if(errors.length)throw Error(errors.join('\n'));
  return {checks,keyboard:true,editing:true,baselineSwitch:true,simulation:true,storageIsolated:true,errors};
}
