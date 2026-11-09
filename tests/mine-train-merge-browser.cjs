// 通过手机真实按钮完成3+4编组合并、失败重试、行驶及解挂。
async original=>{
 const assert=require('node:assert/strict'),fs=require('node:fs'),out='output/playwright/mine-train-merge';fs.mkdirSync(out,{recursive:true});
 const context=await original.context().browser().newContext({viewport:{width:390,height:1050},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;window.g=a.game;window.mc=await import('/src/config/mining.js');window.mi=await import('/src/core/mining/mining.js');window.mt=await import('/src/core/mining/mine-train.js');
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.homeDecor.basement=true;(await import('/src/progression/mining/mining.js')).openBasement(p.mining);
   for(let y=-10;y<=12;y++)for(let x=-1;x<=1;x++){const key=mc.mineKey({x,y});p.mining.dug[key]=p.mining.bridges[key]=true;if(!x)p.mining.rails[key]=true;}
   p.mining.carts=[0,1,2,-1,-2,-3,-4].map((y,i)=>({id:i+1,...mc.minePoint({x:0,y}),leader:i===0||i===3?null:i,wheel:0,heading:0,cargo:{iron:i+1}}));p.mining.nextCart=8;
   g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.livingPersist=()=>true;g.cottage={kind:'cottage',floor:0,outside:mc.MINING.home};Object.assign(g.player,mc.MINING.hatch.goal);const entered=mi.enterMine(g);if(!entered)throw Error('进入失败');g.cottage.scanWait=99999;
   window.realUpdate=g.update.bind(g);g.update=()=>{};a.refresh();
  });
  await page.locator('#mine-tools-toggle').tap();await page.locator('#mine-board').tap();assert.equal(await page.evaluate(()=>g.cottage.ride),1);
  await page.screenshot({path:out+'/before.png'});
  const before=await page.evaluate(()=>{g.livingPersist=()=>false;return JSON.stringify(g.progress.mining.carts);});
  await page.locator('#mine-couple').tap();assert.equal(await page.evaluate(()=>JSON.stringify(g.progress.mining.carts)),before);assert.equal(await page.evaluate(()=>g.cottage.ride),1);
  await page.evaluate(()=>{g.livingPersist=()=>true;});await page.locator('#mine-couple').tap();

  const merged=await page.evaluate(()=>({ride:g.cottage.ride,position:{x:g.player.x,y:g.player.y},ids:mt.mineTrain(g.progress.mining,g.progress.mining.carts.find(c=>c.id===g.cottage.ride)).map(c=>c.id),cargo:g.progress.mining.carts.map(c=>c.cargo),notice:g.cottage.notice}));
  assert.deepEqual(merged.ids,[3,2,1,4,5,6,7]);assert.match(merged.notice,/7 辆/);assert.equal(merged.ride,1);assert.deepEqual(merged.position,await page.evaluate(()=>mc.MINING.home));assert.ok(await page.locator('#mine-drive').isDisabled());assert.ok(await page.locator('#mine-route').isDisabled());
  // 恢复正式游戏循环，方向触屏在中间车厢只能提示，不移动猫或列车。
  await page.evaluate(()=>{g.update=realUpdate;});const cdp=await context.newCDPSession(page);
  async function touch(sign,until){const f=await page.locator('#game-frame').boundingBox(),x=f.x+65,y=f.y+f.height*.56;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+sign*45}]});try{if(until)await page.waitForFunction(until,null,{timeout:15000});else await page.waitForTimeout(250);}finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}}
  async function phase(id){await page.evaluate(async id=>{const p=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===id);g.progress.living.calendar.elapsed=p.start+p.duration/2;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);},id);}
  await page.locator('#mine-tools-toggle').tap();await touch(1);assert.equal(await page.evaluate(()=>g.cottage.running),false);assert.deepEqual(await page.evaluate(()=>({x:g.player.x,y:g.player.y})),merged.position);
  for(const time of ['day','night']){await phase(time);await page.waitForTimeout(120);await page.screenshot({path:out+'/middle-'+time+'.png'});}
  // 自行下车并用真实摇杆走到车头，中途经过车厢不自动换座。
  await page.locator('#mine-tools-toggle').tap();await page.locator('#mine-board').tap();await page.locator('#mine-tools-toggle').tap();await touch(1,()=>Math.abs(g.player.y-g.progress.mining.carts.find(c=>c.id===3).y)<28);await page.waitForFunction(()=>g.cottage.ride===3);await page.locator('#mine-tools-toggle').tap();assert.ok(await page.locator('#mine-drive').isEnabled());assert.ok(await page.locator('#mine-route').isEnabled());
  const start=await page.evaluate(()=>g.player.y);await page.locator('#mine-drive').tap();await page.waitForFunction(start=>g.player.y>start+64,start);await page.locator('#mine-drive').tap();await phase('day');await page.screenshot({path:out+'/head-driven-day.png'});
  const after=await page.evaluate(async()=>{const m=(await import('/src/progression/mining/mining.js')).normalizeMining(g.progress.mining);return {ids:mt.mineTrain(m,m.carts.find(c=>c.id===g.cottage.ride)).map(c=>c.id),cargo:m.carts.map(c=>c.cargo)};});assert.deepEqual(after.ids,merged.ids);assert.deepEqual(after.cargo,merged.cargo);
  // 再自行下车，沿完整列车走到尾端，候停登乘后从尾端反向驾驶。
  await page.locator('#mine-board').tap();await page.locator('#mine-tools-toggle').tap();await touch(-1,()=>Math.abs(g.player.y-g.progress.mining.carts.find(c=>c.id===7).y)<28);await page.waitForFunction(()=>g.cottage.ride===7);await page.locator('#mine-tools-toggle').tap();assert.ok(await page.locator('#mine-drive').isEnabled());
  const tailStart=await page.evaluate(()=>g.player.y);await page.locator('#mine-drive').tap();await page.waitForFunction(y=>g.player.y<y-64,tailStart);await page.locator('#mine-drive').tap();await phase('night');await page.setViewportSize({width:320,height:568});await page.screenshot({path:out+'/tail-driven-night-320.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const reversed=await page.evaluate(()=>mt.mineTrain(g.progress.mining,g.progress.mining.carts.find(c=>c.id===g.cottage.ride)).map(c=>c.id));assert.deepEqual(reversed,[7,6,5,4,1,2,3]);await page.locator('#mine-detach').tap();assert.ok(await page.evaluate(()=>g.progress.mining.carts.every(c=>!c.leader)));assert.deepEqual(errors,[]);
  fs.writeFileSync(out+'/result.json',JSON.stringify({merged,after,reversed,middleCannotDrive:true,headAndTailDriven:true,errors},null,2));return {cars:merged.ids.length,seatUnchanged:true,middleCannotDrive:true,headAndTailDriven:true,errors};
 }catch(error){await page.screenshot({path:out+'/failure.png'});throw error;}finally{await context.close();}
}
