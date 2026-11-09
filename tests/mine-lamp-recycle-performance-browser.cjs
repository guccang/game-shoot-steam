// 手机实机回归：矿灯二次确认、地下移动与不可见地表预热隔离，使用独立临时存档。
async original=>{
 const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),out='output/playwright/mine-lamp-rail-stability';fs.mkdirSync(out,{recursive:true});
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:out+'/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[],views=[],motions=[];
 page.on('pageerror',e=>errors.push(e.message));
 for(const file of ['src/app/create-app.js','src/rendering/renderer.js','src/rendering/mining.js','src/rendering/mine-landscape-ground.js','src/world/mine-surface-cache.js','src/core/mining/mine-demolition.js','src/ui/mining.js'])await context.route('http://localhost:4175/'+file,r=>r.fulfill({path:path.resolve(file),contentType:'text/javascript'}));
 // 使用正式历法切换昼夜，保留角色、矿车、团子、地形和迷雾正式绘制。
 async function phase(id){await page.evaluate(async id=>{const p=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===id);g.progress.living.calendar.elapsed=p.start+p.duration/2;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);},id);}
 // 按实际面板尺寸验收滚动、中文和44px触区；截图另行人工复核。
 async function shot(name){
  await page.waitForTimeout(100);const view=await page.evaluate(async()=>{const r=(await import('/src/rendering/visual-review.js')).inspectMineCartControls(g,a.renderer,document);return {...r,visibleButtons:[...document.querySelectorAll('#mine-controls button,#mine-removal-dialog[open] button')].filter(b=>b.getClientRects().length).map(b=>{const r=b.getBoundingClientRect();return {text:b.textContent,width:r.width,height:r.height};})};});
  assert.equal(view.overflow,false);assert.ok(view.visibleButtons.every(b=>b.width>=43.9&&b.height>=43.9));assert.ok(view.dialogs.every(d=>!d.overflow));views.push({name,...view});await page.screenshot({path:out+'/'+name+'.png'});
 }
 // 对真实渲染帧检查沿轨连续移动、座位锚点与后台任务调用次数。
 async function measure(name,count=100){
  const sample=await page.evaluate(async count=>{const frames=[];for(let i=0;i<count;i++){await new Promise(requestAnimationFrame);frames.push({now:performance.now(),x:a.renderer.mineView.x,y:a.renderer.mineView.y,cart:a.renderer.mineCartRiderReview});}return {frames,calls:{...warmupCalls},landscape:a.renderer.mineLandscapeReview};},count);
  const delta=sample.frames.slice(1).map((s,i)=>s.now-sample.frames[i].now),sorted=[...delta].sort((a,b)=>a-b);
  assert.ok(sample.frames.at(-1).x>sample.frames[0].x+64,name+'未连续移动');assert.ok(sample.frames.slice(1).every((s,i)=>s.x>=sample.frames[i].x-1e-7),name+'镜头倒跳');
  assert.ok(sample.frames.every(s=>!s.cart||s.cart.cameraError<1e-7));assert.ok(Object.values(sample.calls).every(n=>n===0),'地下仍运行地表预热 '+JSON.stringify(sample.calls));
  const result={name,frames:count,mean:delta.reduce((s,n)=>s+n,0)/delta.length,p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1),longFrames:delta.filter(n=>n>34).length,calls:sample.calls,landscape:sample.landscape};motions.push(result);return result;
 }
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;window.g=a.game;window.mc=await import('/src/config/mining.js');window.mi=await import('/src/core/mining/mining.js');
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.homeDecor.basement=true;(await import('/src/progression/mining/mining.js')).openBasement(p.mining);p.mining.seed=1847;p.mining.ore=20;p.wood=20;
   const ec=await import('/src/config/mine-ecology.js');
   for(let x=-2;x<=50;x++)for(let y=-2;y<=2;y++){const cell={x,y},key=mc.mineKey(cell);p.mining.dug[key]=true;if(y===0||ec.mineTerrain(cell,p.mining).water)p.mining.bridges[key]=true;if(y===0)p.mining.rails[key]=true;}
   p.mining.decor['3,0']='lamp';p.mining.decor['5,0']='lamp';p.mining.carts=[{id:1,...mc.minePoint({x:4,y:0}),heading:1,wheel:0},{id:2,...mc.minePoint({x:3,y:0}),heading:1,wheel:0,leader:1}];
   p.mining.animals['4,1']={key:'4,1',kind:'beetle',...mc.minePoint({x:4,y:1}),hp:10000,maxHp:10000,phase:'recover',timer:99999,clock:0,death:0};
   g.progress=p;g.reset();g.start();g.arrivalScene=null;g.mainlineSpeech=null;g.vehicle.active=false;g.enemies=[];g.boss=null;g.livingPersist=()=>true;g.cottage={kind:'mine',depth:1,direction:1,ride:null,running:false,tool:null,autoDig:false,scanWait:99999,hurtWait:99999,attackWait:99999};Object.assign(g.player,mc.minePoint({x:3,y:0}));
   window.realUpdate=g.update.bind(g);g.update=()=>{};a.refresh();
   // 调用计数直接覆盖正式预热入口，不以渲染时间波动代替隔离断言。
   window.warmupCalls={};for(const [object,key,name]of [[a.navigationWarmup,'prepare','navigationPrepare'],[a.navigationWarmup,'advance','navigationAdvance'],[a.renderer.ground,'advance','groundAdvance'],[a.renderer.ground.mapPreview,'request','mapRequest'],[a.renderer.ground.mapPreview,'advance','mapAdvance'],[a.renderer,'advanceCampBuildings','campAdvance']]){const run=object[key].bind(object);warmupCalls[name]=0;object[key]=(...args)=>{warmupCalls[name]++;return run(...args);};}
  });
  // 取消保持矿灯和材料；确认仅回收已选矿灯，保留同格轨道。
  await page.locator('#mine-remove').tap();const lamp=page.getByRole('button',{name:'回收附近矿灯',exact:true});assert.ok(await lamp.isEnabled());await lamp.tap();await page.locator('[data-remove-close]').last().tap();assert.equal(await page.evaluate(()=>g.progress.mining.decor['3,0']),'lamp');
  await page.locator('#mine-remove').tap();await lamp.tap();
  for(const [width,height]of [[320,568],[390,844]]){await page.setViewportSize({width,height});for(const time of ['day','night']){await phase(time);await shot('recycle-'+width+'-'+time);}}
  await page.locator('[data-remove-confirm]').tap();await page.waitForFunction(()=>!g.progress.mining.decor['3,0']);assert.deepEqual(await page.evaluate(()=>({ore:g.progress.mining.ore,wood:g.progress.wood,rail:g.progress.mining.rails['3,0'],other:g.progress.mining.decor['5,0']})),{ore:21,wood:21,rail:true,other:'lamp'});
  await page.evaluate(()=>{g.update=realUpdate;Object.assign(g.player,g.progress.mining.carts[0]);a.refresh();});await page.locator('#mine-tools-toggle').tap();await page.locator('#mine-board').tap();await page.locator('#mine-tools-toggle').tap();assert.equal(await page.evaluate(()=>g.cottage.ride),1);
  for(const [width,height]of [[320,568],[390,844]]){await page.setViewportSize({width,height});for(const time of ['day','night']){await phase(time);await shot('world-'+width+'-'+time);}}
  assert.ok(await page.evaluate(()=>g.cottage.ecologyActors.some(a=>a.hp>0)));
  // 真正的触屏方向启动矿车；松手后列车继续前进。
  const cdp=await context.newCDPSession(page),r=await page.locator('#game-frame').boundingBox(),x=r.x+60,y=r.y+r.height*.58;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+45,y}]});await page.waitForFunction(()=>g.cottage.running);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  for(const [width,height]of [[320,568],[390,844]]){await page.setViewportSize({width,height});for(const time of ['day','night']){await phase(time);await measure('driving-'+width+'-'+time,80);await shot('driving-'+width+'-'+time);}}
  await page.locator('#mine-quick-board').tap();await page.waitForTimeout(100);const stopped=await page.evaluate(()=>({...a.renderer.mineView}));await page.waitForTimeout(180);assert.deepEqual(await page.evaluate(()=>({x:a.renderer.mineView.x,y:a.renderer.mineView.y})),{x:stopped.x,y:stopped.y});await page.locator('#mine-quick-board').tap();assert.equal(await page.evaluate(()=>g.cottage.ride),null);
  await page.keyboard.down('ArrowRight');await measure('walking',80);await page.keyboard.up('ArrowRight');
  // 返回地面后原队列可继续执行，未被清空或永久停用。
  await page.evaluate(()=>{g.cottage=null;g.progress.mining.animals={};a.refresh();});await page.waitForFunction(()=>warmupCalls.navigationPrepare>0&&warmupCalls.groundAdvance>0&&warmupCalls.mapAdvance>0&&warmupCalls.campAdvance>0);
  assert.deepEqual(errors,[]);const report={views,motions,recycled:true,resumed:await page.evaluate(()=>warmupCalls),errors};fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));return {recycled:true,views:views.length,motions,resumed:report.resumed,errors};
 }catch(error){await page.screenshot({path:out+'/failure.png'});throw error;}finally{await context.close();}
}
