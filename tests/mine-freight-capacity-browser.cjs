// 手机真实触屏验证：满车转背包、全满继续挖、走入范围自动装矿。
async original=>{
 const assert=require('node:assert/strict'),fs=require('node:fs'),out='output/playwright/mine-freight-capacity';fs.mkdirSync(out,{recursive:true});
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;window.g=a.game;window.mc=await import('/src/config/mining.js');window.me=await import('/src/config/mine-ecology.js');window.cartCapacity=(await import('/src/config/mine-freight.js')).CART_CAPACITY;window.weight=await import('/src/progression/inventory/load-weight.js');
   // 每种情况使用独立进度，岩壁由真实固定种子寻找，不调用奖励函数代替开采。
   window.prepare=async full=>{
    const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.homeDecor.basement=true;(await import('/src/progression/mining/mining.js')).openBasement(p.mining);p.mining.seed=1847;
    let cell;outer:for(let y=5;y<80;y++)for(let x=5;x<80;x++){
     const from={x:x-1,y};if(me.mineTerrain(from,p.mining).prop||me.mineTerrain(from,p.mining).water)continue;
     if(Array.from({length:3},(_,i)=>({x:x+i,y})).every(c=>!me.mineTerrain(c,p.mining).natural&&!me.mineTerrain(c,p.mining).water&&me.mineCellArea(c,p.mining)===4096)){cell={x,y};break outer;}
    }
    if(!cell)throw Error('缺少连续岩壁');const from={x:cell.x-1,y:cell.y};window.wall=cell;
    for(let dx=-8;dx<=0;dx++)for(let dy=-1;dy<=1;dy++){const k=mc.mineKey({x:from.x+dx,y:from.y+dy});p.mining.dug[k]=p.mining.bridges[k]=true;}
    const cart=mc.minePoint({x:from.x-2,y:from.y});p.mining.rails[mc.mineKey(mc.mineCell(cart))]=true;p.mining.carts=[{id:1,...cart,wheel:0,heading:1,cargo:{stone:cartCapacity}}];
    g.progress=p;g.reset();g.start();g.arrivalScene=null;g.mainlineSpeech=null;g.vehicle.active=false;g.enemies=[];g.boss=null;g.livingPersist=()=>true;g.progress.supplies.hand.light=0;g.magazines[0].ammo=0;g.magazines[0].remaining=0;
    g.cottage={kind:'mine',depth:1,direction:1,tool:null,autoDig:false,ride:null,running:false,scanWait:99999,hurtWait:99999,attackWait:99999};Object.assign(g.player,mc.minePoint(from));
    if(full){const l=weight.catLoad(g);g.progress.logistics.bagWood=Math.floor((l.capacity-l.weight)/.1+1e-6);}
    a.renderer.camera.time=null;a.refresh();
   };
  });
  const capacity=await page.evaluate(()=>cartCapacity),cdp=await context.newCDPSession(page);
  // 手指在正式战场拖出移动摇杆，松手后不继续推动角色。
  async function walk(sign,until){const frame=await page.locator('#game-frame').boundingBox(),x=frame.x+65,y=frame.y+frame.height*.56;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+sign*45,y}]});try{await page.waitForFunction(until,null,{timeout:20000});}finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}}
  // 夜色使用正式历法，保持矿车、角色与UI同屏。
  async function phase(time){await page.evaluate(async id=>{const p=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===id);g.progress.living.calendar.elapsed=p.start+p.duration/2;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);},time);}
  await page.evaluate(()=>prepare(false));await page.locator('#mine-pick').tap();await walk(1,()=>g.progress.mining.dug[mc.mineKey(wall)]===true);
  const roomy=await page.evaluate(()=>({bag:g.progress.mining.bagOre,cargo:g.progress.mining.carts[0].cargo,load:weight.catLoad(g),autoDig:g.cottage.autoDig,notice:g.cottage.notice}));assert.ok(Object.values(roomy.bag).reduce((a,b)=>a+b,0)>0);assert.equal(roomy.cargo.stone,capacity);assert.equal(roomy.autoDig,true);assert.ok(roomy.load.weight<=roomy.load.capacity);await phase('day');await page.screenshot({path:out+'/full-cart-roomy-bag.png'});
  await page.evaluate(()=>prepare(true));const before=await page.evaluate(()=>({bag:g.progress.mining.bagOre,carts:g.progress.mining.carts,raw:g.progress.industry.raw}));await page.locator('#mine-pick').tap();await walk(1,()=>g.progress.mining.dug[mc.mineKey({x:wall.x+1,y:wall.y})]===true);
  const full=await page.evaluate(()=>({bag:g.progress.mining.bagOre,carts:g.progress.mining.carts,raw:g.progress.industry.raw,autoDig:g.cottage.autoDig,notice:g.cottage.notice,mined:g.progress.production.minedOre}));assert.deepEqual(full.bag,before.bag);assert.deepEqual(full.carts,before.carts);assert.deepEqual(full.raw,before.raw);assert.equal(full.autoDig,true);assert.ok(full.mined>=2);assert.match(full.notice,/未收纳/);await page.waitForFunction(()=>document.querySelector('#mine-message').textContent.includes('未收纳'));await page.screenshot({path:out+'/both-full-keep-mining-day.png'});await page.setViewportSize({width:320,height:568});await phase('night');await page.waitForTimeout(120);await page.screenshot({path:out+'/both-full-keep-mining-night-320.png'});
  await page.setViewportSize({width:390,height:844});await page.evaluate(async()=>{
   await prepare(false);const cell=mc.mineCell(g.player),head=mc.minePoint({x:cell.x-5,y:cell.y}),tail=mc.minePoint({x:cell.x-6,y:cell.y});g.progress.mining.carts=[{id:1,...head,wheel:0,heading:1,cargo:{stone:cartCapacity-4}},{id:2,...tail,leader:1,wheel:0,heading:1,cargo:{iron:cartCapacity-8}}];for(const c of g.progress.mining.carts)g.progress.mining.rails[mc.mineKey(mc.mineCell(c))]=true;g.progress.mining.bagOre={stone:2,copper:2,iron:2,rareMetal:2};g.cottage.cartLoadNext=0;a.renderer.camera.time=null;a.refresh();
  });await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>Object.values(g.progress.mining.bagOre).reduce((a,b)=>a+b,0)),8);
  await walk(-1,()=>Object.keys(g.progress.mining.bagOre).length===0);const loaded=await page.evaluate(()=>({bag:g.progress.mining.bagOre,cargo:g.progress.mining.carts.map(c=>c.cargo),notice:g.cottage.notice}));assert.deepEqual(loaded.cargo,[{stone:capacity-2,copper:2},{iron:capacity-6,rareMetal:2}]);assert.match(loaded.notice,/自动装入/);await phase('day');await page.screenshot({path:out+'/walk-near-autoload-day.png'});await page.setViewportSize({width:320,height:568});await phase('night');await page.waitForTimeout(120);await page.screenshot({path:out+'/walk-near-autoload-night-320.png'});
  await page.setViewportSize({width:390,height:844});await walk(-1,()=>Math.hypot(g.player.x-g.progress.mining.carts[0].x,g.player.y-g.progress.mining.carts[0].y)<30);await page.waitForFunction(()=>g.cottage.ride===1);
  await page.waitForFunction(()=>document.querySelector('#mine-wallet').textContent.includes('/'+cartCapacity*2));assert.match(await page.locator('#mine-wallet').innerText(),new RegExp((capacity*2-4)+'/'+capacity*2));await phase('day');await page.screenshot({path:out+'/train-capacity-390-day.png'});await page.setViewportSize({width:320,height:568});await phase('night');await page.waitForTimeout(120);await page.screenshot({path:out+'/train-capacity-320-night.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({capacityPerCart:capacity,trainCapacity:capacity*2,roomy,full,loaded,errors},null,2));return {capacityPerCart:capacity,trainCapacity:capacity*2,fullCartUsesBag:true,fullStillDigs:true,autoLoaded:8,errors};
 }catch(error){await page.screenshot({path:out+'/failure.png'});throw error;}finally{await context.close();}
}
