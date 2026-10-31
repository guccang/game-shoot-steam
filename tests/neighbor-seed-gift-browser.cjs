// 旧档首次播种回归：写入独立测试档，经正式读档补发，再用真实点击播种。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:390,height:844});await page.goto('http://localhost:4175');await page.locator('#start').click();
 await page.evaluate(async()=>{
  const app=(await import('/src/main.js')).application;await app.ready;app.game.state='paused';
  const p=(await import('/src/progression/progress.js')).freshRangerProgress();p.arrival=null;p.mainline={...p.mainline,version:6,completed:['first-map'],phase:'doing'};
  p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.farm.wildMaps=['forest','jiuzhaigou'];p.farm.delivery.nextAt=Date.now()+3600000;p.farm.dug=1;p.farm.nextId=1;p.farm.plots=[{id:0,mapId:'forest',x:803.25,y:643.5,crop:null,plantedAt:0,readyAt:0,watered:false}];
  app.game.progress=p;localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
 });
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.seedApp=(await import('/src/main.js')).application;await seedApp.ready;const g=seedApp.game;g.mainlineTalkDelay=999999;Object.assign(g.player,{x:803.25,y:719.5});g.enemies=[];g.fireClock=99999;seedApp.renderer.camera.time=null;seedApp.refresh();});
 const gift=await page.evaluate(()=>({count:seedApp.game.progress.farm.seeds[0],unlocked:seedApp.game.progress.farm.unlocked[0]}));if(gift.count!==3||!gift.unlocked)throw Error('旧档赠种未到账 '+JSON.stringify(gift));
 await page.locator('#mainline-hud').click();await page.locator('[data-farm-cell="0"]').click();await page.locator('[data-farm-seed="0"]').waitFor({state:'visible'});
 await page.screenshot({path:'output/playwright/equipment-seeds/old-save-seeds.png'});
 await page.locator('[data-farm-seed="0"]').click();await page.locator('[data-farm-cell="0"]').click();await page.waitForFunction(()=>seedApp.game.progress.farm.planted===1&&!seedApp.game.farmWork?.job);
 if(!await page.evaluate(()=>seedApp.game.progress.farm.seeds[0]===2))throw Error('赠送种子未实际消耗播种');await page.evaluate(()=>seedApp.save());
 await page.reload();await page.locator('#start').click();await page.evaluate(async()=>{window.seedApp=(await import('/src/main.js')).application;await seedApp.ready;});
 const after=await page.evaluate(()=>seedApp.game.progress.farm.seeds[0]);if(after!==2)throw Error('刷新重复赠种');if(errors.length)throw Error(errors.join('\n'));return {gift,planted:true,afterReload:after,errors};
}
