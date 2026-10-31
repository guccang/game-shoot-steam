// 隔离存档验证库存直接修复、真实触屏走近与完整投料录像；固定施工采样仍使用正式绘制器。
async page=>{
 if(new URL(page.url()).port!=='4294')throw Error('仅限隔离验收端口4294');
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/restoration-wood-flow/video',size:{width:390,height:844}}});
 const t=await context.newPage(),errors=[],results=[];
 t.on('pageerror',e=>errors.push(e.message));
 await t.goto('http://localhost:4294');
 await t.evaluate(async()=>{
  const app=(await import('/src/main.js')).application;app.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress();
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
  localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await t.reload();await t.locator('#start').tap();
 await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
 await t.waitForFunction(()=>a.menu.page==='game'&&a.game.state==='playing');
 const cdp=await context.newCDPSession(t);
 for(const [id,time,width,height] of [['cottage','day',390,844],['garage','night',320,568]]){
  await t.setViewportSize({width,height});
  await t.evaluate(async({id,time})=>{
   const g=a.game,fs=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS,f=fs.find(f=>f.id===id),ids=(await import('/src/config/mainline.js')).MAINLINE_IDS;
   g.state='playing';g.progress.mainline.completed=ids.slice(0,f.order);g.progress.mainline.phase='doing';
   g.progress.restoration.repaired=fs.slice(0,fs.indexOf(f)).map(f=>f.id);g.progress.restoration.build=null;g.progress.restoration.gathered[id]=0;g.progress.wood=f.wood;
   g.enemies=[];g.boss=null;g.attackTimer=g.fireClock=999;g.vehicle.active=false;
   Object.assign(g.player,{x:f.site.x,y:f.site.y+135,vx:0,vy:0});a.renderer.camera.time=null;
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
   Object.assign(a.environment,{livingPreview:true,time,weather:'sun',autoSeason:false,autoTime:false,autoWeather:false,forestSeason:'summer'});
   g.progress.living.calendar.elapsed=time==='day'?400000:1100000;
   a.environment.time=time==='night'?'dusk':'night';document.getElementById('time-picture').click();
   a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);
   window.flowFrames=[];window.flowDone=false;
   // 只观察真实逐帧施工；动画时钟及自动投料不被测试替换。
   function watch(){
    const b=g.progress.restoration.build;
    if(b?.id===id)flowFrames.push({elapsed:b.elapsed,build:structuredClone(b),player:{x:g.player.x,y:g.player.y}});
    if(g.progress.restoration.repaired.includes(id)){window.flowDone=true;return;}
    requestAnimationFrame(watch);
   }
   requestAnimationFrame(watch);a.refresh();
  },{id,time});
  const y=height-200;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:100,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:100,y:y-65}]});
  await t.waitForFunction(()=>!!a.game.progress.restoration.build,null,{timeout:15000});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await t.waitForFunction(()=>flowDone,null,{timeout:15000});
  const result=await t.evaluate(()=>({wood:a.game.progress.wood,gathered:a.game.progress.restoration.gathered,frames:flowFrames.length,last:flowFrames.at(-1)?.elapsed,overflow:document.documentElement.scrollWidth>innerWidth,time:a.environment.time}));
  if(result.wood!==0||result.gathered[id]!==0||result.last<2.9||result.overflow||result.time!==time)throw Error('库存修复失败 '+JSON.stringify(result));
  results.push({id,time,...result});
  await t.waitForTimeout(3100);
  // 从实际录下的施工状态取中后段，便于同屏复核；不以固定样本替代上面的真实交互。
  for(const [label,elapsed] of [['middle',1.5],['late',2.9]]){
   await t.evaluate(({id,elapsed})=>{
    const g=a.game,frame=flowFrames.reduce((best,f)=>Math.abs(f.elapsed-elapsed)<Math.abs(best.elapsed-elapsed)?f:best);
    window.flowUpdate??=g.update;g.update=()=>{};g.state='playing';g.progress.restoration.repaired=g.progress.restoration.repaired.filter(x=>x!==id);
    g.progress.restoration.build=structuredClone(frame.build);Object.assign(g.player,frame.player);a.refresh();
   },{id,elapsed});
   await t.screenshot({path:'docs/art-reference/wood-flow-'+id+'-'+label+'.png'});
  }
  await t.evaluate(id=>{a.game.progress.restoration.build=null;a.game.progress.restoration.repaired.push(id);a.game.state='playing';a.game.update=window.flowUpdate;a.refresh();},id);
 }
 // 窄屏修复页显示当前库存与差额；已有材料不再显示采集配额。
 await t.evaluate(()=>{const g=a.game;g.progress.restoration.repaired=g.progress.restoration.repaired.filter(id=>id!=='garage');g.progress.wood=159;g.requestFacility('garage');});
 await t.locator('#restoration-dialog').waitFor({state:'visible'});
 const shortage=await t.locator('#restoration-summary').textContent();
 if(!shortage.includes('还差 1 木头')||shortage.includes('采集进度'))throw Error('差额文案错误 '+shortage);
 await t.screenshot({path:'docs/art-reference/wood-flow-panel-320.png'});
 await t.locator('#restoration-close').tap();
 const video=await t.video().path();await context.close();
 // 既有桌面窗口运行首间工坊，全额库存且采集记录为零。
 await page.setViewportSize({width:1280,height:900});
 await page.evaluate(async()=>{
  const app=(await import('/src/main.js')).application;app.destroy();
  const p=(await import('/src/progression/progress.js')).freshRangerProgress(),{RANGER}=await import('/src/config/ranger-arrival.js'),{WORKSHOP}=await import('/src/world/workshop.js');
  Object.assign(p.arrival,{phase:'gather',keys:true,wood:0,x:WORKSHOP.x,y:WORKSHOP.y+160});p.wood=RANGER.repairWood;
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
 await page.waitForFunction(()=>a.menu.page==='game'&&a.game.state==='playing'&&a.game.progress.arrival.phase==='repair');
 await page.keyboard.down('ArrowUp');
 await page.waitForFunction(()=>a.game.progress.arrival.phase==='repairing');
 await page.keyboard.up('ArrowUp');
 await page.waitForFunction(()=>a.game.progress.arrival.elapsed>4.8);
 await page.screenshot({path:'docs/art-reference/wood-flow-first-workshop-late.png'});
 await page.waitForFunction(()=>a.game.progress.arrival.phase==='craft');
 const initial=await page.evaluate(()=>({wood:a.game.progress.wood,gathered:a.game.progress.arrival.wood,phase:a.game.progress.arrival.phase}));
 if(initial.wood!==0||initial.gathered!==0)throw Error('首间工坊库存修复失败');
 if(errors.length)throw Error(JSON.stringify(errors));
 await page.evaluate(result=>window.woodFlowResult=result,{results,initial,shortage,video,errors});
}
