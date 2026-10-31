// 工作台实机验收：配置导入导出与校验、短时100种子、候选隔离、桌面和手机布局。
async page=>{
 if(new URL(page.url()).port!=='4288')throw Error('仅运行于隔离验收端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:4288/balance.html');
 await page.locator('#param-clearing-coins-0').waitFor({state:'attached'});
 const config=JSON.parse(await page.locator('#config-json').inputValue());if(config.version!==3)throw Error('版本不正确');
 const invalid=structuredClone(config);invalid.taskRewards['first-map'].coins=-1;
 await page.locator('#config-file').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(invalid))});
 await page.waitForFunction(()=>document.querySelector('#status').dataset.error==='true');
 if(JSON.parse(await page.locator('#config-json').inputValue()).taskRewards['first-map'].coins!==60)throw Error('非法配置污染候选');
 const custom=structuredClone(config);custom.taskRewards['first-map'].coins=61;
 await page.locator('#config-file').setInputFiles({name:'candidate.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(custom))});
 await page.waitForFunction(()=>JSON.parse(document.querySelector('#config-json').value).taskRewards['first-map'].coins===61);
 const download=page.waitForEvent('download');await page.locator('#export-config').click();await (await download).saveAs('output/playwright/task-cadence/export.json');
 const formal=await page.evaluate(async()=>(await import('/src/config/economy.js')).RECOMMENDED_ECONOMY.taskRewards['first-map'].coins);if(formal!==60)throw Error('候选修改了正式参数');
 await page.locator('#config-file').setInputFiles({name:'formal.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(config))});
 await page.locator('#collection').selectOption('hovercraft');await page.locator('#collection').selectOption('none');
 const layouts=[];
 for(const width of [1280,390,320]){
  await page.setViewportSize({width,height:width===1280?900:844});
  await page.locator('#parameter-editor > details').filter({has:page.locator('summary',{hasText:'清缴整波预算'})}).evaluate(el=>el.open=true);
  await page.locator('#param-clearing-groupGrowth').scrollIntoViewIfNeeded();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);if(overflow)throw Error('工作台溢出 '+width);
  await page.screenshot({path:`output/playwright/task-cadence/balance-${width}.png`});layouts.push({width,overflow});
 }
 await page.locator('#minutes').fill('15');await page.locator('#run').click();
 await page.waitForFunction(()=>!document.querySelector('#run').disabled,null,{timeout:45000});
 if((await page.locator('#status').getAttribute('data-error'))==='true')throw Error(await page.locator('#status').innerText());
 const result=await page.locator('#completion-label').innerText();if(!result.includes('100'))throw Error('缺少全部样本');
 if(!await page.locator('#task-timeline').textContent())throw Error('主线奖励时间轴缺失');
 await page.locator('#task-timeline').evaluate(el=>el.closest('details').open=true);await page.locator('#task-timeline').scrollIntoViewIfNeeded();
 await page.screenshot({path:'output/playwright/task-cadence/task-timeline-320.png'});
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('任务时间轴溢出');
 if(errors.length)throw Error(errors.join('\n'));
 return {errors,layouts,result,roundTrip:true,candidateIsolated:true};
}
