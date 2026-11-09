// 默认本地4175；允许独立工作树端口，以隔离存档检查休息回血和共用弹出入口配色。
async page=>{
 const origin=new URL(page.url());if(!['localhost','127.0.0.1'].includes(origin.hostname))throw Error('仅允许本地验收');
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),t=await context.newPage(),errors=[],checks=[];
 t.on('pageerror',e=>errors.push(e.message));
 // 使用正式计算样式检查前景背景配对，不能靠截图时间掩盖过渡期间浅底浅字。
 async function paperEntry(type){
  const button=t.locator(`#nearby-interaction[data-interaction="${type}"]`);await button.waitFor({state:'visible'});
  const colors=await button.evaluate(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {fg:s.color,bg:s.backgroundColor,primary:e.classList.contains('ui-button--primary'),height:r.height,left:r.left,right:r.right};});
  if(colors.fg!=='rgb(41, 67, 56)'||colors.primary||colors.height<44||colors.left<0||colors.right>await t.evaluate(()=>innerWidth))throw Error(type+JSON.stringify(colors));
  checks.push({type,...colors});return button;
 }
 try{
  await t.goto(origin.origin);
  await t.evaluate(async()=>{(await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
  await t.reload();await t.locator('#start').click();
  await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;const g=a.game;g.update=()=>{};g.mainlineSpeech=null;g.vehicle.active=false;g.enemies=[];const {COTTAGE}=await import('/src/config/cottage.js');Object.assign(g.player,COTTAGE.door);if(!(await import('/src/core/home/cottage.js')).enterCottage(g))throw Error('未进入小屋');Object.assign(g.player,COTTAGE.bed);a.refresh();});
  for(const [width,height,phase,mode] of [[390,844,'day','phase'],[320,568,'night','morning']]){
   await t.setViewportSize({width,height});
   await t.evaluate(async phase=>{const g=a.game;g.player.hp=17;g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();},phase);
   const button=await paperEntry('rest');await t.screenshot({path:`output/playwright/rest-ui-colors/${width}-${phase}-bed.png`});await button.tap();
   await t.locator('#cottage-rest-dialog').waitFor({state:'visible'});await t.screenshot({path:`output/playwright/rest-ui-colors/${width}-${phase}-options.png`});
   await t.locator('#cottage-sleep-'+mode).tap();
   await t.evaluate(async()=>{const g=a.game;if(!g.cottage.sleep)throw Error('未启动休息');if(g.player.hp!==17)throw Error('提前回血');(await import('/src/core/home/cottage.js')).updateCottage(g,1.3,{x:0,y:0});a.refresh();});
   const result=await t.locator('#cottage-notice').innerText();const hp=await t.evaluate(()=>a.game.player.hp);
   if(result!==`HP 已恢复至满值（${hp}/${hp}）`||hp!==await t.evaluate(()=>a.game.maxHp()))throw Error(result);
   const fit=await t.locator('#cottage-notice').evaluate(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return e.dataset.result==='true'&&r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&s.color==='rgb(41, 67, 56)'&&s.backgroundColor==='rgb(255, 246, 220)';});
   if(!fit||await t.locator('#cottage-rest-dialog').isVisible())throw Error('睡醒提示不可读或重复弹窗');
   await t.screenshot({path:`output/playwright/rest-ui-colors/${width}-${phase}-recovered.png`});checks.push({mode,hp,result,fit});
  }
  // 保存失败必须保留损血值并显示失败提示，不能报告HP恢复成功。
  await t.evaluate(()=>{a.game.player.hp=19;window.persist=a.game.livingPersist;a.game.livingPersist=()=>false;});
  await (await paperEntry('rest')).tap();await t.locator('#cottage-sleep-phase').tap();
  await t.evaluate(async()=>{(await import('/src/core/home/cottage.js')).updateCottage(a.game,1.3,{x:0,y:0});a.refresh();});
  const failure=await t.locator('#cottage-notice').innerText();if(!failure.includes('没保存成功')||await t.evaluate(()=>a.game.player.hp)!==19)throw Error(failure);
  await t.screenshot({path:'output/playwright/rest-ui-colors/320-save-failed.png'});
  // 返回室外、再进入武器展厅，覆盖同一节点由建筑提示切换至其他弹出操作。
  await t.evaluate(async()=>{const g=a.game,c=await import('/src/core/home/cottage.js'),{COTTAGE}=await import('/src/config/cottage.js');g.livingPersist=window.persist;c.leaveCottage(g);Object.assign(g.player,{x:COTTAGE.door.x+60,y:COTTAGE.door.y+40});a.renderer.camera.time=null;a.refresh();});
  await paperEntry('cottage');await t.screenshot({path:'output/playwright/rest-ui-colors/320-cottage-entry.png'});
  await t.evaluate(async()=>{const g=a.game,rooms=await import('/src/config/workshop-interiors.js');Object.assign(g.player,rooms.WORKSHOP_INTERIORS.weapons.door);if(!(await import('/src/core/home/cottage.js')).enterWorkshop(g,'weapons'))throw Error('未进入展厅');const item=rooms.interiorWorkshopTargets(g)[0];Object.assign(g.player,{x:item.x,y:item.y+item.height/2+15});a.renderer.camera.time=null;a.refresh();});
  await paperEntry('display');await t.screenshot({path:'output/playwright/rest-ui-colors/320-display.png'});
  // 扫描已挂载弹窗的正文按钮与标题；大号＋仅要求图形级别的3:1对比度。
  const audit=await t.evaluate(()=>{
   // 按WCAG相对亮度检查文字与实际祖先底板的对比度。
   const lum=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
   const bad=[],dialogs=new Set();let count=0;
   for(const e of document.querySelectorAll('dialog button:not(:disabled),dialog .ui-panel__header :is(h2,small,p)')){
    if(!e.textContent.trim())continue;const fg=getComputedStyle(e).color.match(/[\d.]+/g).map(Number);let p=e,bg;
    while(p){bg=getComputedStyle(p).backgroundColor.match(/[\d.]+/g).map(Number);if(bg.length===3||bg[3]===1)break;p=p.parentElement;}
    if(!p)continue;const l=[lum(fg),lum(bg)].sort((a,b)=>b-a),ratio=(l[0]+.05)/(l[1]+.05);count++;dialogs.add(e.closest('dialog').id);
    if(ratio<(e.id==='ws-socket'?3:4.5))bad.push({id:e.id,text:e.textContent,ratio});
   }return {count,dialogs:[...dialogs],bad};
  });
  if(audit.bad.length||errors.length)throw Error(JSON.stringify({audit,errors}));return {checks,failure,audit,errors};
 }finally{await context.close();}
}
