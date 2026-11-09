// 隔离手机存档，通过正式入口与状态机验证五波、领主和结算文案；大伤害仅加速流程。
async original=>{
 const assert=require('node:assert/strict'),fs=require('node:fs'),out='output/playwright/camp-defense-five-waves';fs.mkdirSync(out,{recursive:true});
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;window.g=a.game;g.update=()=>{};const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired.push('defense');g.progress=p;g.reset();g.start();g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.enemies=[];g.boss=null;g.vehicle.active=false;Object.assign(g.player,(await import('/src/config/camp-defense.js')).CAMP_GATES.find(v=>v.id==='left'));a.renderer.camera.time=null;a.refresh();});
  await page.locator('[data-camp-gate="left"]').dispatchEvent('click',{detail:0});assert.match(await page.locator('#camp-content').textContent(),/守住五波/);await page.locator('#camp-primary').tap();
  const waves=[];
  for(let wave=1;wave<=5;wave++){
   const row=await page.evaluate(async()=>{const {updateCampDefense}=await import('/src/core/camp/camp-defense.js');g.campDefense.timer=0;updateCampDefense(g,.01);a.refresh();const e=g.enemies[0];return {wave:g.campDefense.wave,level:e.level,hp:e.hp,total:document.querySelector('.camp-wave-total').textContent,label:document.querySelector('.camp-wave-orbit').getAttribute('aria-label')};});
   assert.deepEqual([row.wave,row.level,row.hp,row.total],[wave,wave+4,30+(wave-1)*3,'/5']);assert.match(row.label,/共 5 波/);waves.push(row);
   if(wave===1||wave===5)for(const [width,height]of [[320,568],[390,844]])for(const time of ['day','night']){
    await page.setViewportSize({width,height});await page.evaluate(async time=>{const {LIVING_PHASES}=await import('/src/config/living-world.js'),{projectLivingCalendar}=await import('/src/world/living-calendar.js');g.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id===time).start+1000;projectLivingCalendar(a.environment,g.progress.living.calendar);a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();},time);await page.waitForTimeout(220);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:`${out}/wave-${wave}-${width}-${time}.png`});
   }
   await page.evaluate(async wave=>{const {updateCampDefense}=await import('/src/core/camp/camp-defense.js');for(let i=0;g.campDefense.cleared<wave&&i<500;i++){updateCampDefense(g,.2);for(const e of g.enemies)if(e.hp>0)g.hit(e,1e9);g.enemies=g.enemies.filter(e=>e.hp>0);}a.refresh();},wave);
   assert.equal(await page.evaluate(()=>g.campDefense.cleared),wave);assert.equal(await page.evaluate(()=>!!g.boss),wave===5);
  }
  await page.evaluate(async()=>{g.hit(g.boss,1e9);(await import('/src/core/camp/camp-defense.js')).updateCampDefense(g,2);a.refresh();});await page.locator('#camp-defense-dialog').waitFor({state:'visible'});const result=await page.locator('#camp-content').textContent();assert.match(result,/守住 5 \/ 5 波/);assert.match(result,/金币 \+4200/);assert.doesNotMatch(result,/十波|六波|\/ 10 波/);await page.screenshot({path:out+'/result.png'});
  await page.locator('#camp-primary').tap();assert.equal(await page.evaluate(()=>g.campDefense),null);assert.equal(await page.evaluate(()=>g.progress.campDefense.runs),1);assert.deepEqual(errors,[]);
  fs.writeFileSync(out+'/result.json',JSON.stringify({waves,result,errors},null,2));return {waves,claimed:true,errors};
 }catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}finally{await context.close();}
}
