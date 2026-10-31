// 离线底图与修改前的正式总览绘制顺序逐像素对照，防止用替代图片通过缓存验收。
async page => {
  return await page.evaluate(async()=>{
    (await import('/src/main.js')).application.destroy();window.a?.destroy();await document.fonts.ready;
    const {WORLD,ORIGINAL_WORLD}=await import('/src/world/coordinates.js');
    const {paintGround}=await import('/src/rendering/ground-art.js');
    const {drawSceneryMap}=await import('/src/rendering/scenery.js');
    const {drawNaturalMap}=await import('/src/rendering/natural-terrain.js');
    const {paintJiuzhaigou,drawJiuzhaigouWater}=await import('/src/rendering/jiuzhaigou.js');
    const results=[];
    for(const name of ['forest-spring','forest-summer','forest-autumn','forest-winter','jiuzhaigou-summer']){
      const [mapId,season]=name.split('-'),winter=season==='winter',extent=mapId==='forest'?WORLD:ORIGINAL_WORLD;
      const canvas=document.createElement('canvas');canvas.width=720;canvas.height=560;const c=canvas.getContext('2d');
      c.save();c.scale(720/extent.width,560/extent.height);
      if(mapId==='forest'){paintGround(c,null,winter,season);drawSceneryMap(c,winter);drawNaturalMap(c,winter);}
      else{paintJiuzhaigou(c);drawJiuzhaigouWater(c,{x:0,y:0,w:WORLD.width,h:WORLD.height},0,0,true);}
      c.restore();const expected=c.getImageData(0,0,720,560).data;
      const response=await fetch('/assets/map-preview/'+name+'.png');if(!response.ok)throw Error('底图缺失：'+name);
      const image=await createImageBitmap(await response.blob());c.clearRect(0,0,720,560);c.drawImage(image,0,0);image.close();
      const actual=c.getImageData(0,0,720,560).data;let different=0,maxDelta=0;
      for(let i=0;i<actual.length;i++){const delta=Math.abs(actual[i]-expected[i]);if(delta)different++;maxDelta=Math.max(maxDelta,delta);}
      results.push({name,different,maxDelta});canvas.width=canvas.height=1;
      if(different)throw Error('底图像素不一致：'+JSON.stringify(results));
    }
    return {designCriterion:'map-preview-cache',results};
  });
}
