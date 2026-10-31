// 修复和升级置顶验收：真实场景、手机昼夜、材料状态及原生点击共用正式入口。
async page=>{
 const samples=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(await page.locator('#start').isVisible())await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
  const g=a.game;g.progress=(await import('/src/progression/progress.js')).freshProgress();g.progress.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();g.progress.mainline.phase='complete';g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.enemies=[];g.boss=null;g.update=()=>{};
  window.facilities=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS;window.rooms=(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS;
  // 每个样本只改变目标进度和角色位置，渲染及交互实现保持正式版本。
  window.setBuilding=async(id,time,wood)=>{
   g.progress.arrival=id==='arrival-repair'?{version:3,phase:'repair',elapsed:0,keys:true,gifted:true,wood:0}:null;
   g.progress.restoration.repaired=facilities.filter(f=>f.id!==id).map(f=>f.id);g.progress.restoration.build=null;g.progress.wood=wood;g.cottage=null;g.vehicle.active=false;g.mainlineSpeech=null;
   const site=id==='arrival-repair'?rooms.weapons.door:id.startsWith('upgrade-')?rooms[id.slice(8)].door:facilities.find(f=>f.id===id).site;
   Object.assign(g.player,{x:site.x,y:site.y+15,vx:0,vy:0});g.enemies=[];g.spawnEnemy(0,0,{x:site.x+140,y:site.y+80},{ambient:true});
   const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);g.progress.living.calendar={day:1,elapsed:phase.start+phase.duration/2};
   Object.assign(a.environment,{time,weather:'sun',livingPreview:true,autoTime:false,autoWeather:false,autoSeason:false,forestSeason:'summer'});
   a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();
  };
  for(const d of document.querySelectorAll('dialog[open]'))d.close();
 });
 const ids=await page.evaluate(()=>[...facilities.map(f=>f.id),'arrival-repair','upgrade-weapons','upgrade-vehicle']);
 for(const [width,height] of [[320,568],[390,844],[844,390]])for(const time of ['day','night'])for(const id of ids)for(const wood of [0,999]){
  await page.setViewportSize({width,height});await page.evaluate(async({id,time,wood})=>setBuilding(id,time,wood),{id,time,wood});await page.waitForFunction(()=>!document.getElementById('nearby-interaction').hidden);await page.waitForTimeout(100);
  const info=await page.evaluate(async()=>{
   const b=document.getElementById('nearby-interaction'),r=b.getBoundingClientRect(),v=a.renderer.view,c=a.renderer.canvas.getBoundingClientRect(),hud=document.querySelector('.hud-resources').getBoundingClientRect();
   const review=await (await import('/src/rendering/visual-review.js')).inspectBuildingInteraction(a.renderer,document);
   const entry=(await import('/src/core/nearby-interaction.js')).nearbyInteraction(a.game);
   return {key:entry.key,type:entry.type,target:b.dataset.target,cards:['ranger-arrival','mainline-hud'].filter(id=>{const n=document.getElementById(id);return n&&!n.hidden;}),hidden:b.hidden,placement:b.dataset.placement,anchorError:review.anchorError,color:getComputedStyle(b).backgroundColor,rect:{left:r.left,top:r.top,right:r.right,bottom:r.bottom,height:r.height},hudBottom:Math.max(hud.bottom,...[...document.querySelectorAll('#ranger-arrival,#mainline-hud')].filter(n=>!n.hidden).map(n=>n.getBoundingClientRect().bottom)),playerY:c.top+(a.game.player.y-v.y)*v.zoom,canvasBottom:c.bottom,zoom:v.zoom};
  });
  const target=id==='arrival-repair'?id:id.startsWith('upgrade-')?'workshop-'+id.slice(8):'restore-'+id;
  // 按钮不跨入资源栏，底边真实绑定屋顶；短屏取景仍保留人物脚底。
  if((id==='arrival-repair'||id.startsWith('upgrade-')?info.target!==target:info.type!=='restoration'||info.key!==id)||info.hidden||info.placement!=='above'||info.anchorError>1||info.rect.top<info.hudBottom+7||info.rect.left<0||info.rect.right>width||info.rect.bottom>height||info.rect.height<44||info.playerY>info.canvasBottom-40||!['rgb(255, 246, 220)','rgb(232, 237, 207)'].includes(info.color))throw Error(JSON.stringify({width,height,time,id,wood,info}));
  samples.push({width,height,time,id,wood,...info});
  if(wood===999&&['arrival-repair','garage','upgrade-weapons','upgrade-vehicle'].includes(id))await page.screenshot({path:`output/playwright/building-overhead-ui/${id}-${width}-${time}.png`});
 }
 // 原生鼠标按下不能跳位，足料点击准确扣料并创建相应施工。
 const clicks=[];
 await page.setViewportSize({width:320,height:568});
 for(const id of ['arrival-repair','garage','upgrade-weapons','upgrade-vehicle']){
  await page.evaluate(async id=>setBuilding(id,'day',999),id);await page.waitForTimeout(120);
  const b=page.locator('#nearby-interaction'),before=await b.boundingBox();await page.mouse.move(before.x+before.width/2,before.y+before.height/2);await page.mouse.down();await page.waitForTimeout(80);const down=await b.boundingBox();if(Math.abs(before.y-down.y)>.5)throw Error('按下发生跳位');await page.mouse.up();
  const result=await page.evaluate(()=>({wood:a.game.progress.wood,phase:a.game.progress.arrival?.phase,build:a.game.progress.restoration.build?.id,upgrade:document.getElementById('workshop-dialog').open}));
  if(id==='arrival-repair'&&(result.wood!==919||result.phase!=='repairing')||id==='garage'&&(result.wood!==839||result.build!=='garage')||id.startsWith('upgrade-')&&!result.upgrade)throw Error(JSON.stringify({id,result}));
  clicks.push({id,...result});if(result.upgrade)await page.locator('#ws-close').click();
 }
 if(errors.length)throw Error(errors.join('\n'));
 return {designCriterion:'building-interaction-anchor',samples,clicks,errors};
}
