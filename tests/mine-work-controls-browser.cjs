// 手机主操作栏、自动迎敌恢复及方向直接起步，使用真实按钮和触屏输入。
async original=>{
 const assert=require('node:assert/strict'),fs=require('node:fs'),out='output/playwright/mine-work-controls';fs.mkdirSync(out,{recursive:true});
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 // 使用游戏日历切换时段，保留正式场景光照和手机HUD。
 async function phase(id){await page.evaluate(async id=>{g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===id).start+1000;a.refresh();},id);await page.waitForTimeout(160);}
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;window.g=a.game;window.mc=await import('/src/config/mining.js');window.mi=await import('/src/core/mining/mining.js');window.ml=await import('/src/core/mining/mine-layers.js');
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.homeDecor.basement=true;(await import('/src/progression/mining/mining.js')).openBasement(p.mining);p.mining.seed=1847;
   g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.livingPersist=()=>true;g.cottage={kind:'cottage',floor:0,outside:mc.MINING.home};Object.assign(g.player,mc.MINING.hatch.goal);if(!mi.enterMine(g))throw Error('进入失败');g.cottage.scanWait=99999;g.cottage.hurtWait=999;g.magazines[g.loadout.weapon].ammo=g.weapon().magazineSize;g.magazines[g.loadout.weapon].remaining=0;
   const l=ml.currentMineLayer(g),ec=await import('/src/config/mine-ecology.js');window.center=null;
   for(let y=18;y<60&&!center;y++)for(let x=18;x<60&&!center;x++){let dry=true;for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)if(ec.mineTerrain({x:x+dx,y:y+dy},l).water)dry=false;if(dry)center={x,y};}if(!center)throw Error('缺少干燥区域');
   for(let y=center.y-5;y<=center.y+5;y++)for(let x=center.x-8;x<=center.x+8;x++){const key=mc.mineKey({x,y});l.dug[key]=true;if(y===center.y){l.rails[key]=true;l.bridges[key]=true;}}
   Object.assign(g.player,mc.minePoint(center));l.animals={};l.carts=[{id:1,...mc.minePoint(center),heading:1,wheel:0,cargo:{}}];window.realUpdate=g.update.bind(g);g.update=()=>{};a.refresh();
  });
  assert.equal(await page.locator('#mine-tools-panel').isVisible(),false);await page.locator('#mine-pick').tap();await page.evaluate(()=>{realUpdate(.05);a.refresh();});assert.equal(await page.evaluate(()=>g.cottage.tool),'pick');
  assert.equal(await page.locator('[data-mine-tool="pick"]').count(),1);
  const layouts=[];
  for(const [width,height] of [[320,568],[390,844],[430,932]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await phase(time);
   const layout=await page.evaluate(()=>{const p=document.querySelector('#mine-pick').getBoundingClientRect(),f=document.querySelector('#mine-fish').getBoundingClientRect();return {pick:{x:p.x,y:p.y,width:p.width,height:p.height},fish:{x:f.x,y:f.y},overflow:document.documentElement.scrollWidth>innerWidth};});assert.equal(layout.overflow,false);assert.ok(layout.pick.width>=44&&layout.pick.height>=44);assert.equal(layout.pick.y,layout.fish.y);assert.ok(layout.pick.x<layout.fish.x);layouts.push(layout);await page.screenshot({path:`${out}/pick-${width}-${time}.png`});
  }
  await page.setViewportSize({width:390,height:844});
  const ammo=await page.evaluate(()=>{const key=mc.mineKey({x:center.x+2,y:center.y});window.enemyKey=key;ml.currentMineLayer(g).animals[key]={key,kind:'spore',x:g.player.x+110,y:g.player.y,hp:10000,maxHp:10000,phase:'recover',timer:999,clock:0,death:0};return g.magazines[0].ammo;});
  await page.evaluate(()=>{for(let i=0;i<8;i++)realUpdate(.05);a.refresh();});assert.equal(await page.evaluate(()=>g.cottage.combatWork.tool),'pick');assert.equal(await page.evaluate(()=>g.cottage.weaponReady),true);assert.ok(await page.evaluate(()=>g.magazines[0].ammo)<ammo);assert.equal(await page.locator('#mine-pick').textContent(),'迎敌中');
  for(const time of ['day','night']){await phase(time);await page.screenshot({path:out+'/combat-'+time+'.png'});}
  await page.evaluate(()=>{ml.currentMineLayer(g).animals[enemyKey].hp=0;for(let i=0;i<24;i++)realUpdate(.05);a.refresh();});assert.equal(await page.evaluate(()=>g.cottage.tool),'pick');assert.equal(await page.evaluate(()=>g.cottage.weaponReady),false);assert.equal(await page.locator('#mine-pick').textContent(),'挖矿');await page.screenshot({path:out+'/restored.png'});
  await page.locator('#mine-tools-toggle').tap();await page.locator('#mine-board').tap();assert.equal(await page.evaluate(()=>g.cottage.ride),1);assert.equal(await page.locator('#mine-pick').isDisabled(),true);await page.evaluate(()=>{g.update=realUpdate;});
  // 无需点击开车，方向键及WASD分别直接启动；停止仍通过原按钮。
  for(const [key,direction] of [['ArrowRight',1],['a',3]]){
   const before=await page.evaluate(()=>g.player.x);await page.keyboard.down(key);await page.waitForFunction(({before,direction})=>g.cottage.running&&(g.player.x-before)*(direction===1?1:-1)>8,{before,direction});await page.keyboard.up(key);await page.locator('#mine-drive').tap();assert.equal(await page.evaluate(()=>g.cottage.running),false);
  }
  const cdp=await context.newCDPSession(page),before=await page.evaluate(()=>g.player.x);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,x:195,y:300}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:0,x:260,y:300}]});await page.waitForFunction(before=>g.cottage.running&&g.player.x>before+8,before);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();await page.locator('#mine-drive').tap();await page.screenshot({path:out+'/cart-stopped.png'});
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/result.json',JSON.stringify({layouts,errors,combatRestored:true,directionInputs:['方向键','WASD','触屏摇杆']},null,2));return {layouts:layouts.length,errors};
 }catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}finally{await context.close();}
}
