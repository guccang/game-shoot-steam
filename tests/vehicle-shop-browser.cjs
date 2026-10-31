// 载具双页签真实验收：只操作隔离存档，检查购买、安装、升级和窄屏展示。
async(page)=>{
 if(new URL(page.url()).port!=='4174')throw Error('仅允许隔离端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.destroy();const {freshProgress}=await import('/src/game.js');const p=freshProgress();p.weapons.fill(1);localStorage.setItem('forest-patrol-v1',JSON.stringify(p));});
 await page.reload();await page.locator('#vehicles-button').click();
 if(!await page.locator('#vehicle-upgrade').isDisabled())throw Error('余额不足可升级');
 await page.locator('#vehicle-tab-turrets').click();
 if(await page.locator('[data-turret-card]').count()!==12)throw Error('炮塔目录错误');
 if(!await page.locator('[data-turret-card="0"] [data-turret-action="buy"]').isDisabled())throw Error('基础炮塔免费购买');
 if(await page.locator('[data-turret-action="equip"]').count())throw Error('手持枪免费授予炮塔');
 await page.locator('[data-turret-filter="owned"]').click();
 if(await page.locator('[data-turret-card]').count())throw Error('已购筛选错误');
 await page.locator('[data-turret-filter="all"]').click();await page.keyboard.press('Escape');
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;Object.assign(a.game.progress,{coins:20000,wood:10000,bosses:30});a.save();});
 await page.locator('#start').click();
 await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;g.enemies=[];g.trees=[];g.spawnTimer=g.attackTimer=999;});
 await page.locator('#vehicle-button').click();
 if(!await page.locator('#vehicle-button').getAttribute('aria-label').then(s=>s.includes('未安装炮塔')))throw Error('空炮塔HUD错误');
 await page.locator('#vehicles-button').click();await page.locator('#vehicle-upgrade').click();
 if(await page.locator('#player-health').textContent()!=='280 / 280')throw Error('升级血条没刷新');
 await page.locator('#vehicle-tab-turrets').click();
 await page.locator('[data-turret-card="1"] [data-turret-action="buy"]').click();
 if(!await page.evaluate(async()=>{const p=(await import('/src/main.js')).application.game.progress;return p.vehicleWeapons[1]===1&&p.vehicleWeapon===null&&p.coins===18680&&p.wood===9530;}))throw Error('购买扣费或自动安装错误');
 await page.locator('[data-turret-card="1"] [data-turret-action="equip"]').click();
 await page.locator('[data-turret-card="1"] [data-turret-action="upgrade"]').click();
 if(await page.locator('[data-turret-card]').first().getAttribute('data-turret-card')!=='1')throw Error('当前炮塔未置顶');
 if(!await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return g.progress.vehicleWeapons[1]===2&&g.progress.weapons[1]===1&&g.vehicle.module.magazine.ammo===0&&g.vehicle.module.magazine.remaining===2.2;}))throw Error('升级补弹或污染主枪');
 const layouts=[];
 for(const width of [320,390,580]){
  await page.setViewportSize({width,height:width===320?568:width===580?928:844});
  for(const tab of ['hull','turrets']){
   await page.locator(`#vehicle-tab-${tab}`).click();
   await page.locator('#vehicle-collection-dialog').evaluate(n=>n.scrollTop=0);
   const bounds=await page.locator('#vehicle-collection-dialog').evaluate(n=>{const r=n.getBoundingClientRect();return {x:r.x,right:r.right,top:r.top,bottom:r.bottom,overflow:n.scrollWidth>n.clientWidth};});
   if(bounds.overflow||bounds.x<0||bounds.right>width||bounds.top<0)throw Error('载具面板溢出');
   await page.screenshot({path:`output/playwright/vehicle-upgrades/${tab}-${width}.png`});layouts.push({width,tab});
  }
 }
 await page.locator('#vehicle-tab-hull').focus();await page.keyboard.press('ArrowRight');
 if(await page.locator('#vehicle-tab-turrets').getAttribute('aria-selected')!=='true')throw Error('页签键盘切换失败');
 await page.keyboard.press('Escape');
 await page.locator('#weapons-button').click();await page.locator('[data-category="vehicles"]').click();
 if(!await page.locator('#vehicle-turrets-panel').isVisible())throw Error('武器工坊入口错误');
 await page.keyboard.press('Escape');
 if(!await page.locator('#camp-dialog').evaluate(n=>n.open))throw Error('未返回原工坊');
 await page.keyboard.press('Escape');await page.reload();
 if(!await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return g.progress.vehicleLevel===2&&g.progress.vehicleWeapons[1]===2&&g.progress.vehicleWeapon===1&&!g.vehicle.active;}))throw Error('存档恢复失败');
 if(errors.length)throw Error(errors.join('\n'));
 return {purchases:true,installation:true,upgrades:true,persistence:true,layouts,errors};
}
