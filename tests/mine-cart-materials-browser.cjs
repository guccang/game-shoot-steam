// 第三层真实手机建造按钮验证背包原矿支付，不直接调用建造函数代替点击。
async original=>{
 const assert=require('node:assert/strict'),fs=require('node:fs'),out='output/playwright/mine-cart-materials';fs.mkdirSync(out,{recursive:true});const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;window.g=a.game;const p=(await import('/src/progression/progress.js')).freshProgress(),{freshMineLayer}=await import('/src/progression/mining/mine-layers.js'),{minePoint}=await import('/src/config/mining.js');
   p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.homeDecor.basement=true;p.wood=12;p.mining.ore=0;p.mining.bagOre={rareMetal:25};for(let d=2;d<=3;d++)p.mining.layers[d]=freshMineLayer(d,{x:0,y:0},()=>.5);
   const layer=p.mining.layers[3];layer.rails['3,0']=layer.dug['3,0']=layer.bridges['3,0']=true;g.progress=p;g.reset();g.start();g.mainlineSpeech=null;g.arrivalScene=null;g.vehicle.active=false;g.enemies=[];g.boss=null;g.cottage={kind:'mine',depth:3,ride:null,running:false,direction:1,scanWait:99999,hurtWait:99999,attackWait:99999,outside:minePoint({x:0,y:0})};Object.assign(g.player,minePoint({x:3,y:0}));a.renderer.camera.time=null;a.refresh();
  });
  await page.locator('#mine-tools-toggle').tap();await page.locator('#mine-build').tap();await page.locator('[data-mine-build="cart"]').tap();
  await page.waitForFunction(()=>g.progress.mining.layers[3].carts.length===1&&g.progress.mining.layers[3].carts[0].cargo?.rareMetal===17);const result=await page.evaluate(()=>({ore:g.progress.mining.ore,bag:g.progress.mining.bagOre,cargo:g.progress.mining.layers[3].carts[0].cargo,wood:g.progress.wood,deepCars:g.progress.mining.layers[3].carts.length,surfaceCars:g.progress.mining.carts.length,notice:g.cottage.notice}));assert.equal(result.ore,0);assert.equal(result.bag.rareMetal,undefined);assert.equal(result.cargo.rareMetal,17);assert.equal(result.wood,0);assert.equal(result.surfaceCars,0);assert.match(result.notice,/自动装入/);await page.screenshot({path:out+'/built-from-bag.png'});assert.deepEqual(errors,[]);fs.writeFileSync(out+'/result.json',JSON.stringify({result,errors},null,2));return {result,errors};
 }finally{await context.close();}
}
