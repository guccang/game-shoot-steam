// 营门提示实机验收：双营门、昼夜、手机比例、材料状态与按下位置均使用正式DOM和绘制器。
async page=>{
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:390,height:844});if(await page.locator('#start').isVisible())await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.gateApp=(await import('/src/main.js')).application;await gateApp.ready;await document.fonts.ready;
  const g=gateApp.game;g.progress=(await import('/src/progression/progress.js')).freshProgress();g.progress.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();g.progress.mainline.phase='complete';g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.enemies=[];g.boss=null;g.update=()=>{};
  window.gateSites=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.find(f=>f.id==='defense').locations;
  for(const d of document.querySelectorAll('dialog[open]'))d.close();
 });
 for(const [width,height] of [[320,568],[390,844],[844,390]])for(const time of ['day','night'])for(const index of [0,1])for(const state of ['poor','funded','repaired']){
  await page.setViewportSize({width,height});
  await page.evaluate(async({time,index,state})=>{
   const g=gateApp.game,s=gateSites[index];g.progress.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.filter(f=>state==='repaired'||f.id!=='defense').map(f=>f.id);g.progress.restoration.build=null;g.progress.wood=state==='funded'?120:0;Object.assign(g.player,{x:state==='repaired'?s.x:s.site.x,y:state==='repaired'?s.y+24:s.site.y+15,vx:0,vy:0});g.vehicle.active=false;
   const {LIVING_PHASES}=await import('/src/config/living-world.js'),{EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js'),phase=LIVING_PHASES.find(p=>p.id===time);g.progress.living.calendar={day:1,elapsed:phase.start+phase.duration/2};Object.assign(gateApp.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});gateApp.renderer.light=new EnvironmentTransition(gateApp.environment,0);gateApp.renderer.tone=new SceneTone(gateApp.environment,0);gateApp.renderer.camera.time=null;gateApp.refresh();
  },{time,index,state});await page.waitForTimeout(150);
  const sample=await page.evaluate(async index=>{
   const b=document.getElementById('nearby-interaction'),r=b.getBoundingClientRect(),v=gateApp.renderer.view,c=gateApp.renderer.canvas.getBoundingClientRect(),s=gateSites[index],p=(await import('/src/world/coordinates.js')).nearest(s,{x:v.x+v.w/2,y:v.y+v.h/2});
   const marker={left:c.left+(p.x-48-v.x)*v.zoom,right:c.left+(p.x+48-v.x)*v.zoom,top:c.top+(p.y-(b.dataset.interaction==='gate'?142:70)-v.y)*v.zoom,bottom:c.top+(p.y+8-v.y)*v.zoom};
   const review=await (await import('/src/rendering/visual-review.js')).inspectBuildingInteraction(gateApp.renderer,document);return {anchorError:review.anchorError,hidden:b.hidden,target:b.dataset.target,type:b.dataset.presentation,placement:b.dataset.placement,rect:{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height},marker,overlap:r.left<marker.right&&r.right>marker.left&&r.top<marker.bottom&&r.bottom>marker.top,color:getComputedStyle(b).backgroundColor,text:b.innerText};
  },index);
  if(sample.anchorError>1||sample.hidden||sample.type!=='gate-hint'||sample.overlap||sample.rect.left<0||sample.rect.right>width||sample.rect.top<0||sample.rect.bottom>height||sample.rect.height<44||!['rgb(255, 246, 220)','rgb(232, 237, 207)'].includes(sample.color))throw Error(JSON.stringify({width,height,time,index,state,sample}));
  samples.push({width,height,time,index,state,...sample});
  if(state==='poor'&&width!==844)await page.screenshot({path:`output/playwright/gate-repair-ui/${width}-${time}-${index}.png`});
 }
 // 原生按下不改变锚点；点击后才扣120木头并开工。
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{const g=gateApp.game,s=gateSites[0];g.progress.restoration.repaired=[];g.progress.restoration.build=null;g.progress.wood=120;Object.assign(g.player,s.site);gateApp.renderer.camera.time=null;});await page.waitForTimeout(200);
 const button=page.locator('#nearby-interaction'),before=await button.boundingBox();await page.mouse.move(before.x+before.width/2,before.y+before.height/2);await page.mouse.down();await page.waitForTimeout(80);const pressed=await button.boundingBox();if(Math.abs(before.x-pressed.x)>.5||Math.abs(before.y-pressed.y)>.5)throw Error('按下营门提示时发生跳位');await page.mouse.up();
 const repair=await page.evaluate(()=>({wood:gateApp.game.progress.wood,build:gateApp.game.progress.restoration.build?.id}));if(repair.wood!==0||repair.build!=='defense')throw Error('修复点击未正确扣料 '+JSON.stringify(repair));if(errors.length)throw Error(errors.join('\n'));
 return {designCriterion:'building-interaction-anchor',samples,repair,errors};
}
