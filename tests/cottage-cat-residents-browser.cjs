// 走正式施工与招募事务，再用手机点击楼梯、房间住户和交接对话。
async page=>{
 const out='output/playwright/cottage-residents';
 await page.goto('http://localhost:4175');await page.locator('#start').tap();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;
  const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();
  p.arrival={version:3,phase:'complete',keys:true};p.coins=p.wood=10000;
  Object.assign(p.materials,{stone:80,iron:8});
  p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
  p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(b=>b.id);
  g.progress=p;g.reset();g.start();g.vehicle.active=false;g.mainlineSpeech=null;g.mainlineTalkDelay=g.fireClock=99999;
  const outside={x:g.player.x,y:g.player.y};g.cottage={kind:'cat-home',outside,displayEntryLatch:true};
  Object.assign(g.player,(await import('/src/core/workshop/workshop-display-entry.js')).shopkeeperApproach(g.cottage));a.refresh();
 });
 // 短按管理员打开名册。加盖前按钮锁定；确认付款时预告真实入住层。
 async function roster(){
  await page.locator('[data-room-item="shopkeeper"]').tap();
  await page.locator('[data-npc-service]').tap();
  await page.locator('#cat-home-dialog').waitFor({state:'visible'});
 }
 await roster();const adopt=page.locator('[data-cat-adopt="1"]');
 if(!await adopt.isDisabled())throw Error('缺少三楼时不能招募');
 await page.locator('#cat-home-close').tap();await page.waitForFunction(()=>a.game.state==='playing');
 await page.evaluate(async()=>{
  const g=a.game;g.cottage.kind='construction';if(!(await import('/src/core/home/home-construction.js')).buildHome(g,'floor').ok)throw Error('加盖失败');
  g.cottage.kind='cat-home';a.refresh();
 });
 await roster();await adopt.scrollIntoViewIfNeeded();
 await adopt.press('Enter');await page.locator('#cat-home-dialog > .shop-dropzone').tap();const checkout=page.locator('#shop-checkout');
 if(!(await checkout.locator('[data-cart-lines]').innerText()).includes('3 楼'))throw Error('结账缺少入住楼层');
 await checkout.locator('[data-pay]').tap();
 if(!await page.evaluate(()=>a.game.progress.heroes[1]===1&&a.game.progress.hero===0))throw Error('招募失败');
 await page.locator('#cat-home-close').tap();await page.waitForFunction(()=>a.game.state==='playing');
 await page.evaluate(async()=>{
  const g=a.game;
  g.cottage=null;const {COTTAGE}=await import('/src/config/cottage.js');Object.assign(g.player,COTTAGE.door);
  if(!(await import('/src/core/home/cottage.js')).enterCottage(g))throw Error('未能进屋');
  a.refresh();
 });
 // 在梯口附近短按真实热点，仍由正式候停计时完成切层。
 async function stairs(direction,floor){
  await page.evaluate(async direction=>{
   const s=(await import('/src/config/cottage.js')).COTTAGE_STAIRS,point=direction==='up'?s.landing:s.downLanding;
   Object.assign(a.game.player,{x:point.x-42,y:point.y,vx:0,vy:0});a.refresh();
  },direction);
  await page.locator('[data-cottage-target="stairs-'+direction+'"]').tap();
  await page.waitForFunction(floor=>a.game.cottage.floor===floor,floor,{timeout:8000});
 }
 await stairs('up',1);await stairs('up',2);
 for(const [width,height,time] of [[390,844,'day'],[320,568,'night'],[1280,900,'night'],[1280,900,'day']]){
  await page.setViewportSize({width,height});
  await page.evaluate(async time=>{
   const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);
   a.game.progress.living.calendar.elapsed=phase.start+8;a.refresh();
  },time);
  await page.waitForTimeout(180);await page.screenshot({path:out+'/'+width+'-'+time+'.png'});
 }
 await page.setViewportSize({width:390,height:844});
 const resident=page.locator('[data-cottage-target="resident"]'),chat=page.locator('#resident-chat');
 await resident.tap();await chat.waitFor({state:'visible',timeout:10000});
 await page.screenshot({path:out+'/chat.png'});
 await chat.locator('[data-resident-back]').tap();await page.waitForFunction(()=>a.game.state==='playing'&&a.game.progress.hero===0);
 await resident.tap();await chat.locator('[data-resident-switch]').tap();
 await page.waitForFunction(()=>a.game.progress.hero===1&&a.game.state==='playing');
 await stairs('down',1);await resident.tap();await chat.locator('[data-resident-switch]').tap();
 await page.waitForFunction(()=>a.game.progress.hero===0&&a.game.state==='playing');
 return page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectCottageResidents(a.game,document));
}
