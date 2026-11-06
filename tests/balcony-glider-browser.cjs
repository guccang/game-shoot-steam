// 用正式阳台入口和触屏按钮起飞，检查自然着陆、提前降落及昼夜画面。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:4175');await page.locator('#start').tap();
 for(const [floor,side,time,width,height] of [[1,'east','day',390,844],[5,'south','night',320,568],[3,'west','day',580,844]]){
  await page.setViewportSize({width,height});
  await page.evaluate(async({floor,side,time})=>{
   const a=window.a=(await import('/src/main.js')).application;await a.ready;
   const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(v=>v.id);
   p.homeDecor.floors=8;p.homeDecor.balconies[floor]=[side];g.progress=p;g.reset();g.start();g.vehicle.active=false;g.mainlineSpeech=null;
   const {COTTAGE}=await import('/src/config/cottage.js');Object.assign(g.player,COTTAGE.door);
   if(!(await import('/src/core/cottage.js')).enterCottage(g))throw Error('小屋入口失败');
   g.cottage.floor=floor;Object.assign(g.player,(await import('/src/config/home-construction.js')).HOME_DIRECTIONS[side].door);
   if(!(await import('/src/core/home-construction.js')).enterHomeBalcony(g,side))throw Error('阳台入口失败');
   const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);p.living.calendar.elapsed=phase.start+phase.duration*.5;
   (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,p.living.calendar);
   // 同一屏保留停驻载具和怪物，核对翼布、地影与下方实体的遮挡。
   const home=(await import('/src/world/workshop.js')).RANGER_COTTAGE;
   p.campParking.owned=[{hull:5,spot:null,mapId:'forest',x:home.x+95,y:home.y+95,hp:120,ammo:0,reload:0}];
   g.spawnEnemy(0,100);Object.assign(g.enemies.at(-1),{x:home.x+58,y:home.y+98,hp:9999});
   a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment);
   a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment);a.renderer.camera.time=null;a.refresh();
  },{floor,side,time});
  const launch=page.locator('#home-glider');await launch.tap();await page.waitForFunction(()=>!!a.game.cottage?.glide);
  const distance=await page.evaluate(()=>a.game.cottage.glide.distance);
  if(distance>(floor+1)*180+.001)throw Error('超过楼层航程');
  await page.waitForTimeout(750);await page.screenshot({path:`output/balcony-glider/${width}-${time}.png`});
  if(floor>1){await launch.tap();await page.waitForFunction(()=>a.game.cottage?.glide?.approach||!a.game.cottage);}
  await page.waitForFunction(()=>!a.game.cottage,null,{timeout:18000});
  const safe=await page.evaluate(async()=>{const g=a.game,p=g.player,q=(await import('/src/core/town-layout.js')).townStandingPoint(g,p);return q&&Math.hypot(p.x-q.x,p.y-q.y)<.01;});
  if(!safe)throw Error('着陆位置无法步行');
 }
 if(errors.length)throw Error(errors.join('；'));return true;
}
