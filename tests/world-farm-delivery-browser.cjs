// 隔离测试只跳过旧入职教学并定位空地；实际开地、播种、收割均由指针驱动。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.setViewportSize({width:390,height:844});
 if(await page.locator('#start').isVisible())await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.farmApp=(await import('/src/main.js')).application;await farmApp.ready;
  const {freshRangerProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js');
  const g=farmApp.game,p=freshRangerProgress();p.arrival=null;p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';/* 单项农活夹具不额外放置示范田。 */p.farm.wildMaps=['forest','jiuzhaigou'];g.progress=p;g.mapId='forest';g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.fireClock=999999;
  for(const d of document.querySelectorAll('dialog[open]'))d.close();
  const {snapFarmPoint,farmLandReason,farmApproach}=await import('/src/world/farm-land.js'),{blocked}=await import('/src/physics/motion.js');
  let found=null;
  for(let y=500;y<1300&&!found;y+=52)for(let x=1600;x<2300&&!found;x+=56){const point=snapFarmPoint({x,y},'forest'),start={x:point.x,y:point.y+108};Object.assign(g.player,start);if(!farmLandReason(g,point)&&!blocked(start.x,start.y,14,g.trees,g.player)&&farmApproach(g,point))found={point,start};}
  if(!found)throw Error('没有找到野外测试空地');window.farmTestSite=found;Object.assign(g.player,found.start,{vx:0,vy:0});g.enemies=[];g.player.invincible=99999;
  Object.assign(farmApp.environment,{time:'day',weather:'sun',autoWeather:false,autoTime:false,livingPreview:true});farmApp.renderer.camera.time=null;farmApp.refresh();
 });
 await page.waitForTimeout(800);if(await page.locator('#farm-tools').isVisible())throw Error('未点击种地不应显示工具栏');
 await page.locator('#field-menu-toggle').click();await page.locator('#farm-menu').click();
 if(await page.locator('#farm-tools button').count()!==5)throw Error('工具栏应显示锄头、镰刀、水壶、战斗和退出');
 if(await page.locator('#farm-hoe').getAttribute('aria-pressed')!=='true')throw Error('默认应选中锄头');
 await page.screenshot({path:'output/playwright/world-farm-delivery/01-world-tools.png'});
 const land=await page.evaluate(()=>{const v=farmApp.renderer.view,r=farmApp.renderer.canvas.getBoundingClientRect(),p=farmTestSite.point;return {x:r.x+(p.x-v.x)*v.zoom,y:r.y+(p.y-v.y)*v.zoom};});
 await page.mouse.click(land.x,land.y);
 await page.waitForFunction(()=>farmApp.game.farmWork?.job?.action==='dig',null,{timeout:5000});
 const early=await page.evaluate(()=>({plots:farmApp.game.progress.farm.plots.length,job:farmApp.game.farmWork.job.action}));if(early.plots!==0)throw Error('未落锄就生成了土地');
 await page.waitForFunction(()=>farmApp.game.progress.farm.plots.length===1,null,{timeout:15000});await page.waitForTimeout(400);
 await page.locator('[data-farm-cell="0"]').click();await page.waitForSelector('#farm-picker:not([hidden])');await page.locator('[data-farm-seed="0"]').click();
 // 将角色移开后点田块，明确检验播种前必须走近，排队不直接扣款。
 await page.evaluate(()=>{farmApp.game.player.y+=90;farmApp.game.player.vx=farmApp.game.player.vy=0;});await page.waitForTimeout(400);
 await page.locator('[data-farm-cell="0"]').click();
 const queued=await page.evaluate(()=>({crop:farmApp.game.progress.farm.plots[0].crop,coins:farmApp.game.progress.coins}));if(queued.crop!==null)throw Error('远程点击直接种下作物');
 await page.waitForFunction(()=>farmApp.game.farmWork?.job?.action==='plant'&&farmApp.game.farmWork.job.elapsed>0,null,{timeout:15000});
 await page.screenshot({path:'output/playwright/world-farm-delivery/02-sowing.png'});
 await page.waitForFunction(()=>farmApp.game.progress.farm.plots[0].crop===0);await page.waitForTimeout(500);
 // 收割定位沿用正式操作位，避免测试直接向下平移跨进新地形障碍；远程行走已由播种检查覆盖。
 await page.evaluate(async()=>{const g=farmApp.game,p=g.progress.farm.plots[0];p.plantedAt-=61000;p.readyAt-=61000;Object.assign(g.player,(await import('/src/world/farm-land.js')).farmApproach(g,p),{vx:0,vy:0});farmApp.renderer.camera.time=null;});await page.waitForTimeout(400);
 await page.locator('[data-farm-cell="0"]').click();if(await page.evaluate(()=>farmApp.game.progress.coins)!==0)throw Error('未挥镰就领到金币');
 await page.waitForFunction(()=>farmApp.game.farmWork?.job?.action==='harvest'&&farmApp.game.farmWork.job.elapsed>0,null,{timeout:15000});
 // 截图可能耗时超过金币动画，观察与截图并行，避免漏过真实出现过的短动画。
 await Promise.all([page.waitForFunction(()=>document.querySelectorAll('.farm-coin-flight').length>0,null,{timeout:5000}),page.screenshot({path:'output/playwright/world-farm-delivery/03-scythe.png'})]);
 await page.waitForTimeout(180);await page.screenshot({path:'output/playwright/world-farm-delivery/04-flying-coins.png'});
 const harvest=await page.evaluate(async()=>({...(await import('/src/ui/farm.js')).inspectFarm(farmApp.game,document),plot:structuredClone(farmApp.game.progress.farm.plots[0])}));
 if(harvest.coins!==60||harvest.plot.crop!==null||harvest.seeds[1]!==2)throw Error('收获或任务奖励不正确 '+JSON.stringify(harvest));
 await page.waitForTimeout(1200);if(await page.locator('.farm-coin-flight').count())throw Error('金币飞行节点没有回收');
 // 包裹时钟夹具触发到达，领取仍通过快递站正式按钮。
 await page.evaluate(async()=>{const g=farmApp.game,{FARM_DELIVERY}=await import('/src/config/farm.js');g.progress.farm.delivery.nextAt=1;g.farmDeliveryCheck=0;Object.assign(g.player,{x:FARM_DELIVERY.x,y:FARM_DELIVERY.y+55,vx:0,vy:0});farmApp.renderer.camera.time=null;});
 await page.waitForFunction(()=>farmApp.game.progress.farm.delivery.parcels.length===1);await page.waitForTimeout(700);
 await page.locator('#farm-delivery-hit').click();await page.waitForSelector('#farm-mail:not([hidden])');await page.screenshot({path:'output/playwright/world-farm-delivery/05-delivery.png'});
 const parcel=await page.evaluate(()=>({...farmApp.game.progress.farm.delivery.parcels[0],before:farmApp.game.progress.farm.seeds.slice()}));
 await page.locator('[data-farm-parcel]').click();const after=await page.evaluate(()=>({seeds:farmApp.game.progress.farm.seeds,parcels:farmApp.game.progress.farm.delivery.parcels.length,claimed:farmApp.game.progress.farm.delivery.claimed}));
 if(after.parcels!==0||after.seeds[parcel.crop]!==parcel.before[parcel.crop]+parcel.count||after.claimed!==1)throw Error('快递领取失败 '+JSON.stringify(after));
 await page.locator('[data-farm-mail-close]').click();
 if(errors.length)throw Error(JSON.stringify(errors));return {early,queued,harvest,parcel,after,errors};
}
