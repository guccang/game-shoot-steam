// 用正式角色绘制器输出七款围巾，并在游戏中通过摇杆验证起停和昼夜遮挡。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage(),out='output/playwright/hero-scarves/',errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;
   const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival=null;p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.heroes.fill(1);p.hero=5;
   g.progress=p;g.reset();g.start();g.mainlineSpeech=null;g.mainlineTalkDelay=g.spawnTimer=g.fireClock=999999;g.vehicle.active=false;
   for(const d of document.querySelectorAll('dialog[open]'))d.close();
   Object.assign(g.player,{x:700,y:2752});g.progress.campParking.owned=[{hull:0,spot:null,mapId:'forest',x:780,y:2812,hp:1,ammo:0}];
   const enemy=g.spawnEnemy(0,0,{x:618,y:2782});Object.assign(enemy,{speed:0,damage:0,hp:9999,maxHp:9999});
   a.renderer.camera.time=null;a.refresh();
  });
  for(const [width,height,time] of [[390,844,'day'],[320,568,'night'],[950,844,'day'],[950,844,'night']]){
   await page.setViewportSize({width,height});
   await page.evaluate(async time=>{
    a.game.progress.hero=time==='day'?5:2;
    const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);
    a.game.progress.living.calendar.elapsed=phase.start+phase.duration/2;
    (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);
    Object.assign(a.environment,{time,autoTime:false,livingPreview:false,weather:'sun',autoWeather:false});
    a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);
    a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);a.renderer.camera.time=null;a.refresh();
   },time);
   await page.waitForTimeout(180);await page.screenshot({path:out+'field-'+width+'-'+time+'.png'});
  }
  await page.setViewportSize({width:390,height:844});
  const touch=await context.newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:80,y:520}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:150,y:520}]});
  await page.waitForFunction(()=>a.game.player.bodyAnimation.scarfLift>.6);
  await page.screenshot({path:out+'walking.png'});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForFunction(()=>a.game.player.bodyAnimation.scarfLift<.1);
  await page.setViewportSize({width:760,height:430});
  await page.evaluate(async()=>{
   const {drawCat}=await import('/src/rendering/characters.js'),{catSprites}=await import('/src/rendering/cat-animation.js');
   const {HEROES}=await import('/src/config/heroes.js'),{CAT_SCARVES}=await import('/src/config/cat-scarves.js');
   if(!await catSprites.load())throw Error('猫身体图集加载失败');
   const canvas=document.createElement('canvas');canvas.id='scarf-samples';canvas.width=760;canvas.height=430;
   canvas.style='position:fixed;top:0;left:0;z-index:99999';document.body.append(canvas);
   const c=canvas.getContext('2d');c.fillStyle='#f8efd8';c.fillRect(0,0,760,430);
   for(const [i,h] of HEROES.entries()){
    const x=i<4?95+i*190:190+(i-4)*190,y=i<4?147:355;
    drawCat(c,x,y,i,0,1.95,0,0,null,1,null,0,false,false,{idleTime:.25,moveTime:.25,moveWeight:.8,scarfLift:.85},0,null,0,true);
    c.fillStyle='#364e40';c.font='bold 19px sans-serif';c.textAlign='center';c.fillText(h.name,x,y+49);
    const rgb=parseInt(CAT_SCARVES[h.id].cloth.slice(1),16),data=c.getImageData(x-82,y-130,160,150).data;
    let area=0;for(let j=0;j<data.length;j+=4)if(data[j]===(rgb>>16)&&data[j+1]===(rgb>>8&255)&&data[j+2]===(rgb&255))area++;
    if(area<35)throw Error(h.name+' 的围巾色未显现');
   }
  });
  await page.locator('#scarf-samples').screenshot({path:out+'seven-cats.png'});
  if(errors.length)throw Error(errors.join('\n'));
 }finally{await context.close();}
}
