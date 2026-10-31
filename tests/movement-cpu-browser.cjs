// 用正式手机帧循环采样持续走位，输出阶段耗时和 CPU 热点用于前后对照。
async page => {
  if(new URL(page.url()).port!=='4174')throw Error('仅允许隔离性能端口');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(async()=>{
    window.a?.destroy();(await import('/src/main.js')).application.destroy();localStorage.clear();
    const {STORAGE_KEYS,WORLD_SAVE_REVISION}=await import('/src/platform/storage.js');localStorage.setItem(STORAGE_KEYS.worldRevision,WORLD_SAVE_REVISION);
    const {freshProgress}=await import('/src/progression/progress.js');
    const {MAINLINE_IDS}=await import('/src/config/mainline.js');
    const p=freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.living.position={x:1600,y:400};
    localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
    localStorage.setItem('forest-patrol-audio-v1',JSON.stringify({enabled:false}));
    localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
    window.a=(await import('/src/app/create-app.js')).createApplication({random:()=>.5});
  });
  await page.locator('#start').click();await page.waitForFunction(()=>a.menu.page==='game');
  await page.evaluate(()=>{a.game.player.invincible=1e6;a.game.encounterTimer=999;a.game.mainlineTalkDelay=999;});
  await page.waitForTimeout(2000);
  const client=await page.context().newCDPSession(page);
  await client.send('Profiler.enable');await client.send('Profiler.start');
  const start=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y,cache:a.renderer.ground.stats()}));
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(4000);await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowDown');await page.waitForTimeout(4000);await page.keyboard.up('ArrowDown');
  const {profile}=await client.send('Profiler.stop');await client.detach();
  const end=await page.evaluate(()=>{
    // 仅统计最近持续游玩帧，首屏初始化另由缓存计数体现。
    const f=a.renderer.profiler.frames.filter(f=>f.state==='playing');
    const stats=values=>{const v=values.toSorted((a,b)=>a-b);return {mean:v.reduce((s,n)=>s+n,0)/v.length,p95:v[Math.floor(v.length*.95)],max:v.at(-1)};};
    const sections={};for(const key of new Set(f.flatMap(f=>Object.keys(f.sections))))sections[key]=stats(f.map(f=>f.sections[key]||0));
    return {x:a.game.player.x,y:a.game.player.y,frames:f.length,total:stats(f.map(f=>f.total)),interval:stats(f.map(f=>f.interval)),sections,cache:a.renderer.ground.stats(),errors:a.renderer.profiler.events.filter(e=>e.type==='frame-error')};
  });
  const parents=new Map();for(const n of profile.nodes)for(const child of n.children||[])parents.set(child,n);
  const hotspots=profile.nodes.filter(n=>n.hitCount).sort((a,b)=>b.hitCount-a.hitCount).slice(0,25).map(n=>({name:n.callFrame.functionName,file:n.callFrame.url.split('/').slice(-2).join('/'),line:n.callFrame.lineNumber,hits:n.hitCount,parent:parents.get(n.id)?.callFrame}));
  if(errors.length||end.errors.length)throw Error(JSON.stringify({errors,end}));
  return {start,end,hotspots,errors};
}
