// 隔离实机检查营地分区、正式门牌、昼夜小屏和通路；镜头定位仅作为验收夹具。
async(page)=>{
 if(new URL(page.url()).port!=='4229')throw Error('仅允许隔离端口4229');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();});await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.campApp=(await import('/src/main.js')).application;await campApp.ready;const g=campApp.game;g.waveWarning=0;g.spawnTimer=999;g.encounterTimer=999;g.attackTimer=999;g.player.invincible=999;g.summonVehicle();});
 // 读取正式建筑位置，逐个走到门前检查，不为验收另造一套建筑。
 const points=await page.evaluate(async()=>{
  const {WORKSHOP}=await import('/src/world/workshop.js'),{REALM_ENTRANCES}=await import('/src/world/realm-entrances.js');
  return [{id:'center',x:930,y:820},{id:'workshop',...WORKSHOP},...REALM_ENTRANCES.map(e=>({id:e.mode,...e}))];
 });
 // 固定环境进行同机昼夜比较，角色、载具与一只正式怪物仍走原绘制和动作。
 async function scene(point,time){
  await page.evaluate(async({point,time})=>{const a=campApp,g=a.game;Object.assign(g.player,{x:point.x,y:point.y+75,pushX:0,pushY:0,invincible:999});g.enemies=[];g.attackTimer=999;
   const enemy=g.spawnEnemy(0,145);enemy.hp=enemy.maxHp=100000;g.waveWarning=0;g.spawnTimer=999;
   Object.assign(a.environment,{time,weather:'sun',season:'spring',autoTime:false,autoWeather:false});
   a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);a.renderer.camera.time=null;a.renderer.draw();a.refresh();
  },{point,time});await page.waitForTimeout(200);
 }
 for(const [width,height] of [[1280,900],[390,844],[320,568]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});await scene(points[0],time);
  const data=await page.evaluate(async()=>await (await import('/src/rendering/visual-review.js')).inspectCampLayout(campApp.game,document));
  if(data.overflow)throw Error('页面水平溢出');
  if(await page.evaluate(async()=>{const {worldLabelBlocked}=await import('/src/ui/world-label-space.js');return [...document.querySelectorAll('.world-workshop-entry,.world-realm-entry')].some(n=>!n.hidden&&n.getBoundingClientRect().width>0&&worldLabelBlocked(n,document));}))throw Error('世界门牌覆盖固定HUD');
  for(let i=0;i<data.labels.length;i++)for(const b of data.labels.slice(i+1)){const a=data.labels[i].box,r=b.box;if(a.left<r.right&&a.right>r.left&&a.top<r.bottom&&a.bottom>r.top)throw Error('世界门牌重叠');}
  samples.push({width,time,labels:data.labels});await page.screenshot({path:`output/playwright/camp-layout/center-${width}-${time}.png`});
 }
 await page.setViewportSize({width:390,height:844});
 for(const point of points.slice(1)){
  await scene(point,'day');await page.screenshot({path:`output/playwright/camp-layout/${point.id}-day.png`});
  // 真实键盘绕过门前左右两侧，验证镜头移动后按钮仍跟随原建筑。
  const before=await page.evaluate(()=>({x:campApp.game.player.x,y:campApp.game.player.y}));
  await page.keyboard.down('a');await page.waitForTimeout(450);await page.keyboard.up('a');
  await page.keyboard.down('d');await page.waitForTimeout(700);await page.keyboard.up('d');
  const after=await page.evaluate(()=>({x:campApp.game.player.x,y:campApp.game.player.y}));if(Math.hypot(before.x-after.x,before.y-after.y)<3)throw Error('门前无法移动 '+point.id);
  await scene(point,'night');if(await page.evaluate(async()=>{const {worldLabelBlocked}=await import('/src/ui/world-label-space.js');return [...document.querySelectorAll('.world-workshop-entry,.world-realm-entry')].some(n=>!n.hidden&&n.getBoundingClientRect().width>0&&worldLabelBlocked(n,document));}))throw Error('建筑门牌遮挡HUD '+point.id);await page.screenshot({path:`output/playwright/camp-layout/${point.id}-night.png`});
 }
 // 新工坊门牌打开正式工坊，关闭后通过回信驿进入故事目录。
 await scene(points.find(p=>p.id==='workshop'),'day');await page.locator('.world-workshop-entry').click();
 if(!await page.locator('#workshop-dialog').isVisible())throw Error('新工坊位置不能交互');await page.keyboard.press('Escape');
 await scene({x:970,y:715},'day');await page.locator('[data-story-post="sunleaf-post"]').click();
 if(!await page.locator('#story-dialog').isVisible())throw Error('回信驿不能交互');await page.keyboard.press('Escape');
 // 三座入口使用正式可点击门牌，检查模式后用原离开方法复原巡游现场。
 for(const point of points.filter(p=>p.mode)){
  await scene(point,'day');await page.locator(`[data-world-realm="${point.mode}"]`).click();
  if(!await page.evaluate(mode=>campApp.game.realm?.mode===mode,point.mode))throw Error('秘境入口模式错误 '+point.mode);
  await page.evaluate(()=>{const a=campApp;a.game.leaveRealm();document.querySelectorAll('dialog[open]').forEach(d=>d.close());a.game.start();a.refresh();});
 }
 if(errors.length)throw Error(errors.join('\n'));return {passed:true,designCriterion:'camp-building-layout',samples,errors};
}
