// 四季地表与周期镜像接缝核对，确认九寨沟不被森林物候覆盖。
async (page) => {
  const results=[];
  for(const season of ['spring','summer','autumn','winter'])results.push(await page.evaluate(async season=>{
    const {GroundCache}=await import('/src/rendering/ground-cache.js');
    const {paintGround}=await import('/src/rendering/ground-art.js');
    const view={x:1536,y:1152,w:768,h:384};
    const canvases=[0,1,2].map(()=>{const c=document.createElement('canvas');c.width=768;c.height=384;return c;});
    for(const [i,canvas] of canvases.entries()) {
      const c=canvas.getContext('2d',{willReadFrequently:true});c.translate(-view.x-(i===2?3600:0),-view.y);
      if(i===0)paintGround(c,view,season==='winter',season);else {const cache=new GroundCache();cache.setSeason(season);cache.draw(c,{...view,x:view.x+(i===2?3600:0)},0);}
    }
    const data=canvases.map(c=>c.getContext('2d').getImageData(0,0,768,384).data);let severe=0,mirror=0;
    for(let y=10;y<374;y++)for(let x=381;x<=387;x++)for(let k=0;k<3;k++) {
      const n=(y*768+x)*4+k;if(Math.abs(data[0][n]-data[1][n])>18)severe++;if(data[1][n]!==data[2][n])mirror++;
    }
    if(severe>20||mirror)throw Error(`雪地接缝异常 ${severe}/${mirror}`);
    const valley=new GroundCache('jiuzhaigou'),c=canvases[0].getContext('2d');c.resetTransform();
    valley.setSeason('winter');valley.draw(c,{x:0,y:0,w:768,h:384},0);const first=canvases[0].toDataURL(),builds=valley.builds;
    valley.setSeason(season);valley.draw(c,{x:0,y:0,w:768,h:384},0);
    if(canvases[0].toDataURL()!==first||valley.builds!==builds||valley.winter)throw Error('森林季节污染九寨沟');
    return {season,seamSevere:severe,mirrorDifference:mirror,valleyUnaffected:true};
  },season));
  return {designCriterion:'winter-ground-contact',surfaces:results};
}
