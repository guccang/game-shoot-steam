// 相同手机窗口与四倍CPU降速比较0/12/72块静止农田，区分画布、DOM与逻辑耗时。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],results=[];
 page.on('pageerror',e=>errors.push(e.message));const cdp=await context.newCDPSession(page);
 try{
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Performance.enable');
  await page.goto(original.url());await page.locator('#start').tap();
  await page.evaluate(async()=>{
   const a=window.a=(await import('/src/main.js')).application;await a.ready;
   const {freshRangerProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js');
   const p=freshRangerProgress();p.arrival=null;p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.farm.wildMaps=['forest','jiuzhaigou'];p.farm.plots=[];p.weapon=18;p.weapons[18]=1;
   const g=a.game;g.progress=p;g.reset();a.menu.enter();g.start();g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.fireClock=999999;g.updateWaves=()=>{};g.enemies=[];g.boss=null;g.vehicle.active=false;
   Object.assign(g.player,{x:1677,y:800,invincible:9999});a.renderer.camera.time=null;
   Object.assign(a.environment,{time:'day',livingPreview:true,weather:'sun',autoTime:false,autoWeather:false});
   await(await import('/src/rendering/farm.js')).loadFarmArt();a.farm.open();(await import('/src/core/farm.js')).setFarmTool(g,'water');
   const render=a.farm.renderFrame.bind(a.farm);window.farmCosts=[];
   a.farm.renderFrame=()=>{if(window.skipFarmPanel)return;const t=performance.now();render();window.farmCosts.push(performance.now()-t);};
  });
  for(const sample of [{count:0},{count:12},{count:72},{count:72,empty:true},{count:72,skipPanel:true}]){
   await page.evaluate(async sample=>{
    const now=Date.now(),g=a.game;g.progress.farm.plots=Array.from({length:sample.count},(_,i)=>({id:i,mapId:'forest',x:1537+i%6*56,y:492+Math.floor(i/6)*56,crop:sample.empty?null:i%8,plantedAt:now-120000,readyAt:now-60000,watered:true}));g.progress.farm.nextId=sample.count;
    window.skipFarmPanel=false;a.refresh();window.skipFarmPanel=!!sample.skipPanel;
   },sample);
   await page.waitForTimeout(1200);
   await page.evaluate(()=>{a.diagnostics.monitor.frames=[];window.farmCosts=[];});
   const before=await cdp.send('Performance.getMetrics');
   // 性能采样期间不启用CPU调用栈采样，避免采样器开销污染FPS。
   await page.waitForTimeout(3500);
   const after=await cdp.send('Performance.getMetrics'),data=await page.evaluate(()=>{
    const frames=a.diagnostics.monitor.frames,stats=values=>{const sorted=[...values].sort((a,b)=>a-b);return {mean:values.reduce((a,b)=>a+b,0)/Math.max(1,values.length),p95:sorted[Math.floor(sorted.length*.95)]||0};};
    const keys=['logic','render.canvas','render.entities','render.panels','ui'];return {frames:frames.length,fps:1000/stats(frames.map(f=>f.interval)).mean,total:stats(frames.map(f=>f.total)),farmPanel:stats(window.farmCosts),sections:Object.fromEntries(keys.map(k=>[k,stats(frames.map(f=>f.sections[k]||0))])),visibleCells:[...document.querySelectorAll('.farm-cell')].filter(n=>!n.hidden).length,plots:a.game.progress.farm.plots.length};
   });
   const base=Object.fromEntries(before.metrics.map(m=>[m.name,m.value]));data.browser=Object.fromEntries(after.metrics.filter(m=>['LayoutDuration','RecalcStyleDuration','ScriptDuration','TaskDuration','LayoutCount','RecalcStyleCount'].includes(m.name)).map(m=>[m.name,m.value-base[m.name]]));
   if(sample.count===72&&!sample.empty&&!sample.skipPanel){
    await cdp.send('Profiler.enable');await cdp.send('Profiler.start');await page.waitForTimeout(1500);
    const {profile}=await cdp.send('Profiler.stop'),nodes=new Map(profile.nodes.map(n=>[n.id,n])),counts={};
    profile.samples.forEach((id,i)=>{const n=nodes.get(id),key=n.callFrame.functionName+' '+n.callFrame.url.split('/').slice(-2).join('/')+':'+(n.callFrame.lineNumber+1);counts[key]=(counts[key]||0)+(profile.timeDeltas[i]||0)/1000;});
    data.cpu=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,18);await page.screenshot({path:'output/playwright/farm-72/scene.png'});
   }
   results.push({...sample,...data});
  }
  if(errors.length)throw Error(errors.join('\n'));return {url:original.url(),cpuThrottle:4,viewport:'390x844 DPR2',results,errors};
 }finally{await context.close();}
}
