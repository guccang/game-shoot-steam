// 通过正式页面验收四类新增作物、翻页、触控购买/拖播与昼夜美术，默认使用4175。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;
   p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS;p.mainline.phase='complete';p.coins=100000;p.farm.wildMaps=['forest'];p.farm.lessonRewarded=true;p.farm.seeds.fill(3);p.farm.unlocked.fill(true);p.farm.plots=[];
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.update=()=>{};g.mainlineSpeech=null;g.vehicle.active=false;g.enemies=[];g.boss=null;Object.assign(g.player,{x:921,y:2855});a.renderer.camera.time=null;a.refresh();await(await import('/src/rendering/farm.js')).loadFarmArt();
  });
  for(const [width,height,phase] of [[390,844,'day'],[320,568,'night'],[844,390,'day']]){
   await page.setViewportSize({width,height});
   await page.evaluate(async phase=>{Object.assign(a.environment,{time:phase,livingPreview:true,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);Object.assign(a.game.player,{x:921,y:2855});a.renderer.camera.time=null;a.refresh();},phase);
   await page.waitForTimeout(350);
   await page.evaluate(()=>{const v=a.renderer.view;a.game.progress.farm.plots=[0,1].map(id=>({id,mapId:'forest',x:v.x+v.w/2+id*56,y:v.y+v.h*.55,crop:null,plantedAt:0,readyAt:0,watered:false}));a.game.progress.farm.nextId=2;a.game.progress.farm.seeds.fill(3);a.refresh();});
   await page.locator('[data-farm-cell="0"]').tap();await page.locator('#farm-picker').waitFor({state:'visible'});
   for(const [category,count] of [['grain',15],['vegetable',15],['fruit',15],['ornamental',15]]){
    await page.locator(`[data-farm-category="${category}"]`).tap();const seen=[];
    while(true){
     const info=await page.locator('#farm-picker').evaluate(n=>{const b=n.getBoundingClientRect(),t=document.querySelector('#farm-tools').getBoundingClientRect();return {ids:[...n.querySelectorAll('[data-farm-seed]')].map(b=>Number(b.dataset.farmSeed)),fit:b.left>=0&&b.right<=innerWidth&&b.top>=0&&b.bottom<=t.top,hit:[...n.querySelectorAll('button')].every(t=>{const r=t.getBoundingClientRect();return r.width>=44&&r.height>=44&&t.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})};});
     if(!info.fit||!info.hit)throw Error(JSON.stringify({width,category,info}));seen.push(...info.ids);
     if(await page.locator('[data-farm-page="1"]').isDisabled())break;
     await page.locator('[data-farm-page="1"]').tap();
    }
    const ordered=await page.evaluate(async ids=>{const {FARM_CROPS}=await import('/src/config/farm.js');return ids.every((id,i)=>!i||FARM_CROPS[ids[i-1]].cost<FARM_CROPS[id].cost||FARM_CROPS[ids[i-1]].cost===FARM_CROPS[id].cost&&ids[i-1]<id);},seen);
    if(!ordered)throw Error('选种页未按价格升序：'+category);
    if(seen.length!==count||new Set(seen).size!==count)throw Error('分类翻页缺失或重复：'+category);checks.push({width,category,count,reachable:true,priceOrder:true});
    if(category==='ornamental')await page.screenshot({path:`output/playwright/crop-expansion/${width}-picker.png`});
   }
   // 最后一页新品种支持点选后点田，手机短屏也不会误选相邻种子。
   await page.locator('[data-farm-seed="56"]').tap();await page.locator('[data-farm-cell="1"]').tap();
   if(!await page.evaluate(()=>a.game.farmWork.queue.some(j=>j.crop===56)))throw Error('波斯菊未安排播种');await page.locator('#farm-exit').tap();
   // 原生触摸从第二页种子拖到田块，翻页不能破坏原有拖播捕获。
   await page.locator('[data-farm-cell="0"]').tap();await page.locator('[data-farm-category="ornamental"]').tap();while(await page.locator('[data-farm-page="1"]').isEnabled())await page.locator('[data-farm-page="1"]').tap();
   const seed=await page.locator('[data-farm-seed="56"]').boundingBox(),cell=await page.locator('[data-farm-cell="1"]').boundingBox(),cdp=await context.newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:seed.x+seed.width/2,y:seed.y+seed.height/2}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cell.x+cell.width/2,y:cell.y+cell.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();await page.waitForTimeout(350);
   if(!await page.evaluate(()=>a.game.farmWork.queue.some(j=>j.crop===56)&&!a.game.farmDragging))throw Error('翻页后的触摸拖播失败');
   // 触摸协议结束后重置夹具工具，避免后续购种测试受浏览器合成点击时序影响。
   await page.evaluate(()=>a.farm.open());checks.push({width,touchDrag:true});
   await page.locator('[data-farm-cell="0"]').press('Enter');await page.locator('[data-farm-shop]').tap();await page.locator('#seed-shop-dialog').waitFor({state:'visible'});
   await page.evaluate(async()=>{Object.assign(a.game.player,(await import('/src/config/farm.js')).FARM_SEED_DOOR);a.refresh();});
   // 商店四类排序与跨页选种一致，实际购买继续使用原作物索引。
   for(const category of ['grain','vegetable','fruit','ornamental']){
    await page.locator('[data-seed-shop-category="'+category+'"]').tap();
    const ordered=await page.locator('#seed-shop-goods').evaluate(async n=>{const {FARM_CROPS}=await import('/src/config/farm.js');const ids=[...n.querySelectorAll('[data-count="1"]')].map(b=>Number(b.dataset.buySeed));return ids.every((id,i)=>!i||FARM_CROPS[ids[i-1]].cost<FARM_CROPS[id].cost||FARM_CROPS[ids[i-1]].cost===FARM_CROPS[id].cost&&ids[i-1]<id);});
    if(!ordered)throw Error('商店未按价格升序：'+category);
   }
   const before=await page.evaluate(()=>({coins:a.game.progress.coins,seeds:a.game.progress.farm.seeds[56]}));
   await page.locator('[data-buy-seed="56"][data-count="1"]').tap();
   if(!await page.evaluate(before=>a.game.progress.coins===before.coins-300&&a.game.progress.farm.seeds[56]===before.seeds+1,before))throw Error('新品种购买未扣正确价格');
   await page.locator('.seed-shop-good').last().locator('summary').tap();
   if(!await page.locator('.seed-shop-good').last().innerText().then(s=>s.includes('暂无固定营地来源')))throw Error('新增来源说明错误');
   await page.screenshot({path:`output/playwright/crop-expansion/${width}-shop.png`});await page.locator('#seed-shop-close').tap();
   checks.push({width,purchase:true,plantQueue:true});
   if(width===844)continue;
   await page.waitForFunction(()=>!document.querySelector('#toast')?.classList.contains('visible'));
   // 新作物进入正式深度排序与光照；同屏保留原田、角色和周围地形。
   await page.evaluate(()=>{Object.assign(a.game.player,{x:921,y:2855});a.renderer.camera.time=null;a.refresh();});await page.waitForTimeout(350);
   for(let category=0;category<4;category++){
    await page.evaluate(category=>{const v=a.renderer.view;a.game.progress.farm.plots=Array.from({length:12},(_,id)=>({id,mapId:'forest',x:v.x+v.w/2+(id%3-1)*75,y:v.y+v.h*.26+Math.floor(id/3)*95,crop:id<10?17+category*10+id:id===10?1:11,plantedAt:0,readyAt:0,watered:true}));a.refresh();},category);
    await page.waitForTimeout(150);await page.screenshot({path:`output/playwright/crop-expansion/${width}-world-${category}.png`});
   }
  }
  // 全部追加作物三阶段使用正式绘制器取样，根部与相邻格边缘一并复核。
  await page.setViewportSize({width:900,height:1260});
  const budget=await page.evaluate(async()=>{
   const {drawFarmCrop,farmArtBudget}=await import('/src/rendering/farm.js'),{FARM_CROPS}=await import('/src/config/farm.js');
   const node=document.createElement('canvas');node.id='crop-review';node.width=900;node.height=1260;node.style.cssText='position:fixed;inset:0;z-index:1000;width:900px;height:1260px';document.body.append(node);const c=node.getContext('2d');c.fillStyle='#f6edce';c.fillRect(0,0,900,1260);
   FARM_CROPS.slice(17).forEach((crop,i)=>{const x=i%5*180,y=Math.floor(i/5)*140;c.fillStyle='#34543b';c.font='14px sans-serif';c.fillText(crop.name,x+12,y+20);for(let stage=0;stage<3;stage++)drawFarmCrop(c,{x:x+30+stage*55,y:y+120,plot:{id:i,crop:i+17,plantedAt:0,readyAt:100000}},0,true,[5000,90000,110000][stage]);});return farmArtBudget();
  });
  await page.locator('#crop-review').screenshot({path:'output/playwright/crop-expansion/all-stages.png'});
  if(budget.sheets!==4||budget.pixels!==4591968||errors.length)throw Error(JSON.stringify({budget,errors}));return {checks,budget,errors};
 }catch(error){await page.screenshot({path:'output/playwright/crop-expansion/failure.png'});const state=await page.evaluate(()=>({picker:document.querySelector('#farm-picker').hidden,tool:a.game.farmWork?.tool,plots:a.game.progress.farm.plots,drag:a.game.farmDragging,state:a.game.state}));throw Error(error.message+' '+JSON.stringify(state));}finally{await context.close();}
}
