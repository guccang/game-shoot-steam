// 在本地浏览器离线生成两套风格地图；运行时仍只加载720×560成品底图。
async page=>{
 if(!['localhost','127.0.0.1'].includes(new URL(page.url()).hostname))throw Error('仅允许本地美术导出');
 return page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();await document.fonts.ready;
  const {switchArtStyle}=await import('/src/art-styles/controller.js');
  const {WORLD,ORIGINAL_WORLD}=await import('/src/world/coordinates.js');
  const {paintGround}=await import('/src/rendering/ground-art.js'),{drawSceneryMap}=await import('/src/rendering/scenery.js'),{drawNaturalMap}=await import('/src/rendering/natural-terrain.js'),{paintJiuzhaigou,drawJiuzhaigouWater}=await import('/src/rendering/jiuzhaigou.js');
  const results=[];
  for(const style of ['classic','clear']){
   await switchArtStyle(style);
   for(const name of ['forest-spring','forest-summer','forest-autumn','forest-winter','jiuzhaigou-summer']){
    const canvas=document.createElement('canvas');canvas.width=720;canvas.height=560;const c=canvas.getContext('2d'),[mapId,season]=name.split('-'),winter=season==='winter',extent=mapId==='jiuzhaigou'?ORIGINAL_WORLD:WORLD;
    c.save();c.scale(720/extent.width,560/extent.height);
    if(mapId==='jiuzhaigou'){paintJiuzhaigou(c);drawJiuzhaigouWater(c,{x:0,y:0,w:WORLD.width,h:WORLD.height},0,0,true);}
    else{paintGround(c,null,winter,season);drawSceneryMap(c,winter);drawNaturalMap(c,winter);}
    c.restore();results.push({style,name,png:canvas.toDataURL().split(',')[1]});canvas.width=canvas.height=1;
   }
  }
  return results;
 });
}
