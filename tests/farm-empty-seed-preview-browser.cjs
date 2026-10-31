// 手机实景验收：空田种子袋对齐、触摸选种、真实播种与新地块红绿预览。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],samples=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(original.url()||'http://localhost:4175');
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;a.menu.enter();await a.ready;});
  await page.waitForFunction(()=>a.menu.page==='game');
  const plot=await page.evaluate(async()=>{
   const g=a.game;g.update=()=>{};
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.cottageRested=true;p.farm.wildMaps=['forest','jiuzhaigou'];p.farm.lessonRewarded=true;
   p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
   g.progress=p;g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.enemies=[];g.boss=null;g.vehicle.active=false;
   const {farmLandReason,farmApproach}=await import('/src/world/farm-land.js'),{farmAction}=await import('/src/core/farm.js');
   for(let y=900;y<1300;y+=52)for(let x=1200;x<1760;x+=56){const point={x,y,mapId:g.mapId},approach=farmApproach(g,point);if(farmLandReason(g,point)||!approach)continue;Object.assign(g.player,approach,{vx:0,vy:0});const r=farmAction(g,'dig',{point});if(!r.ok)continue;g.progress.farm.seeds[0]=3;g.progress.farm.unlocked[0]=true;for(const d of document.querySelectorAll('dialog[open]'))d.close();a.renderer.camera.time=null;a.refresh();a.renderer.draw();a.farm.open();return g.progress.farm.plots.at(-1);}
   throw Error('正式地图未找到可开垦田地');
  });
  const cell=page.locator(`[data-farm-cell="${plot.id}"]`),preview=page.locator('#farm-placement');
  for(const [width,height,time] of [[390,844,'day'],[320,568,'night']]){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);a.game.progress.living.calendar.elapsed=phase.start+1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();a.renderer.draw();},time);
   await page.waitForTimeout(250);const b=await cell.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height-2);
   await page.waitForTimeout(150);const state=await preview.evaluate(el=>({mode:el.dataset.mode,valid:el.dataset.valid,x:Number(el.dataset.worldX),y:Number(el.dataset.worldY),border:getComputedStyle(el).borderTopWidth,bag:getComputedStyle(el.querySelector('svg')).display}));
   if(state.mode!=='seed'||state.valid!=='true'||state.x!==plot.x||state.y!==plot.y||state.border!=='0px'||state.bag==='none')throw Error('空田边缘提示不正确 '+JSON.stringify(state));
   await page.screenshot({path:`output/playwright/farm-empty-seed-preview/${width}-${time}.png`});samples.push({width,time,...state});
  }
  await cell.tap();if(!await page.locator('#farm-picker').isVisible()||await preview.isVisible())throw Error('点击空田未进入选种');
  await page.screenshot({path:'output/playwright/farm-empty-seed-preview/picker.png'});
  await page.locator('[data-farm-seed="0"]').tap();await cell.tap();
  const planted=await page.evaluate(async id=>{const g=a.game,{updateFarmWork}=await import('/src/core/farm.js');if(!g.farmWork.queue.some(j=>j.action==='plant'))throw Error('播种未进入正式队列');for(let i=0;i<80;i++)updateFarmWork(g,.05,{x:0,y:0});a.refresh();return {crop:g.progress.farm.plots.find(p=>p.id===id).crop,seeds:g.progress.farm.seeds[0]};},plot.id);
  if(planted.crop!==0||planted.seeds!==2)throw Error('播种结算错误 '+JSON.stringify(planted));
  await page.locator('#farm-hoe').tap();await cell.hover();await page.waitForTimeout(100);if(await preview.getAttribute('data-mode')==='seed')throw Error('已有作物仍显示选种袋');
  const targets=await page.evaluate(async()=>{const {farmDigTarget}=await import('/src/world/farm-land.js'),v=a.renderer.view,r=a.renderer.canvas.getBoundingClientRect(),out={};for(let y=160;y<r.height-110;y+=16)for(let x=20;x<r.width-20;x+=16){const el=document.elementFromPoint(r.x+x,r.y+y);if(el?.closest('button,[role="button"],dialog'))continue;const t=farmDigTarget(a.game,{x:v.x+x/r.width*v.w,y:v.y+y/r.height*v.h},v),kind=t.reason?'invalid':'valid';if(!out[kind]&&t.point&&!('id'in t.point))out[kind]={x:r.x+x,y:r.y+y};}return out;});
  for(const kind of ['valid','invalid']){const t=targets[kind];if(!t)throw Error('缺少地面样本 '+kind);await page.mouse.move(t.x,t.y);await page.waitForTimeout(100);if(await preview.getAttribute('data-valid')!==String(kind==='valid')||await preview.getAttribute('data-mode')!=='dig')throw Error('新地块预览错误 '+kind);}
  await page.locator('#farm-water').tap();if(await preview.isVisible())throw Error('切换工具未收起');await page.locator('#farm-exit').tap();if(await preview.isVisible())throw Error('退出未收起');
  if(errors.length)throw Error(errors.join('\n'));return {samples,planted,newTerrain:true,touchPicker:true,errors};
 }finally{await context.close();}
}


