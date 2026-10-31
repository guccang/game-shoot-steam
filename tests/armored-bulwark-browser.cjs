// 重装怪正式战斗验收：实际承伤、走位与盾击阶段，手机桌面昼夜混合场景。
async page=>{
 if(new URL(page.url()).port!=='4236')throw Error('仅使用隔离验收端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.reload();await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;if(!await a.ready)throw Error('正式资源未加载');
  const {freshProgress}=await import('/src/progression/progress.js'),p=freshProgress();p.arrival={version:2,phase:'complete',keys:true};
  const g=a.game;g.progress=p;g.arrivalScene=null;g.reset();a.menu.enter();g.start();g.enemies=[];g.trees=g.trees.filter(t=>t.hp>0);g.wave=4;g.waveWarning=g.waveRest=0;g.bossReady=true;g.encounterTimer=999;g.random=()=>0;
  g.updateWaves=()=>{};g.attack=()=>{};g.updateWeaponAbility=()=>{};Object.assign(g.player,{x:1600,y:400});
  for(const [i,x,y] of [[0,1510,400],[1,1700,460]]){g.waveSpawned=2;const e=g.spawnEnemy(0,0,{x,y});e.damage=2;e.reviewId=i;}
  g.waveSpawned=0;const normal=g.spawnEnemy(0,0,{x:1500,y:530});normal.speed=10;normal.damage=1;
  g.waveSpawned=1;const ranged=g.spawnEnemy(0,0,{x:1710,y:300});ranged.damage=1;
  Object.assign(a.environment,{time:'day',weather:'sun',autoTime:false,autoWeather:false,autoSeason:false,forestSeason:'summer'});a.renderer.seasons.reset('summer',performance.now());a.refresh();
 });
 const samples=[];for(let i=0;i<48;i++){
  await page.waitForTimeout(150);samples.push(await page.evaluate(()=>({hp:a.game.player.hp,phases:a.game.enemies.filter(e=>e.species==='ironwood-bulwark').map(e=>({phase:e.assault.phase,walk:e.armoredWalk||0}))})));
 }
 for(const phase of ['windup','lunge','returning','recovery'])if(!samples.some(s=>s.phases.some(p=>p.phase===phase)))throw Error('未出现正式盾击阶段 '+phase);
 if(!samples.some(s=>s.phases.some(p=>p.walk>0)))throw Error('移动未带动双腿');
 const start=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));
 await page.keyboard.down('ArrowDown');await page.waitForTimeout(400);await page.keyboard.up('ArrowDown');
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:80,y:610}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:125,y:610}]});await page.waitForTimeout(250);await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
 const moved=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));if(Math.hypot(moved.x-start.x,moved.y-start.y)<20)throw Error('走位未生效');if(!await page.locator('#joystick').isHidden())throw Error('触摸未释放');
 const damage=await page.evaluate(()=>{
  const g=a.game,e=g.enemies.find(e=>e.reviewId===0),before=e.hp;g.hit(e,e.maxHp*.65,false,{direction:{x:-1,y:0},impulse:50});return {before,after:e.hp,max:e.maxHp};
 });
 await page.waitForTimeout(160);await page.screenshot({path:'output/playwright/armored-bulwark/actual-hit.png'});
 if(damage.after>=damage.max*.5||damage.after<=0)throw Error('重装受击裂纹生命状态异常');
 // 正式致命命中产生甲片残块；另取一只测试对象，不替换展示中的完整护甲。
 await page.evaluate(()=>{const g=a.game;g.waveSpawned=2;const e=g.spawnEnemy(0,0,{x:g.player.x+60,y:g.player.y+70});g.hit(e,e.hp+1,false,{direction:{x:1,y:0},impulse:45,power:2});});
 await page.waitForTimeout(120);await page.screenshot({path:'output/playwright/armored-bulwark/actual-defeat.png'});await page.waitForTimeout(600);
 // 截图冻结同一现场，并列完整甲片与损坏甲片，保持真实角色、车辆、普通近战和远程。
 await page.evaluate(()=>{
  const g=a.game;g.update=()=>{};Object.assign(g.player,{x:1600,y:400,flash:0,invincible:0});g.fx.items=[];g.numbers=[];g.enemyBolts=[];g.remnants=[];g.particles=[];g.drops=[];g.summonVehicle();
  const positions=[[1500,330],[1690,380],[1510,520],[1690,540]];
  g.enemies.forEach((e,i)=>{[e.x,e.y]=positions[i];e.z=e.rollAngle=e.knockTime=e.flash=0;e.assault={phase:'chase',elapsed:0};});a.refresh();
 });
 for(const width of [1280,390,320])for(const time of ['day','night']){
  await page.setViewportSize({width,height:width===1280?900:844});await page.evaluate(async time=>{const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');a.environment.time=time;a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.renderer.camera.time=null;a.renderer.resize();a.refresh();a.renderer.draw();},time);
  await page.waitForTimeout(100);await page.screenshot({path:`output/playwright/armored-bulwark/field-${width}-${time}.png`});
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.screenshot({path:'output/playwright/armored-bulwark/reduced-320.png'});await page.emulateMedia({reducedMotion:'no-preference'});
 const frames=await page.evaluate(async()=>{
  const {renderVisualCase}=await import('/src/rendering/visual-review.js'),{monsterAtlasStats}=await import('/src/rendering/monster-atlas.js');const before=monsterAtlasStats();
  const gallery=document.createElement('canvas');gallery.id='armor-gallery';gallery.width=1000;gallery.height=500;gallery.style.cssText='position:absolute;z-index:999;top:0;left:0;width:1000px;background:#eee8c8';document.body.append(gallery);
  const c=gallery.getContext('2d'),tile=document.createElement('canvas');tile.width=200;tile.height=250;const data=[];
  for(let i=0;i<10;i++){await renderVisualCase(tile.getContext('2d'),'armored-bulwark',Math.floor(i/2)+.25+(i%2)*.5);data.push(tile.toDataURL());c.drawImage(tile,(i%5)*200,Math.floor(i/5)*250);}
  const after=monsterAtlasStats();if(before.bytes!==after.bytes)throw Error('新增怪物缓存');return {unique:new Set(data).size,before,after};
 });
 await page.setViewportSize({width:1280,height:900});await page.locator('#armor-gallery').screenshot({path:'output/playwright/armored-bulwark/frames.png'});await page.evaluate(()=>document.getElementById('armor-gallery').remove());
 if(frames.unique<7)throw Error('局部姿态缺少变化');if(errors.length)throw Error(errors.join('\n'));
 return {designCriterion:'armored-bulwark',damage,frames,movement:Math.hypot(moved.x-start.x,moved.y-start.y),maxWalk:Math.max(...samples.flatMap(s=>s.phases.map(p=>p.walk))),errors};
}
