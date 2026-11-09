// 正式地下绘制、独立部件连续帧与地表颜色隔离，使用真实手机场景验收。
async original=>{
 const assert=require('node:assert/strict'),fs=require('node:fs'),out='output/playwright/mine-metal-dumplings';fs.mkdirSync(out,{recursive:true});
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;window.g=a.game;window.mc=await import('/src/config/mining.js');window.md=await import('/src/config/mine-dumplings.js');window.ml=await import('/src/core/mining/mine-layers.js');
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(s=>s.id);p.homeDecor.basement=true;(await import('/src/progression/mining/mining.js')).openBasement(p.mining);p.mining.seed=1847;
   g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.mainlineTalkDelay=g.spawnTimer=999999;g.livingPersist=()=>true;
   g.cottage={kind:'cottage',floor:0,outside:mc.MINING.home};Object.assign(g.player,mc.MINING.hatch.goal);if(!(await import('/src/core/mining/mining.js')).enterMine(g))throw Error('地下入口失败');
   window.l=ml.currentMineLayer(g);const ec=await import('/src/config/mine-ecology.js');window.center=null;
   for(let y=18;y<65&&!center;y++)for(let x=18;x<65&&!center;x++){let dry=true;for(let dy=-5;dy<=4;dy++)for(let dx=-4;dx<=4;dx++)if(ec.mineTerrain({x:x+dx,y:y+dy},l).water)dry=false;if(dry)center={x,y};}if(!center)throw Error('缺少干燥验收区域');
   for(let y=center.y-8;y<=center.y+8;y++)for(let x=center.x-8;x<=center.x+8;x++)l.dug[mc.mineKey({x,y})]=true;
   Object.assign(g.player,mc.minePoint(center));g.cottage.scanWait=999999;g.cottage.tool=null;g.cottage.hurtWait=999;
   l.animals={};window.forms=[];const used=new Set();
   for(const [i,form] of md.MINE_DUMPLINGS.entries()){
    let key;for(let y=center.y-5;y<=center.y+5&&!key;y++)for(let x=center.x-4;x<=center.x+4&&!key;x++){const k=mc.mineKey({x,y});if(!used.has(k)&&md.mineDumplingForm({kind:form.kind,key:k}).id===form.id)key=k;}if(!key)throw Error('缺少外观 '+form.id);used.add(key);
    const actor={key,kind:form.kind,x:g.player.x+(i%3-1)*105,y:g.player.y+Math.floor(i/3)*84-220,hp:form.kind==='bat'?30:form.kind==='spore'?60:48,clock:0,walk:0,phase:'roam',timer:0,death:0,respawn:0};actor.maxHp=actor.hp;l.animals[key]=actor;forms.push({id:form.id,key});
   }
   // 停驻矿车与猫猫同屏；怪物继续使用正式地下队列和脚底排序。
   const cell={x:center.x,y:center.y+2};l.rails[mc.mineKey(cell)]=true;l.carts=[{id:1,...mc.minePoint(cell),heading:0,wheel:0}];g.cottage.ecologyActors=Object.values(l.animals);
   window.realUpdate=g.update.bind(g);g.update=()=>{};a.refresh();
  });
  // 用正式绘制器采样各部件，不修改世界数据以伪造颜色；同时生成地面/地下并排对照。
  const sprites=await page.evaluate(async()=>{
   const {drawMineAnimal}=await import('/src/rendering/mine-ecology.js'),{drawSlime}=await import('/src/rendering/enemies.js'),{advanceMineDumplingMotion,hitMineDumpling}=await import('/src/combat/mine-dumpling-motion.js');
   const sheet=document.createElement('canvas');sheet.width=800;sheet.height=520;const sc=sheet.getContext('2d');sc.fillStyle='#fff6dc';sc.fillRect(0,0,800,520);
   const tile=document.createElement('canvas');tile.width=160;tile.height=128;const c=tile.getContext('2d',{willReadFrequently:true});
   const hash=()=>{let h=2166136261;for(const n of c.getImageData(0,0,160,128).data)h=Math.imul(h^n,16777619);return h>>>0;};
   const draw=e=>{c.clearRect(0,0,160,128);drawMineAnimal(c,{...e,x:80,y:98},e.clock||0);return hash();};
   const metrics=[];
   for(const [i,form] of forms.entries()){
    const original=l.animals[form.key],e=structuredClone(original),slotX=(i%5)*160,slotY=Math.floor(i/5)*260;
    c.clearRect(0,0,160,128);c.save();c.translate(80,98);c.scale(md.mineDumplingForm(e).scale,md.mineDumplingForm(e).scale);drawSlime(c,{...md.mineDumplingSnapshot(e),x:0,y:0},0,false,null,true);c.restore();const surfaceBefore=hash();sc.drawImage(tile,slotX,slotY);
    const idle=draw(e);sc.drawImage(tile,slotX,slotY+128);sc.fillStyle='#315c43';sc.font='12px sans-serif';sc.textAlign='center';sc.fillText(md.mineDumplingForm(e).name,slotX+80,slotY+251);
    const frames=[];for(let n=0;n<4;n++){e.x+=3;e.clock+=.08;e.walk+=.8;advanceMineDumplingMotion(e,.08);frames.push(draw(e));}
    hitMineDumpling(e);const hit=draw(e);e.hp=0;e.death=.4;const death=draw(e);
    c.clearRect(0,0,160,128);c.save();c.translate(80,98);c.scale(md.mineDumplingForm(original).scale,md.mineDumplingForm(original).scale);drawSlime(c,{...md.mineDumplingSnapshot(original),x:0,y:0},0,false,null,true);c.restore();const surfaceAfter=hash();metrics.push({id:form.id,idle,frames,hit,death,surfaceBefore,surfaceAfter});
   }
   return {metrics,png:sheet.toDataURL('image/png').split(',')[1]};
  });fs.writeFileSync(out+'/surface-metal-comparison.png',Buffer.from(sprites.png,'base64'));
  assert.equal(new Set(sprites.metrics.map(m=>m.idle)).size,10);for(const row of sprites.metrics){assert.equal(row.surfaceBefore,row.surfaceAfter,row.id);assert.ok(new Set(row.frames).size>1,row.id);assert.notEqual(row.idle,row.death,row.id);assert.notEqual(row.idle,row.hit,row.id);}
  const reviews=[];
  for(const [width,height] of [[390,844],[320,568],[1280,900]])for(const night of [false,true]){
   await page.setViewportSize({width,height});await page.evaluate(async night=>{g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===(night?'night':'day')).start+1000;const short=innerHeight<650;forms.forEach((form,i)=>{const e=l.animals[form.key];e.x=g.player.x+(i%2?95:-95);e.y=g.player.y+(short?-135:-220)+Math.floor(i/2)*(short?60:90);});a.renderer.resize();a.refresh();},night);await page.waitForTimeout(120);await page.screenshot({path:`${out}/scene-${width}-${night?'night':'day'}.png`});
   const review=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectMineMetalDumplings(g,a.renderer));assert.ok(!review.overflow);assert.equal(review.actors.length,10);reviews.push(review);
  }
  await page.setViewportSize({width:390,height:844});
  // 正式更新产生位移和步态，受击入口产生回弹，致命一击只结算一次。
  await page.evaluate(()=>{g.cottage.tool='pick';g.cottage.strike=0;g.cottage.attackWait=999;});
  const moving=await page.evaluate(()=>{for(let i=0;i<8;i++)realUpdate(.05);a.refresh();return g.cottage.ecologyActors.map(e=>({walk:e.walk,step:e.gelStep}));});assert.ok(moving.some(e=>e.walk>0&&e.step>0));
  await page.screenshot({path:out+'/moving.png'});
  await page.evaluate(async()=>{const target=g.cottage.ecologyActors.find(e=>e.kind==='spore');window.targetKey=target.key;(await import('/src/core/mining/mine-combat.js')).hitMineAnimal(g,target,1,{direction:{x:1,y:0}});a.refresh();});await page.screenshot({path:out+'/hit.png'});
  const death=await page.evaluate(async()=>{const target=ml.currentMineLayer(g).animals[targetKey],before=g.progress.mining.ore,{hitMineAnimal}=await import('/src/core/mining/mine-combat.js');hitMineAnimal(g,target,999);hitMineAnimal(g,target,999);g.cottage.ecologyActors=Object.values(ml.currentMineLayer(g).animals);a.refresh();return {ore:g.progress.mining.ore-before,death:ml.currentMineLayer(g).animals[targetKey].death};});assert.equal(death.ore,4);assert.equal(death.death,.6);
  await page.screenshot({path:out+'/death.png'});
  await page.locator('#mine-tools-toggle').tap();await page.locator('#mine-build').tap();const age=await page.evaluate(()=>ml.currentMineLayer(g).age);await page.evaluate(()=>{for(let i=0;i<10;i++)realUpdate(.05);});assert.equal(await page.evaluate(()=>ml.currentMineLayer(g).age),age);await page.keyboard.press('Escape');
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/result.json',JSON.stringify({metrics:sprites.metrics,reviews,errors},null,2));return {designCriterion:'mine-metal-dumplings',forms:sprites.metrics.length,screens:reviews.length,errors};
 }finally{await context.close();}
}
