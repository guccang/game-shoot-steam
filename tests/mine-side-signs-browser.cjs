// 侧牌复用正式矿区，检查相邻梯口、手机昼夜和点击走向真实入口。
async page=>{
 const fs=require('fs'),assert=require('node:assert/strict'),out='output/mine-side-signs';fs.mkdirSync(out,{recursive:true});
 await page.goto('http://localhost:4175');await page.locator('#start').tap();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;window.g=a.game;
  const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.homeDecor.basement=true;p.coins=100000;p.wood=10000;
  (await import('/src/progression/mining/mining.js')).openBasement(p.mining);p.mining.seed=1847;p.mining.ore=10000;p.mining.shafts=['7,3'];
  for(let x=4;x<=9;x++)for(let y=1;y<=5;y++){p.mining.dug[`${x},${y}`]=true;p.mining.bridges[`${x},${y}`]=true;}
  g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.mainlineTalkDelay=g.spawnTimer=999999;g.trees=[];
  Object.assign(g.player,(await import('/src/config/mining.js')).minePoint({x:7,y:3}),{vx:0,vy:0});(await import('/src/core/mining/mining.js')).enterMine(g,'7,3');a.refresh();
 });

 await page.evaluate(async()=>{const m=g.progress.mining;m.entry='6,0';m.descent='6,1';m.depotRow=2;m.shafts=[];m.layers={2:(await import('/src/progression/mining/mine-layers.js')).freshMineLayer(2,{x:6,y:1},()=>.5)};for(let x=3;x<=9;x++)for(let y=-2;y<=4;y++){m.dug[x+','+y]=true;m.bridges[x+','+y]=true;}for(let x=3;x<=8;x++)m.rails[x+',2']=true;for(let y=0;y<=3;y++)m.rails['6,'+y]=true;m.decor['7,0']='lamp';m.decor['7,2']='lamp';Object.assign(g.player,(await import('/src/config/mining.js')).minePoint({x:6,y:1}),{vx:0,vy:0});g.player.x-=45;g.cottage.portalLatch='1:6,1';g.cottage.portalWait=null;a.refresh();});
 const reports=[];
 for(const [width,height,time]of [[320,568,'day'],[390,844,'night'],[1280,900,'day'],[1280,900,'night']]){
 await page.setViewportSize({width,height});await page.evaluate(async time=>{const phases=(await import('/src/config/living-world.js')).LIVING_PHASES;g.progress.living.calendar.elapsed=phases.find(p=>p.id===time).start+1000;},time);await page.waitForTimeout(400);
 const review=await page.evaluate(()=>({signs:a.renderer.mineReview.portalSigns,errors:g.profiler.events.filter(e=>e.type==='frame-error'),overflow:document.documentElement.scrollWidth>innerWidth}));assert.deepEqual(review.errors,[]);assert.equal(review.overflow,false);assert.equal(review.signs.length,3);for(const p of review.signs)assert.ok(Math.abs(p.x-p.goal.x)>=82);
 await page.screenshot({path:out+'/'+time+'-'+width+'.png'});reports.push({width,height,time,...review});}
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);await page.locator('[data-mine-sign="down"]').tap();await page.waitForFunction(()=>g.cottage?.portalWait?.elapsed>.08);assert.equal(await page.evaluate(()=>g.cottage.depth),1);await page.waitForFunction(()=>g.cottage?.depth===2);
 fs.writeFileSync(out+'/review.json',JSON.stringify(reports,null,2));return {shots:reports.length,sideSignTravel:true};
}