// 载具从同一工坊入口进入正式机动演练，记录昼夜驾驶与回到原选项。
async page=>{
 if(new URL(page.url()).port!=='4292')throw Error('仅限隔离验收端口');
 await page.evaluate(()=>{document.getElementById('weapon-trial-close').click();});
 await page.waitForTimeout(80);
 await page.evaluate(()=>a.workshop.open('vehicle',2));
 const before=await page.evaluate(()=>JSON.stringify(a.game.progress));
 await page.locator('#ws-test').click();
 await page.waitForFunction(()=>readTrial(document.getElementById('weapon-trial-dialog'))?.elapsed>.5);
 const start=await page.evaluate(()=>readTrial(document.getElementById('weapon-trial-dialog')));
 await page.keyboard.down('ArrowLeft');await page.waitForTimeout(600);await page.keyboard.up('ArrowLeft');
 const moved=await page.evaluate(()=>readTrial(document.getElementById('weapon-trial-dialog')));
 if(moved.player.x>=start.player.x-20)throw Error('载具移动失败');
 await page.waitForTimeout(2000);
 await page.screenshot({path:'output/playwright/trial-vehicle-day.png'});
 await page.locator('#weapon-trial-time').click();await page.screenshot({path:'output/playwright/trial-vehicle-night.png'});
 await page.locator('#weapon-trial-close').click();await page.waitForTimeout(80);
 if(await page.evaluate(()=>JSON.stringify(a.game.progress))!==before)throw Error('试车污染正式存档');
 await page.evaluate(result=>window.weaponTrialVehicleResult=result,{moved:Math.round(start.player.x-moved.player.x),isolated:true});
}
