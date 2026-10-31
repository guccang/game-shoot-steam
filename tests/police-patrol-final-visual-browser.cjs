// 补齐正式采样器完整画幅、昼夜 HUD 同步与猫警员卡片证据。
async page=>{
 if(await page.locator('#camp-dialog').isVisible())await page.locator('#camp-dialog').evaluate(d=>d.close());
 await page.setViewportSize({width:1000,height:600});
 await page.evaluate(async()=>{
  const canvas=document.createElement('canvas');canvas.id='police-review';canvas.width=1000;canvas.height=600;canvas.style='position:fixed;inset:0;z-index:99999;background:#e9e5c7';document.body.append(canvas);
  const c=canvas.getContext('2d'),{renderVisualCase}=await import('/src/rendering/visual-review.js');
  for(let i=0;i<5;i++)for(let row=0;row<2;row++){
   const tile=document.createElement('canvas');tile.width=480;tile.height=360;await renderVisualCase(tile.getContext('2d'),row?'police-car-motion':'hero-breed-6',i*.4);
   c.drawImage(tile,i*200,row*300+65,200,150);c.fillStyle='#315c43';c.font='16px sans-serif';c.fillText((row?'警车':'警察猫')+' · '+(i*.4).toFixed(1),i*200+25,row*300+20);
  }
 });
 await page.screenshot({path:'output/playwright/police-patrol/motion.png'});await page.evaluate(()=>document.getElementById('police-review').remove());
 for(const [width,height] of [[320,568],[390,844],[1100,844]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async time=>{
   const g=a.game;g.state='playing';g.progress.vehicleIndex=8;g.vehicle=(await import('/src/combat/vehicle.js')).createVehicle(g.progress,g.maxHp(),8);g.vehicle.active=true;g.vehicle.wheelPhase=.65;
   const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);
   g.progress.living.calendar={day:1,elapsed:phase.start+phase.duration/2};
   Object.assign(a.environment,{time:'dusk',livingPreview:false,weather:'sun',autoWeather:false});
  },time);
  await page.waitForTimeout(100);
  await page.evaluate(async()=>{a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();});
  await page.waitForTimeout(100);
  const actual=await page.evaluate(()=>({time:a.environment.time,night:a.renderer.light.sample(performance.now()).night,overflow:document.documentElement.scrollWidth>innerWidth}));
  if(actual.time!==time||actual.night!==(time==='night'?1:0)||actual.overflow)throw Error(JSON.stringify(actual));
  await page.screenshot({path:`output/playwright/police-patrol/${width}-${time}.png`});
 }
 await page.setViewportSize({width:390,height:844});
 if(await page.locator('#heroes-button').isHidden())await page.locator('#field-menu-toggle').click();await page.locator('#heroes-button').click();
 await page.locator('[data-portrait="6"]').scrollIntoViewIfNeeded();await page.screenshot({path:'output/playwright/police-patrol/hero-card.png'});
 return {samples:10,scenes:6,heroCard:true};
}
