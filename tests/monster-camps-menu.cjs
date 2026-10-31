// 入口数量增加后的短屏回归：实际滚动到菜单项并打开同一正式面板。
async page=>{
 const samples=[];
 for(const [width,height] of [[320,568],[844,390]]){
  await page.setViewportSize({width,height});
  if(await page.locator('#field-menu-toggle').getAttribute('aria-expanded')!=='true')await page.locator('#field-menu-toggle').click();
  const bounds=await page.locator('#field-menu-items').boundingBox();if(bounds.y<0||bounds.y+bounds.height>height)throw Error('菜单超出短屏');
  await page.locator('#monster-camps-menu').click();if(!await page.locator('#monster-camps-dialog').isVisible())throw Error('菜单无法打开营地目录');
  await page.locator('[data-camp-close]').click();
  if(await page.locator('#field-menu-toggle').getAttribute('aria-expanded')!=='true')await page.locator('#field-menu-toggle').click();
  await page.locator('#field-menu-items').evaluate(n=>n.scrollTop=0);
  await page.screenshot({path:`output/playwright/monster-camps/menu-${width}.png`});samples.push({width,height,bounds});
 }
 return samples;
}
