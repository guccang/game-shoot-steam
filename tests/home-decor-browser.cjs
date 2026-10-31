// 隔离手机浏览器通过正式入口完成装扮闭环；默认4175，已有服务占用时允许工作树4176或4177。
async original=>{
 const browser=original.context().browser(),context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/home-decor/video',size:{width:390,height:844}}});
 const page=await context.newPage(),errors=[],results=[];
 page.on('pageerror',e=>errors.push(e.message));
 // 断言同时记录阶段，失败时明确给出操作原因。
 function check(ok,message){if(!ok)throw Error(message);}
 // 使用正式已修复小屋入口，仅测试夹具给足金币和已完成主线。
 async function enter(){await page.locator('#start').click();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;g.state='playing';g.mainlineSpeech=null;g.mainlineTalkDelay=99999;g.vehicle.active=false;Object.assign(g.player,(await import('/src/config/cottage.js')).COTTAGE.door);if(!(await import('/src/core/cottage.js')).enterCottage(g))throw Error('正式入室失败');a.refresh();});await page.locator('#home-decor-open').waitFor({state:'visible'});}
 // 通过真实触摸坐标选择家具落点，不直接修改布局状态。
 async function place(x,y){const box=await page.locator('#home-preview').boundingBox();await page.locator('#home-preview').tap({position:{x:x/360*box.width,y:y/360*box.height}});}
 // 家具购买迁到新店，布置仍在家中；往返使用正式门口与出口计时。
 async function visit(kind){
  if(await page.locator('#home-decor-dialog').evaluate(d=>d.open)){await page.locator('#home-close').tap();await page.waitForFunction(()=>a.game.state==='playing');}
  await page.evaluate(async()=>{const g=a.game;if(g.cottage)Object.assign(g.player,(await import('/src/config/workshop-interiors.js')).interiorLayout(g.cottage).exit,{vx:0,vy:0});});await page.waitForFunction(()=>!a.game.cottage);
  await page.evaluate(async kind=>{Object.assign(a.game.player,(await import('/src/config/workshop-interiors.js')).interiorLayout({kind}).door,{vx:0,vy:0});a.game.cottageDoorLatch=false;a.game.mainlineSpeech=null;},kind);await page.waitForFunction(kind=>a.game.cottage?.kind===kind,kind);
  await page.locator(kind==='furniture'?'[data-room-item=shopkeeper]':'#home-decor-open').tap();
 }
 try{
  await page.goto(original.url());check(['4175','4176','4177'].includes(new URL(page.url()).port),'必须使用本地隔离服务');
  await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.coins=10000;p.arrival={version:3,phase:'complete',keys:true,parked:false};p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS;p.restoration.repaired=['cottage'];localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
  await page.reload();await enter();await page.locator('#home-decor-open').tap();
  check(await page.evaluate(()=>a.game.state==='paused'),'打开商店没有暂停');
  await visit('furniture');check(await page.locator('[data-buy]').count()===15,'目录不是15款');
  await page.screenshot({path:'output/playwright/home-decor/shop-390.png'});
  await page.locator('[data-buy="pot"]').tap();check(await page.evaluate(()=>a.game.progress.coins===9920),'购买未正确扣款');
  await visit('cottage');const uid=await page.evaluate(()=>a.game.progress.homeDecor.items.find(i=>i.type==='pot').uid);await page.locator(`[data-select="${uid}"]`).tap();
  await place(120,228);await page.locator('#home-confirm').tap();
  await page.locator('[data-sow="mint"]').tap();check(await page.evaluate(()=>a.game.progress.coins===9910),'播种未正确扣款');
  await page.locator('[data-move]').tap();await place(62,140);check(await page.locator('#home-confirm').isDisabled(),'床位没有拒绝摆放');await page.locator('#home-cancel').tap();
  check(await page.evaluate(uid=>a.game.progress.homeDecor.items.find(i=>i.uid===uid).x===120,uid),'取消移动改变了存档');
  await page.locator('[data-move]').tap();await place(120,252);await page.locator('#home-confirm').tap();
  await page.locator('[data-store]').tap();check(await page.evaluate(uid=>a.game.progress.homeDecor.items.find(i=>i.uid===uid).x===null,uid),'收纳失败');
  await page.locator('[data-move]').tap();await place(120,228);await page.locator('#home-confirm').tap();
  // 注入保存失败只替换持久化返回值，交易和反馈仍走正式按钮。
  await page.evaluate(()=>{window.savedPersist=a.game.livingPersist;a.game.livingPersist=()=>false;});await visit('furniture');await page.locator('[data-buy="radio"]').tap();
  check((await page.locator('#home-message').innerText()).includes('没有保存成功'),'保存失败没有中文反馈');check(await page.evaluate(()=>a.game.progress.coins===9910),'保存失败扣了款');await page.evaluate(()=>a.game.livingPersist=window.savedPersist);await visit('cottage');
  await page.locator('#home-close').tap();await page.waitForFunction(()=>a.game.state==='playing');
  await page.evaluate(()=>{Object.assign(a.game.player,{x:119,y:158});a.refresh();});await page.locator('#nearby-interaction[data-interaction="rest"]').tap();await page.locator('#cottage-sleep-morning').tap();
  await page.waitForFunction(()=>!a.game.cottage.sleep&&a.game.progress.living.calendar.day===1);
  await page.locator('#home-decor-open').tap();await page.locator(`[data-select="${uid}"]`).tap();check(await page.locator('[data-harvest]').isEnabled(),'睡眠后没有成熟');
  await page.locator('[data-harvest]').scrollIntoViewIfNeeded();await page.screenshot({path:'output/playwright/home-decor/mature-390.png'});await page.locator('[data-harvest]').tap();check(await page.evaluate(()=>a.game.progress.coins===9928),'采收金额错误');
  await page.locator('[data-sow="daisy"]').tap();await page.locator('#home-close').tap();await page.reload();await enter();
  check(await page.evaluate(uid=>{const i=a.game.progress.homeDecor.items.find(i=>i.uid===uid);return i.x===120&&i.y===228&&i.plant.id==='daisy';},uid),'刷新后布局或植物丢失');
  await page.locator('#home-decor-open').tap();
  // 腾出免费家具以组合本轮十五款；所有购买、移动依然点击正式界面。
  for(const id of [1,2,3,4]){await page.locator(`[data-select="${id}"]`).tap();await page.locator('[data-store]').tap();}
  const positions={painting:[144,46],television:[228,144],radio:[300,180],plush:[60,276],curtain:[81,46],sofa:[276,264],table:[216,216],bookcase:[300,120],lamp:[312,228],rug:[180,240],clock:[204,46],basket:[108,288],stool:[156,108],vase:[216,288]};
  await visit('furniture');for(const type of Object.keys(positions))await page.locator(`[data-buy="${type}"]`).tap();await visit('cottage');
  for(const [type,point] of Object.entries(positions)){const itemId=await page.evaluate(type=>a.game.progress.homeDecor.items.find(i=>i.type===type).uid,type);await page.locator(`[data-select="${itemId}"]`).tap();await place(...point);check(await page.locator('#home-confirm').isEnabled(),'示例布局无效：'+type+' '+await page.locator('#home-message').innerText());await page.locator('#home-confirm').tap();}
  await page.locator('#home-close').tap();await page.waitForFunction(()=>a.game.state==='playing');
  // 真实脚底输入绕行和起停，录制保留连续猫帧及家具前后遮挡。
  await page.evaluate(()=>{Object.assign(a.game.player,{x:180,y:288});});
  for(const key of ['ArrowUp','ArrowLeft','ArrowDown','ArrowRight']){await page.keyboard.down(key);await page.waitForTimeout(650);await page.keyboard.up(key);await page.waitForTimeout(120);}
  for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[844,390],[1280,900]]){
   await page.setViewportSize({width,height});
   for(const time of ['day','night']){
    await page.evaluate(async time=>{const phases=(await import('/src/config/living-world.js')).LIVING_PHASES;a.game.progress.living.calendar.elapsed=phases.find(p=>p.id===time).start;a.renderer.draw();a.refresh();},time);
    await page.screenshot({path:`output/playwright/home-decor/room-${width}-${time}.png`});
    await page.locator('#home-decor-open').tap();
    const row=await page.evaluate(async()=>{const r=(await import('/src/rendering/visual-review.js')).inspectHomeDecor(a.renderer,document),d=document.getElementById('home-decor-dialog').getBoundingClientRect();return {...r,dialogBounds:{x:d.x,y:d.y,right:d.right,bottom:d.bottom},touch:[...document.querySelectorAll('#home-decor-dialog button')].filter(b=>b.getBoundingClientRect().height>0).every(b=>b.getBoundingClientRect().height>=44)};});
    check(!row.overflow&&row.touch,'手机溢出或触控不足 '+JSON.stringify({width,time,row}));check(row.dialogBounds.x>=0&&row.dialogBounds.y>=0&&row.dialogBounds.right<=width&&row.dialogBounds.bottom<=height,'弹窗越界');
    await page.screenshot({path:`output/playwright/home-decor/inventory-${width}-${time}.png`});await page.screenshot({path:`output/playwright/home-decor/editor-${width}-${time}.png`});
    await page.locator('#home-close').tap();await page.waitForFunction(()=>a.game.state==='playing');results.push({width,height,time,...row});
   }
  }
  check(errors.length===0,'页面错误 '+JSON.stringify(errors));return {results,errors,flow:'购买、无效落点、取消、移动、收纳、播种、睡眠、采收、失败回滚与刷新通过'};
 }finally{await context.close();}
}
