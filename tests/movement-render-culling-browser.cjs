// 手机移动验收复用正式页面，旧绘制器由测试路由提供，仅用于像素和耗时对照。
async page=>{
 const fs=require('node:fs'),assert=require('node:assert/strict'),out='output/navigation-stutter';
 for(const name of ['local-minimap','parking'])await page.route(`**/src/rendering/${name}-baseline.js`,route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(`${out}/${name}-before.js`,'utf8')}));
 const pixels=await page.evaluate(async()=>{
  const oldMap=(await import('/src/rendering/local-minimap-baseline.js')).drawLocalMinimap,newMap=(await import('/src/rendering/local-minimap.js')).drawLocalMinimap;
  const oldParking=(await import('/src/rendering/parking-baseline.js')).drawParkingGround,newParking=(await import('/src/rendering/parking.js')).drawParkingGround;
  const reports=[];
  for(const [x,y] of [[3320,3000],[900,700],[-300,300],[47995,35995],[24000,18000]])for(const night of [false,true])for(const mapId of ['forest','jiuzhaigou']){
   const g={mapId,player:{x,y,angle:.3},progress:window.g.progress,trees:window.g.trees,enemies:[],boss:null};
   for(const [kind,oldDraw,newDraw,size]of [['map',oldMap,newMap,208],['parking',oldParking,newParking,390]]){
    const images=[],times=[];for(const draw of [oldDraw,newDraw]){const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const c=canvas.getContext('2d',{willReadFrequently:true}),view=kind==='map'?{w:500,h:900}:{x:x-195,y:y-195,w:390,h:390};if(kind==='parking')c.translate(-view.x,-view.y);const start=performance.now();for(let i=0;i<6;i++){c.clearRect(kind==='parking'?view.x:0,kind==='parking'?view.y:0,size,size);draw(c,g,view,night);}times.push((performance.now()-start)/6);images.push(c.getImageData(0,0,size,size).data);}
    let changed=0;for(let i=0;i<images[0].length;i++)if(images[0][i]!==images[1][i])changed++;reports.push({kind,mapId,x,y,night,changed,oldMs:times[0],newMs:times[1]});
   }
  }
  return reports;
 });
 for(const row of pixels)assert.equal(row.changed,0,JSON.stringify(row));
 const movement=[];
 for(const [width,height,time]of [[320,568,'day'],[390,844,'night']]){
  await page.setViewportSize({width,height});await page.evaluate(async time=>{g.waystationTravel=null;g.enemies=[];g.boss=null;Object.assign(g.player,{x:3320,y:3000,vx:0,vy:0});g.state='playing';const {LIVING_PHASES}=await import('/src/config/living-world.js');g.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id===time).start+1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.camera.time=null;a.refresh();},time);
  await page.waitForTimeout(1500);const before=await page.evaluate(()=>({x:g.player.x,y:g.player.y,n:samples.length}));
  const cdp=await page.context().newCDPSession(page),box=await page.locator('#game-frame').boundingBox(),x=box.x+90,y=box.y+height/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+60,y}]});await page.waitForTimeout(3500);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  const result=await page.evaluate(n=>({x:g.player.x,y:g.player.y,samples:samples.slice(n),errors:g.profiler.events.filter(e=>e.type==='frame-error')}),before.n);assert.ok(result.x-before.x>100);assert.deepEqual(result.errors,[]);movement.push({width,height,time,before,...result});
  await page.screenshot({path:`${out}/manual-${time}-${width}.png`});
 }
 fs.writeFileSync(out+'/review.json',JSON.stringify({pixels,movement},null,2));return {pixels:pixels.length,movement:movement.map(s=>({width:s.width,time:s.time,distance:s.x-s.before.x})),mapOldMs:pixels.filter(p=>p.kind==='map').reduce((s,p)=>s+p.oldMs,0)/20,mapNewMs:pixels.filter(p=>p.kind==='map').reduce((s,p)=>s+p.newMs,0)/20};
}
