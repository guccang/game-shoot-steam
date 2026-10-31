// 消防站缺层复现：仅在独立端口准备已修复站点，保留正式场景绘制。
async page=>{
 if(new URL(page.url()).port!=='4302')throw Error('仅限隔离端口');
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.destroy();localStorage.clear();const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';localStorage.setItem('forest-patrol-world-revision','forest-threefold-2026-10');localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.locator('#start').click();await page.waitForTimeout(3200);
 const result=await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;window.tick=g.update.bind(g);g.update=()=>{};g.state='playing';Object.assign(g.player,{x:1440,y:1160,vx:0,vy:0});Object.assign(a.environment,{time:'day',weather:'sun',forestSeason:'summer',autoTime:false,autoWeather:false,autoSeason:false});a.renderer.camera.time=null;a.refresh();return {repaired:g.progress.restoration.repaired,state:g.state};});await page.screenshot({path:'output/playwright/fire-station-render/before.png'});

 // 使用正式故事入口复现未修复消防站；仅固定构图，不用夹具坐标证明通行。
 await page.evaluate(async()=>{const g=a.game;g.progress.restoration.repaired=g.progress.restoration.repaired.filter(id=>id!=='fire');const {storyPostForChapter,storyPostApproach}=await import('/src/core/story-posts.js');Object.assign(g.player,storyPostApproach(storyPostForChapter(g,'sunleaf-01')));if(!g.enterStory('sunleaf-01'))throw Error('故事未进入');g.advanceStoryDialogue(true);g.chooseStoryLoadout('line-patrol');g.startStoryStage();Object.assign(g.player,{x:1440,y:1160,vx:0,vy:0});a.renderer.camera.time=null;a.refresh();});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const views=[];
 for(const [width,height,label]of [[390,844,'390'],[320,740,'320'],[1280,900,'wide']])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});
  const state=await page.evaluate(async phase=>{const {LIVING_PHASES}=await import('/src/config/living-world.js'),{projectLivingCalendar}=await import('/src/world/living-calendar.js'),{EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');a.game.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id===phase).start+1000;projectLivingCalendar(a.environment,a.game.progress.living.calendar);a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.renderer.camera.time=null;a.renderer.resize();a.refresh();
   // 观测正式主画布内墙与地板的绘制，不能仅凭独立资产预览判定通过。
   const c=a.renderer.c,fill=c.fill;let wall=0,floor=0;c.fill=function(...args){if(this.fillStyle==='#385e4b')wall++;if(this.fillStyle==='#8d9e82')floor++;return fill.apply(this,args);};try{a.renderer.draw();}finally{c.fill=fill;}
   return {wall,floor,time:a.environment.time,overflow:document.documentElement.scrollWidth>innerWidth,story:!!a.game.story};
  },phase);
  if(!state.wall||!state.floor||state.time!==phase||state.overflow)throw Error(JSON.stringify(state));views.push({label,phase,...state});await page.screenshot({path:'output/playwright/fire-station-render/'+label+'-'+phase+'.png'});
 }
 // 回到普通巡逻检查废墟、施工显露与库内停驻车，正式设施权限保持不变。
 await page.setViewportSize({width:390,height:844});
 const stages=[];for(const stage of ['ruin','building','parked']){
  const state=await page.evaluate(async stage=>{const g=a.game;if(g.story)g.leaveStory();g.update=()=>{};g.state='playing';Object.assign(g.player,{x:1440,y:1160,vx:0,vy:0});g.progress.restoration.repaired=g.progress.restoration.repaired.filter(id=>id!=='fire');g.progress.restoration.build=stage==='building'?{id:'fire',elapsed:2.5,x:1440,y:1160}:null;if(stage==='parked'){g.progress.restoration.repaired.push('fire');g.progress.fireDispatch.garage={parked:true,truckHp:.8};g.vehicles[4].hp=g.vehicles[4].maxHp*.8;}a.renderer.camera.time=null;a.refresh();const c=a.renderer.c,fill=c.fill;let wall=0;c.fill=function(...args){if(this.fillStyle==='#385e4b')wall++;return fill.apply(this,args);};try{a.renderer.draw();}finally{c.fill=fill;}return {wall,parked:g.fireGarageParked};},stage);
  if((stage==='ruin')!==(state.wall===0)||stage==='parked'&&!state.parked)throw Error(JSON.stringify({stage,state}));stages.push({stage,...state});await page.screenshot({path:'output/playwright/fire-station-render/'+stage+'.png'});
 }
 // 从站前准备一次起点，之后仅用真实键盘绕行，保留正式物理、动作和遮挡。
 await page.evaluate(()=>{Object.assign(a.game.player,{x:1400,y:1170});a.game.update=tick;a.game.state='playing';a.game.fireClock=600;a.renderer.camera.time=null;a.refresh();});
 const walk=[];
 // 每段输入结束保存实际落点与正常画面。
 async function capture(label){const point=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y,parked:a.game.fireGarageParked}));walk.push({label,...point});await page.screenshot({path:'output/playwright/fire-station-render/walk-'+label+'.png'});}
 // 键盘输入走位，不直接挪动角色到结果位置。
 async function move(key,ms){await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);await page.waitForTimeout(150);}
 await capture('front');await move('d',580);await capture('side');await move('w',760);await move('a',560);await capture('behind');await move('d',560);await move('s',760);await move('a',580);await capture('return');
 if(walk[2].y>=1100||Math.abs(walk[1].x-walk[0].x)<40||walk.some(p=>!p.parked))throw Error(JSON.stringify(walk));
 await page.evaluate(()=>{a.game.update=()=>{};});
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'fire-station-garage',views,stages,walk,errors};
}
