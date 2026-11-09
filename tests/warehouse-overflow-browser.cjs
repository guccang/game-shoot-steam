// 大库存、矿井说明和待领取商品同时存在时，验证仓库及马车货舱完整可达。
async original=>{
 const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),out='output/playwright/warehouse-complete';fs.mkdirSync(out,{recursive:true});
 const context=await original.context().browser().newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const file of ['src/app/create-app.js','src/ui/warehouse.js','src/ui/warehouse-drag.js','src/styles/warehouse.css','src/rendering/visual-review.js','src/core/industry/industry.js','src/progression/industry/industry.js','src/core/inventory/warehouse.js'])await context.route('http://localhost:4175/'+file,r=>r.fulfill({path:path.resolve(file),contentType:file.endsWith('.css')?'text/css':'text/javascript'}));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;window.g=a.game;const p=(await import('/src/progression/progress.js')).freshProgress(),{COLLECTED_VEHICLES}=await import('/src/config/vehicles.js');window.wagon=COLLECTED_VEHICLES.findIndex(v=>v.name.includes('马车'));if(wagon<0)throw Error('缺少马车');
   p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.homeDecor.basement=true;p.coins=1234;p.vehicleHulls[wagon]=1;
   const {industryStore}=await import('/src/progression/industry/industry.js');for(const id of Object.keys((await import('/src/config/industry.js')).INDUSTRY_GOODS))for(const where of ['home','bag',wagon]){const [s,k]=industryStore(p,id,where,true);s[k]=3;}
   for(const key of Object.keys((await import('/src/config/supplies.js')).AMMO_TYPES)){p.warehouse.ammo[key]=10;p.supplies.hand[key]=5;p.supplies.vehicles[wagon][key]=5;}
   p.warehouse.seeds.fill(30);p.farm.seeds.fill(10);p.weapons.fill(1);p.warehouse.weapons=[1,2,3];Object.assign(p.materials,{parts:12,crystal:7,core:3});p.shopStock.home={'supply:medkit':2,'supply:gunKit':2,'supply:engineKit':2};p.shopStock[wagon]={'supply:medkit':4};
   g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.livingPersist=()=>true;g.enemies=[];g.update=()=>{};
   const s=(await import('/src/config/warehouse.js')).WAREHOUSE;Object.assign(g.player,{x:s.x,y:s.y+60,vx:0,vy:0});g.progress.campParking.owned=[{hull:wagon,spot:null,mapId:'forest',x:s.x+60,y:s.y+60,hp:100,ammo:0}];a.renderer.camera.time=null;a.refresh();
  });
  await page.evaluate(()=>g.onEvent('scene-warehouse'));await page.locator('#warehouse-dialog[open]').waitFor();await page.locator('#warehouse-source').selectOption(await page.evaluate(()=>String(wagon)));
  for(const [key,count]of [['parts',12],['crystal',7],['core',3]])assert.equal(await page.locator(`[data-warehouse-balance="${key}"] .warehouse-slot__count`).textContent(),String(count));
  // 记录每个库存的真实可视高度与底部位置，不能只检查页面是否横向溢出。
  const measure=()=>page.evaluate(()=>Object.fromEntries(['warehouse-carried','warehouse-stored'].map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return [id,{height:r.height,top:r.top,bottom:r.bottom,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight,items:e.querySelectorAll('[data-item]').length}];})));
  if(original.url().includes('#before')){await page.screenshot({path:out+'/before.png'});return await measure();}
  const reviews=[];
  for(const [width,height] of [[320,568],[390,844],[430,932],[844,390]]){
   await page.locator('#warehouse-source').selectOption(await page.evaluate(()=>String(wagon)));
   await page.setViewportSize({width,height});await page.evaluate(async width=>{g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===(width===320?'night':'day')).start+1000;a.refresh();},width);await page.locator('[data-warehouse-jump="stored"]').tap();await page.waitForTimeout(120);await page.screenshot({path:out+'/inventory-'+width+'.png'});
   const visible=await page.evaluate(()=>{const body=document.querySelector('#warehouse-dialog .ui-panel__body').getBoundingClientRect(),top=document.querySelector('.warehouse-toolbar').getBoundingClientRect().bottom;return [...document.querySelectorAll('#warehouse-stored .warehouse-slot')].filter(e=>{const r=e.getBoundingClientRect();return r.top>=top&&r.bottom<=body.bottom;}).length;});assert.ok(visible>=6,'可见库存仍过少：'+visible);
   for(const id of ['warehouse-carried','warehouse-stored']){
    if(id==='warehouse-stored')await page.locator('#warehouse-source').selectOption('bag');
    const grid=page.locator('#'+id),last=grid.locator('[data-item]').last();await last.scrollIntoViewIfNeeded();const r=await last.boundingBox();assert.ok(r.height>=44&&r.y>=0&&r.y+r.height<=height+1,id+'最后一件被裁切');await last.locator('.warehouse-slot__name').tap();await page.locator('#warehouse-quantity[open]').waitFor();await page.locator('#warehouse-quantity [data-cancel]').last().tap();
   }
   const metrics=await measure();assert.ok(Object.values(metrics).every(r=>r.height>=90&&r.scrollHeight<=r.clientHeight+2));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.ok(await page.locator('#warehouse-dialog').evaluate(e=>e.getBoundingClientRect().height>=innerHeight-1));reviews.push({width,height,visible,...metrics});await page.screenshot({path:out+'/last-items-'+width+'.png'});
  }
  // 图标区域也能上下滑动，不再必须寻找狭小的文字空隙。
  await page.setViewportSize({width:390,height:844});await page.locator('#warehouse-source').selectOption(await page.evaluate(()=>String(wagon)));
  const first=page.locator('#warehouse-carried [data-item]').first();await first.scrollIntoViewIfNeeded();const grip=await first.locator('[data-warehouse-grip]').boundingBox(),cdp=await context.newCDPSession(page),x=grip.x+grip.width/2,y=grip.y+grip.height/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x,y}]});for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x,y:y-i*8}]});await page.waitForTimeout(20);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();await page.waitForTimeout(180);
  assert.ok(await page.locator('#warehouse-dialog .ui-panel__body').evaluate(e=>e.scrollTop)>0);assert.equal(await page.locator('#warehouse-quantity').isVisible(),false);
  assert.ok(await page.evaluate(()=>document.querySelector('.warehouse-toolbar').getBoundingClientRect().top<=document.querySelector('#warehouse-dialog .ui-panel__body').getBoundingClientRect().top+1),'固定工具栏上沿露出滚动物品');
  // 同名商品分别存放于马车和小屋，领取严格使用所点来源，不能误扣另一个仓库。
  await page.evaluate(()=>{const p=g.progress;p.logistics.bagWood=0;p.industry.bag={};p.mining.bagOre={};p.farm.seeds.fill(0);p.weapons.fill(0);p.weapons[0]=1;for(const k of Object.keys(p.supplies.hand))p.supplies.hand[k]=0;});
  const carGood=page.locator('[data-collect-good="supply:medkit"][data-collect-where="'+await page.evaluate(()=>wagon)+'"]');await carGood.scrollIntoViewIfNeeded();await page.screenshot({path:out+'/wagon-goods.png'});await carGood.tap();
  assert.equal(await page.evaluate(()=>g.progress.shopStock[wagon]['supply:medkit']),undefined);assert.equal(await page.evaluate(()=>g.progress.shopStock.home['supply:medkit']),2);
  const homeGood=page.locator('[data-collect-good="supply:medkit"][data-collect-where="home"]');await homeGood.scrollIntoViewIfNeeded();await homeGood.tap();assert.equal(await page.evaluate(()=>g.progress.shopStock.home['supply:medkit']),undefined);
  // 横向拖出图标后仍能跨区存取，与原生纵向浏览互不冲突。
  await page.locator('#warehouse-source').selectOption(await page.evaluate(()=>String(wagon)));const itemId=await page.locator('#warehouse-carried [data-item]').first().getAttribute('data-item');
  // 顶部仓库入口既能导航，也能接收拖出的实物；分别验证取消和真正确认存入。
  async function depositGesture(){const card=page.locator(`#warehouse-carried [data-item="${itemId}"]`);await card.scrollIntoViewIfNeeded();const handle=await card.locator('[data-warehouse-grip]').boundingBox(),zone=await page.locator('[data-warehouse-jump="stored"]').boundingBox(),drag=await context.newCDPSession(page),sx=handle.x+handle.width/2,sy=handle.y+handle.height/2,tx=zone.x+zone.width/2,ty=zone.y+zone.height/2;
   await drag.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:sx,y:sy}]});await drag.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:sx+30,y:sy}]});for(let i=1;i<=10;i++)await drag.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:sx+30+(tx-sx-30)*i/10,y:sy+(ty-sy)*i/10}]});
   // 模拟自动入库提交替换存档，拖放和排队中的数量确认仍须保留。
   await page.evaluate(()=>{g.progress=structuredClone(g.progress);});await drag.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await drag.detach();await page.locator('#warehouse-quantity[open]').waitFor();
  }
  const before=await page.evaluate(async id=>(await import('/src/core/inventory/warehouse.js')).warehouseRows(g,wagon).find(r=>r.id===id),itemId);await depositGesture();await page.locator('#warehouse-quantity [data-cancel]').last().tap();const cancelled=await page.evaluate(async id=>(await import('/src/core/inventory/warehouse.js')).warehouseRows(g,wagon).find(r=>r.id===id),itemId);assert.equal(cancelled.carried,before.carried);assert.equal(cancelled.stored,before.stored);
  await depositGesture();await page.locator('#warehouse-quantity [data-confirm]').tap();const after=await page.evaluate(async id=>(await import('/src/core/inventory/warehouse.js')).warehouseRows(g,wagon).find(r=>r.id===id),itemId);assert.equal(after.carried,before.carried-1);assert.equal(after.stored,before.stored+1);const transfer={id:itemId,before:{carried:before.carried,stored:before.stored},after:{carried:after.carried,stored:after.stored}};
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/result.json',JSON.stringify({reviews,transfer,errors},null,2));return {reviews,transfer,errors};
 }catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}finally{await context.close();}
}
