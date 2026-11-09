// 从正式武器工坊加购，验证购物车预告与付款结果使用同一交付顺序。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();page.setDefaultTimeout(15000);
 try{
  await page.goto(original.url());await page.locator('#start').tap();
  for(const place of ['猫猫背包','载具仓库','小屋仓库']){
   await page.evaluate(async place=>{
    const a=(await import('/src/main.js')).application;await a.ready;const g=a.game;
    const p=(await import('/src/progression/progress.js')).freshProgress();
    p.arrival={version:3,phase:'complete',keys:true};p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(r=>r.id);
    p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.coins=p.wood=100000;p.bosses=50;p.materials={parts:10000,crystal:10000,core:10000};
    p.weapons.fill(0);p.weapons[0]=1;p.weapon=0;p.vehicleHulls[0]=1;
    g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.spawnTimer=g.mainlineTalkDelay=99999;
    const {door}=(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS.weapons;
    Object.assign(g.player,door);if(!(await import('/src/core/home/cottage.js')).enterWorkshop(g,'weapons'))throw Error('无法进入武器工坊');
    g.progress.campParking.owned=[{...g.cottage.outside,mapId:g.mapId,hull:0,spot:null,hp:1,ammo:0,reload:0}];
    g.progress.logistics.bagWood=place==='猫猫背包'?0:100;
    g.progress.logistics.builds[0].wood=place==='小屋仓库'?99999:0;
    a.refresh();a.workshop.open('weapons',1);
   },place);
   await page.locator('#ws-purchase').tap();await page.locator('#workshop-dialog > .shop-dropzone').tap();
   const cart=page.locator('#shop-checkout');if(!(await cart.locator('.cart-line').innerText()).includes(place))throw Error('购物车交付地点错误：'+place);
   await cart.locator('[data-pay]').tap();await cart.waitFor({state:'hidden'});
   const actual=await page.evaluate(async()=>{
    const p=(await import('/src/main.js')).application.game.progress;
    if((await import('/src/progression/inventory/weapon-storage.js')).carriedWeapon(p,1))return '猫猫背包';
    if(p.shopStock?.[0]?.['weapon:1']===1)return '载具仓库';
    if(p.warehouse.weapons.includes(1))return '小屋仓库';
   });
   if(actual!==place)throw Error('付款后的武器位置错误：'+actual);
   await page.locator('#ws-close').tap();
  }
  return true;
 }finally{await context.close();}
}
