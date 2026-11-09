// 正式地下湖岸自动入口：步行靠岸、触控备竿、离岸收起及手机昼夜检查。
async page=>{
 const fs=require('node:fs'),assert=require('node:assert/strict'),out='output/mine-shore-entry';fs.mkdirSync(out,{recursive:true});
  await page.goto('http://localhost:4175');await page.locator('#start').tap();await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await(await import('/src/rendering/farm.js')).loadFarmArt();window.mc=await import('/src/config/mining.js');window.ec=await import('/src/config/mine-ecology.js');window.mi=await import('/src/core/mining/mining.js');
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.homeDecor.basement=true;(await import('/src/progression/mining/mining.js')).openBasement(p.mining);p.mining.seed=1847;p.wood=200;p.mining.ore=100;
   p.mining.layers[2]=(await import('/src/progression/mining/mine-layers.js')).freshMineLayer(2,{x:8,y:4},()=>.31);
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.cottage={kind:'cottage',floor:0,outside:mc.MINING.home};Object.assign(g.player,mc.MINING.hatch.goal);mi.enterMine(g);g.cottage.scanWait=99999;g.livingPersist=()=>true;g.progress.outdoors.rod=true;g.progress.outdoors.bait=20;
   window.outdoors=await import('/src/core/activities/outdoors.js');window.mf=await import('/src/world/mine-fishing.js');
   let found=false;
   outer:for(let y=-16;y<16;y++)for(let x=-16;x<16;x++){
    if(!ec.mineTerrain({x,y},g.progress.mining).water)continue;const center=mc.minePoint({x,y});
    for(let dy=-112;dy<=112;dy+=16)for(let dx=-112;dx<=112;dx+=16){Object.assign(g.player,{x:center.x+dx,y:center.y+dy});if(mf.mineFishingShore(g)){found=true;break outer;}}
   }
   if(!found)throw Error('没有找到真实岸边');window.bank={x:g.player.x,y:g.player.y};a.refresh();
  });

 const reports=[];
 for(const [width,height,time]of [[320,568,'day'],[390,844,'night'],[1280,900,'day'],[1280,900,'night']]){
  await page.setViewportSize({width,height});await page.evaluate(async time=>{const p=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);a.game.progress.living.calendar.elapsed=p.start+1000;Object.assign(a.game.player,bank);a.game.progress.outdoors.bait=20;a.refresh();},time);
  await page.waitForFunction(()=>!document.getElementById('fishing-nearby').hidden);assert.equal(await page.locator('#fishing-nearby').isVisible(),true);
  const box=await page.locator('#fishing-nearby').boundingBox();assert.ok(box.height>=44&&box.width>=44);await page.screenshot({path:`${out}/shore-${time}-${width}.png`});
  await page.locator('#fishing-nearby').tap();assert.equal(await page.locator('#fishing-hud').isVisible(),true);assert.equal(await page.locator('#mine-controls').isVisible(),false);
  assert.equal(await page.evaluate(()=>a.game.fishing.phase),'ready');await page.screenshot({path:`${out}/ready-${time}-${width}.png`});
  await page.locator('#fishing-cancel').tap();await page.waitForTimeout(200);assert.equal(await page.locator('#mine-controls').isVisible(),true);
  await page.evaluate(()=>{a.game.progress.outdoors.bait=0;});await page.waitForTimeout(200);assert.equal(await page.locator('#fishing-nearby').isVisible(),false);
  await page.evaluate(()=>{a.game.progress.outdoors.bait=20;Object.assign(a.game.player,mc.MINING.home);});await page.waitForTimeout(250);assert.equal(await page.locator('#fishing-nearby').isVisible(),false);
  reports.push({width,height,time,entryBox:box});
 }
 // 找一段真实干岸直线路径，使用触摸移动进入提示范围，不伪造湖面或可钓结果。
 await page.setViewportSize({width:390,height:844});const walk=await page.evaluate(async()=>{
  const g=a.game,{mineOccupancy}=await import('/src/physics/mine-motion.js');let start;
  outer:for(const distance of [48,80,112,144])for(let i=0;i<16;i++){
   const q={x:bank.x+Math.cos(i*Math.PI/8)*distance,y:bank.y+Math.sin(i*Math.PI/8)*distance};
   if(!Array.from({length:17},(_,j)=>j/16).every(t=>mineOccupancy(g,q.x+(bank.x-q.x)*t,q.y+(bank.y-q.y)*t)))continue;
   Object.assign(g.player,q);if(!mf.mineFishingShore(g)){start=q;break outer;}
  }
  if(!start)throw Error('未找到可走的岸边验证路径');Object.assign(g.player,start);return {start,goal:bank};
 });await page.waitForTimeout(250);assert.equal(await page.locator('#fishing-nearby').isVisible(),false);
 const cdp=await page.context().newCDPSession(page),frame=await page.locator('#game-frame').boundingBox(),x=frame.x+100,y=frame.y+480,dx=walk.goal.x-walk.start.x,dy=walk.goal.y-walk.start.y,n=Math.hypot(dx,dy);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx/n*60,y:y+dy/n*60}]});
 await page.waitForFunction(()=>!document.getElementById('fishing-nearby').hidden);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
 assert.equal(await page.locator('#fishing-nearby').isVisible(),true);const position=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));assert.ok(Math.hypot(position.x-walk.start.x,position.y-walk.start.y)>2);
 const errors=await page.evaluate(()=>a.game.profiler.events.filter(e=>e.type==='frame-error'));assert.deepEqual(errors,[]);fs.writeFileSync(out+'/review.json',JSON.stringify({reports,walk,position,errors},null,2));return {screens:reports.length,walked:Math.hypot(position.x-walk.start.x,position.y-walk.start.y)};
}
