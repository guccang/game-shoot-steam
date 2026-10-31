// 从正式绘制器采样固定相位像素指纹，迁移前后使用相同浏览器与尺寸。
async page=>{
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true});const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 try{
  await p.goto(new URL('/?artPreview=idle-cat-pine',page.url()).href);await p.waitForFunction(()=>document.querySelector('#vehicle-button')?.getAttribute('aria-pressed')==='true',null,{timeout:60000});
  const result=await p.evaluate(async()=>{
   const {application}=await import('/src/main.js');application.destroy();
   const {switchArtStyle}=await import('/src/art-styles/controller.js'),{artStyle}=await import('/src/art-styles/state.js');
   const {renderVisualCase}=await import('/src/rendering/visual-review.js'),{drawWorkshopEquipment}=await import('/src/rendering/workshop.js'),{freshProgress}=await import('/src/progression/progress.js');
   const {COLLECTED_VEHICLES}=await import('/src/config/vehicles.js'),{WEAPONS}=await import('/src/config/weapons.js'),{grantVehicleArmament}=await import('/src/config/vehicle-armaments.js');
   const {paintGround}=await import('/src/rendering/ground-art.js'),{drawScenery,drawSceneryMap}=await import('/src/rendering/scenery.js'),{SCENERY}=await import('/src/world/scenery.js'),{WORLD}=await import('/src/world/coordinates.js');
   const {drawRealmEntrance}=await import('/src/rendering/realm-entrances.js'),{REALM_ENTRANCES}=await import('/src/world/realm-entrances.js');
   const details=[...new Map(SCENERY.map(item=>[item.kind+':'+(item.workshop||'')+':'+((item.row||0)%3),item])).values()];
   const progress=freshProgress();progress.vehicleHulls.fill(1);progress.weapons.fill(1);COLLECTED_VEHICLES.forEach((_,i)=>grantVehicleArmament(progress,i));
   const cases=['vehicle-wheels','vehicle-tracks','vehicle-rotor','dumpling-jelly-motion','monster-fly','monster-hit-type-slime','monster-death','jiuzhaigou-lake-day','jiuzhaigou-lake-night','jiuzhaigou-falls-day','jiuzhaigou-falls-night',...Array.from({length:6},(_,i)=>['landscape-group-'+i,'landscape-group-'+i+'-night']).flat(),'landscape-group-0-spring','landscape-group-0-autumn','landscape-group-0-winter'];
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=420;const c=canvas.getContext('2d'),samples=[];
   // 直接读取像素，不包含时间戳、截图UI或压缩器元数据。
   async function fingerprint(id,phase){const data=c.getImageData(0,0,640,420).data;const hash=await crypto.subtle.digest('SHA-256',data);samples.push({style:artStyle(),id,phase,hash:[...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('')});}
   for(const style of ['classic','clear']){
    await switchArtStyle(style);
    for(const id of cases)for(const phase of [.15,.65]){c.reset();await renderVisualCase(c,id,phase);await fingerprint(id,phase);}
    for(const [kind,items]of [['vehicle',COLLECTED_VEHICLES],['weapons',WEAPONS]])for(let i=0;i<items.length;i++){c.reset();drawWorkshopEquipment(c,progress,kind,i,.4,false);await fingerprint(kind+'-'+i,.4);}
    // 地面全图覆盖水纹和草笔画，局部大图覆盖麦穗、建筑和夜间图集。
    for(const season of ['spring','summer','autumn','winter']){c.reset();c.scale(640/WORLD.width,420/WORLD.height);paintGround(c,null,season==='winter',season);drawSceneryMap(c,season==='winter');await fingerprint('ground-'+season,0);}
    for(let i=0;i<details.length;i++)for(const night of [0,1]){c.reset();drawScenery(c,{...details[i],x:320,y:310},night,null,false);await fingerprint('scenery-'+i,night);}
    for(let i=0;i<REALM_ENTRANCES.length;i++){c.reset();drawRealmEntrance(c,{...REALM_ENTRANCES[i],x:320,y:310},.4,null,.7,false);await fingerprint('realm-'+i,.4);}
   }
   return samples;
  });
  if(errors.length)throw Error(errors.join('\n'));return {passed:true,samples:result,errors};
 }finally{await context.close();}
}
