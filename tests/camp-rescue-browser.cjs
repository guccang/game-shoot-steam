// 正式场景验收：分批出场、昼夜手机/桌面小气泡与真实交战结算。
async page=>{
 if(new URL(page.url()).port!=='4286')throw Error('仅允许隔离端口');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 // 只准备已完成入职的存档与现场敌群，镜头、实体和更新仍走正式应用。
 async function mount(width,night=false){
  await page.setViewportSize({width,height:900});
  await page.evaluate(async({night})=>{
   (window.rescueApp||(await import('/src/main.js')).application).destroy();for(const d of document.querySelectorAll('dialog[open]'))d.close();localStorage.clear();
   const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js');const p=freshProgress();p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.living.position={x:160,y:729};p.living.calendar={day:1,elapsed:night?1100000:400000};
   localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-audio-v1',JSON.stringify({enabled:false}));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));localStorage.setItem('forest-patrol-environment-v1',JSON.stringify({time:night?'night':'day',autoTime:false,autoWeather:false,weather:'sun'}));
   window.rescueApp=(await import('/src/app/create-app.js')).createApplication({random:()=>.41});
  },{night});
  await page.locator('#start').click();await page.waitForFunction(()=>rescueApp.menu.page==='game');
  await page.waitForFunction(night=>{const tone=rescueApp.renderer.tone.sample(performance.now());return night?tone.night>=.99:tone.night<=.01;},night,{timeout:30000});
 }
 // 断裂拒马通过正式受伤入口触发；检查点只停模拟便于同屏截图，不伪造战斗结果。
 async function rescue(stop=2.4){
  await page.evaluate(async stop=>{
   const g=rescueApp.game,{startCampDefense,hurtCampBarricade}=await import('/src/core/camp/camp-defense.js');startCampDefense(g,'left');const r=g.campDefense;g.attackTimer=999;r.timer=999;g.enemies=[];
   for(let i=0;i<32;i++){const e=g.spawnEnemy(0,0,{x:r.barrier.x-190-Math.floor(i/8)*30,y:r.barrier.y+(i%8-3.5)*24},{ambient:true});Object.assign(e,{campDefense:true,arena:r.arena,hp:28,maxHp:28,speed:42,damage:5});}
   window.rescueCheck={stop,counts:[],last:0};const update=g.update.bind(g);g.update=dt=>{if(g.campDefense?.phase==='rescue'&&g.campDefense.rescueTime>=rescueCheck.stop)return;update(dt);if(r.rescueTime-rescueCheck.last>=.5){rescueCheck.last=r.rescueTime;rescueCheck.counts.push({t:r.rescueTime,count:g.enemies.filter(e=>e.hp>0).length});}};
   hurtCampBarricade(g,99999);rescueApp.refresh();
  },stop);
  await page.waitForFunction(()=>rescueApp.game.campDefense.rescueTime>=rescueCheck.stop);
 }
 // 所有检查读取共享正式验收入口，并限制气泡预算及点击穿透。
 async function inspect(label){const s=await page.evaluate(async()=> (await import('/src/rendering/visual-review.js')).inspectCampRescue(rescueApp.game,document));
  if(s.overflow||s.bubbles.length>1||s.bubbles.some(b=>b.rect.width>169||b.rect.height>49||b.buttons||b.pointerEvents!=='none'))throw Error(label+JSON.stringify(s));samples.push({label,...s});await page.screenshot({path:`output/playwright/horde-rescue-neighbor-bubbles/${label}.png`});return s;
 }
 await mount(1280);await rescue(1.2);const first=await inspect('arrival-one');if(first.helpers.filter(h=>h.entered).length!==1||first.enemies!==32)throw Error('第一位出场节奏异常');
 for(const t of [2.4,4.2,6.2]){await page.evaluate(t=>rescueCheck.stop=t,t);await page.waitForFunction(()=>rescueApp.game.campDefense.rescueTime>=rescueCheck.stop);await inspect('arrival-'+t);}
 await page.evaluate(()=>rescueCheck.stop=Infinity);await page.waitForFunction(()=>rescueApp.game.campDefense.phase==='result',null,{timeout:70000});
 const result=await page.evaluate(()=>({time:rescueApp.game.campDefense.rescueTime,counts:rescueCheck.counts,kills:rescueApp.game.campDefense.kills}));if(result.time<9||result.kills!==0||!result.counts.some(x=>x.count>0&&x.count<32))throw Error('救场不是逐步清敌');await inspect('result');
 for(const night of [false,true])for(const width of [1280,390,320]){
  await mount(width,night);await rescue(7.2);const s=await inspect(`rescue-${width}-${night?'night':'day'}`);if(!s.bubbles.length)throw Error('救援短句未显示 '+width);
 }
 // 普通营地闲聊也复用小气泡，不能退回任务对话框。
 for(const night of [false,true]){
  await mount(390,night);await page.evaluate(async()=>{const g=rescueApp.game,actors=(await import('/src/core/camp/living-world.js')).livingResidents(g),actor=actors.find(a=>a.id==='snow');Object.assign(g.player,{x:actor.x,y:actor.y+90});rescueApp.refresh();});
  await page.locator('#resident-chatter:not([hidden])').waitFor({state:'visible',timeout:15000});await inspect('resident-'+(night?'night':'day'));
 }
 if(errors.length)throw Error(errors.join('\n'));return {result,samples:samples.map(s=>({label:s.label,phase:s.phase,enemies:s.enemies,helpers:s.helpers,bubbles:s.bubbles})),errors};
}
