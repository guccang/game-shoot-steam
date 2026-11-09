// 正式手机矿道检查四矿色、混装、层号木牌与概率文案，保留实际昼夜和角色帧。
async original=>{
 const assert=require('node:assert/strict'),fs=require('node:fs'),out='output/playwright/mine-ore-distribution';fs.mkdirSync(out,{recursive:true});
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],reviews=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;window.g=a.game;window.mc=await import('/src/config/mining.js');
   const p=(await import('/src/progression/progress.js')).freshProgress(),{freshMineLayer}=await import('/src/progression/mining/mine-layers.js');
   p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.homeDecor.basement=true;p.coins=100000;p.wood=100;p.mining.ore=100;
   (await import('/src/progression/mining/mining.js')).openBasement(p.mining);for(let d=2;d<=3;d++)p.mining.layers[d]=freshMineLayer(d,{x:0,y:0},()=>.5);
   for(const layer of [p.mining,...Object.values(p.mining.layers)]){
    layer.descent='0,3';layer.entry='0,0';layer.seed=1847;
    for(let x=-1;x<=4;x++)for(let y=-1;y<=4;y++){const k=mc.mineKey({x,y});layer.dug[k]=layer.bridges[k]=true;}
    layer.carts=['stone','copper','iron','rareMetal'].map((key,i)=>({id:i+1,...mc.minePoint({x:i,y:1}),heading:1,wheel:0,cargo:{[key]:32}}));
    layer.carts.push({id:5,...mc.minePoint({x:2,y:3}),heading:1,wheel:0,cargo:{stone:8,copper:8,iron:8,rareMetal:8}});
    for(const cart of layer.carts)layer.rails[mc.mineKey(mc.mineCell(cart))]=true;
    layer.animals['3,3']={key:'3,3',kind:'beetle',...mc.minePoint({x:3,y:3}),hp:60,maxHp:60,phase:'recover',timer:9999,clock:0,death:0};
   }
   g.progress=p;g.reset();g.start();g.arrivalScene=null;g.mainlineSpeech=null;g.vehicle.active=false;g.enemies=[];g.boss=null;g.livingPersist=()=>true;g.progress.supplies.hand.light=0;g.magazines[0].ammo=0;g.magazines[0].remaining=0;
   g.cottage={kind:'mine',depth:1,direction:1,tool:'pick',autoDig:true,ride:null,running:false,scanWait:99999,hurtWait:99999,attackWait:99999};Object.assign(g.player,mc.minePoint({x:1,y:2}));a.renderer.camera.time=null;a.refresh();
  });
  for(const depth of [1,2,3]){
   await page.evaluate(depth=>{g.cottage.depth=depth;g.cottage.cartBoarding=null;g.cottage.combat=null;g.cottage.rockScan=null;a.renderer.camera.time=null;a.refresh();},depth);
   for(const [width,height]of [[390,844],[320,568],[580,844]]){
    await page.setViewportSize({width,height});
    for(const time of ['day','night']){
     await page.evaluate(async id=>{const p=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===id);g.progress.living.calendar.elapsed=p.start+p.duration/2;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);},time);
     await page.waitForTimeout(150);const review=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectMining(g,a.renderer,document));
     assert.equal(review.overflow,false);assert.equal(review.render.night,time==='night');assert.equal(review.render.depth,depth);assert.ok(review.render.layerSigns.every(s=>s.depth===depth));assert.equal(review.render.layerSigns.length,2);
     assert.equal(new Set(review.render.freight.cargo.slice(0,4).flatMap(c=>c.colors)).size,4);assert.equal(new Set(review.render.freight.cargo[4].colors).size,4);
     reviews.push({width,height,time,depth,signs:review.render.layerSigns,cargo:review.render.freight.cargo});await page.screenshot({path:out+'/layer-'+depth+'-'+width+'-'+time+'.png'});
    }
   }
   await page.setViewportSize({width:390,height:844});if(await page.locator('#mine-tools-panel').isHidden())await page.locator('#mine-tools-toggle').tap();await page.locator('#mine-build').tap();
   const rates=await page.locator('#mine-ore-rates').innerText();assert.match(rates,/石矿/);assert.match(rates,/铜原矿/);assert.match(rates,/铁原矿/);assert.match(rates,/稀有原矿/);
   if(depth===1)assert.match(rates,/99.5%.*0.5%.*0%.*0%/);if(depth===3)assert.match(await page.locator('[data-mine-special="down"]').innerText(),/90000 金币/);
   await page.screenshot({path:out+'/rates-'+depth+'.png'});await page.locator('[data-mine-close]').first().tap();await page.locator('#mine-tools-toggle').tap();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({reviews,errors},null,2));return {views:reviews.length,errors};
 }catch(error){await page.screenshot({path:out+'/failure.png'});throw error;}finally{await context.close();}
}
