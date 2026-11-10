// 手机建设页实际确认费用，验证低探索率开通、缺料反馈和已开层免费往返。
async original=>{
 const assert=require('node:assert/strict'),fs=require('node:fs'),out='output/playwright/mine-unlock-cost';fs.mkdirSync(out,{recursive:true});
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 // 操作页沿用原工具栏和弹窗暂停规则，不直接调用开层函数。
 async function open(){if(!await page.locator('#mine-build').isVisible())await page.locator('#mine-tools-toggle').tap();await page.locator('#mine-build').tap();}
 async function action(kind){await open();await page.locator('[data-mine-special="'+kind+'"]').tap();await page.waitForTimeout(200);}
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;window.g=a.game;window.mc=await import('/src/config/mining.js');window.ml=await import('/src/core/mining/mine-layers.js');const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.homeDecor.basement=true;p.coins=10000;p.wood=20;(await import('/src/progression/mining/mining.js')).openBasement(p.mining);p.mining.ore=10;p.mining.coreClears[1]=true;p.mining.coreCrystals[1]=1;p.mining.seed=1847;
   g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.enemies=[];g.spawnTimer=99999;g.cottage={kind:'cottage',floor:0,outside:mc.MINING.home};Object.assign(g.player,mc.MINING.hatch.goal);if(!(await import('/src/core/mining/mining.js')).enterMine(g))throw Error('地下入口失败');g.cottage.scanWait=99999;a.refresh();
  });
  await open();assert.match(await page.locator('[data-mine-special="down"]').innerText(),/10000 金币 \+ 10 矿石 \+ 20 木材/);assert.match(await page.locator('#mine-layer-rule').innerText(),/晶核不可跨层代用/);
  for(const [width,height] of [[320,568],[390,844]]){await page.setViewportSize({width,height});await page.screenshot({path:out+'/quote-'+width+'.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
  await page.locator('[data-mine-special="down"]').tap();await page.waitForFunction(()=>g.cottage.depth===2);assert.deepEqual(await page.evaluate(()=>({coins:g.progress.coins,ore:g.progress.mining.ore,wood:g.progress.wood})),{coins:0,ore:0,wood:0});
  await open();assert.match(await page.locator('#mine-layer-rule').innerText(),/金币缺 30000/);await page.locator('[data-mine-special="down"]').tap();await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>g.cottage.depth),2);assert.match(await page.evaluate(()=>g.cottage.notice),/材料不足/);
  const seed=await page.evaluate(()=>ml.currentMineLayer(g).seed);await action('up');assert.equal(await page.evaluate(()=>g.cottage.depth),1);await open();assert.match(await page.locator('[data-mine-special="down"]').innerText(),/免费/);await page.screenshot({path:out+'/free-return.png'});await page.locator('[data-mine-special="down"]').tap();await page.waitForFunction(()=>g.cottage.depth===2);assert.equal(await page.evaluate(()=>ml.currentMineLayer(g).seed),seed);assert.equal(await page.evaluate(()=>g.progress.coins),0);
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/result.json',JSON.stringify({depth:2,seed,paid:{coins:10000,ore:10,wood:20},freeReturn:true,errors},null,2));return {paidOnce:true,freeReturn:true,errors};
 }catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}finally{await context.close();}
}
