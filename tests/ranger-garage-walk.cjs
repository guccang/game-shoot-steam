// 入库局部动作和车库绕行：前半段从正式检查点重建；后半段只检查完成后的场景遮挡与通路。
async page=>{
 await page.reload();await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;a.menu.enter();a.game.start();window.garageGame=a.game;window.garageTick=Object.getPrototypeOf(a.game).update.bind(a.game);a.game.update=()=>{};a.game.progress.arrival.phase='dismount';a.game.progress.arrival.elapsed=0;(await import('/src/core/ranger-arrival.js')).restoreArrival(a.game);a.refresh();});
 // 使用真实速度完成下车与倒推，每0.5秒留下连续动作采样，并检查车在下车期间没有移动。
 for(let i=0;i<20;i++){
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.update=window.garageTick;});await page.waitForTimeout(500);await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.update=()=>{};if(a.game.progress.arrival.phase==='dismount'&&a.game.arrivalScene.scooter.y!==705)throw Error('Moving before dismount');});await page.screenshot({path:`output/playwright/garage-motion-${String(i).padStart(2,'0')}.png`});
 }
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.progress.arrival.phase='complete';g.arrivalScene=null;g.enemies=[];g.spawnTimer=9999;g.waveWarning=9999;a.refresh();});
 await page.setViewportSize({width:390,height:844});
 for(const [x,y,label] of [[265,710,'front'],[265,615,'inside'],[265,710,'exit'],[395,720,'right-front'],[395,470,'right-back'],[265,460,'behind'],[135,470,'left-back'],[135,650,'left'],[200,700,'return']]){
  await page.evaluate(async({x,y})=>{const a=(await import('/src/main.js')).application,g=a.game;let n=0;while(Math.hypot(g.player.x-x,g.player.y-y)>8&&n++<600){const dx=x-g.player.x,dy=y-g.player.y,d=Math.hypot(dx,dy);window.garageTick(.05,{x:dx/d,y:dy/d});}if(n>=600)throw Error('Garage route blocked');a.refresh();a.renderer.draw();},{x,y});await page.waitForTimeout(100);await page.screenshot({path:`output/playwright/garage-walk-${label}.png`});
 }
}
