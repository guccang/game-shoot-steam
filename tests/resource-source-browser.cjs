// 资源分工工作台验收：真实控件、文件导入导出、短批次Worker及手机布局。
async page=>{
 if(new URL(page.url()).port!=='4288')throw Error('仅允许隔离端口');
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://localhost:4288/balance.html');await page.setViewportSize({width:1440,height:960});
 const storage=await page.evaluate(()=>localStorage.getItem('forest-patrol-v1'));
 const initial=JSON.parse(await page.locator('#config-json').inputValue());
 if(initial.version!==4||initial.tree.coins!==0||initial.enemy.woodRatio!==0||initial.boss.wood!==0)throw Error('资源职责配置错误');
 if(await page.locator('#weight-logging').inputValue()!=='0.05'||await page.locator('#rate-treeRate').inputValue()!=='60')throw Error('默认采集情景错误');
 await page.locator('#parameter-editor > details > summary').filter({hasText:'清缴金币与材料预算'}).click();
 await page.locator('#param-clearing-perKill').uncheck();
 if(!await page.getByText('整波金币预算',{exact:true}).isVisible()||await page.locator('#param-clearing-perKill').isChecked())throw Error('整波语义未同步');
 await page.locator('#param-clearing-perKill').check();
 await page.getByText('单怪金币（各波位置）',{exact:true}).click();
 await page.locator('#param-clearing-coins-0').fill('29');
 if(JSON.parse(await page.locator('#config-json').inputValue()).clearing.coins[0]!==29)throw Error('编辑未进入候选');
 const downloadPromise=page.waitForEvent('download');await page.locator('#export-config').click();
 await(await downloadPromise).saveAs('output/playwright/resource-source/config.json');
 await page.locator('#preset').selectOption('original');
 await page.locator('#config-file').setInputFiles('output/playwright/resource-source/config.json');
 await page.waitForFunction(()=>JSON.parse(document.getElementById('config-json').value).clearing.coins[0]===29);
 const accepted=await page.locator('#config-json').inputValue(),invalid=JSON.parse(accepted);invalid.clearing.perKill=1;
 await page.locator('#config-file').setInputFiles({name:'非法配置.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(invalid))});
 await page.waitForFunction(()=>document.getElementById('status').dataset.error==='true');
 if(await page.locator('#config-json').inputValue()!==accepted)throw Error('非法导入污染候选');
 await page.locator('#preset').selectOption('recommended');
 await page.locator('#minutes').fill('15');await page.locator('#run').click();
 await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('模拟完成'),null,{timeout:60000});
 if(!await page.locator('#completion-label').innerText().then(t=>t==='0/100 组完成'))throw Error('短观察窗隐藏未完成样本');
 const layouts=[];
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:960});
  await page.locator('#parameter-editor > details > summary').filter({hasText:'清缴金币与材料预算'}).click();
  await page.locator('#param-clearing-perKill').scrollIntoViewIfNeeded();
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('页面横向溢出 '+width);
  await page.screenshot({path:`output/playwright/resource-source/workbench-${width}.png`});
  layouts.push({width,overflow:false});
  await page.locator('#parameter-editor > details > summary').filter({hasText:'清缴金币与材料预算'}).click();
 }
 await page.locator('#parameter-editor > details > summary').filter({hasText:'升级费用'}).click();
 await page.getByText('单次木材费用上限（追赶前）',{exact:true}).click();
 await page.locator('#param-upgrades-woodCeilings-weapons').fill('170');
 if(JSON.parse(await page.locator('#config-json').inputValue()).upgrades.woodCeilings.weapons!==170)throw Error('木材上限编辑失败');
 await page.locator('#param-upgrades-woodCeilings-weapons').scrollIntoViewIfNeeded();
 await page.screenshot({path:'output/playwright/resource-source/wood-cap-320.png'});
 if(await page.evaluate(()=>localStorage.getItem('forest-patrol-v1'))!==storage)throw Error('工作台污染存档');
 if(errors.length)throw Error(errors.join('\n'));
 return {designCriterion:'economy-workbench-feedback',configRoundTrip:true,invalidRejected:true,workerSamples:100,layouts,errors};
}
