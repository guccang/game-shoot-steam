// 正式页面验收中文目标选择、排序、边界与Worker报告；只使用隔离端口。
async page=>{
  if(new URL(page.url()).port!=='4174')throw Error('仅允许隔离端口');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:4174/balance.html');
  const storage=await page.evaluate(()=>localStorage.getItem('forest-patrol-v1'));
  await page.locator('#target-settings > summary').click();
  const rows=page.locator('.route-row');
  // 读取实际控件的内部映射，证明中文名称没有改变稳定装备身份。
  const read=()=>page.locator('.route-row').evaluateAll(nodes=>nodes.map(row=>[row.querySelector('.route-kind').value,Number(row.querySelector('.route-item').value)]));
  const defaults=[['weapons',3],['weapons',1],['vehicle',1],['vehicle',2],['weapons',13],['weapons',12]];
  if(JSON.stringify(await read())!==JSON.stringify(defaults))throw Error('默认路线变化');
  await rows.first().locator('.route-down').focus();await page.keyboard.press('Enter');
  if((await read())[0][1]!==1||!await rows.nth(1).locator('.route-down').evaluate(n=>n===document.activeElement))throw Error('键盘排序或跟随焦点失败');
  await rows.nth(1).locator('.route-up').click();
  await rows.first().locator('.route-kind').selectOption('vehicle');
  if(await rows.first().locator('.route-item option').count()!==4)throw Error('类别未过滤目录');
  await rows.first().locator('.route-item').selectOption({label:'飞行直升机'});
  if((await read())[0][1]!==2)throw Error('中文载具映射错误');
  await rows.first().locator('.route-kind').selectOption('weapons');
  await rows.first().locator('.route-item').selectOption({label:'橡果散弹枪'});
  await page.locator('.route-add').click();
  await rows.last().locator('.route-kind').selectOption('weapons');
  await rows.last().locator('.route-item').selectOption({label:'蜂群无人机'});
  await rows.last().locator('.route-up').click();await rows.nth(5).locator('.route-remove').click();
  if(JSON.stringify(await read())!==JSON.stringify(defaults))throw Error('添加移动删除改变其他装备');
  // 验收清空后的中文提示与重新添加，空路线不得悄悄回退到默认。
  while(await rows.count())await rows.first().locator('.route-remove').click();
  await page.locator('#run').click();
  if(!await page.locator('#status').innerText().then(t=>t.includes('添加至少一件')))throw Error('空路线缺少指引');
  if(!await page.locator('.route-add').isEnabled())throw Error('清空后不能恢复');
  // 三件自定义路线经真实选择、排序后，核对Worker输入与实际购买顺序。
  for(const [kind,index] of [['weapons',14],['weapons',2],['vehicle',1]]){
    await page.locator('.route-add').click();await rows.last().locator('.route-kind').selectOption(kind);await rows.last().locator('.route-item').selectOption(String(index));
  }
  await rows.last().locator('.route-up').click();
  const expected=[['weapons',14],['vehicle',1],['weapons',2]];
  await page.locator('#run').click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('模拟完成'),null,{timeout:180000});
  const downloadPromise=page.waitForEvent('download');await page.locator('#export-report').click();
  const download=await downloadPromise;await download.saveAs('output/playwright/route-custom-report.json');
  const stream=await download.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);
  const report=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if(JSON.stringify(report.scenario.route)!==JSON.stringify(expected)||JSON.stringify(report.representative.purchases.map(p=>[p.kind,p.index]))!==JSON.stringify(expected))throw Error('选择顺序未用于实际购买');
  for(let i=3;i<30;i++)await page.locator('.route-add').click();
  if(await rows.count()!==30||!await page.locator('.route-add').isDisabled())throw Error('30件边界未生效');
  await rows.last().locator('.route-remove').click();
  if(!await page.locator('.route-add').isEnabled())throw Error('删除后上限未恢复');
  await page.goto('http://localhost:4174/balance.html');await page.locator('#target-settings > summary').click();
  const checks=[];
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:1000});
    const result=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectBalanceRoute(document));
    if(result.overflow||!result.firstUpDisabled||!result.lastDownDisabled||result.count!==6||result.names[5]!=='星环浮游炮')throw Error('中文路线布局不合格');
    if(await page.locator('#target-route textarea').count())throw Error('仍需手填路线');
    await page.locator('#target-settings').screenshot({path:'output/playwright/route-picker-'+width+'.png'});checks.push({width,...result});
  }
  if(await page.evaluate(()=>localStorage.getItem('forest-patrol-v1'))!==storage)throw Error('修改了游戏存档');
  if(errors.length)throw Error(errors.join('\n'));
  return {checks,keyboard:true,emptyRecovery:true,maxTargets:30,reportRoute:report.scenario.route,purchases:report.representative.purchases.map(p=>p.name),errors};
}
