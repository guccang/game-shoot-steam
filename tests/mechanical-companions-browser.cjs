// 隔离端口实际配置、键盘/触控挂载与四车型召唤武器试射验收。
async page => {
 if(new URL(page.url()).port!=='4197')throw Error('仅允许隔离端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.reload();await page.setViewportSize({width:1280,height:960});
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application,{freshProgress}=await import('/src/progression/progress.js');
  const p=freshProgress();p.weapons.fill(1);p.vehicleWeapons.fill(1);p.vehicleHulls.fill(1);p.weapon=15;p.weaponParts[15].coordination=p.turretParts[15].coordination=8;
  p.coins=p.wood=999999;p.bosses=100;p.materials={parts:9999,crystal:9999,core:999};a.game.progress=p;a.game.reset();a.game.state='ready';a.save();a.refresh();
  const {catSprites}=await import('/src/rendering/cat-animation.js');if(!await catSprites.load())throw Error('角色资源缺失');
 });
 await page.locator('#weapons-button').click();await page.locator('#ws-mechanical').click();
 await page.locator('[data-mechanical-gun="9"]').focus();await page.keyboard.press('Enter');
 if((await page.locator('[data-mechanical-gun="9"]').getAttribute('aria-pressed'))!=='true')throw Error('键盘配置失败');
 await page.screenshot({path:'output/playwright/mechanical-companions/config-desktop.png'});
 await page.locator('#mechanical-done').click();await page.locator('#ws-test').click();await page.waitForTimeout(2600);
 await page.screenshot({path:'output/playwright/mechanical-companions/trial-pulse.png'});await page.locator('#ws-trial-stop').click();
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 for(const width of [320,390]) {
  await page.setViewportSize({width,height:844});await page.locator('#ws-mechanical').click();
  const choice=page.locator(width===320?'[data-mechanical-gun="0"]':'[data-mechanical-gun="1"]');await choice.scrollIntoViewIfNeeded();const b=await choice.boundingBox();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  if(await choice.getAttribute('aria-pressed')!=='true')throw Error('手机配置失败');
  await page.screenshot({path:`output/playwright/mechanical-companions/config-${width}.png`});
  if(await page.locator('#mechanical-dialog').evaluate(n=>n.scrollWidth>n.clientWidth+1))throw Error('配置横溢出');
  await page.locator('#mechanical-done').click();await page.locator('#ws-test').click();await page.waitForTimeout(1700);
  await page.screenshot({path:`output/playwright/mechanical-companions/trial-${width}.png`});await page.locator('#ws-trial-stop').click();
 }
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
 await page.setViewportSize({width:1280,height:960});await page.locator('[data-ws-mode="vehicle"]').click();
 const layouts=[];
 for(let hull=0;hull<4;hull++){
  await page.locator(`[data-ws-item="${hull}"]`).click();await page.locator('#ws-kits-tab').click();
  for(const index of [12,13,15]){
   await page.locator(`[data-ws-part="${index}"]`).focus();await page.keyboard.press('Enter');
   await page.locator('#ws-socket').focus();await page.keyboard.press('Enter');await page.locator('#ws-confirm').click();
   const selected=await page.evaluate(async()=>{const p=(await import('/src/main.js')).application.game.progress;return {loadouts:p.vehicleLoadouts,index:p.vehicleIndex};});
   if(selected.loadouts[hull]!==index||selected.index!==0)throw Error('配置改变目标载具或出战车');
   layouts.push(await page.locator('#ws-stage').boundingBox());
   await page.locator('#ws-test').click();await page.waitForTimeout(1400);await page.screenshot({path:`output/playwright/mechanical-companions/vehicle-${hull}-${index}.png`});await page.locator('#ws-trial-stop').click();
  }
 }
 if(layouts.some(r=>Math.abs(r.width-layouts[0].width)>1||Math.abs(r.height-layouts[0].height)>1))throw Error('舞台尺寸变化');
 await page.locator('#ws-mechanical').click();await page.locator('[data-mechanical-gun="melee"]').click();await page.locator('#mechanical-done').click();
 await page.locator('#ws-close').click();await page.reload();
 const saved=await page.evaluate(async()=>structuredClone((await import('/src/main.js')).application.game.progress));
 if(saved.mechanicalLoadout!==null||saved.vehicleLoadouts.some(i=>i!==15))throw Error('配置刷新丢失');
 if(errors.length)throw Error(errors.join('\n'));return {vehicleTrials:12,inputs:['mouse','keyboard','touch320','touch390'],layouts};
}
