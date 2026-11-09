// 复用正式手机页面，验证文字节点稳定、真实触控移动与导航状态切换。
async page=>{
 const fs=require('node:fs'),assert=require('node:assert/strict'),out='output/world-scroll';fs.mkdirSync(out,{recursive:true});
 const dom=await page.evaluate(async()=>{
  const {setHidden,setText}=await import('/src/ui/shared/dom-state.js');
  const box=document.createElement('section'),label=document.createElement('span');box.append(label);document.body.append(box);
  setHidden(box,true);setText(label,'剩余10米');const text=label.firstChild;
  const observer=new MutationObserver(()=>{});observer.observe(box,{subtree:true,attributes:true,childList:true,characterData:true});
  for(let i=0;i<120;i++){setHidden(box,true);setText(label,'剩余10米');}
  const repeated=observer.takeRecords().length;setText(label,'剩余9米');const changed=observer.takeRecords().map(r=>r.type),sameNode=text===label.firstChild;
  setHidden(box,false);const visible=!box.hidden;observer.disconnect();box.remove();return {repeated,changed,sameNode,visible};
 });assert.deepEqual(dom,{repeated:0,changed:['characterData'],sameNode:true,visible:true});
 // 正式自动导航先更新距离，再通过触控停止；确认停止不会留下HUD。
 await page.waitForTimeout(300);const travel=page.locator('#waystation-travel');assert.equal(await travel.isVisible(),true);
 await travel.locator('button').tap();assert.equal(await travel.isVisible(),false);
 const movement=[];
 for(const [width,height,time]of [[320,568,'day'],[390,844,'night']]){
  await page.setViewportSize({width,height});await page.evaluate(async time=>{
   g.waystationTravel=null;g.enemies=[];g.boss=null;g.state='playing';g.cottage=null;
   g.progress.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);g.progress.campLand.owned=(await import('/src/config/camp-land.js')).CAMP_PLOTS.map(p=>p.id);Object.assign(g.player,{x:450,y:650,vx:0,vy:0});
   const {LIVING_PHASES}=await import('/src/config/living-world.js');g.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id===time).start+1000;
   (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoTime:false,autoWeather:false});
   a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.camera.time=null;a.refresh();
  },time);
  await page.waitForTimeout(1200);await page.screenshot({path:`${out}/houses-${time}-${width}.png`});
  const before=await page.evaluate(()=>({x:g.player.x,y:g.player.y,n:samples.length}));
  const cdp=await page.context().newCDPSession(page),box=await page.locator('#game-frame').boundingBox(),x=box.x+90,y=box.y+height/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+60,y}]});
  await page.waitForTimeout(1000);await page.screenshot({path:`${out}/moving-${time}-${width}.png`});await page.waitForTimeout(2000);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  const result=await page.evaluate(async n=>({x:g.player.x,y:g.player.y,samples:samples.slice(n),errors:g.profiler.events.filter(e=>e.type==='frame-error'),review:(await import('/src/rendering/visual-review.js')).inspectMovementRenderCulling(a.renderer)}),before.n);
  assert.ok(result.x-before.x>100,JSON.stringify({before,x:result.x}));assert.deepEqual(result.errors,[]);assert.equal(result.review.overflow,false);assert.equal(result.review.designCriterion,'movement-render-culling');
  movement.push({width,height,time,before,...result});
 }
 fs.writeFileSync(out+'/review.json',JSON.stringify({dom,movement},null,2));return {dom,movement:movement.map(s=>({width:s.width,time:s.time,distance:s.x-s.before.x}))};
}
