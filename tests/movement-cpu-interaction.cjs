// 复用性能夹具，验证手机昼夜触摸移动、热点投影，以及营地延迟刷新后的最新状态。
async page=>{
  const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
  if(new URL(page.url()).port!=='4174')throw Error('仅允许隔离性能端口');
  await page.evaluate(()=>{if(!window.a)throw Error('先运行移动性能夹具');a.game.player.invincible=1e6;});
  for(const [width,height] of [[390,844],[320,700],[844,390]])for(const phase of ['day','night']){
    await page.setViewportSize({width,height});
    const start=await page.evaluate(async phase=>{
      const {LIVING_PHASES}=await import('/src/config/living-world.js');
      const {EnvironmentTransition}=await import('/src/world/environment.js');
      const {SceneTone}=await import('/src/rendering/scene-tone.js');
      const g=a.game;g.state='playing';g.mainlineSpeech=null;g.enemies=[];g.mainlineTalkDelay=999;
      Object.assign(g.player,{x:1600,y:400,vx:0,vy:0,invincible:1e6});
      g.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id===phase).start+1000;
      Object.assign(a.environment,{time:phase,weather:'sun',autoWeather:false,autoTime:false});
      a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.renderer.camera.time=null;a.renderer.resize();a.refresh();
      const enemy=g.spawnEnemy(0,0,{x:1780,y:510},{ambient:true});Object.assign(enemy,{speed:0,damage:0,hp:1e6,maxHp:1e6});
      return {x:g.player.x,y:g.player.y};
    },phase);
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:width*.4,y:height*.55}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:width*.4+65,y:height*.55}]});
    await page.waitForTimeout(900);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
    const state=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y,phase:a.environment.time,overflow:document.documentElement.scrollWidth>innerWidth,errors:a.renderer.profiler.events.filter(e=>e.type==='frame-error')}));
    if(Math.hypot(state.x-start.x,state.y-start.y)<30||state.phase!==phase||state.overflow||state.errors.length)throw Error(JSON.stringify({width,height,phase,start,state}));
    await page.screenshot({path:`output/playwright/movement-cpu/scene-${width}-${phase}.png`});samples.push({width,height,phase,start,state});
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('#field-menu-toggle').click();await page.locator('#heroes-button').click();
  await page.locator('#camp-dialog[open]').waitFor();
  if(await page.locator('#inventory [data-portrait]').count()===0)throw Error('首次打开营地未生成卡片');
  await page.locator('#close-camp').click();
  const hidden=await page.evaluate(()=>{
    const node=document.getElementById('inventory');window.oldInventory=node.firstElementChild;
    a.game.progress.heroes[a.game.progress.hero]=2;a.refresh();return node.firstElementChild===oldInventory;
  });
  if(!hidden)throw Error('关闭营地仍重建卡片');
  if(await page.locator('#heroes-button').isHidden())await page.locator('#field-menu-toggle').click();
  await page.locator('#heroes-button').click();
  const updated=await page.evaluate(()=>document.getElementById('inventory').firstElementChild!==oldInventory&&document.querySelector('#inventory .equipped .level').textContent.includes('2'));
  if(!updated)throw Error('重新打开营地未更新角色等级');
  await page.locator('#close-camp').click();
  // 靠近正式工坊后检查透明命中框中心，并用真实点击打开已有工坊。
  await page.evaluate(async()=>{const {WORKSHOP}=await import('/src/world/workshop.js');Object.assign(a.game.player,{x:WORKSHOP.x,y:WORKSHOP.y+90,vx:0,vy:0});a.renderer.camera.time=null;a.refresh();});
  await page.waitForTimeout(500);
  const hit=await page.evaluate(async()=>{
    const {WORKSHOP}=await import('/src/world/workshop.js'),{nearest}=await import('/src/world/coordinates.js');
    const r=a.renderer,v=r.view,p=nearest(WORKSHOP,{x:v.x+v.w/2,y:v.y+v.h/2}),canvas=r.canvas.getBoundingClientRect();
    const b=document.querySelector('[data-workshop-kind="weapons"]').getBoundingClientRect();
    return {error:Math.abs((b.left+b.width/2)-(canvas.left+(p.x-v.x)*v.zoom)),width:b.width,height:b.height};
  });
  if(hit.error>1||hit.width<44||hit.height<44)throw Error('命中区与建筑错位 '+JSON.stringify(hit));
  if(await page.locator('#field-menu-toggle').getAttribute('aria-expanded')==='true')await page.locator('#field-menu-toggle').click();
  await page.locator('[data-workshop-kind="weapons"]').click();
  await page.locator('#workshop-dialog[open]').waitFor();
  if(errors.length)throw Error(errors.join(';'));
  return {samples,inventory:{hidden,updated},hit,errors};
}
