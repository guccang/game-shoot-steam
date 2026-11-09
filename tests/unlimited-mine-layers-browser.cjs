// 正式手机页面验证无限地下层开通、往返、规则文案与存档，不创建替代绘制器。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/unlimited-mine-layers/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[],reviews=[];page.on('pageerror',e=>errors.push(e.message));
 // 所有生态和层级交互均点击正式手机按钮。
 async function action(kind){if(!await page.locator('#mine-build').isVisible())await page.locator('#mine-tools-toggle').tap();await page.locator('#mine-build').tap();await page.locator(`[data-mine-special="${kind}"]`).tap();await page.waitForTimeout(180);}
 // 时段切换只改正式历法，画面继续由正式渲染路径完成。
 async function phase(id){await page.evaluate(async id=>{const p=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===id);a.game.progress.living.calendar.elapsed=p.start+p.duration*.5;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false,livingPreview:false});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);},id);await page.waitForTimeout(150);}
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;window.mc=await import('/src/config/mining.js');window.ec=await import('/src/config/mine-ecology.js');window.ml=await import('/src/core/mining/mine-layers.js');window.pm=await import('/src/progression/mining/mine-layers.js');window.mi=await import('/src/core/mining/mining.js');
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.coins=100000;p.wood=10000;p.vehicleIndex=1;p.vehicleHulls[1]=1;p.vehicleWeapons[18]=1;p.vehicleLoadouts[1]=18;
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.enemies=[];g.spawnTimer=999999;g.cottage={kind:'construction',outside:{x:600,y:400}};
   if(!(await import('/src/core/home/home-construction.js')).buildHome(g,'basement').ok)throw Error('地下室创建失败');g.progress.mining.seed=1847;g.progress.mining.ore=1000;g.cottage={kind:'cottage',floor:0,outside:{x:600,y:400}};Object.assign(g.player,mc.MINING.hatch.goal);if(!mi.enterMine(g))throw Error('正式地下入口失败');a.refresh();
   // 缩短景观验收准备，只揭开摄影范围，怪物与景观仍取固定种子及正式运行规则。
   window.reveal=(cell,r=4)=>{const l=ml.currentMineLayer(g);l.dug={...l.dug};for(let y=cell.y-r;y<=cell.y+r;y++)for(let x=cell.x-r;x<=cell.x+r;x++)if(ec.mineCellArea({x,y},l)>0)l.dug[mc.mineKey({x,y})]=true;Object.assign(g.player,mc.minePoint(cell));g.cottage.autoDig=false;g.cottage.hurtWait=10;g.cottage.scanWait=0;};
   window.findCell=(id,water=false)=>{const l=ml.currentMineLayer(g);for(let y=5;y<60;y++)for(let x=8;x<100;x++){const t=ec.mineTerrain({x,y},l);if(t.biome.id===id&&t.water===water&&(water||t.prop))return {x,y};}throw Error('缺少景观 '+id);};
   window.fillLayer=()=>{const l=ml.currentMineLayer(g),b=ec.mineBounds(l),lo=mc.mineCell({x:b.left-32,y:b.top-32}),hi=mc.mineCell({x:b.right+32,y:b.bottom+32});l.dug={...l.dug};for(let y=lo.y;y<=hi.y;y++)for(let x=lo.x;x<=hi.x;x++)if(ec.mineCellArea({x,y},l)>0)l.dug[mc.mineKey({x,y})]=true;};
  });
  for(let depth=2;depth<=5;depth++){
   const coins=await page.evaluate(()=>a.game.progress.coins);
   await action('down');if(await page.evaluate(()=>a.game.cottage.depth)!==depth)throw Error('付费开层失败');if(await page.evaluate(()=>a.game.progress.coins)!==coins-(depth-1)*100)throw Error('开层扣费错误');
  }
  const before=await page.evaluate(()=>[a.game.progress.mining,...Object.values(a.game.progress.mining.layers)].map(l=>({seed:l.seed,bounds:l.bounds,coverage:l.coverage})));
  await action('up');await action('down');if(await page.evaluate(()=>a.game.cottage.depth)!==5)throw Error('第五层往返失败');
  for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390}]){
   await page.setViewportSize(size);
   for(const time of ['day','night']){
    await phase(time);await page.screenshot({path:`output/playwright/unlimited-mine-layers/layer-5-${size.width}-${time}.png`});
    await page.locator('#mine-build').tap();const text=await page.locator('#mine-build-dialog').textContent();if(!text.includes('地下层数没有上限')||!text.includes('三层及以后10%–100%')||text.includes('最深层'))throw Error('地下规则文案错误');
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('手机规则页横向溢出');
    await page.screenshot({path:`output/playwright/unlimited-mine-layers/rules-${size.width}-${time}.png`});await page.locator('[data-mine-close]').first().tap();
   }
  }
  await page.evaluate(()=>{if(!a.game.livingPersist(a.game.progress))throw Error('深层存档失败');});
  await page.reload();await page.locator('#start').tap();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
  const after=await page.evaluate(()=>[a.game.progress.mining,...Object.values(a.game.progress.mining.layers)].map(l=>({seed:l.seed,bounds:l.bounds,coverage:l.coverage})));
  if(JSON.stringify(before)!==JSON.stringify(after))throw Error('刷新丢失深层或改变已生成布局');if(errors.length)throw Error(errors.join('\n'));return {depths:after.length,coverage:after.map(l=>l.coverage),stable:true,errors};
 }catch(error){await page.screenshot({path:'output/playwright/unlimited-mine-layers/failure.png'});throw error;}finally{await context.close();}
}
