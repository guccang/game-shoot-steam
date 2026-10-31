// 正式隔离试玩补充角色、怪物、坦克与界面文字的昼夜同屏证据。
async (page) => {
  await page.setViewportSize({width:1400,height:1100});
  await page.goto('http://localhost:4199/gatling-preview.html?lang=en-US');
  const scene=page.frameLocator('#scene');
  await scene.locator('#player-name').filter({hasText:'Chestnut'}).waitFor();
  await page.locator('[data-command="tank"]').click();
  const checks=[];
  for(const width of [1280,390,320]){
    await page.locator('#size').selectOption(String(width));
    for(const time of ['day','night']){
      await page.waitForFunction(()=>{try{return JSON.parse(document.getElementById('report').textContent).tank;}catch{return false;}});
      const status=JSON.parse(await page.locator('#report').textContent());
      if(status.time!==time)await page.locator('[data-command="night"]').click();
      await page.waitForFunction(time=>{try{return JSON.parse(document.getElementById('report').textContent).time===time;}catch{return false;}},time);
      await page.waitForTimeout(500);
      await page.locator('#scene').screenshot({path:'output/playwright/font-tank-'+width+'-'+time+'.png'});
      checks.push({width,time,font:await scene.locator('html').getAttribute('data-font-status')});
    }
  }
  return checks;
}
