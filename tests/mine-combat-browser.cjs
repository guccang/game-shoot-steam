// 隔离手机上下文实测地下武器、作业切换、暂停、触控、昼夜和既有竖版容器。
async original=>{
 const base=new URL(original.url()).origin;
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/mine-weapons/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[],reviews=[];
 page.on('pageerror',e=>errors.push(e.message));
 async function phase(id){await page.evaluate(async id=>{const p=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===id);a.game.progress.living.calendar.elapsed=p.start+p.duration*.5;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false,livingPreview:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);},id);await page.waitForTimeout(120);}
 async function move(dx,dy,ms){const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:430}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:180+dx,y:430+dy}]});await page.waitForTimeout(ms);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}

 // 样例保留真实景观，仅打开战斗范围以验证武器，不替换正式渲染。
 async function scene(index=0){await page.evaluate(index=>{
  const g=a.game,l=g.progress.mining;g.state='playing';g.cottage.tool=null;g.cottage.autoDig=false;g.cottage.shaftWork=0;g.cottage.combat=null;g.cottage.scanWait=9999;g.cottage.ride=null;g.cottage.weaponTarget=null;
  g.progress.weapon=index;g.progress.weapons[index]=1;g.magazines[index].ammo=g.weapon().magazineSize;g.magazines[index].remaining=0;g.player.hp=g.maxHp();
  for(let y=16;y<=24;y++)for(let x=26;x<=34;x++){const c={x,y},key=mc.mineKey(c);l.dug[key]=true;if(ec.mineTerrain(c,l).water)l.bridges[key]=true;}
  const p=mc.minePoint({x:30,y:20});Object.assign(g.player,p,{vx:0,vy:0});l.animals={};
  for(const [kind,dx,dy] of [['beetle',75,-24],['bat',-75,-55],['spore',100,70]]){const q={x:p.x+dx,y:p.y+dy},key=mc.mineKey(mc.mineCell(q));l.animals[key]={key,kind,...q,hp:300,maxHp:300,respawn:0,clock:0,phase:'recover',timer:999,death:0};}
  l.carts=[{id:1,...mc.minePoint({x:29,y:21}),heading:1,wheel:0}];l.rails={'29,21':true,'30,21':true};
  a.refresh();
 },index);await page.waitForTimeout(350);}
 // 机械记录和截图一起验收，视觉效果由实际截图另行复核。
 async function shot(name){await page.screenshot({path:'output/playwright/mine-weapons/'+name+'.png'});const r=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectMineCombat(a.game,a.renderer,document));if(r.view.top!==0||r.view.bottom!==r.view.height)throw Error('地下地图未铺满画布');if(r.overflow||r.buttons.some(b=>b.width<43.9||b.height<43.9))throw Error('手机操作区不合格 '+JSON.stringify(r));reviews.push({name,...r});}
 try{
  await page.goto(base);await page.locator('#start').tap();await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await(await import('/src/rendering/farm.js')).loadFarmArt();window.mc=await import('/src/config/mining.js');window.ec=await import('/src/config/mine-ecology.js');window.mi=await import('/src/core/mining.js');
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.homeDecor.basement=true;(await import('/src/progression/mining.js')).openBasement(p.mining);p.mining.seed=1847;p.wood=200;p.mining.ore=100;
   p.mining.layers[2]=(await import('/src/progression/mine-layers.js')).freshMineLayer(2,{x:8,y:4},()=>.31);
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.cottage={kind:'cottage',floor:0,outside:mc.MINING.home};Object.assign(g.player,mc.MINING.hatch.goal);mi.enterMine(g);g.cottage.scanWait=999;a.refresh();
  });

  await scene();await phase('day');await shot('pistol-day');const before=await page.evaluate(()=>({ammo:a.game.magazines[0].ammo,hp:Object.values(a.game.progress.mining.animals).map(a=>a.hp)}));await page.waitForTimeout(1000);const after=await page.evaluate(()=>({ammo:a.game.magazines[0].ammo,hp:Object.values(a.game.progress.mining.animals).map(a=>a.hp)}));if(after.ammo>=before.ammo||after.hp.every((hp,i)=>hp===before.hp[i]))throw Error('实机未射击扣弹伤敌');
  await page.locator('#mine-tools-toggle').tap();await page.locator('[data-mine-tool="pick"]').tap();await page.waitForTimeout(150);if(await page.evaluate(()=>a.game.cottage.weaponReady))throw Error('矿镐未切换');await shot('pick-mode');
  await page.locator('#mine-weapon').tap();await page.waitForTimeout(150);if(!await page.evaluate(()=>a.game.cottage.weaponReady))throw Error('武器未恢复');
  const y=await page.evaluate(()=>a.game.player.y);await move(0,60,350);if(await page.evaluate(()=>a.game.player.y)<=y)throw Error('持枪触控无法移动');await shot('moving-armed');
  await page.locator('#mine-build').tap();const age=await page.evaluate(()=>a.game.progress.mining.age);await page.waitForTimeout(250);if(await page.evaluate(()=>a.game.progress.mining.age)!==age)throw Error('暂停推进战斗');await page.locator('[data-mine-close]').first().tap();
  for(const index of original.url().includes('#layout')?[]:[1,3,9,10,12,13,14,15,16,17,18])for(const time of ['day','night']){await scene(index);await phase(time);await page.waitForTimeout(index>=12&&index<=16?2200:450);await shot('weapon-'+index+'-'+time);}
  for(const size of [{width:320,height:568},{width:844,height:390},{width:1280,height:900}]){await page.setViewportSize(size);await scene();for(const time of ['day','night']){await phase(time);await shot('layout-'+size.width+'-'+time);}}
  if(errors.length)throw Error(errors.join(' / '));return {base,scenes:reviews.length,errors,reviews};
 }catch(e){await page.screenshot({path:'output/playwright/mine-weapons/failure.png'});throw e;}finally{await context.close();}
}
