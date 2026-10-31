// 手机、键盘、主炮与失败回退专项；任务夹具只选阶段，交易均由真实控件执行。
async page=>{
 if(new URL(page.url()).port!=='4253')throw Error('仅限隔离端口4253');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // 每个阶段重建应用，避免上个弹窗的暂停归属污染下一项检查。
 async function setup(id,width=390,height=844){
  await page.evaluate(()=>a.destroy());await page.reload();await page.setViewportSize({width,height});
  await page.evaluate(async id=>{window.a=(await import('/src/main.js')).application;await a.ready;const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS,MAINLINE_TASKS,MAINLINE_SITES}=await import('/src/config/mainline.js');const p=freshProgress();p.coins=p.wood=100000;p.materials={parts:10000,crystal:10000,core:10000};p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf(id));p.mainline.phase='doing';p.vehicleHulls[0]=1;(await import('/src/config/vehicle-armaments.js')).grantVehicleArmament(p,0);a.game.progress=p;a.game.reset();a.game.arrivalScene=null;a.game.mainlineTalkDelay=999;Object.assign(a.game.player,MAINLINE_SITES[MAINLINE_TASKS.find(t=>t.id===id).site]);a.refresh();},id);
  await page.locator('#start').click();await page.locator('#mainline-hud').click();
 }
 const cdp=await page.context().newCDPSession(page);
 // 用实际触屏事件验证引导层不会拦截拖放。
 async function touch(type,x,y){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]});}
 async function drag(selector,invalid=false){const b=await page.locator(selector).boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;await touch('touchStart',x,y);await touch('touchMove',x,y-12);const t=await page.locator('#ws-socket').boundingBox(),tx=invalid?20:t.x+t.width/2,ty=invalid?130:t.y+t.height/2;for(let i=1;i<=8;i++)await touch('touchMove',x+(tx-x)*i/8,y+(ty-y)*i/8);await touch('touchEnd');}
 async function stage(id){await page.waitForFunction(id=>document.getElementById('operation-guide').dataset.stage===id,id);}
 async function hold(){const b=await page.locator('#ws-hold').boundingBox();await touch('touchStart',b.x+b.width/2,b.y+b.height/2);await page.waitForTimeout(1750);await touch('touchEnd');}
 async function install(part){await drag(`[data-ws-upgrade="${part}"]`);await stage('tool');await drag('#ws-tool');await stage('hold');await hold();}
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 await setup('pistol-parts',320,568);await stage('part');
 await page.screenshot({path:'output/playwright/operation-guide/touch-320-part.png'});
 await drag('[data-ws-upgrade="capacity"]',true);
 if(await page.evaluate(()=>!!a.workshop.guideState().draft||a.game.progress.weaponParts[0].capacity!==1))throw Error('拖错安装点竟然推进');
 await install('capacity');await page.waitForFunction(()=>a.game.progress.weaponParts[0].capacity===2);await stage('part');
 if(!await page.locator('[data-ws-upgrade="reload"]').evaluate(n=>n.classList.contains('operation-source')))throw Error('未自动转到供弹机构');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'output/playwright/operation-guide/touch-390-reload.png'});
 await drag('[data-ws-upgrade="reload"]');await stage('tool');await drag('#ws-tool');await stage('hold');
 await page.screenshot({path:'output/playwright/operation-guide/touch-390-hold.png'});
 await page.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('专项保存失败');};});
 try{await hold();if(!await page.evaluate(()=>a.game.progress.weaponParts[0].reload===1&&a.workshop.guideState().draft?.part==='reload'))throw Error('保存失败却跳步');}finally{await page.evaluate(()=>{Storage.prototype.setItem=originalSetItem;});}
 await stage('tool');await drag('#ws-tool');await stage('hold');await hold();await page.waitForFunction(()=>a.game.progress.weaponParts[0].reload===2);await stage('trial');
 if(!await page.locator('#ws-test').evaluate(n=>n.classList.contains('operation-source')))throw Error('未自动指出试射');
 await page.locator('#ws-test').click();await page.waitForFunction(()=>a.workshop.guideState().trial);
 await page.waitForFunction(()=>document.getElementById('ws-trial-stop').classList.contains('operation-source'));
 await page.waitForFunction(()=>a.game.progress.mainline.seen.trial>0);await page.waitForTimeout(1300);if(!await page.locator('#ws-trial').isVisible())throw Error('命中后自动结束试射');await page.locator('#ws-trial-stop').click();await page.locator('#ws-close').click();await page.locator('#workshop-dialog').waitFor({state:'hidden'});
 await setup('vehicle-service');await stage('part');
 await install('armor');await page.waitForFunction(()=>a.game.progress.vehicleHulls[0]===2);await stage('part');
 await install('engine');await page.waitForFunction(()=>a.game.progress.vehicleParts[0].engine===2);await stage('turrets');
 await page.locator('#ws-back-body').click();await stage('native');await page.locator('.operation-source').click();await stage('turret-edit');
 await page.locator('#ws-turret-upgrade').click();await stage('part');
 await page.screenshot({path:'output/playwright/operation-guide/vehicle-native.png'});
 await install('damage');await page.waitForFunction(async()=>a.game.progress.vehicleWeapons[(await import('/src/config/vehicle-armaments.js')).nativeVehicleWeapon(0).weaponIndex]===2);
 if(!await page.evaluate(()=>a.game.progress.weapons[0]===1))throw Error('主炮升级误改手持武器');
 await page.locator('#workshop-dialog').waitFor({state:'hidden'});
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
 await setup('pistol-parts',1280,900);await stage('part');
 // 资源短缺不推进；补齐之后恢复当前部件。
 await page.evaluate(()=>{a.game.progress.coins=0;a.workshop.render();a.refresh();});await stage('resources');
 if(!await page.evaluate(()=>a.game.progress.weaponParts[0].capacity===1))throw Error('缺料也完成了');
 await page.evaluate(()=>{a.game.progress.coins=100000;a.workshop.render();a.refresh();});await stage('part');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.locator('[data-ws-upgrade="capacity"]').focus();await page.keyboard.press('Enter');await page.locator('#ws-socket').focus();await page.keyboard.press('Enter');await stage('tool');
 await page.locator('#ws-tool').focus();await page.keyboard.press('Enter');await stage('hold');await page.locator('#ws-hold').focus();await page.keyboard.down('Space');await page.waitForTimeout(1750);await page.keyboard.up('Space');
 await page.waitForFunction(()=>a.game.progress.weaponParts[0].capacity===2);await stage('part');
 await page.screenshot({path:'output/playwright/operation-guide/keyboard-next.png'});await page.emulateMedia({reducedMotion:'no-preference'});
 if(errors.length)throw Error(errors.join('\n'));return {touch:[320,390],invalidDrop:true,saveRetry:true,nativeCannon:true,insufficientResources:true,keyboard:true,errors};
}
