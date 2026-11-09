// 手机触控完成跨仓购买，核对报价、缺料、背包交付和车体登记。
async original=>{
 const assert=require('node:assert/strict'),fs=require('node:fs'),out='output/playwright/workshop-materials';fs.mkdirSync(out,{recursive:true});
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],startupErrors=[];let testing=false;
 page.on('pageerror',e=>(testing?errors:startupErrors).push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;});
  await page.waitForTimeout(500);testing=true;
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;window.g=a.game;g.update=()=>{};
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(r=>r.id);p.campLand.owned=(await import('/src/config/camp-land.js')).CAMP_PLOTS.map(r=>r.id);p.weapons[1]=0;p.vehicleHulls[3]=0;p.vehicleHulls[0]=1;p.vehicleHulls[5]=1;p.coins=100000;p.wood=0;
   g.progress=p;g.reset();g.start();g.mainlineSpeech=null;g.enemies=[];g.vehicle.active=false;g.arrivalScene=null;
   window.fundWorkshop=async(kind,index)=>{
    const {enterWorkshop,leaveCottage}=await import('/src/core/home/cottage.js');if(g.cottage)leaveCottage(g);g.state='playing';g.cottageDoorLatch=false;g.mainlineSpeech=null;Object.assign(g.player,(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS[kind].door);if(!enterWorkshop(g,kind))throw Error('无法进入工坊');
    const p=g.progress,rows=(await import('/src/progression/workshop/equipment-goals.js')).equipmentRequirements(p,kind,index),{industryStore}=await import('/src/progression/industry/industry.js');
    for(const row of rows){
     if(row.key==='coins')continue;
     if(row.key==='wood'){p.wood=0;p.logistics.bagWood=10;p.logistics.builds[0].wood=20;p.logistics.builds[5].wood=row.need-30;}
     else if(row.key.endsWith('Gun')||row.key.endsWith('Vehicle')){p.materials[row.key]=0;const [store,key]=industryStore(p,row.key,5,true);store[key]=row.need-1;p.industry.bag[row.key]=1;}
     else p.materials[row.key]=row.need;
    }
    a.refresh();a.workshop.open(kind,index);return rows;
   };
  });
  const results=[];
  for(const [kind,index,width,height,time] of [['weapons',1,390,844,'day'],['vehicle',3,320,568,'night']]){
   await page.setViewportSize({width,height});
   const rows=await page.evaluate(async({kind,index,time})=>{Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);return fundWorkshop(kind,index);},{kind,index,time});
   assert.equal(await page.locator('#ws-purchase').isDisabled(),false);
   const quotes=await page.locator('#ws-resources .ws-resource').evaluateAll(nodes=>nodes.map(n=>({title:n.title,short:n.classList.contains('short')})));assert.ok(quotes.length);assert.ok(quotes.every(q=>!q.short));
   // 减少车内一份材料后重新报价，缺料阻止购买；补回后无需卸货即可结账。
   await page.evaluate(({kind,index})=>{g.progress.logistics.builds[5].wood--;a.workshop.open(kind,index);},{kind,index});assert.equal(await page.locator('#ws-purchase').isDisabled(),true);
   await page.evaluate(({kind,index})=>{g.progress.logistics.builds[5].wood++;a.workshop.open(kind,index);},{kind,index});
   await page.locator('#ws-purchase').tap();await page.locator('#workshop-dialog > .shop-dropzone').tap();
   assert.equal(await page.locator('#shop-checkout [data-pay]').isDisabled(),false);await page.screenshot({path:out+'/'+kind+'-'+time+'.png'});
   await page.locator('#shop-checkout [data-pay]').tap();
   await page.waitForFunction(({kind,index})=>(kind==='weapons'?g.progress.weapons:g.progress.vehicleHulls)[index]>0,{kind,index});
   const after=await page.evaluate(async rows=>{const {workshopMaterialCount}=await import('/src/progression/workshop/workshop-materials.js');return Object.fromEntries(rows.filter(r=>r.key!=='coins').map(r=>[r.key,workshopMaterialCount(g.progress,r.key)]));},rows);assert.ok(Object.values(after).every(n=>n===0),JSON.stringify(after));
   results.push({kind,quotes,after});if(await page.locator('#workshop-dialog').isVisible())await page.locator('#ws-close').tap();
  }
  fs.writeFileSync(out+'/result.json',JSON.stringify({results,errors,startupErrors},null,2));assert.deepEqual(errors,[]);return {results,errors,startupErrors};
 }catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}finally{await context.close();}
}
