// 已打开游戏中的真实按钮交易、长按升级、演练和正式绘制器连续采样。
async page=>{
 await page.mouse.up();page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(await page.locator('#ws-close').isVisible())await page.locator('#ws-close').click();
 await page.evaluate(()=>{const p=a.game.progress;p.hero=0;p.heroes[6]=0;p.vehicleIndex=5;p.vehicleHulls[8]=0;p.vehicleLoadouts[8]=null;p.campParking.owned=p.campParking.owned.filter(v=>v.hull!==8);a.refresh();});
 await page.locator('#field-menu-toggle').click();await page.locator('#heroes-button').click();
 const recruit=page.locator('#inventory [data-action="buy"][data-index="6"]');await recruit.scrollIntoViewIfNeeded();
 await page.screenshot({path:'output/playwright/police-patrol/recruit.png'});await recruit.click();
 if(await page.evaluate(()=>a.game.progress.hero)!==6)throw Error('警察猫招募失败');
 await page.locator('#inventory [data-action="upgrade"][data-index="6"]').click();
 if(await page.evaluate(()=>a.game.progress.heroes[6])!==2)throw Error('警察猫升级失败');
 await page.evaluate(()=>a.workshop.open('vehicle',8));await page.locator('#ws-purchase').click();
 await page.waitForFunction(()=>a.game.progress.vehicleHulls[8]===1);
 await page.locator('#ws-function-upgrade').click();await page.locator('[data-ws-item="8"]').click();
 await page.locator('[data-ws-upgrade="armor"]').click();
 await page.waitForFunction(()=>!document.getElementById('ws-hold').disabled);await page.waitForTimeout(200);
 const hold=await page.locator('#ws-hold').boundingBox();await page.mouse.move(hold.x+hold.width/2,hold.y+hold.height/2);await page.mouse.down();
 await page.waitForFunction(()=>a.game.progress.vehicleHulls[8]===2);await page.mouse.up();
 await page.screenshot({path:'output/playwright/police-patrol/upgraded.png'});
 // 切回车体原页，确认真实演练按钮可进入并产生伤害。
 await page.locator('[data-ws-item="8"]').click();await page.locator('#ws-test').click();
 await page.waitForFunction(async()=>{const r=(await import('/src/ui/workshop/trial-scene.js')).inspectWeaponTrialScene(document.getElementById('weapon-trial-dialog'));return r?.damage>0;},{},{timeout:20000});
 await page.screenshot({path:'output/playwright/police-patrol/trial.png'});await page.locator('#weapon-trial-close').click();await page.locator('#ws-close').click();
 // 正式工作台采样器输出连续帧，不另画替代警车或猫。
 if(await page.locator('#camp-dialog').isVisible())await page.locator('#camp-dialog').evaluate(d=>d.close());
 await page.setViewportSize({width:1000,height:600});
 await page.evaluate(async()=>{
  const canvas=document.createElement('canvas');canvas.id='police-review';canvas.width=1000;canvas.height=600;canvas.style='position:fixed;inset:0;z-index:99999;background:#e9e5c7';document.body.append(canvas);
  const c=canvas.getContext('2d'),{renderVisualCase}=await import('/src/rendering/visual-review.js');
  for(let i=0;i<5;i++)for(let row=0;row<2;row++){
   const tile=document.createElement('canvas');tile.width=480;tile.height=360;await renderVisualCase(tile.getContext('2d'),row?'police-car-motion':'hero-breed-6',i*.4);
   c.drawImage(tile,i*200,row*300+65,200,150);c.fillStyle='#315c43';c.font='16px sans-serif';c.fillText((row?'警车':'警察猫')+' · '+(i*.4).toFixed(1),i*200+25,row*300+20);
  }
 });
 await page.screenshot({path:'output/playwright/police-patrol/motion.png'});await page.evaluate(()=>document.getElementById('police-review').remove());
 const result=await page.evaluate(async()=>({hero:a.game.progress.heroes[6],car:a.game.progress.vehicleHulls[8],parked:a.game.progress.campParking.owned.some(v=>v.hull===8),atlas:(await import('/src/rendering/cat-animation.js')).catSprites.stats()}));
 if(errors.length)throw Error(errors.join('\n'));return {result,errors};
}
