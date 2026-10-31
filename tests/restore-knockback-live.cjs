// 正式载具连射、角色走位与停火恢复的连续录制；不替换绘制器或逐帧摆拍。
async page=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{
  const g=hitApp.game,{armoredIdentity}=await import('/src/config/armored-enemies.js'),{rangedIdentity}=await import('/src/config/ranged-enemies.js'),{EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js'),{LIVING_PHASES}=await import('/src/config/living-world.js');
  g.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id==='day').start+1000;Object.assign(hitApp.environment,{time:'day',autoTime:false,weather:'sun',autoWeather:false});hitApp.renderer.light=new EnvironmentTransition(hitApp.environment,0);hitApp.renderer.tone=new SceneTone(hitApp.environment,0);
  Object.assign(g.player,{x:1600,y:400,invincible:99});g.enemies=[];g.remnants=[];g.projectiles=[];g.numbers=[];g.attack=()=>false;g.updateWeaponAbility=()=>{};g.summonVehicle();g.vehicle.module.cooldown=0;
  for(let i=0;i<6;i++){const a=-Math.PI*.8+i*.9,x=1600+Math.cos(a)*100,y=400+Math.sin(a)*100,e=g.spawnEnemy(a,0,{x,y});const identity=i===1?armoredIdentity(e):i===4?rangedIdentity(e,'bramble-buggy'):e;Object.assign(e,identity,{x,y,hp:i===0?60:400,maxHp:i===0?60:400,damage:0,arena:{x:1600,y:400,radius:380}});}
  window.liveKnock={elapsed:0,samples:[],startKills:g.kills};const original=Object.getPrototypeOf(g).update;
  g.update=(dt,input)=>{if(liveKnock.elapsed>=6)return;if(liveKnock.elapsed>=3)g.vehicle.module.cooldown=99;original.call(g,dt,input);liveKnock.elapsed+=dt;liveKnock.samples.push(g.enemies.map(e=>({id:e.id,species:e.species,z:e.z||0,vz:e.vz||0,roll:e.rollAngle||0,knock:e.knockTime||0,step:e.hitStep||0})));};hitApp.refresh();
  const stream=document.querySelector('#game').captureStream(20),chunks=[],recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9'});window.liveRecording={recorder,stream};recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=()=>{const blob=new Blob(chunks,{type:'video/webm'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='live.webm';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);stream.getTracks().forEach(t=>t.stop());};recorder.start();
 });
 await page.keyboard.down('ArrowLeft');await page.waitForTimeout(450);await page.keyboard.up('ArrowLeft');
 for(const t of [1,2,3,4,5,6]){await page.waitForFunction(t=>liveKnock.elapsed>=t,t);await page.screenshot({path:`output/playwright/restore-knockback-feel/live-${t}.png`});}
 const download=page.waitForEvent('download');await page.evaluate(()=>liveRecording.recorder.stop());await (await download).saveAs('output/playwright/restore-knockback-feel/live.webm');
 const result=await page.evaluate(()=>({duration:liveKnock.elapsed,kills:hitApp.game.kills-liveKnock.startKills,frames:liveKnock.samples.length,peakHeight:Math.max(...liveKnock.samples.flat().map(e=>e.z)),nonRoundRoll:liveKnock.samples.flat().some(e=>e.species&&e.species!=='slime'&&e.roll!==0),final:liveKnock.samples.at(-1)}));
 if(result.nonRoundRoll||result.peakHeight<1)throw Error(JSON.stringify(result));
 await page.emulateMedia({reducedMotion:'reduce'});await page.screenshot({path:'output/playwright/restore-knockback-feel/reduced-390.png'});return result;
}
