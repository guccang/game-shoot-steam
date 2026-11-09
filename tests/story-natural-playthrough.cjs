// 实机试玩助手仅通过界面和键盘发出玩家操作；不改生命、伤害、敌人或任务状态。
async(page)=>{
 if(new URL(page.url()).port!=='4225')throw Error('仅限隔离试玩端口4225');
 await page.evaluate(async()=>{
  if(window.storyPlay)return;
  const a=(await import('/src/main.js')).application;await a.ready;
  const defs=await import('/src/core/story/story-definition.js'),coords=await import('/src/world/coordinates.js'),motion=await import('/src/physics/motion.js'),nav=await import('/src/physics/terrain-navigation.js'),journey=await import('/src/core/story/story-journey.js');
  window.storyPlay={a,defs,coords,motion,nav,journey,index:0,keys:[],records:[],stages:[],dialogues:[],deaths:[],lastStage:'',all:['sunleaf-01','sunleaf-02','sunleaf-03','sunleaf-04','sunleaf-05','sunleaf-06','sunleaf-side-expedition','sunleaf-side-guardian'],loadouts:['line-patrol','tide-arc','frost-guard','little-team','canopy-light','little-team']};
  const saved=sessionStorage.getItem('playthrough-log');if(saved){Object.assign(window.storyPlay,JSON.parse(saved));sessionStorage.removeItem('playthrough-log');}
 });
 await page.evaluate(()=>{if(!window.playErrors){window.playErrors=[];addEventListener('error',e=>window.playErrors.push(e.message));addEventListener('unhandledrejection',e=>window.playErrors.push(String(e.reason)));}});
 const until=Date.now()+45000;
 while(Date.now()<until){
  const decision=await page.evaluate(()=>{
   const s=window.storyPlay,{a,defs,coords,motion,nav,journey}=s,g=a.game,r=g.story;
   // 秘境是正式独立会话，故事暂停期间不误记交付。
   if(g.realm){const realm=g.realm,flag=g.progress.story.run.flags.excursion;
    if(flag){s.realmResults??={};s.realmResults[realm.mode]={cleared:realm.cleared,weapon:g.loadout.weaponIndex,vehicle:g.loadout.vehicleIndex,blessings:realm.blessingCounts,defenses:realm.defenses?.length,hp:g.player.hp,goddessHp:realm.goddess.hp};return document.querySelector('#realm-dialog[open]')?{click:'[data-realm-exit]'}:{click:'#realm-button'};}
    if(realm.phase==='lost')return {stop:'正式秘境挑战失败'};
    if(g.state==='paused')return {click:'#resume'};
    if(realm.phase==='loadout'){for(const kind of ['weapon','vehicle','turret'])if(realm.loadout[kind]===null)return {click:`[data-realm-roll="${kind}"]`};return {click:'[data-realm-ready]'};}
    if(realm.phase==='choice')return {click:'[data-realm-blessing] >> nth=0'};
    if(document.querySelector('#realm-dialog[open]'))return {click:'[data-realm-resume]'};
    if(realm.mode==='guardian'&&realm.cleared>0){
     if(!document.querySelector('.guardian-build-panel:not([hidden])'))return {press:'[data-guardian-slot="0"]'};
     return {click:'[data-guardian-equipment="weapon:0"]'};
    }
    if(realm.phase==='build')return {click:'.guardian-next-wave'};
    if(!g.vehicle.active&&!g.vehicle.cooldown)return {click:'#vehicle-button'};
    const p=g.player,t=g.enemies.filter(e=>e.hp>0).sort((a,b)=>coords.worldDistance(a,realm.mode==='guardian'?realm.goddess:p)-coords.worldDistance(b,realm.mode==='guardian'?realm.goddess:p))[0];
    if(!t)return {keys:[]};const near=coords.nearest(t,p),dx=p.x-near.x,dy=p.y-near.y,d=Math.hypot(dx,dy)||1,range=realm.mode==='guardian'?80:115;
    const goal={x:near.x+dx/d*range,y:near.y+dy/d*range};
    const point=p.flying||p.amphibious||p.arena?.terrain!=='forest'?goal:nav.naturalWaypoint(p,goal);
    const ax=point.x-p.x,ay=point.y-p.y;if(Math.hypot(ax,ay)<15)return {keys:[]};
    return {keys:[...(Math.abs(ax)>10?[ax>0?'KeyD':'KeyA']:[]),...(Math.abs(ay)>10?[ay>0?'KeyS':'KeyW']:[])]};
   }
   // 通过正式按钮接取下一章，已完成记录仅由真实交付生成。
   if(!r){
    if(s.active&&g.progress.story.chapters[s.active].completed){s.records.push({id:s.active,completed:g.progress.story.chapters[s.active].completed,elapsed:s.summary?.[s.active]?.metrics?.seconds??g.time,start:s.started});s.index++;s.active=null;}
    if(s.index>=s.all.length)return {done:true};
    const id=s.all[s.index];
    if(document.querySelector('#start')?.getBoundingClientRect().width>0&&g.state!=='playing'&&g.state!=='paused')return {click:'#start'};
    if(!document.querySelector('#story-dialog[open]'))return {click:'#story-button'};
    const selected=document.querySelector(`[data-story-chapter="${id}"]`);
    if(selected?.getAttribute('aria-pressed')!=='true')return document.querySelector('.story-catalog')?.open?{click:`[data-story-chapter="${id}"]`}:{click:'.story-catalog summary'};
    s.active=id;s.started=Date.now();return {click:'[data-story-command="enter"]'};
   }
   const id=r.chapterId,n=defs.storyNode(g),stage=id+'/'+r.stageId+'/'+r.phase;
   // 只读记录正式伙伴的攻击状态，帮助复核河岸卡住问题。
   if(g.mechanical?.nodes?.some(n=>n.mode==='strike')){s.strikes??={};s.strikes[id]=(s.strikes[id]||0)+1;}
   if(stage!==s.lastStage){s.stages.push({stage,time:g.time,hp:g.player.hp,hull:g.vehicle.hp,relay:r.relay?.hp});s.lastStage=stage;}
   if(id==='sunleaf-06'&&r.stageId==='DEFEND'&&r.combat?.spawned>=2&&!s.visualDone){s.visualDone=true;return {visual:true};}
   if(id==='sunleaf-06'&&r.stageId==='LAST'&&r.combat?.spawned>=2&&!s.visualShort){s.visualShort=true;return {visual:true};}
   if(r.dialogue){if(!s.dialogues.some(d=>d.id===id&&d.key===r.dialogue))s.dialogues.push({id,key:r.dialogue,lines:journey.storyDialogueLines(r,r.dialogue)});return {click:'#story-speech-skip'};}
   if(r.phase==='failed'){if(s.lastFailure!==id+'/'+r.stageId+'/'+r.metrics.deaths){s.deaths.push({id,stage:r.stageId,error:r.error});s.lastFailure=id+'/'+r.stageId+'/'+r.metrics.deaths;}if(s.deaths.filter(x=>x.id===id&&x.stage===r.stageId).length>8)return {stop:'同阶段失败超过8次'};return {click:'[data-story-command="retry"]'};}
   if(r.phase==='prepare'){
    if(n.excursion)return {click:'[data-story-command="excursion"]'};
    if(n.claimWhen){s.summary??={};s.summary[id]={metrics:r.metrics,experiences:r.experiences,choices:r.choices};return {click:'[data-story-command="claim"]'};}
    if(n.choice)return {click:'[data-story-option="lamp"]'};
    const loadout=id==='sunleaf-01'&&r.stageId==='Q50'?'frost-guard':s.loadouts[s.index];if(n.loadout&&r.loadoutId!==loadout)return {click:`[data-story-loadout="${loadout}"]`};
    if(n.routeChoice&&!r.routeId)return {click:`[data-story-route="${id==='sunleaf-01'?'road':id==='sunleaf-02'?'water':'bank'}"]`};
    return {click:'[data-story-command="start"]'};
   }
   if(document.querySelector('dialog[open]'))return {click:'#story-close'};
   if(g.state==='paused')return {click:'#resume'};
   if(n.task.type==='landing'&&coords.worldDistance(g.player,defs.storyDefinition(g).world.sites[n.task.site])<=n.task.radius&&g.vehicle.active)return {click:'#vehicle-button'};
   if(id==='sunleaf-05'&&r.stageId==='LIGHT'&&!g.vehicle.active&&!g.vehicle.cooldown)return {click:'#vehicle-button'};
   const o=g.storyObjective(),p=g.player,def=defs.storyDefinition(g);let goal=def.world.sites[o.site];
   const fighting=g.boss||r.combat&&!r.combat.cleared;
   if(fighting){
    const enemies=[...g.enemies.filter(e=>e.hp>0),...(g.boss?[g.boss]:[])].sort((a,b)=>coords.worldDistance(a,r.relay||p)-coords.worldDistance(b,r.relay||p));
    const t=enemies[0];if(t){const near=coords.nearest(t,p),dx=p.x-near.x,dy=p.y-near.y,d=Math.hypot(dx,dy)||1;
     if(t.type==='boss'){const angle=Math.atan2(dy,dx)+.35;goal={x:near.x+Math.cos(angle)*145,y:near.y+Math.sin(angle)*145};}
     else {const range=r.relay?75:id==='sunleaf-04'||id==='sunleaf-06'?95:115;goal=d>range+20?{x:near.x+dx/d*range,y:near.y+dy/d*range}:d<65?{x:near.x+dx/d*95,y:near.y+dy/d*95}:{x:p.x,y:p.y};}
    }
   }
   if(o.action&&coords.worldDistance(p,def.world.sites[o.site])<=def.interaction.radius&&!r.interacting)return {click:'#story-interact'};
   if(r.interacting)return {keys:[]};
   let point=p.flying||p.amphibious?coords.nearest(goal,p):nav.naturalWaypoint(p,goal);
   const distance=coords.worldDistance(p,point);if(distance<10)return {keys:[]};
   // 每次只按一个或两个方向键，选择可通行且最接近目的地的方向。
   let best=null,score=Infinity;
   for(const [x,y,keys] of [[1,0,['KeyD']],[-1,0,['KeyA']],[0,1,['KeyS']],[0,-1,['KeyW']],[1,1,['KeyD','KeyS']],[1,-1,['KeyD','KeyW']],[-1,1,['KeyA','KeyS']],[-1,-1,['KeyA','KeyW']]]){
    const l=Math.hypot(x,y),q={x:p.x+x/l*22,y:p.y+y/l*22};if(motion.blocked(q.x,q.y,12,g.trees,p)&&!p.flying)continue;
    const value=coords.worldDistance(q,point);if(value<score){score=value;best=keys;}
   }
   return {keys:best||[],stage,position:{x:p.x,y:p.y},goal};
  });
  const held=await page.evaluate(()=>window.storyPlay.keys),wanted=decision.keys||[];
  for(const k of held)if(!wanted.includes(k))await page.keyboard.up(k);
  for(const k of wanted)if(!held.includes(k))await page.keyboard.down(k);
  await page.evaluate(keys=>{window.storyPlay.keys=keys;},wanted);
  if(decision.done||decision.stop)break;
  if(decision.press)await page.locator(decision.press).press('Enter');
  // 同一场正式战斗只切换窗口和环境表现，采样期间不改任务、生命或敌人。
  if(decision.visual){
   sloop:for(const width of [1280,390,320])for(const time of ['day','night']){
    await page.setViewportSize({width,height:width===320?568:width===390?844:900});
    await page.evaluate(async time=>{const a=window.storyPlay.a;Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);},time);
    await page.waitForTimeout(1400);
    await page.screenshot({path:`output/playwright/story-playthrough/ring-${width}-${time}.png`});
    if(await page.evaluate(()=>window.storyPlay.a.game.story?.phase!=='active'))break sloop;
   }
   await page.setViewportSize({width:1280,height:900});
  }
  if(decision.click){const button=page.locator(decision.click);if(await button.count()&&await button.isVisible()&&await button.isEnabled())await button.click();else await page.waitForTimeout(180);}
  await page.waitForTimeout(decision.click?250:100);
 }
 for(const key of await page.evaluate(()=>window.storyPlay.keys))await page.keyboard.up(key);
 await page.evaluate(()=>window.storyPlay.keys=[]);
 const shot=await page.evaluate(()=>{const s=window.storyPlay,r=s.a.game.story;return (r?.chapterId||'forest')+'-'+(r?.stageId||'return')+'-'+Date.now();});
 await page.screenshot({path:'output/playwright/story-playthrough/'+shot+'.png'});
 if(await page.evaluate(()=>window.storyPlay.a.game.state==='playing')){await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.press('Space');}
 await page.screenshot({path:'output/playwright/story-playthrough/current.png'});
 return await page.evaluate(()=>{const s=window.storyPlay,g=s.a.game;return {index:s.index,records:s.records,last:s.stages.slice(-6),deaths:s.deaths,realm:g.realm?{mode:g.realm.mode,phase:g.realm.phase,cleared:g.realm.cleared}:null,realmResults:s.realmResults,position:g.player,stage:g.story?.stageId,phase:g.story?.phase,enemies:g.enemies.map(e=>({id:e.id,x:e.x,y:e.y,hp:e.hp})),dialog:document.querySelector('dialog[open]')?.id};});
}
