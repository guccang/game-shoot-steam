// 隔离手机存档，实际点击建筑柜台验证矿产报价、失败回滚、扣款与重载。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],shots=[];
 page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(20000);
 // 沿用正式进屋、管理员和服务按钮，不直接调用施工事务。
 async function openCompany(){
  await page.evaluate(async()=>{const g=a.game;g.cottage=null;g.cottageDoorLatch=false;g.sceneApproach=null;g.state='playing';Object.assign(g.player,(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS.construction.door);a.refresh();});
  await page.waitForFunction(()=>a.game.cottage?.kind==='construction');await page.locator('[data-room-item="shopkeeper"]').tap();await page.locator('[data-npc-service]').tap();await page.waitForFunction(()=>document.getElementById('home-construction-dialog').open);
 }
 // 对比真实钱包与设施，禁止失败后部分扣款。
 async function state(){return page.evaluate(()=>{const p=a.game.progress;return {coins:p.coins,wood:p.wood,stone:p.materials.stone,iron:p.materials.iron,copper:p.materials.copper,floors:p.homeDecor.floors,lifts:p.homeDecor.elevators};});}
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.coins=30000;p.wood=4000;
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.mainlineTalkDelay=g.spawnTimer=99999;g.enemies=[];g.boss=null;
  });await openCompany();
  const before=await state();await page.locator('[data-build="floor"]').tap();
  if(JSON.stringify(await state())!==JSON.stringify(before)||!(await page.locator('#home-construction-message').textContent()).includes('石块 80、铁块 8'))throw Error('缺矿物仍扣款或缺口提示错误');
  await page.locator('[data-build-close]').tap();await page.evaluate(()=>Object.assign(a.game.progress.materials,{stone:80,iron:20,copper:4}));await openCompany();
  const floorPrice=await page.locator('[data-build="floor"]').textContent(),liftPrice=await page.locator('[data-build="elevator"]').textContent();
  if(!floorPrice.includes('80 石块 + 8 铁块')||!liftPrice.includes('12 铁块 + 4 铜块'))throw Error('正式报价遗漏矿产');
  for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390}]){
   await page.setViewportSize(size);
   for(const time of ['day','night']){
    await page.evaluate(async time=>{const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);a.game.progress.living.calendar.elapsed=phase.start+phase.duration*.5;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);},time);
    for(const kind of ['floor','elevator']){
     const button=page.locator('[data-build="'+kind+'"]');await button.scrollIntoViewIfNeeded();
     const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,bodyOverflow:document.getElementById('home-construction-content').scrollWidth>document.getElementById('home-construction-content').clientWidth,small:[...document.querySelectorAll('#home-construction-dialog button')].filter(b=>b.getBoundingClientRect().width>0).some(b=>b.getBoundingClientRect().width<44||b.getBoundingClientRect().height<44)}));
     if(layout.overflow||layout.bodyOverflow||layout.small)throw Error('长报价换行或触控异常 '+JSON.stringify(layout));
     const path=`output/playwright/home-construction-minerals/${size.width}-${time}-${kind}.png`;await page.screenshot({path});shots.push(path);
    }
   }
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{window.savedPersist=a.game.livingPersist;a.game.livingPersist=()=>false;});await page.locator('[data-build="floor"]').tap();
  if(JSON.stringify(await state())!==JSON.stringify({...before,stone:80,iron:20,copper:4})||!(await page.locator('#home-construction-message').textContent()).includes('保存失败'))throw Error('保存失败未回滚');
  await page.evaluate(()=>a.game.livingPersist=savedPersist);await page.locator('[data-build="floor"]').tap();await page.locator('[data-build="elevator"]').tap();
  const built=await state(),expected={coins:21000,wood:2800,stone:0,iron:0,copper:0,floors:3,lifts:[0]};
  if(JSON.stringify(built)!==JSON.stringify(expected))throw Error('施工实际扣款错误 '+JSON.stringify(built));
  await page.reload();await page.locator('#start').tap();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
  if(JSON.stringify(await state())!==JSON.stringify(expected))throw Error('矿产扣款或设施未保存');
  await openCompany();await page.locator('[data-remove-elevator]').tap();
  if(!(await page.locator('#home-elevator-removal').textContent()).includes('铁块和铜块不返还'))throw Error('拆除确认遗漏矿产');
  await page.locator('[data-build="remove-elevator"]').tap();const removed=await state();
  if(removed.iron!==0||removed.copper!==0||removed.coins!==21000||removed.lifts.length)throw Error('拆除返还矿产或扣款');
  await page.locator('[data-build="elevator"]').tap();if(JSON.stringify(await state())!==JSON.stringify(removed))throw Error('重装缺矿仍成功');
  if(errors.length)throw Error(errors.join(' / '));return {built,reload:true,rollback:true,errors,shots};
 }finally{await context.close();}
}
