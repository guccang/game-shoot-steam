// 种子小屋真实手机交互：击杀解锁、门前购买、来源、远程导航和昼夜同屏。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival=null;p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';p.farm.wildMaps=['forest','jiuzhaigou'];p.farm.delivery.nextAt=Date.now()+3600000;p.coins=200;
   g.progress=p;g.mapId='forest';g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.fireClock=999999;g.enemies=[];
   Object.assign(g.player,{x:1000,y:890,vx:0,vy:0});for(const d of document.querySelectorAll('dialog[open]'))d.close();a.renderer.camera.time=null;
   // 正式敌人及击杀奖励路径，随机数固定只为确定验收的种子种类。
   g.random=()=>0;g.spawnEnemy(0,160,{x:1400,y:900});const e=g.enemies.at(-1);g.hit(e,100000);g.hit(e,100000);if(g.progress.farm.seeds[0]!==1||!g.progress.farm.unlocked[0])throw Error('真实击杀未唯一发放种子');g.enemies=[];
   window.light=async time=>{Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();};await light('day');
  });await page.waitForTimeout(700);
  await page.locator('#nearby-interaction[data-target="seed-shop"]').waitFor({state:'visible'});
  for(const time of ['day','night']){await page.evaluate(time=>light(time),time);await page.waitForTimeout(250);await page.screenshot({path:`output/playwright/seed-cottage/building-${time}.png`});}
  await page.locator('#nearby-interaction').tap();await page.locator('#seed-shop-dialog').waitFor({state:'visible'});
  if(!await page.locator('[data-buy-seed="1"]').first().isDisabled())throw Error('未解锁商品可购买');
  await page.locator('[data-buy-seed="0"][data-count="5"]').tap();
  if(await page.evaluate(()=>a.game.progress.coins!==150||a.game.progress.farm.seeds[0]!==6))throw Error('雏菊购买扣款错误');
  await page.locator('#seed-shop-goods summary').first().tap();
  for(const [width,height] of [[320,568],[390,844],[1280,800]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(time=>light(time),time);await page.waitForTimeout(150);
   const r=await page.locator('#seed-shop-dialog').boundingBox();if(!r||r.x<0||r.y<0||r.x+r.width>width+.5||r.y+r.height>height+.5)throw Error('商店底板越界 '+JSON.stringify(r));
   const sizes=await page.locator('#seed-shop-dialog button').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return [r.width,r.height];}));if(sizes.some(([w,h])=>w<44||h<44))throw Error('按钮小于44 '+JSON.stringify(sizes));
   await page.screenshot({path:`output/playwright/seed-cottage/shop-${width}-${time}.png`});
  }
  await page.setViewportSize({width:390,height:844});await page.locator('#seed-shop-close').tap();
  // 用完库存后序列化重载仍保留购买权限，远处只能浏览和导航。
  await page.evaluate(async()=>{const g=a.game;g.progress.farm.seeds[0]=0;g.progress=(await import('/src/progression/progress.js')).validateProgress(structuredClone(g.progress));Object.assign(g.player,{x:740,y:890});a.refresh();});
  await page.locator('#field-menu-toggle').tap();await page.locator('#seed-shop-menu').tap();
  if(!await page.locator('[data-buy-seed="0"]').first().isDisabled())throw Error('远程可购买');
  if(!(await page.locator('#seed-shop-goods article').first().innerText()).includes('已解锁购买'))throw Error('用完失去解锁');
  await page.locator('#seed-shop-go').tap();await page.waitForFunction(()=>!document.querySelector('#seed-shop-dialog').open);
  const nav=await page.evaluate(async()=>(await import('/src/core/world-navigation.js')).worldNavigationObjective(a.game));if(nav?.site.id!=='seed-shop')throw Error('导航目标错误 '+JSON.stringify(nav));
  // 导航沿用世界路线提示；玩家使用真实移动输入沿营地走到柜台。
  await page.keyboard.down('ArrowRight');await page.waitForFunction(()=>Math.hypot(a.game.player.x-1000,a.game.player.y-872)<40,null,{timeout:12000});await page.keyboard.up('ArrowRight');
  await page.locator('#nearby-interaction[data-target="seed-shop"]').tap();await page.locator('[data-buy-seed="0"][data-count="1"]').tap();
  if(await page.evaluate(()=>a.game.progress.farm.seeds[0]!==1||a.game.progress.coins!==140))throw Error('导航后购种失败');
  if(errors.length)throw Error(errors.join('\n'));console.log({designCriterion:'seed-cottage',result:'PASS',checks:'kill/unlock/purchase/navigation/mobile/day/night'});
 }catch(e){console.log(await page.evaluate(()=>({player:{x:a.game.player.x,y:a.game.player.y},state:a.game.state,near:document.querySelector('#nearby-interaction')?.outerHTML})));await page.screenshot({path:'output/playwright/seed-cottage/failure.png'});throw e;}finally{await context.close();}
}
