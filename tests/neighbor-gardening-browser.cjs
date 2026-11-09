// 邻里种植任务全流程；请使用独立浏览器会话，并先创建 output/playwright/neighbor-quests 截图目录。
async page=>{
 const setup=// 独立浏览器使用4175正式服务，不修改已有服务或用户存档。
async page=>{
 await page.setViewportSize({width:390,height:844});await page.goto('http://localhost:4175');await page.locator('#start').click();
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application;await a.ready;window.questApp=a;
  const p=(await import('/src/progression/progress.js')).freshRangerProgress();p.arrival=null;p.mainline.completed=['first-map'];p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.coins=100;p.wood=100;p.weapon=0;p.weapons[0]=1;p.farm.delivery.nextAt=Date.now()+3600000;p.farm.wildMaps=['forest','jiuzhaigou'];
  const g=a.game;g.progress=p;g.mapId='forest';g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=0;g.fireClock=999999;g.enemies=[];g.boss=null;
  Object.assign(g.player,(await import('/src/config/mainline.js')).MAINLINE_SITES.camp,{invincible:99999});for(const d of document.querySelectorAll('dialog[open]'))d.close();a.renderer.camera.time=null;a.refresh();
 });
 await page.locator('#mainline-speech-skip').waitFor({state:'visible'});return await page.locator('#mainline-speech').innerText();
}
;
 const seeds=// 找种与购种实测：远路用定位夹具省时，营地清空、柜台及交付使用正式运行时。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(await page.evaluate(()=>questApp.game.progress.mainline.phase==='meet'))await page.locator('#mainline-speech-skip').click();
 await page.evaluate(async()=>{const g=questApp.game,c=(await import('/src/config/monster-camps.js')).MONSTER_CAMPS[0];Object.assign(g.player,c,{vx:0,vy:0,invincible:99999});(await import('/src/core/battle/monster-camps.js')).updateMonsterCamps(g,.04);for(const e of [...g.enemies].filter(e=>e.monsterCamp===c.id))g.hit(e,99999);questApp.renderer.camera.time=null;questApp.refresh();});
 await page.waitForFunction(()=>questApp.game.progress.mainline.gardening.seedDrops===1);
 const drop=await page.evaluate(async()=>({seeds:questApp.game.progress.farm.seeds[0],unlocked:questApp.game.progress.farm.unlocked[0],destination:(await import('/src/core/navigation/world-navigation.js')).worldNavigationObjective(questApp.game)?.key}));
 if(!drop.seeds||!drop.unlocked||drop.destination!=='camp')throw Error('营地清空未掉种或返程目标不对 '+JSON.stringify(drop));
 await page.screenshot({path:'output/playwright/neighbor-quests/01-seed-found.png'});
 await page.evaluate(async()=>{Object.assign(questApp.game.player,(await import('/src/config/mainline.js')).MAINLINE_SITES.camp,{vx:0,vy:0});questApp.game.mainlineTalkDelay=0;questApp.renderer.camera.time=null;questApp.refresh();});
 await page.locator('#mainline-speech-skip').waitFor({state:'visible'});
 const before=await page.evaluate(()=>questApp.game.progress.farm.seeds[0]);await page.locator('#mainline-speech-skip').click();await page.locator('#task-reward-close').click();
 if(await page.evaluate(n=>questApp.game.progress.farm.seeds[0]!==n-1,before))throw Error('未交付一粒种子');
 await page.waitForFunction(()=>questApp.game.mainlineSpeech?.id==='neighbor-seed-shop');await page.locator('#mainline-speech-skip').click();
 await page.evaluate(async()=>{Object.assign(questApp.game.player,(await import('/src/config/farm.js')).FARM_SEED_DOOR,{vx:0,vy:0});questApp.renderer.camera.time=null;questApp.refresh();});
 await page.locator('#mainline-hud').click();await page.locator('#seed-shop-dialog').waitFor({state:'visible'});
 const coins=await page.evaluate(()=>questApp.game.progress.coins);const buy=page.locator('[data-buy-seed="0"][data-count="1"]');await buy.click();await buy.click();
 const purchase=await page.evaluate(()=>({purchased:questApp.game.progress.mainline.gardening.purchased,coins:questApp.game.progress.coins,seeds:questApp.game.progress.farm.seeds[0]}));
 if(purchase.purchased!==2||purchase.coins!==coins-20)throw Error('柜台购买未真实扣款或未推进');
 await page.screenshot({path:'output/playwright/neighbor-quests/02-seed-shop.png'});await page.locator('#seed-shop-close').click();
 await page.evaluate(async()=>{Object.assign(questApp.game.player,(await import('/src/config/mainline.js')).MAINLINE_SITES.camp,{vx:0,vy:0});questApp.game.mainlineTalkDelay=0;questApp.renderer.camera.time=null;questApp.refresh();});
 await page.locator('#mainline-speech-skip').waitFor({state:'visible'});await page.locator('#mainline-speech-pause').click();await page.screenshot({path:'output/playwright/neighbor-quests/03-delivery.png'});await page.locator('#mainline-speech-skip').click();await page.locator('#task-reward-close').click();
 if(await page.evaluate(n=>questApp.game.progress.farm.seeds[0]!==n+2,purchase.seeds))throw Error('购买交付库存不符');
 await page.waitForFunction(()=>questApp.game.mainlineSpeech?.id==='first-farm');await page.locator('#mainline-speech-pause').click();
 if(errors.length)throw Error(errors.join('\n'));return {passed:true,drop,purchase,errors};
}
;
 const garden=// 连续完成首茬和照顾委托，农活由真实点击与动作队列执行；只加速离线成熟时间。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.locator('#mainline-speech-skip').click();await page.locator('#farm-tools').waitFor({state:'visible'});
 await page.evaluate(async()=>{
  const g=questApp.game,point={x:803.25,y:643.5,mapId:'forest'};if((await import('/src/world/farm-land.js')).farmLandReason(g,point))throw Error('营地小田不可开垦');
  window.questPlotPoint=point;g.mainlineTalkDelay=999999;Object.assign(g.player,{x:803.25,y:751.5,vx:0,vy:0});questApp.renderer.camera.time=null;questApp.refresh();
 });await page.waitForTimeout(300);
 const spot=await page.evaluate(()=>{const v=questApp.renderer.view,r=questApp.renderer.canvas.getBoundingClientRect(),p=questPlotPoint;return {x:r.x+(p.x-v.x)*v.zoom,y:r.y+(p.y-v.y)*v.zoom};});await page.mouse.click(spot.x,spot.y);
 await page.waitForFunction(()=>questApp.game.progress.farm.dug===1&&!questApp.game.farmWork?.job);
 await page.locator('[data-farm-cell="0"]').click();await page.locator('[data-farm-seed="0"]').click();await page.locator('[data-farm-cell="0"]').click();
 await page.waitForFunction(()=>questApp.game.progress.farm.planted===1&&!questApp.game.farmWork?.job);
 await page.locator('#farm-water').click();await page.locator('[data-farm-cell="0"]').click();
 await page.waitForFunction(()=>questApp.game.progress.mainline.phase==='report');
 await page.evaluate(async()=>{Object.assign(questApp.game.player,(await import('/src/config/mainline.js')).MAINLINE_SITES.camp);questApp.game.mainlineTalkDelay=0;questApp.renderer.camera.time=null;questApp.refresh();});
 await page.locator('#mainline-speech-skip').waitFor({state:'visible'});await page.locator('#mainline-speech-skip').click();
 const next=await page.evaluate(async()=>({id:(await import('/src/config/mainline.js')).currentMainlineTask(questApp.game.progress.mainline).id,harvested:questApp.game.progress.farm.harvested,seeds:questApp.game.progress.farm.seeds[1]}));
 if(next.id!=='first-patrol'||next.harvested!==0||next.seeds!==2)throw Error('浇水后未继续其他任务 '+JSON.stringify(next));
 if(errors.length)throw Error(errors.join('\n'));return {passed:true,next,errors};
};
 await setup(page);return {seeds:await seeds(page),garden:await garden(page)};
}
