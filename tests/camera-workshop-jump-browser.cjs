// 默认4175，允许独立本地端口；隔离存档，在正式绘制器中逐帧往返工坊范围。
async page=>{
 const origin=new URL(page.url());if(!['localhost','127.0.0.1'].includes(origin.hostname))throw Error('仅允许本地验收');
 const context=await page.context().browser().newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true});
 const t=await context.newPage(),errors=[],checks=[];t.on('pageerror',e=>errors.push(e.message));
 try{
  await t.goto(origin.origin);
  await t.evaluate(async()=>{
   (await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival={version:2,phase:'complete',keys:true};p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
   p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
   localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
  });
  await t.reload();await t.locator('#start').click();
  await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;window.realUpdate=a.game.update.bind(a.game);a.game.update=()=>{};a.game.mainlineSpeech=null;a.game.enemies=[];});
  for(const [width,height] of [[320,568],[390,844],[844,390],[1280,900]])for(const active of [false,true]){
   await t.setViewportSize({width,height});
   const result=await t.evaluate(async({active})=>{
    const {WORKSHOP}=await import('/src/world/workshop.js'),{nearbyInteraction}=await import('/src/core/navigation/nearby-interaction.js');
    const g=a.game,r=a.renderer;g.vehicle.active=active;g.state='playing';Object.assign(g.player,{x:WORKSHOP.x+90,y:WORKSHOP.y+230,vx:0,vy:0});r.camera.time=null;a.refresh();r.draw();
    let last=null,maxStep=0,maxZoomStep=0,maxFollowError=0;const targets=new Set();
    // 上下穿越交互范围并反向，采样实际渲染帧；不重置镜头来掩盖边界变化。
    for(let frame=0;frame<80;frame++){
     await new Promise(resolve=>requestAnimationFrame(resolve));g.player.y=WORKSHOP.y+230-5*(frame<40?frame:80-frame);a.refresh();r.draw();
     const v=r.view;maxFollowError=Math.max(maxFollowError,Math.hypot(v.x-(g.player.x+r.camera.x-r.width/v.zoom/2),v.y-(g.player.y+r.camera.y-r.height/v.zoom/2)));const point={x:(g.player.x-v.x)*v.zoom,y:(g.player.y-v.y)*v.zoom,zoom:v.zoom};
     if(last){maxStep=Math.max(maxStep,Math.hypot(point.x-last.x,point.y-last.y));maxZoomStep=Math.max(maxZoomStep,Math.abs(Math.log(point.zoom/last.zoom))*r.height);}
     last=point;targets.add(nearbyInteraction(g)?.id||'none');
    }
    return {maxStep,maxZoomStep,maxFollowError,targets:[...targets],width:r.width,height:r.height};
   },{active});
   if(result.maxStep>1e-6||result.maxZoomStep>1e-6||result.maxFollowError>1e-6||result.targets.length<2)throw Error(JSON.stringify(result));checks.push({active,...result});
  }
  // 保留任务卡，覆盖小屋、工坊、营门、清缴与种子小屋的本体热点。
  for(const [width,height] of [[320,568],[390,844],[844,390],[1280,900]])for(const phase of ['day','night']){
   await t.setViewportSize({width,height});
   for(const kind of ['weapons','garage','cottage','clearing','defense','seed-shop']){
    await t.evaluate(async({kind,phase})=>{
     const g=a.game,{TOWN_RESTORATIONS}=await import('/src/config/town-restoration.js');
     g.vehicle.active=false;g.progress.restoration.repaired=TOWN_RESTORATIONS.filter(f=>f.id!==kind).map(f=>f.id);
     g.progress.mainline=(await import('/src/progression/progress.js')).freshProgress().mainline;
     const site=kind==='weapons'?(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS.weapons.door:kind==='seed-shop'?(await import('/src/config/farm.js')).FARM_SEED_DOOR:TOWN_RESTORATIONS.find(f=>f.id===kind).site;
     Object.assign(g.player,{x:site.x,y:site.y+35,vx:0,vy:0});g.enemies=[];
     g.spawnEnemy(0,0,{x:site.x+135,y:site.y+110},{ambient:true});
     Object.assign(a.environment,{time:phase,weather:'sun',livingPreview:true,autoTime:false,autoWeather:false,autoSeason:false,forestSeason:'summer'});
     a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
     a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
     a.renderer.camera.time=null;a.refresh();a.renderer.draw();a.refresh();
    },{kind,phase});
    await t.locator('#nearby-interaction').waitFor({state:'visible'});
    const state=await t.evaluate(async()=>{
     const review=await(await import('/src/rendering/visual-review.js')).inspectStableCampCamera(a.renderer,document);
     return review;
    });
    if(!state.touchTarget||!state.building||state.visibleText.trim()||state.followError>1e-6||state.anchorError>1)throw Error(JSON.stringify({width,height,kind,phase,state}));
    if(kind==='garage')await t.screenshot({path:`output/playwright/camera-workshop-jump/${width}-${height}-${phase}.png`});
    checks.push({width,height,kind,phase,visible:state.visible,followError:state.followError,anchorError:state.anchorError});
   }
  }
  // 真触摸摇杆运行正式移动逻辑，停止后不残留镜头偏移。
  await t.setViewportSize({width:390,height:844});
  await t.evaluate(async()=>{
   const g=a.game,{WORKSHOP}=await import('/src/world/workshop.js');
   g.progress.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
   g.progress.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];g.progress.mainline.phase='complete';
   g.enemies=[];g.spawnTimer=g.fireClock=g.attackTimer=999;g.update=realUpdate;g.mainlineSpeech=null;
   Object.assign(g.player,{x:WORKSHOP.x+90,y:WORKSHOP.y+200,vx:0,vy:0});a.renderer.camera.time=null;a.refresh();
   window.touchBefore={x:g.player.x,y:g.player.y};
  });
  const cdp=await context.newCDPSession(t);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:600}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:180,y:540}]});
  await t.waitForTimeout(1100);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  const moved=await t.evaluate(async()=>({before:touchBefore,after:{x:a.game.player.x,y:a.game.player.y},review:await(await import('/src/rendering/visual-review.js')).inspectStableCampCamera(a.renderer,document)}));
  if(moved.before.y-moved.after.y<10||moved.review.followError>1e-6)throw Error('真实触摸跟随失败 '+JSON.stringify(moved));
  checks.push({touch:moved});
  await t.evaluate(async()=>{const {WORKSHOP}=await import('/src/world/workshop.js');a.game.update=()=>{};a.game.mainlineSpeech=null;Object.assign(a.game.player,{x:WORKSHOP.x+90,y:WORKSHOP.y+100});a.refresh();});
  await t.locator('#nearby-interaction[data-target="workshop-weapons"]').tap();await t.locator('#workshop-dialog').waitFor({state:'visible'});
  if(errors.length)throw Error(errors.join('\n'));return {checks,workshopOpened:true,errors};
 }finally{await context.close();}
}
