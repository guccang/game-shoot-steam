// 农具美术验收：真实触控种收、正式渲染连续帧、昼夜尺寸及电锯复用；默认4175。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/farm-tools-motion/video',size:{width:390,height:844}}});
 const page=await context.newPage(),errors=[],reviews=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   const {freshRangerProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js'),{snapFarmPoint,farmLandReason,farmApproach}=await import('/src/world/farm-land.js'),{blocked}=await import('/src/physics/motion.js');
   const p=freshRangerProgress();p.arrival=null;p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.weapons[14]=1;p.weapon=14;p.coins=0;
   const g=a.game;/* 单项农活夹具不额外放置示范田。 */p.farm.wildMaps=['forest','jiuzhaigou'];g.progress=p;g.reset();g.start();g.mainlineSpeech=null;g.mainlineTalkDelay=99999;g.fireClock=99999;g.enemies=[];g.player.invincible=0;
   for(const d of document.querySelectorAll('dialog[open]'))d.close();
   for(let y=500;y<1300&&!window.site;y+=52)for(let x=1600;x<2300&&!window.site;x+=56){const point=snapFarmPoint({x,y},'forest');Object.assign(g.player,{x:point.x,y:point.y+110});if(!farmLandReason(g,point)&&!blocked(g.player.x,g.player.y,14,g.trees,g.player)&&farmApproach(g,point))window.site=point;}
   if(!site)throw Error('缺少可用地块');Object.assign(g.player,{x:site.x,y:site.y+110});a.renderer.camera.time=null;
   window.setLighting=async time=>{Object.assign(a.environment,{time,weather:'sun',season:'summer',autoWeather:false,autoTime:false,livingPreview:true});const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.refresh();};await setLighting('day');
   window.motionFrames=[];const thresholds={dig:[.08,.18,.31,.39,.57],harvest:[.08,.18,.34,.43,.57],saw:[.12,.45,.83]},draw=a.renderer.draw.bind(a.renderer);
   // 采样正式绘制后的实际连续帧，局部裁切只用于验收排版，不重绘工具或身体。
   a.renderer.draw=renderGame=>{draw(renderGame);const j=renderGame.farmWork?.job,t=j?.farmPoseTime??0,list=thresholds[j?.action];if(!list)return;
    const n=motionFrames.filter(f=>f.action===j.action).length;if(n>=list.length||t<list[n])return;
    const v=a.renderer.view,p=renderGame.player,canvas=a.renderer.canvas,ratio=canvas.width/a.renderer.width,c=document.createElement('canvas');c.width=400;c.height=360;const x=(p.x-v.x)*v.zoom-100,y=(p.y-v.y)*v.zoom-125;
    c.getContext('2d').drawImage(canvas,x*ratio,y*ratio,200*ratio,180*ratio,0,0,400,360);motionFrames.push({action:j.action,t,data:c.toDataURL()});
   };a.refresh();
  });await page.waitForTimeout(700);
  await page.locator('#field-menu-toggle').tap();await page.locator('#farm-menu').tap();
  const ground=await page.evaluate(()=>{const v=a.renderer.view,r=a.renderer.canvas.getBoundingClientRect();return {x:r.x+(site.x-v.x)*v.zoom,y:r.y+(site.y-v.y)*v.zoom};});await page.touchscreen.tap(ground.x,ground.y);
  await page.waitForFunction(()=>a.game.progress.farm.plots.length===1&&!a.game.farmWork?.job);await page.locator('[data-farm-cell="0"]').tap();await page.locator('[data-farm-seed="0"]').tap();await page.locator('[data-farm-cell="0"]').tap();
  await page.waitForFunction(()=>a.game.progress.farm.plots[0].crop===0&&!a.game.farmWork?.job);
  await page.screenshot({path:'output/playwright/farm-tools-motion/seed-small.png'});
  await page.evaluate(()=>{const p=a.game.progress.farm.plots[0];p.plantedAt-=61000;p.readyAt-=61000;a.refresh();});
  await page.locator('[data-farm-cell="0"]').tap();await page.waitForFunction(()=>a.game.progress.coins===60&&!a.game.farmWork?.job);
  const timings=await page.evaluate(()=>motionFrames.map(({action,t})=>({action,t})));if(timings.filter(f=>f.action==='dig').length!==5||timings.filter(f=>f.action==='harvest').length!==5)throw Error('连续动作采样不完整 '+JSON.stringify(timings));
  // 队列站位检查后再用同一实际地块展示种子与幼苗；不改变田块或角色的绘制入口。
  await page.evaluate(()=>{const g=a.game,now=Date.now();g.progress.farm.plots[0].crop=0;g.progress.farm.plots[0].plantedAt=now;g.progress.farm.plots[0].readyAt=now+60000;g.progress.farm.plots.push({id:1,mapId:'forest',x:site.x+56,y:site.y,crop:1,plantedAt:now-20000,readyAt:now+40000});g.progress.farm.nextId=2;Object.assign(g.player,{x:site.x,y:site.y+62});a.farm.open();g.farmCursor={...site,x:site.x-56};a.renderer.camera.time=null;});
  for(const [width,height] of [[320,568],[390,844],[1280,900]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(time=>setLighting(time),time);await page.waitForTimeout(500);
   await page.screenshot({path:`output/playwright/farm-tools-motion/field-${width}-${time}.png`});
   const review=await page.evaluate(async()=>({...(await import('/src/ui/farm.js')).inspectFarm(a.game,document),icons:document.querySelectorAll('[data-farm-tool-art]').length,buttons:[...document.querySelectorAll('#farm-tools button')].map(b=>({w:b.offsetWidth,h:b.offsetHeight}))}));
   if(review.overflow||review.icons!==5||review.art.sheets!==3||review.buttons.some(b=>b.w<44||b.h<44))throw Error('场景或资源预算不合格 '+JSON.stringify(review));reviews.push({width,time,...review});
  }
  await page.setViewportSize({width:390,height:844});await page.evaluate(async()=>{await setLighting('day');const g=a.game,{farmApproach}=await import('/src/world/farm-land.js');window.tree=g.trees.find(t=>t.hp>0&&t.x>1600&&t.x<2200&&t.y>200&&t.y<900&&farmApproach(g,t));Object.assign(g.player,farmApproach(g,tree));a.renderer.camera.time=null;});await page.waitForTimeout(700);// 电锯已从种地UI移除，内部绘制兼容检查直接选择工具，不伪造按钮。
  await page.evaluate(async()=>{(await import('/src/core/farming/farm.js')).setFarmTool(a.game,'saw');});
  const treePoint=await page.evaluate(()=>{const v=a.renderer.view,r=a.renderer.canvas.getBoundingClientRect();return {x:r.x+(tree.x-v.x)*v.zoom,y:r.y+(tree.y-25-v.y)*v.zoom};});await page.touchscreen.tap(treePoint.x,treePoint.y);await page.waitForFunction(()=>tree.hp<=0&&!a.game.farmWork?.job);await page.screenshot({path:'output/playwright/farm-tools-motion/weapon-saw.png'});
  // 由已采集的正式帧组成连续分镜，正文时间标注属于验收记录。
  const counts=await page.evaluate(async()=>{
   const output=[];for(const action of ['dig','harvest','saw']){const frames=motionFrames.filter(f=>f.action===action),canvas=document.createElement('canvas');canvas.id='review-'+action;canvas.width=frames.length*200;canvas.height=205;canvas.style.cssText='position:relative;display:block;width:'+canvas.width+'px;height:205px;';const c=canvas.getContext('2d');c.fillStyle='#fff5d9';c.fillRect(0,0,canvas.width,205);
    for(let i=0;i<frames.length;i++){const img=new Image();img.src=frames[i].data;await img.decode();c.drawImage(img,i*200,0,200,180);c.fillStyle='#315640';c.font='14px sans-serif';c.fillText(({dig:'锄头',harvest:'镰刀',saw:'电锯'})[action]+' '+frames[i].t.toFixed(2)+'秒',i*200+8,198);}document.body.append(canvas);output.push({action,frames:frames.length});}return output;
  });await page.setViewportSize({width:1100,height:900});for(const {action} of counts)await page.locator('#review-'+action).screenshot({path:`output/playwright/farm-tools-motion/motion-${action}.png`});
  if(counts.find(c=>c.action==='saw').frames!==3||errors.length)throw Error(JSON.stringify({counts,errors}));
  return {designCriterion:'world-farm-delivery',timings,reviews,counts,coins:await page.evaluate(()=>a.game.progress.coins),video:await page.video().path(),errors};
 }finally{await context.close();}
}
