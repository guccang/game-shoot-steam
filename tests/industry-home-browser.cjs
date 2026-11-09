// 手机真实管理员入口：无货车时直接用小屋原料，校验合计提示、缺料回滚和两厂生产。
async original=>{
 const assert=require('node:assert/strict'),fs=require('node:fs'),out='output/playwright/industry-home';fs.mkdirSync(out,{recursive:true});
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;window.g=a.game;const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.campLand.owned=(await import('/src/config/camp-land.js')).CAMP_PLOTS.map(s=>s.id);p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(s=>s.id);p.restoration.cottageRested=true;p.wood=1002;p.industry.raw.copper=4;p.materials.copper=4;p.vehicleHulls.fill(0);p.campParking.owned=[];
   g.progress=p;g.reset();g.start();g.mainlineSpeech=null;g.mainlineTalkDelay=g.spawnTimer=g.encounterTimer=99999;g.vehicle.active=false;g.enemies=[];g.boss=null;window.ind=await import('/src/core/industry/industry.js');
  });
 // 滑动条使用原生键盘事件精确设份数，另有触屏拖动专项覆盖。
 async function amount(n){const slider=page.locator('[data-industry-count]');await slider.press('Home');for(let i=1;i<n;i++)await slider.press('ArrowRight');}
  // 使用正式进屋方法放置在管理员面前，再通过触控服务入口打开生产页面。
  async function openFactory(id){
   await page.evaluate(async id=>{const {enterWorkshop,leaveCottage}=await import('/src/core/home/cottage.js');if(g.cottage)leaveCottage(g);g.cottageDoorLatch=false;Object.assign(g.player,ind.industryDoor(ind.INDUSTRY_SITES[id]),{vx:0,vy:0});if(!enterWorkshop(g,id))throw Error('无法进入工厂');Object.assign(g.player,(await import('/src/core/workshop/workshop-display-entry.js')).shopkeeperApproach(g.cottage));a.renderer.camera.time=null;a.refresh();},id);
   await page.locator('[data-room-item="shopkeeper"]').tap();await page.locator('#npc-conversation-dialog').waitFor({state:'visible'});await page.locator('[data-npc-service]').tap();await page.locator('#industry-dialog').waitFor({state:'visible'});
   assert.match(await page.locator('[data-industry-docked]').textContent(),/仓库供料/);
  }
  // 点击材料再点料斗，与拖放使用同一备料入口。
  async function stage(key){await page.locator('[data-industry-material="'+key+'"]').tap();await page.locator('[data-industry-hopper]').tap();}
  await openFactory('refinery');assert.match(await page.locator('[data-industry-material="rawCopper"]').getAttribute('aria-label'),/本批需要2，可用4/);
  await amount(3);await stage('rawCopper');assert.match(await page.locator('#industry-message').innerText(),/不足/);assert.equal(await page.evaluate(()=>g.progress.industry.raw.copper),4);
  await amount(2);await stage('rawCopper');await stage('wood');await page.locator('[data-industry-start]').tap();assert.deepEqual(await page.evaluate(()=>({raw:g.progress.industry.raw.copper,wood:g.progress.wood,job:g.progress.industry.sites.refinery.job.count,cars:ind.industryVehicles(g)})),{raw:0,wood:1000,job:2,cars:[]});
  await page.screenshot({path:out+'/refinery-390.png'});await page.locator('[data-industry-close]').tap();
  await openFactory('factory');await amount(2);await page.locator('[data-industry-recipe]').selectOption('make-farmParts');await stage('copper');await stage('wood');await page.locator('[data-industry-start]').tap();assert.equal(await page.evaluate(()=>g.progress.materials.copper),0);assert.equal(await page.evaluate(()=>g.progress.wood),0);
  for(const [width,height] of [[320,568],[390,844],[430,932]]){
   await page.setViewportSize({width,height});await page.locator('[data-industry-recipe]').scrollIntoViewIfNeeded();await page.waitForTimeout(280);
   const review=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectIndustry(g,document));assert.equal(review.overflow,false);assert.ok(review.controls.every(c=>c.height>=44));await page.screenshot({path:out+'/factory-'+width+'.png'});
  }
  await page.waitForFunction(()=>!g.progress.industry.sites.factory.job,null,{timeout:15000});assert.equal(await page.evaluate(()=>g.progress.materials.farmParts),2);assert.ok(await page.locator('[data-industry-output]').isDisabled());
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/result.json',JSON.stringify({refinery:await page.evaluate(()=>g.progress.industry.sites.refinery),factory:await page.evaluate(()=>g.progress.industry.sites.factory),errors},null,2));return {noVehicleProduction:true,errors};
 }catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}finally{await context.close();}
}
