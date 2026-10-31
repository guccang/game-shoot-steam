// 修复按钮固定建筑锚点的正式浏览器验收；默认4175，已有服务时使用独立工作树端口。
async page=>{
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.locator('#start').click();await page.locator('#game-frame[data-page=game]').waitFor({timeout:60000});
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
  const g=a.game;g.progress=(await import('/src/game.js')).freshProgress();g.progress.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();g.progress.wood=999;g.reset();g.state='playing';g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.arrivalScene=null;g.vehicle.active=false;g.enemies=[];g.boss=null;g.update=()=>{};
  window.facilities=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS;window.rooms=(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS;
  Object.assign(a.environment,{livingPreview:true,weather:'sun',autoSeason:false,autoTime:false,autoWeather:false,forestSeason:'summer'});
 });
 // 不同角色位置和镜头倍率下，按钮中心必须由建筑投影计算，不能使用角色投影。
 for(const [width,height] of [[320,568],[390,844],[844,390],[1100,844]])for(const time of ['day','night'])for(const id of ['cottage','garage','clearing','defense','arrival-repair']){
  await page.setViewportSize({width,height});
  for(const dx of [-30,30]){
   await page.evaluate(async({id,dx,time})=>{
    const g=a.game;g.progress.arrival=null;g.progress.restoration.repaired=[];g.progress.restoration.build=null;g.cottage=null;g.vehicle.active=false;g.mainlineSpeech=null;
    const f=id==='arrival-repair'?rooms.weapons:facilities.find(f=>f.id===id);const site=id==='arrival-repair'?f.door:f.site;
    if(id==='arrival-repair')g.progress.arrival={phase:'repair',elapsed:0,keys:true,gifted:true,wood:0};
    Object.assign(g.player,{x:site.x+dx,y:site.y+25,vx:0,vy:0});g.enemies=[];g.spawnEnemy(0,0,{x:site.x+140,y:site.y+80},{ambient:true});
    Object.assign(a.environment,{time});g.progress.living.calendar={day:1,elapsed:time==='day'?400000:1100000};
    a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();
   },{id,dx,time});
   await page.waitForTimeout(100);
   const r=await page.evaluate(async id=>{
    const g=a.game,v=a.renderer.view,b=document.getElementById('nearby-interaction'),rect=b.getBoundingClientRect(),frame=document.getElementById('game-frame').getBoundingClientRect(),canvas=a.renderer.canvas.getBoundingClientRect();
    const site=id==='arrival-repair'?rooms.weapons.site:(await import('/src/core/town-restoration.js')).restorationStatus(g,id).facility;
    const anchor=(await import('/src/world/coordinates.js')).nearest(site,{x:v.x+v.w/2,y:v.y+v.h/2});
    const safeTop=Math.max(8,...[document.querySelector('.hud-resources'),document.getElementById('mainline-hud')].filter(n=>n&&!n.hidden).map(n=>n.getBoundingClientRect().bottom-frame.top+8));
    return {target:b.dataset.target,hidden:b.hidden,x:rect.x+rect.width/2,y:rect.bottom,w:rect.width,h:rect.height,
     expectedX:Math.max(frame.left+rect.width/2+12,Math.min(frame.right-rect.width/2-12,canvas.left+(anchor.x-v.x)*v.zoom)),
     expectedY:Math.max(frame.top+safeTop+rect.height,canvas.top+(anchor.y-site.height-v.y)*v.zoom-8),
     inScreen:rect.left>=0&&rect.right<=innerWidth&&rect.top>=0&&rect.bottom<=innerHeight,wood:g.progress.wood,building:!!g.progress.restoration.build};
   },id);
   if(r.hidden||!r.inScreen||r.w<44||r.h<44||r.building||r.wood!==999||Math.abs(r.x-r.expectedX)>1||Math.abs(r.y-r.expectedY)>1)throw Error(JSON.stringify({id,width,height,time,dx,r}));
   samples.push({id,width,height,time,dx,...r});
   if(dx===30&&['cottage','arrival-repair'].includes(id)&&[320,390,1100].includes(width))await page.screenshot({path:`output/playwright/repair-building-anchor/${id}-${width}-${time}.png`});
  }
 }
 // 保持正常修复点击流程：到场不扣料，明确点小屋才开工；离开则隐藏该目标。
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{const g=a.game;g.progress.arrival=null;g.progress.restoration.build=null;Object.assign(g.player,facilities.find(f=>f.id==='cottage').site);a.renderer.camera.time=null;a.refresh();});
 await page.locator('#nearby-interaction[data-target="restore-cottage"]').waitFor({state:'visible'});
 await page.locator('#nearby-interaction').click();
 const build=await page.evaluate(()=>({id:a.game.progress.restoration.build?.id,wood:a.game.progress.wood}));if(build.id!=='cottage'||build.wood!==919)throw Error(JSON.stringify(build));
 await page.evaluate(()=>{a.game.progress.restoration.build=null;Object.assign(a.game.player,{x:5000,y:5000});a.refresh();});
 await page.locator('#nearby-interaction').waitFor({state:'hidden'});
 if(errors.length)throw Error(errors.join('\n'));
 console.log(JSON.stringify({samples:samples.length,click:build,errors}));
}
