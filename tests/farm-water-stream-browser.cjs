// 手机现场浇水：真实点田、寻路、暂停、出水及结算，保留正式绘制和连续录像。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,recordVideo:{dir:'output/playwright/farm-water-stream/video',size:{width:390,height:844}}});
 const page=await context.newPage(),errors=[],checks=[];page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;
   const p=(await import('/src/progression/progress.js')).freshRangerProgress();p.arrival=null;
   p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS;p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
   p.farm.wildMaps=['forest','jiuzhaigou'];const g=a.game;g.progress=p;g.reset();g.start();g.enemies=[];g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.fireClock=999999;
   for(const d of document.querySelectorAll('dialog[open]'))d.close();await (await import('/src/rendering/farm.js')).loadFarmArt();
   window.waterFrames=[];window.captureName='';const draw=a.renderer.draw.bind(a.renderer),thresholds=[.1,.3,.65,.88];
   // 采集正式绘制后的连续画面，不重画水壶；短动作不能靠截图工具响应速度取帧。
   a.renderer.draw=renderGame=>{draw(renderGame);const j=renderGame.farmWork?.job,t=j?.farmPoseTime??0,n=waterFrames.filter(f=>f.name===captureName).length;
    if(j?.action!=='water'||n>=thresholds.length||t<thresholds[n])return;
    const v=a.renderer.view,p=renderGame.player,canvas=a.renderer.canvas,ratio=canvas.width/a.renderer.width,c=document.createElement('canvas');c.width=400;c.height=360;
    c.getContext('2d').drawImage(canvas,((p.x-v.x)*v.zoom-100)*ratio,((p.y-v.y)*v.zoom-125)*ratio,200*ratio,180*ratio,0,0,400,360);
    waterFrames.push({name:captureName,t,data:c.toDataURL(),full:n===1?canvas.toDataURL():null,width:a.renderer.width});
   };
   window.prepare=async(dx,dy,time)=>{
    const g=a.game,now=Date.now();g.state='playing';g.enemies=[];g.boss=null;g.farmWork=null;g.progress.farm.plots=[{id:0,mapId:'forest',x:1537,y:464,crop:0,plantedAt:now,readyAt:now+60000,watered:false}];g.progress.farm.nextId=1;
    Object.assign(g.player,{x:1537+dx,y:464+dy});a.renderer.camera.time=null;a.farm.open();
    Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});
    a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
    a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();
   };
  });
  for(const [name,dx,dy,width,height,time] of [['south',0,62,390,844,'day'],['left',-54,6,320,568,'night'],['right',54,6,390,844,'night'],['north',0,-48,390,844,'day']]){
   await page.setViewportSize({width,height});await page.evaluate(name=>{window.captureName=name;},name);await page.evaluate(async v=>prepare(...v),[dx,dy,time]);await page.waitForTimeout(250);
   await page.locator('#farm-water').tap();await page.locator('[data-farm-cell="0"]').tap();
   // 自然进入倒水阶段后暂停验证，视觉证据取正式绘制器已采集的连续画面。
   await page.waitForFunction(()=>{const j=a.game.farmWork?.job;if(j?.action==='water'&&j.elapsed>=.35&&j.elapsed<.7){a.game.pause();return true;}return false;});await page.waitForTimeout(80);
   const review=await page.evaluate(async()=> (await import('/src/rendering/visual-review.js')).inspectFarmWaterStream(a.renderer));
   if(!review.active||!review.pose.pouring||review.player.y>review.target.y+10||review.samples.some(p=>!p))throw Error('没有从安全站位倒水 '+JSON.stringify(review));
   for(let i=1;i<review.samples.length;i++)if(review.samples[i].y<=review.samples[i-1].y)throw Error('水滴逆流');
   const frozen=review.time;await page.waitForTimeout(120);const later=await page.evaluate(()=>a.game.farmWork.job.farmPoseTime);if(later!==frozen)throw Error('暂停时水流继续运动');
   await page.evaluate(()=>a.game.pause());await page.waitForFunction(()=>!a.game.farmWork?.job&&a.game.progress.farm.plots[0].watered);
   checks.push({name,width,height,time,review,watered:true});
  }
  // 按原尺寸展示已采集的正式帧供截图导出；不重绘身体、农具或水流。
  const frames=await page.evaluate(()=>waterFrames.map(f=>({name:f.name,t:f.t,full:!!f.full,width:f.width})));
  for(let i=0;i<frames.length;i++){
   const f=frames[i];await page.evaluate(async i=>{const old=document.getElementById('water-review');if(old)old.remove();const f=waterFrames[i],img=new Image();img.id='water-review';img.src=f.data;img.style.cssText='position:fixed;left:0;top:0;z-index:100000;width:200px;height:180px';await img.decode();document.body.append(img);},i);
   await page.locator('#water-review').screenshot({path:`output/playwright/farm-water-stream/${f.name}-frame-${i%4}.png`});
   if(f.full){await page.evaluate(async i=>{const f=waterFrames[i],img=document.getElementById('water-review');img.src=f.full;img.style.width=f.width+'px';img.style.height='auto';await img.decode();},i);await page.locator('#water-review').screenshot({path:`output/playwright/farm-water-stream/${f.name}-field.png`});}
  }
  if(errors.length)throw Error(errors.join('\n'));const result={checks,frames,errors,video:await page.video().path()};await original.evaluate(r=>window.waterStreamResult=r,result);return result;
 }catch(error){await page.screenshot({path:'output/playwright/farm-water-stream/failure.png'});throw error;}finally{await context.close();}
}
