// 连续武器展厅实机验收：实际行走覆盖全目录，正式点击、触屏拖动、镜头与多端昼夜截图。
async page=>{
 if(new URL(page.url()).port!=='4286')throw Error('仅限隔离端口4286');
 const errors=[],visited=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true,parked:false};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.locator('#start').click();await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;g.enemies=[];g.vehicle.active=false;g.spawnTimer=g.fireClock=999;Object.assign(g.player,(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS.weapons.door,{vx:0,vy:0});});
 await page.waitForFunction(()=>a.game.cottage?.kind==='weapons',null,{timeout:6500});
 if(await page.locator('[data-room-page]').count())throw Error('仍有翻页按钮');
 if(await page.locator('[data-room-index="16"]').isVisible())throw Error('深处展品未裁切');
 const racks=await page.evaluate(async()=>(await import('/src/config/workshop-interiors.js')).interiorWeaponDisplays());
 const initial=await page.evaluate(()=>a.renderer.cottageView.top);
 // 每排都从中央走道实际走近，再用原 UI 打开每一件武器，关闭后位置不变。
 for(let row=0;row<Math.ceil(racks.length/2);row++){
  const pair=racks.slice(row*2,row*2+2),target=pair[0].y+45;await page.evaluate(row=>window.galleryStage='行走到第 '+row+' 排',row);
  await page.keyboard.down('ArrowUp');await page.waitForFunction(y=>a.game.player.y<=y,target,{timeout:5000});await page.keyboard.up('ArrowUp');
  for(const rack of pair){
   await page.evaluate(index=>window.galleryStage='点击武器 '+index,rack.index);const before=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));
   await page.locator(`[data-room-index="${rack.index}"]`).click();await page.locator('#workshop-dialog').waitFor({state:'visible'});
   if(Number(await page.locator('#workshop-dialog').getAttribute('data-guide-index'))!==rack.index)throw Error('点击展柜选错武器 '+rack.index);
   visited.push(await page.locator('#ws-name').innerText());await page.locator('#ws-close').click();
   await page.waitForFunction(()=>a.game.state==='playing'&&!document.querySelector('dialog[open]'));await page.waitForTimeout(60);
   if(!await page.evaluate(p=>a.game.cottage?.kind==='weapons'&&a.game.player.x===p.x&&a.game.player.y===p.y,before))throw Error('关闭工坊改变房间位置');
  }
 }
 if(!await page.evaluate(top=>a.renderer.cottageView.top<top-700,initial))throw Error('镜头未随向上行走');
 // 中轴向下返回真正门口，由原三秒出口逻辑退出。
 const exitY=await page.evaluate(async()=>(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS.weapons.exit.y-12);
 await page.evaluate(()=>window.galleryStage='返回出口');await page.keyboard.down('ArrowDown');await page.waitForFunction(y=>a.game.player.y>=y,exitY,{timeout:20000});await page.keyboard.up('ArrowDown');
 await page.evaluate(()=>window.galleryStage='等待出门徽记');await page.waitForFunction(()=>a.renderer.actionCountdownView?.icon==='exit');
 await page.screenshot({path:'output/playwright/walkable-weapon-gallery/exit-countdown.png'});await page.waitForFunction(()=>!a.game.cottage,null,{timeout:6000});
 await page.evaluate(async()=>{Object.assign(a.game.player,(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS.weapons.door);if(!(await import('/src/core/home/cottage.js')).enterWorkshop(a.game,'weapons'))throw Error('再次进入失败');});
 // 真正触屏拖动穿过可见柜区域，不能把行走误当作打开装备。
 await page.evaluate(()=>window.galleryStage='触屏拖动');const cdp=await page.context().newCDPSession(page),box=await page.locator('[data-room-index="0"]').boundingBox(),beforeTouch=await page.evaluate(()=>a.game.player.y);
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2-65}]});await page.waitForTimeout(650);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 if(await page.locator('#workshop-dialog').isVisible()||!await page.evaluate(y=>a.game.player.y<y-10,beforeTouch))throw Error('从展柜起手拖动未正常行走');
 const target=await page.locator('[data-room-index="1"]').boundingBox();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:target.x+target.width/2,y:target.y+target.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.locator('#workshop-dialog').waitFor({state:'visible'});
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();await page.locator('#ws-close').click();
 // 画面采样只冻结更新，仍由正式房间绘制器、相机、猫连续帧及装备画像输出。
 await page.evaluate(()=>window.galleryStage='画面采样');await page.evaluate(()=>{window.galleryTick=a.game.update.bind(a.game);a.game.update=()=>{};});
 for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const phase of ['day','night'])for(const location of ['entrance','middle','back']){
  await page.setViewportSize({width,height});await page.evaluate(async({phase,location})=>{
   const layout=(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS.weapons;
   Object.assign(a.game.player,{x:200,y:location==='entrance'?layout.spawn.y:location==='middle'?760:100,vx:0,vy:0});a.game.cottage.exitElapsed=0;
   a.game.progress.living.calendar.elapsed=phase==='night'?260000:75000;a.environment.time=phase==='day'?'night':'day';
  },{phase,location});await page.waitForFunction(phase=>a.environment.time===phase,phase);await page.waitForTimeout(90);
  const sample=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectWalkableWeaponGallery(a.game,document,a.renderer));
  if(sample.pages||sample.overflow||sample.portraitBytes>12*192*144*4)throw Error('分页、溢出或缓存预算异常');
  const canvas=await page.locator('#game').boundingBox();
  for(const item of sample.visible)if(item.rect.top<canvas.y+sample.view.clip.y-1||item.rect.bottom>canvas.y+sample.view.clip.y+sample.view.clip.height+1)throw Error('展柜热点越过场景视窗');
  await page.screenshot({path:`output/playwright/walkable-weapon-gallery/${location}-${width}-${phase}.png`});samples.push({width,phase,location,...sample});
 }
 await page.evaluate(()=>{a.game.update=window.galleryTick;});
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'walkable-weapon-gallery',visited,samples,errors};
}
