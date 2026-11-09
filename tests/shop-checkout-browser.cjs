// 手机实际进店、拖动、取消、确认，核对三种交付位置与单次扣款。
async page=>{
 await page.goto('http://localhost:4175');await page.locator('#start').tap();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;
  const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();
  p.arrival={version:3,phase:'complete',keys:true};p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(s=>s.id);
  p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.coins=4000;p.vehicleIndex=0;p.vehicleHulls[0]=1;p.farm.unlocked[1]=true;
  g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.spawnTimer=g.mainlineTalkDelay=99999;
  window.visitShop=async kind=>{
   g.cottage=null;g.mainlineSpeech=null;
   const room=(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS[kind];
   Object.assign(g.player,room.door);
   if(!(await import('/src/core/home/cottage.js')).enterWorkshop(g,kind))throw Error('进店失败 '+kind);
   Object.assign(g.player,{x:150,y:260});g.progress.campParking.owned=[{...g.cottage.outside,mapId:g.mapId,hull:0,spot:null,hp:1,ammo:0,reload:0}];a.refresh();
  };
  await visitShop('seed');
 });
 const confirm=page.locator('#shop-checkout'),pay=confirm.locator('[data-pay]'),touch=await page.context().newCDPSession(page);
 // 用连续触点将商品拖入下方结账区，点击与松手都不能直接扣款。
 async function drag(button,drop=true){
  await button.scrollIntoViewIfNeeded();const box=await button.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
  const zone=await page.locator('dialog[open] > .shop-dropzone:visible').boundingBox(),tx=zone.x+zone.width/2,ty=drop?zone.y+zone.height/2:zone.y-5;
  if(ty<=y)throw Error('结账区应在商品下方');
  for(const [type,t] of [['touchStart',0],['touchMove',.3],['touchMove',.7],['touchMove',1]]){
   await touch.send('Input.dispatchTouchEvent',{type,touchPoints:[{x:x+(tx-x)*t,y:y+(ty-y)*t}]});
  }
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});if(drop)await page.locator('dialog[open] > .shop-dropzone:visible').tap();
 }
 // 从柜台进入种子或户外商品页，避免直接调用交易回调。
 async function counter(){await page.locator('[data-room-item=shopkeeper]').tap();await page.locator('[data-npc-service]').tap();}
 await counter();await page.locator('[data-seed-shop-category="vegetable"]').tap();const seed=page.locator('[data-buy-seed="1"]');
 await seed.tap();if(await confirm.isVisible())throw Error('加购不应立即付款');await page.locator('dialog[open] > .shop-dropzone:visible').tap();await confirm.locator('[data-remove-line]').tap();await confirm.locator('[data-cancel]').tap();
 await drag(seed,false);if(await confirm.isVisible())throw Error('结账区外松手发起了购买');
 await drag(seed);await confirm.locator('[data-remove-line]').tap();await confirm.locator('[data-cancel]').tap();
 if(await page.evaluate(()=>a.game.progress.coins)!==4000)throw Error('取消扣款');
 for(const [place,mode] of [['猫猫背包 10 粒',0],['猫猫背包 2 粒',1],['载具仓库 10 粒',2],['小屋仓库 10 粒',3]]){
  await page.evaluate(async mode=>{
   const p=a.game.progress;
   if(mode===1){
    const {catLoad}=await import('/src/progression/inventory/load-weight.js'),load=catLoad(a.game);
    const {itemDefinition}=await import('/src/config/items.js');
    p.farm.seeds[0]+=Math.round((load.capacity-load.weight)/itemDefinition('seed:0').mass)-3;
   }
   if(mode>=2)p.logistics.bagWood=999;
   if(mode===3)p.logistics.builds[0].wood=99999;
   a.refresh();
  },mode);
  const before=await page.evaluate(()=>a.game.progress.coins);await drag(seed);
  if(mode===0){
   const labels=await confirm.locator('.cart-quantities button').allTextContents();if(labels.join(',')!=='10 粒,30 粒,100 粒')throw Error('种子快捷数量不符 '+labels);
   for(const quantity of [10,30,100]){await confirm.locator('[data-order-amount="'+quantity+'"]').tap();const total=Number((await confirm.locator('[data-price]').innerText()).match(/\d+/)[0]);if(total!==40*quantity)throw Error('数量与总价不同步 '+quantity);}
  }
  await confirm.locator('[data-order-amount="10"]').tap();
  const price=Number((await confirm.locator('[data-price]').innerText()).match(/\d+/)[0]);
  if(!(await confirm.innerText()).includes(place)||await page.evaluate(()=>a.game.progress.coins)!==before)throw Error('报价错误 '+place);
  if(mode===1&&!(await confirm.innerText()).includes('载具仓库 8 粒'))throw Error('清单没有显示余下八粒的去向');
  await pay.tap();await confirm.waitFor({state:'hidden'});
  if(await page.evaluate(()=>a.game.progress.coins)!==before-price)throw Error('扣款错误 '+place);
  if(mode===1&&!await page.evaluate(()=>a.game.progress.farm.seeds[1]===12&&a.game.progress.shopStock[0]['seed:1']===8))throw Error('拆分交付与清单不一致');
 }
 await page.locator('#seed-shop-close').tap();await page.waitForFunction(()=>a.game.state==='playing');
 await page.evaluate(()=>visitShop('outdoor'));await counter();await page.locator('#outdoor-dialog[open]').waitFor();
 if(!await page.locator('[data-outdoor-buy=tent]').isVisible())await page.getByText('采购钓具与露营装备',{exact:true}).tap();
 // 点按鱼竿、拖入帐篷，同一购物车逐行显示并统一确认。
 const rod=page.locator('[data-outdoor-buy=rod]');
 await rod.tap();const wallet=await page.evaluate(()=>a.game.progress.coins);
 await drag(page.locator('[data-outdoor-buy=tent]'));
 if(await confirm.locator('.cart-line').count()!==2||await page.evaluate(()=>a.game.progress.coins)!==wallet)throw Error('混合加购未形成两行待付清单');
 const total=Number((await confirm.locator('[data-price]').innerText()).match(/\d+/)[0]);
 if(total!==260)throw Error('多件合计不正确');
 await page.screenshot({path:'output/playwright/shop-cart/multiple.png'});
 // 写入失败后所有未交付商品仍可重新付款，短屏底栏可见。
 await page.setViewportSize({width:320,height:568});
 await page.evaluate(()=>{window.cartPersist=a.game.livingPersist;a.game.livingPersist=()=>false;});
 await pay.tap();
 if(await confirm.locator('.cart-line').count()!==2||await page.evaluate(()=>a.game.progress.coins)!==wallet)throw Error('保存失败仍扣款或丢清单');
 await page.evaluate(()=>{a.game.livingPersist=window.cartPersist;});
 const sample=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectShopCart(document));
 if(!sample.iconVisible||sample.productIcons!==2||sample.rows!==2||!sample.payVisible)throw Error('短屏清单或购物车触控区异常');
 await page.screenshot({path:'output/playwright/shop-cart/short.png'});
 if(!(await confirm.locator('[data-cart-lines]').innerText()).includes('小屋仓库'))throw Error('露营套装报价去向错误');
 await pay.tap();await page.waitForFunction(()=>a.game.progress.shopStock.home?.['outdoor:tent']===1&&a.game.progress.shopStock.home?.['outdoor:rod']===1);if(await page.evaluate(()=>a.game.progress.coins)!==wallet-total)throw Error('多件付款不匹配');
 await page.locator('#outdoor-close').tap();await page.waitForFunction(()=>a.game.state==='playing');
 await page.evaluate(()=>visitShop('furniture'));await counter();
 const pot=page.locator('#home-products [data-buy=pot]'),owned=await page.evaluate(()=>a.game.progress.homeDecor.items.length);
 await drag(pot);if(!(await confirm.innerText()).includes('小屋家具收纳'))throw Error('家具去向不符');
 await pay.tap();await page.waitForFunction(previous=>a.game.progress.homeDecor.items.length===previous+1,owned);
 await touch.detach();return true;
}
