// 正式手机界面验收：快捷施工、局部灯光、荧菇、真实点击候停和昼夜同屏。
async page=>{
 const fs=require('node:fs'),assert=require('node:assert/strict'),out='output/mine-fog';fs.mkdirSync(out,{recursive:true});
 await page.goto('http://localhost:4175');await page.locator('#start').tap();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;window.g=a.game;
  const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.homeDecor.basement=true;p.coins=100000;p.wood=10000;
  (await import('/src/progression/mining/mining.js')).openBasement(p.mining);p.mining.seed=1847;p.mining.ore=10000;p.mining.shafts=['7,3'];
  for(let x=4;x<=9;x++)for(let y=1;y<=5;y++){p.mining.dug[`${x},${y}`]=true;p.mining.bridges[`${x},${y}`]=true;}
  g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.mainlineTalkDelay=g.spawnTimer=999999;g.trees=[];
  Object.assign(g.player,(await import('/src/config/mining.js')).minePoint({x:7,y:3}),{vx:0,vy:0});(await import('/src/core/mining/mining.js')).enterMine(g,'7,3');a.refresh();
 });
 await page.waitForTimeout(400);assert.equal(await page.locator('#mine-fish,#mine-tackle').count(),0);
 assert.deepEqual(await page.locator('.mine-compact button').allTextContents(),['挖矿','铺轨','回收','工具 ▴']);
 await page.locator('#mine-rail').tap();assert.equal(await page.evaluate(()=>g.cottage.tool),'rail');await page.locator('#mine-rail').tap();
 await page.locator('#mine-remove').tap();assert.equal(await page.locator('#mine-removal-dialog').isVisible(),true);await page.locator('#mine-removal-dialog [data-remove-close]').last().tap();
 await page.locator('#mine-tools-toggle').tap();await page.locator('[data-mine-tool="lamp"]').tap();assert.equal(await page.evaluate(()=>g.progress.mining.decor['7,3']),'lamp');await page.locator('#mine-tools-toggle').tap();
 // 点击地下梯口时必须看到真实倒计时，不能直接跳回地表。
 await page.evaluate(()=>{g.player.x-=80;});await page.waitForTimeout(150);
 await page.locator('[data-mine-portal="shaft:7,3"]').tap();await page.waitForFunction(()=>g.cottage?.portalWait?.elapsed>.08);assert.equal(await page.evaluate(()=>g.cottage.kind),'mine');await page.screenshot({path:out+'/portal-countdown.png'});await page.waitForFunction(()=>!g.cottage);
 // 重新点同一地表矿洞，验证原候停进入与新地下防回弹兼容。
 await page.evaluate(async()=>{(await import('/src/core/navigation/scene-approach.js')).approachMineEntrance(g,'7,3');});await page.waitForFunction(()=>g.cottage?.kind==='mine');await page.waitForTimeout(1300);assert.equal(await page.evaluate(()=>g.cottage.kind),'mine');
 const shots=[];
 for(const [width,height,id]of [[320,568,'day'],[390,844,'night']]){
  await page.setViewportSize({width,height});await page.evaluate(async id=>{
   const {mineGlow}=await import('/src/world/mine-vision.js'),{minePoint}=await import('/src/config/mining.js');const l=g.progress.mining;let cell;
   for(let y=3;y<35&&!cell;y++)for(let x=3;x<35;x++)if(mineGlow({x,y},l)){cell={x,y};break;}
   window.glowCell=cell;for(let y=cell.y-2;y<=cell.y+2;y++)for(let x=cell.x-3;x<=cell.x+2;x++)l.dug[`${x},${y}`]=true;
   Object.assign(g.player,minePoint({x:cell.x-1,y:cell.y+1}),{vx:0,vy:0});l.decor[`${cell.x-2},${cell.y}`]='lamp';
   l.rails[`${cell.x-1},${cell.y+1}`]=true;l.carts=[{id:1,...minePoint({x:cell.x-1,y:cell.y+1}),wheel:0,heading:1,cargo:{stone:4}}];g.cottage.cartBoardingBlocked={id:1,depth:1};
   const {LIVING_PHASES}=await import('/src/config/living-world.js');g.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id===id).start+1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);a.refresh();
  },id);
  await page.waitForTimeout(600);const review=await page.evaluate(()=>({fog:a.renderer.mineFogReview,overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...document.querySelectorAll('.mine-compact button')].map(b=>({text:b.textContent,w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height})),errors:g.profiler.events.filter(e=>e.type==='frame-error')}));
  assert.equal(review.overflow,false);assert.deepEqual(review.errors,[]);assert.ok(review.fog.sources.some(s=>s.kind==='flora'));assert.ok(review.fog.sources.some(s=>s.kind==='lamp'));assert.ok(review.fog.sources.length<=16);assert.ok(review.buttons.every(b=>b.w>=44&&b.h>=44));
  await page.screenshot({path:`${out}/${id}-${width}.png`});shots.push({width,height,id,...review});
 }
 const fogCost=await page.evaluate(async()=>{const {drawMineFog}=await import('/src/rendering/mine-fog.js');const t=performance.now();for(let i=0;i<40;i++)drawMineFog(a.renderer,g,g.progress.mining);return (performance.now()-t)/40;});shots.push({fogSubmitMs:fogCost});
 fs.writeFileSync(out+'/review.json',JSON.stringify(shots,null,2));return shots.filter(s=>s.fog).map(s=>({width:s.width,time:s.id,lights:s.fog.sources.length,maskBytes:s.fog.bytes}));
}
