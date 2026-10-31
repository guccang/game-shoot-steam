// 手机浏览器用真实点击和方向键完成免费演练，验证钱包隔离、昼夜显示与存档恢复。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],results=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;
   window.readTrial=(await import('/src/ui/workshop/trial-scene.js')).inspectWeaponTrialScene;
   window.mainline=await import('/src/core/mainline-manager.js');
  });
  for(const [id,kind,index,record,width,time] of [['own-hover','vehicle',3,'hoverTrial',390,'day'],['own-aircraft','vehicle',2,'aircraftTrial',320,'night'],['own-controller','weapons',15,'controllerTrial',390,'day']]){
   await page.setViewportSize({width,height:844});
   const before=await page.evaluate(async({id,kind,index,time})=>{
    const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;
    const ids=(await import('/src/config/mainline.js')).MAINLINE_IDS;p.mainline.completed=ids.slice(0,ids.indexOf(id));p.mainline.currentId=id;p.mainline.phase='doing';
    const g=a.game;g.progress=p;g.reset();a.menu.enter();g.start();g.arrivalScene=null;g.mainlineSpeech=null;g.update=()=>{};
    Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.refresh();a.workshop.open(kind,index);
    return JSON.stringify([g.progress.coins,g.progress.wood,g.progress.materials,g.progress.weapons,g.progress.vehicleHulls]);
   },{id,kind,index,time});
   await page.locator('#ws-test').waitFor({state:'visible'});
   if(await page.locator('#workshop-dialog').getAttribute('data-function')!=='buy')throw Error('未购买装备应留在购买目录');
   await page.screenshot({path:'output/playwright/mainline-reward-balance/'+id+'-entry.png'});
   await page.locator('#ws-test').tap();
   await page.waitForFunction(()=>readTrial(document.getElementById('weapon-trial-dialog'))?.elapsed>0);
   let held=[];
   // 只用真实方向键跟进被击退的靶子，不改伤害、血量或击破计数。
   for(let n=0;n<240;n++){
    const state=await page.evaluate(()=>readTrial(document.getElementById('weapon-trial-dialog')));
    if(state.destroyed)break;
    const e=state.targets.filter(e=>e.hp>0).sort((x,y)=>Math.hypot(x.x-state.player.x,x.y-state.player.y)-Math.hypot(y.x-state.player.x,y.y-state.player.y))[0];
    const dx=e.x-state.player.x,dy=e.y-state.player.y,next=Math.hypot(dx,dy)>70?[...(Math.abs(dx)>35?[dx>0?'ArrowRight':'ArrowLeft']:[]),...(Math.abs(dy)>35?[dy>0?'ArrowDown':'ArrowUp']:[])]:[];
    for(const k of held.filter(k=>!next.includes(k)))await page.keyboard.up(k);
    for(const k of next.filter(k=>!held.includes(k)))await page.keyboard.down(k);held=next;
    await page.waitForTimeout(200);
   }
   for(const k of held)await page.keyboard.up(k);
   const result=await page.evaluate(({before,record})=>{
    const s=readTrial(document.getElementById('weapon-trial-dialog')),p=a.game.progress;
    if(!s.destroyed||!p.mainline.seen[record])throw Error('实际击破未记入体验');
    if(JSON.stringify([p.coins,p.wood,p.materials,p.weapons,p.vehicleHulls])!==before)throw Error('免费演练改变了钱包或所有权');
    if(JSON.parse(localStorage.getItem('forest-patrol-v1')).mainline.seen[record]!==1)throw Error('演练记录未立即保存');
    return {record,destroyed:s.destroyed,seconds:s.elapsed,coins:p.coins};
   },{before,record});
   if(time==='night')await page.locator('#weapon-trial-time').tap();
   await page.locator('#weapon-trial-pause').tap();
   await page.screenshot({path:'output/playwright/mainline-reward-balance/'+id+'-trial.png'});
   await page.locator('#weapon-trial-close').tap();await page.locator('#ws-close').tap();
   await page.evaluate(()=>{mainline.updateMainline(a.game,0);a.save();a.refresh();});
   if(await page.evaluate(()=>a.game.progress.mainline.phase)!=='report')throw Error('演练后未进入交付阶段');
   results.push(result);
  }
  await page.reload();await page.locator('#start').tap();
  const restored=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;return {phase:a.game.progress.mainline.phase,seen:a.game.progress.mainline.seen.controllerTrial,owned:a.game.progress.weapons[15]};});
  if(restored.phase!=='report'||restored.seen!==1||restored.owned!==0)throw Error('重载后体验或永久装备错误');
  if(errors.length)throw Error(errors.join('\n'));return {results,restored,errors};
 }finally{await context.close();}
}
