// 工坊原页续升与点选改装专项：真实触摸提交、暂停、门槛与手机布局。
async page=>{
 const origin=new URL(page.url()).origin; // 默认由 4175 启动，允许独立工作树测试端口。
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),t=await context.newPage(),errors=[],samples=[];
 t.setDefaultTimeout(10000);t.on('pageerror',e=>errors.push(e.message));await t.goto(origin);await t.locator('#start').tap();
 await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.weapons.fill(1);p.weapons[3]=0;p.weapon=0;p.mastery.fill(100);p.coins=p.wood=100000;p.bosses=999;p.vehicleHulls.fill(1);for(const k of Object.keys(p.materials))p.materials[k]=999;a.game.progress=p;a.game.reset();a.menu.enter();a.game.start();a.game.update=()=>{};a.game.arrivalScene=null;a.game.mainlineSpeech=null;a.game.enemies=[];a.refresh();a.workshop.open('weapons',3);});

 const cdp=await context.newCDPSession(t);
 // 使用真实手指按住底栏按钮，释放与完成互相独立。
 async function down(){await t.waitForFunction(()=>!document.getElementById('ws-hold').disabled);const b=await t.locator('#ws-hold').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});}
 async function up(){await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 // 报价从生产逻辑获取，验证提交恰好扣除所展示的费用。
 async function wallet(){return t.evaluate(()=>({coins:a.game.progress.coins,wood:a.game.progress.wood}));}
 async function quote(){return t.evaluate(async()=>{const plan=a.workshop.guideState().draft;return (await import('/src/progression/workshop.js')).quoteWorkshop(a.game.progress,plan).rows;});}
 async function paid(old,rows){const now=await wallet();for(const key of ['coins','wood'])if(old[key]-now[key]!== (rows.find(r=>r.key===key)?.need||0))throw Error('扣费不匹配 '+key);}
 // 检查手机单屏操作区及实际正式绘制器输出。
 async function check(label,shot=false){await t.waitForTimeout(80);const s=await t.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectWorkshopFocus(document));const size=t.viewportSize(),bad=s.controls.filter(c=>c.box.width<43.9||c.box.height<43.9||c.box.x<0||c.box.y<0||c.box.right>size.width+1||c.box.bottom>size.height+1);if(s.overflow.length||bad.length||s.territory)throw Error(label+JSON.stringify({overflow:s.overflow,bad,territory:s.territory}));samples.push(label);if(shot)await t.screenshot({path:'output/playwright/workshop-hold/'+label+'.png'});}
 await t.evaluate(()=>a.workshop.open('weapons',0));await t.locator('[data-ws-upgrade="damage"]').tap();
 const old=await wallet(),rows=await quote();await down();await t.waitForTimeout(350);await up();const pause=await t.locator('#ws-work-progress').textContent();await t.waitForTimeout(200);if(!pause.includes('暂停')||pause!==await t.locator('#ws-work-progress').textContent())throw Error('暂停不稳定');
 await down();await t.waitForFunction(()=>a.game.progress.weapons[0]===2);await t.waitForTimeout(1700);await up();await paid(old,rows);
 if(await t.evaluate(()=>a.game.progress.weapons[0])!==2)throw Error('同一次按住重复升级');
 if(await t.locator('#ws-result').isVisible()||!await t.locator('#ws-part-compare').isVisible())throw Error('完成后跳到结果页');
 if(await t.evaluate(()=>a.workshop.guideState().draft.original)!==2)throw Error('下一次报价未刷新');
 await check('weapon-completed',true);const second=await wallet(),secondRows=await quote();await down();await t.waitForFunction(()=>a.game.progress.weapons[0]===3);await up();await paid(second,secondRows);
 // 达到满级后保持原页，禁止虚构更高等级或扣费。
 await t.evaluate(async()=>{a.game.progress.weapons[0]=(await import('/src/config/equipment-parts.js')).equipmentParts('weapons',0).find(p=>p.key==='damage').max-1;a.workshop.open('weapons',0);});await t.locator('[data-ws-upgrade="damage"]').tap();await down();await t.waitForFunction(()=>document.getElementById('ws-feedback').textContent.includes('满级'));await up();if(!await t.locator('#ws-hold').isDisabled()||await t.locator('#ws-result').isVisible())throw Error('满级退出操作页');await check('maximum');
 // 改装点选即试装，单击确认不付款；长按完成后已安装方案禁用。
 await t.locator('#ws-function-modify').tap();const modOld=await wallet();await t.locator('[data-ws-part="1"]').tap();if(await t.evaluate(()=>a.workshop.guideState().draft.action)!=='modify')throw Error('改装仍需拖拽');await t.locator('#ws-hold').tap();await paid(modOld,[]);await check('modify-preview',true);
 await t.locator('#ws-change-part').tap();await t.locator('[data-ws-part="2"]').tap();const modRows=await quote();await down();await t.waitForFunction(()=>a.game.progress.mods[0]===2);await up();await paid(modOld,modRows);if(!await t.locator('#ws-hold').isDisabled())throw Error('已装方案仍可收费');await check('modify-installed',true);
 await t.locator('#ws-reset').tap();await down();await t.waitForFunction(()=>a.game.progress.mods[0]===0);await up();
 // 熟练度和资源门槛仍允许预览，但不能施工。
 await t.evaluate(()=>{a.game.progress.mastery[0]=0;a.workshop.open('weapons',0);});await t.locator('#ws-function-modify').tap();await t.locator('[data-ws-part="1"]').tap();if(!await t.locator('#ws-hold').isDisabled())throw Error('熟练度门槛失效');await check('mastery-gate');
 await t.evaluate(()=>{a.game.progress.mastery[0]=100;a.game.progress.coins=0;a.workshop.open('weapons',0);});await t.locator('#ws-function-modify').tap();await t.locator('[data-ws-part="1"]').tap();if(!await t.locator('#ws-hold').isDisabled())throw Error('缺钱仍可改装');await check('shortage');
 // 车体、主炮与挂载同样原页长按；挂载选择不改变出战载具。
 await t.evaluate(()=>{a.game.progress.coins=100000;a.workshop.open('vehicle',0);});await t.locator('[data-ws-upgrade="armor"]').tap();await down();await t.waitForFunction(()=>a.game.progress.vehicleHulls[0]===2);await up();if(await t.evaluate(()=>a.workshop.guideState().draft.original)!==2)throw Error('车体未续升');await check('vehicle-completed',true);
 await t.locator('#ws-change-part').tap();await t.locator('#ws-kits-tab').tap();const turret=await t.evaluate(()=>a.workshop.guideState().turret),level=await t.evaluate(i=>a.game.progress.vehicleWeapons[i],turret);await t.locator('[data-ws-upgrade="damage"]').tap();await down();await t.waitForFunction(({turret,level})=>a.game.progress.vehicleWeapons[turret]===level+1,{turret,level});await up();if(await t.evaluate(()=>a.workshop.guideState().draft.kind)!=='turret')throw Error('主炮未留页');
 await t.locator('#ws-function-modify').tap();const mountChoice=await t.locator('[data-ws-part]').evaluateAll(nodes=>Number(nodes.find(n=>Number(n.dataset.wsPart)!==a.game.progress.vehicleLoadouts[0]).dataset.wsPart));await t.locator('[data-ws-part="'+mountChoice+'"]').tap();const mountOld=await wallet(),mountRows=await quote();await down();await t.waitForFunction(choice=>a.game.progress.vehicleLoadouts[0]===choice,mountChoice);await up();await paid(mountOld,mountRows);await check('vehicle-mounted',true);
 // 关闭中止未提交方案；减少动态下键盘长按沿用同一流程。
 await t.locator('#ws-change-part').tap();const cancelChoice=await t.locator('[data-ws-part]').evaluateAll(nodes=>Number(nodes.find(n=>Number(n.dataset.wsPart)!==a.game.progress.vehicleLoadouts[0]).dataset.wsPart));await t.locator('[data-ws-part="'+cancelChoice+'"]').tap();const cancelOld=await wallet();await down();await t.waitForTimeout(250);await up();await t.locator('#ws-close').tap();await paid(cancelOld,[]);
 await t.emulateMedia({reducedMotion:'reduce'});await t.evaluate(()=>a.workshop.open('weapons',1));await t.locator('[data-ws-upgrade="damage"]').tap();await t.locator('#ws-hold').focus();await t.keyboard.down('Space');await t.waitForFunction(()=>a.game.progress.weapons[1]===2);await t.keyboard.up('Space');if(await t.locator('#ws-result').isVisible())throw Error('键盘升级跳页');
 // 昼夜同屏覆盖窄屏、常用手机及既有桌面竖版容器。
 for(const [width,height] of [[320,568],[390,844],[430,932],[1280,900]])for(const time of ['day','night']){
  await t.locator('#ws-close').tap();await t.setViewportSize({width,height});await t.evaluate(async time=>{Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,autoSeason:false,forestSeason:'summer'});a.renderer.seasons.reset('summer',performance.now());a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.game.selectVehicle(0);a.game.summonVehicle();a.game.spawnEnemy(0,125);a.renderer.resize();a.refresh();a.renderer.draw();a.workshop.open('weapons',1);},time);
  await t.locator('[data-ws-upgrade="damage"]').tap();await check('upgrade-'+width+'-'+time,true);await t.locator('#ws-function-modify').tap();await t.locator('[data-ws-part="1"]').tap();await check('modify-'+width+'-'+time,true);
 }
 if(errors.length)throw Error(errors.join('\n'));await cdp.detach();await context.close();return {samples,errors};
}
