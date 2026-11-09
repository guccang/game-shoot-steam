// 满级部件、手机工坊与低动态补充验收，只操作隔离测试进度。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const report={motion:await page.evaluate(()=>window.motion)};
 await page.evaluate(async()=>{const a=reviewApp,{debugGrantProgress}=await import('/src/progression/player/debug-grants.js');a.game.progress=debugGrantProgress(debugGrantProgress(a.game.progress,'max-weapons'),'max-vehicles');a.game.progress.vehicleIndex=6;a.game.reset();a.game.state='playing';a.game.summonVehicle();a.game.updateWaves=()=>{};a.game.enemies=[];Object.assign(a.game.player,{x:350,y:1260});a.game.trees=a.game.trees.filter(t=>Math.hypot(t.x-350,t.y-1260)>300);a.refresh();});
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:844});await page.waitForTimeout(200);await page.screenshot({path:'output/playwright/gravity-gun-redwolf/max-reduced-320.png'});
 for(const [kind,index] of [['vehicle',6],['weapons',17]]){await page.evaluate(({kind,index})=>reviewApp.workshop.open(kind,index),{kind,index});await page.screenshot({path:`output/playwright/gravity-gun-redwolf/${kind}-max-shop-320.png`});if(await page.locator('#workshop-dialog').evaluate(e=>e.scrollWidth>e.clientWidth+1))throw Error('手机工坊溢出');await page.locator('#ws-close').click();}
 await page.emulateMedia({reducedMotion:'no-preference'});report.errors=errors;if(errors.length)throw Error(errors.join('\n'));return report;
}
