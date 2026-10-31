// 新载具无挂载预览回归，两个独立工坊桌面和手机不溢出。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.reload();await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;if(a.game.arrivalPending)throw Error('Completed save replayed');window.rangerTick=Object.getPrototypeOf(a.game).update.bind(a.game);a.game.update=()=>{};});await page.locator('#start').click();
 for(const [width,height,label]of [[1280,900,'desktop'],[390,844,'390'],[320,740,'320']]){
  await page.setViewportSize({width,height});
  for(const kind of ['weapons','vehicle']){
   await page.evaluate(async kind=>{(await import('/src/main.js')).application.workshop.open(kind,kind==='vehicle'?5:0);},kind);
   if(await page.locator('#workshop-title').textContent()!==(kind==='vehicle'?'载具工坊':'武器工坊'))throw Error('Workshop identity');
   if(await page.locator('[data-ws-mode]').count())throw Error('Combined category tabs remain');
   if(kind==='vehicle'&&(!await page.locator('#ws-kits-tab').isDisabled()||await page.locator('#ws-parts button').count()))throw Error('Scooter has weapons');
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow');
   await page.screenshot({path:`output/playwright/ranger-${kind}-${label}.png`});await page.locator('#ws-close').click();
  }
 }
 if(errors.length)throw Error(errors.join('\n'));
}
