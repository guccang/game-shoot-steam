// 正式手机游戏循环验证矿车到站、持续按键不重启及主动返程。
async original=>{
 const assert=require('node:assert/strict'),fs=require('node:fs'),out='output/playwright/mine-cart-terminal';fs.mkdirSync(out,{recursive:true});
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],reports=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;window.g=a.game;window.m=await import('/src/config/mining.js');window.mining=await import('/src/core/mining/mining.js');
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.homeDecor.basement=true;(await import('/src/progression/mining/mining.js')).openBasement(p.mining);
   p.mining.rails={};for(let x=-2;x<=4;x++){const key=m.mineKey({x,y:0});p.mining.rails[key]=p.mining.dug[key]=p.mining.bridges[key]=true;}p.mining.carts=[{id:1,...m.MINING.home,heading:1,wheel:0}];g.progress=p;g.reset();g.start();g.mainlineSpeech=null;g.arrivalScene=null;g.vehicle.active=false;g.cottage={kind:'cottage',floor:0,outside:m.MINING.home};Object.assign(g.player,m.MINING.hatch.goal);if(!mining.enterMine(g))throw Error('进入矿区失败');g.cottage.scanWait=g.cottage.hurtWait=9999;g.enemies=[];g.boss=null;if(!mining.rideMineCart(g))throw Error('上车失败');window.end=m.minePoint({x:4,y:0});a.renderer.camera.time=null;a.refresh();
  });
  await page.keyboard.down('ArrowRight');await page.waitForFunction(()=>g.cottage.running);await page.waitForFunction(()=>!g.cottage.running&&Math.abs(g.player.x-end.x)<.001,null,{timeout:10000});
  const stopped=await page.evaluate(()=>({x:g.player.x,y:g.player.y,wheel:g.progress.mining.carts[0].wheel,heading:g.progress.mining.carts[0].heading,notice:g.cottage.notice}));await page.waitForTimeout(650);
  const held=await page.evaluate(()=>({x:g.player.x,y:g.player.y,wheel:g.progress.mining.carts[0].wheel,heading:g.progress.mining.carts[0].heading,notice:g.cottage.notice}));assert.deepEqual(held,stopped);assert.match(stopped.notice,/铁路尽头/);await page.screenshot({path:out+'/stopped.png'});reports.push(stopped);
  await page.keyboard.up('ArrowRight');await page.waitForTimeout(80);await page.keyboard.down('ArrowLeft');await page.waitForFunction(()=>g.cottage.running&&g.player.x<end.x-20);await page.keyboard.up('ArrowLeft');await page.screenshot({path:out+'/manual-return.png'});assert.deepEqual(errors,[]);fs.writeFileSync(out+'/result.json',JSON.stringify({reports,errors},null,2));return {stopped,manualReturn:true,errors};
 }finally{await context.close();}
}
