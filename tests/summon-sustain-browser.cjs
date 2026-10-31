// 隔离浏览器实机：逐只出场、真实移动、受击死亡爆炸、持续回能及昼夜手机同屏。
async page=>{
 if(new URL(page.url()).port!=='4205')throw Error('仅允许隔离验收端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.reload();await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application;if(!await a.ready)throw Error('正式素材加载失败');
  const g=a.game;window.summonGame=g;g.progress.weapons.fill(1);g.progress.vehicleWeapons.fill(1);g.progress.vehicleHulls.fill(1);
  g.progress.weapon=15;g.progress.weaponParts[15].coordination=8;g.reset();g.start();g.updateWaves=()=>{};
  g.enemies=[];g.boss=null;g.waveWarning=0;g.attackTimer=999;g.magazines[15].ammo=8;
  Object.assign(g.player,{x:900,y:850,invincible:999});
  Object.assign(a.environment,{time:'day',weather:'sun',forestSeason:'summer',autoTime:false,autoWeather:false});a.refresh();
 });
 const counts=[];
 for(let i=0;i<22;i++){
  counts.push(await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return {active:g.mechanical.nodes.filter(n=>n.active&&n.ready).length,energy:g.magazines[15].ammo};}));
  if(i===1||i===10)await page.screenshot({path:`output/playwright/summon-sustain/dogs-${i}.png`});
  await page.waitForTimeout(230);
 }
 if(counts[0].active>1||!counts.some(s=>s.active===2)||counts.some((s,i)=>i&&s.active>counts[i-1].active+1))throw Error('非逐只召唤 '+JSON.stringify(counts));
 if(counts.at(-1).energy<=counts[0].energy)throw Error('非满能源未恢复');
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(350);await page.keyboard.up('ArrowRight');
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:90,y:590}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:120,y:620}]});await page.waitForTimeout(300);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
 if(!await page.locator('#joystick').isHidden())throw Error('触摸取消未释放');
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application,g=a.game;g.progress.weapon=16;g.progress.vehicleLoadouts[0]=0;
  g.reset();g.start();g.updateWaves=()=>{};g.enemies=[];g.boss=null;g.waveWarning=0;Object.assign(g.player,{x:900,y:850,invincible:999});
  g.magazines[16].ammo=8;a.refresh();
 });
 await page.waitForFunction(()=>window.summonGame.spider.nodes.filter(n=>n.active&&n.ready&&n.hp>0).length>=2);
 await page.screenshot({path:'output/playwright/summon-sustain/spider-emergence.png'});
 // 放置真实近邻怪物并注入一次致命受击；爆炸与后续敌人受伤走正式承伤入口。
 await page.evaluate(async()=>{
  const g=(await import('/src/main.js')).application.game,n=g.spider.nodes[0];n.hp=1;
  const e=g.spawnEnemy(0,0,{x:n.x+24,y:n.y});Object.assign(e,{flying:false,hp:100000,maxHp:100000,damage:5,speed:65});
  window.summonVictim=e.id;window.summonNode=n.index;
 });
 await page.waitForTimeout(300);
 await page.evaluate(async()=>{const g=window.summonGame,{damageCompanion}=await import('/src/combat/companion-targets.js');damageCompanion({source:g,node:g.spider.nodes[window.summonNode]},999);});
 await page.waitForFunction(()=>window.summonGame.spider.nodes[window.summonNode].deathExploded);
 await page.screenshot({path:'output/playwright/summon-sustain/actual-death.png'});
 await page.waitForTimeout(1300);
 // 由正式伤害入口固定一次爆炸早期画面，六种视口/光照比较使用同一主体比例。
 const blast=await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application,g=a.game,{hurtMechanical}=await import('/src/combat/mechanical.js');
  g.update=()=>{};g.fx.items=[];g.numbers=[];g.enemies=[];g.projectiles=[];g.shots=[];
  Object.assign(g.player,{x:900,y:850,invincible:0,flash:0});
  const n=g.spider.nodes.find(n=>n.active&&n.ready&&n.hp>0);Object.assign(n,{x:1000,y:900});
  for(const [dx,dy] of [[30,0],[-45,20],[150,30]]){const e=g.spawnEnemy(0,0,{x:n.x+dx,y:n.y+dy});Object.assign(e,{flying:false,hp:10000,maxHp:10000,speed:0,damage:0});}
  hurtMechanical(g,n,999);g.fx.update(.08);g.summonVehicle();a.refresh();
  return {hp:g.enemies.map(e=>e.hp),particles:g.fx.items.length};
 });
 if(!(blast.hp[0]<10000&&blast.hp[1]<10000&&blast.hp[2]===10000))throw Error('爆炸范围伤害异常');
 const budgets=[];
 for(const width of [1280,390,320])for(const time of ['day','night']){
  await page.setViewportSize({width,height:width===1280?960:844});
  budgets.push(await page.evaluate(async({time,width})=>{
   const a=(await import('/src/main.js')).application,{EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
   a.environment.time=time;a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);a.renderer.seasons.reset('summer');
   a.renderer.camera.time=null;a.renderer.resize();a.refresh();a.renderer.draw();
   return {time,width,particles:a.game.fx.items.length,canvasBytes:[...document.querySelectorAll('canvas')].reduce((b,c)=>b+c.width*c.height*4,0)};
  },{time,width}));await page.screenshot({path:`output/playwright/summon-sustain/field-${width}-${time}.png`});
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.screenshot({path:'output/playwright/summon-sustain/reduced-320.png'});await page.emulateMedia({reducedMotion:'no-preference'});
 const frames=await page.evaluate(async()=>{
  const {renderVisualCase}=await import('/src/rendering/visual-review.js');
  const gallery=document.createElement('canvas');gallery.id='summon-gallery';gallery.width=1200;gallery.height=500;gallery.style.cssText='position:absolute;z-index:999;top:0;left:0;width:1200px;background:#eee8c8';document.body.append(gallery);
  const c=gallery.getContext('2d'),tile=document.createElement('canvas');tile.width=400;tile.height=250;const frames=[];
  for(let i=0;i<6;i++){await renderVisualCase(tile.getContext('2d'),'summon-sustain-deathburst',i*.09);frames.push(tile.toDataURL());c.drawImage(tile,(i%3)*400,Math.floor(i/3)*250);}
  return new Set(frames).size;
 });
 await page.setViewportSize({width:1280,height:960});await page.locator('#summon-gallery').screenshot({path:'output/playwright/summon-sustain/burst-frames.png'});await page.evaluate(()=>document.getElementById('summon-gallery').remove());
 if(frames!==6||errors.length)throw Error(JSON.stringify({frames,errors}));
 return {designCriterion:'summon-sustain-deathburst',counts,blast,budgets,frames,errors};
}
