// 材质复核直接调用正式装备、地形和动作绘制器；浏览器靶场继续运行原战斗更新。
async page=>{
 const root='C:/Users/zhengtingjun/.codex/worktrees/art-style-options/game-shoot/output/playwright/clear-world-style/';
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true});
 const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 try{
  await p.goto('http://localhost:4176/?artPreview=idle-cat-pine&artRevision=3');
  await p.waitForFunction(()=>document.querySelector('#vehicle-button')?.getAttribute('aria-pressed')==='true',null,{timeout:60000});
  const result=await p.evaluate(async()=>{
   const {renderVisualCase}=await import('/src/rendering/visual-review.js'),{freshProgress}=await import('/src/progression/progress.js');
   const {drawWorkshopEquipment,drawWorkshopTrial}=await import('/src/rendering/workshop.js'),{createWorkshopTrial}=await import('/src/core/workshop-trial.js');
   const {COLLECTED_VEHICLES}=await import('/src/config/vehicles.js'),{WEAPONS}=await import('/src/config/weapons.js'),{grantVehicleArmament}=await import('/src/config/vehicle-armaments.js');
   const progress=freshProgress();progress.vehicleHulls.fill(1);progress.weapons.fill(1);COLLECTED_VEHICLES.forEach((_,i)=>grantVehicleArmament(progress,i));
   window.reviewSheets={};const trials=[],motions=[];
   // 每格独立画布，防止前一资产的变换或裁切污染下一资产。
   function tile(w,h){const e=document.createElement('canvas');e.width=w;e.height=h;return e;}
   // 对照表使用独立大画布，不改变游戏的手机布局。
   function sheet(name,count,w=260,h=190){const e=tile(w*3,Math.ceil(count/3)*h);const c=e.getContext('2d');c.fillStyle='#fff3ce';c.fillRect(0,0,e.width,e.height);reviewSheets[name]=e;return {e,c,w,h};}
   // 等比放入留出中文说明的位置，避免工作台固定坐标被小画布裁掉。
   function put(s,e,i,label){const x=i%3*s.w,y=Math.floor(i/3)*s.h;s.c.drawImage(e,x,y,s.w,s.h-28);s.c.fillStyle='#59402e';s.c.font='14px sans-serif';s.c.fillText(label,x+8,y+s.h-9);}
   for(const [kind,items]of [['vehicle',COLLECTED_VEHICLES],['weapons',WEAPONS]]){
    const s=sheet(kind,items.length);
    for(let i=0;i<items.length;i++){
     const e=tile(260,162);drawWorkshopEquipment(e.getContext('2d'),progress,kind,i,.4,false);put(s,e,i,items[i].name||items[i].shortName);
     const session=createWorkshopTrial(progress,kind,i),t=tile(560,270),frames=[];
     for(let f=0;f<3;f++){for(let step=0;step<15;step++)session.advance(1/30);drawWorkshopTrial(t.getContext('2d'),session);frames.push(t.toDataURL());}
     if(new Set(frames).size<2)throw Error('装备试射未推进：'+kind+i);
     trials.push({kind,index:i,elapsed:session.elapsed,distinctFrames:new Set(frames).size});
    }
   }
   const landscapes=sheet('landscapes',12,390,286);
   for(let i=0;i<6;i++)for(let n=0;n<2;n++){const e=tile(390,260);await renderVisualCase(e.getContext('2d'),'landscape-group-'+i+(n?'-night':''),.5);put(landscapes,e,i*2+n,'景观'+(i+1)+(n?' 夜晚':' 白天'));}
   const ids=['vehicle-wheels','vehicle-tracks','vehicle-rotor','dumpling-jelly-motion','monster-fly','monster-hit-type-slime','monster-death','jiuzhaigou-lake-day','jiuzhaigou-lake-night','jiuzhaigou-falls-day','jiuzhaigou-falls-night'];
   const s=sheet('motion',ids.length*3,260,198);
   for(let i=0;i<ids.length;i++){
    const frames=[];
    for(let f=0;f<3;f++){const e=tile(640,420);await renderVisualCase(e.getContext('2d'),ids[i],[.05,.32,.67][f]);frames.push(e.toDataURL());put(s,e,i*3+f,['四轮','履带','旋翼','团子步态','飞行','受击','死亡','九寨湖昼','九寨湖夜','瀑布昼','瀑布夜'][i]+' · '+(f+1));}
    if(new Set(frames).size<2)throw Error('连续动作未变化：'+ids[i]);motions.push({id:ids[i],distinctFrames:new Set(frames).size});
   }
   const image=new Image();image.src='/assets/cozy-cottage/cottage.png';await image.decode();const raster=tile(image.width,image.height),rc=raster.getContext('2d');rc.drawImage(image,0,0);const alpha=rc.getImageData(0,0,1,1).data[3];
   if(image.width!==360||image.height!==328||alpha!==0)throw Error('小屋尺寸或透明背景改变');
   return {trials,motions,cottage:{width:image.width,height:image.height,cornerAlpha:alpha}};
  });
  for(const name of ['vehicle','weapons','landscapes','motion']){
   // 只放大证据画布的视口，保证截图完整；真实手机场景另由实机脚本验收。
   await p.setViewportSize(await p.evaluate(name=>({width:reviewSheets[name].width,height:reviewSheets[name].height}),name));
   await p.evaluate(name=>{document.querySelector('#clear-world-review')?.remove();const wrap=document.createElement('div');wrap.id='clear-world-review';wrap.style='position:fixed;inset:0;z-index:99999;overflow:auto;background:#fff3ce';wrap.append(reviewSheets[name]);document.body.append(wrap);},name);
   await p.locator('#clear-world-review canvas').screenshot({path:root+name+'-sheet.png'});
  }
  if(errors.length)throw Error(errors.join('\n'));return {passed:true,designCriterion:'clear-world-style',...result,errors};
 }finally{await context.close();}
}
