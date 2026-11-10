// 原生浏览器验证真实透明像素、逐帧软体、减少动态及缺图硬失败，不以生成预览代替正式绘制。
async(page)=>{
 const result=await page.evaluate(async()=>{
  const manifest=(await import('/assets/biome-dumplings/manifest.json',{with:{type:'json'}})).default;
  const {loadBiomeDumplingArt,biomeDumplingArtStats}=await import('/src/rendering/biome-dumpling-png.js');await loadBiomeDumplingArt();
  const {BIOME_DUMPLINGS}=await import('/src/config/biome-dumplings.js'),{drawSlime}=await import('/src/rendering/enemies.js');
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;const c=canvas.getContext('2d',{willReadFrequently:true});
  const alphas=[];
  for(const [id,e] of Object.entries(manifest.entries)){
   const image=new Image();image.src='/assets/biome-dumplings/'+e.file;await image.decode();c.clearRect(0,0,512,512);c.drawImage(image,0,0);const data=c.getImageData(0,0,512,512).data;let transparent=0,opaque=0;
   for(let i=3;i<data.length;i+=4){if(data[i]===0)transparent++;if(data[i]>=240)opaque++;}
   if(transparent<512*512*.4||opaque<1000)throw Error('真实alpha比例异常：'+id);
   for(let i=0;i<512;i++)if(data[(i*512+255)*4+3]||data[(255*512+i)*4+3])throw Error('分区边界有不透明底板：'+id);
   alphas.push({id,transparent,opaque});
  }
  const board=document.createElement('canvas');board.id='png-motion-review';board.width=1000;board.height=1500;board.style='position:fixed;inset:0;z-index:99999;width:1000px;height:1500px';document.body.append(board);const bc=board.getContext('2d');bc.fillStyle='#f3ecd0';bc.fillRect(0,0,1000,1500);bc.font='14px sans-serif';bc.fillStyle='#315c43';
  const hashes=[];
  // 比较同一正式绘制器在不同动作相位的像素，低动态模式应保持稳定。
  function signature(actor,reduced){c.clearRect(0,0,512,512);c.save();c.translate(180,150);drawSlime(c,actor,0,reduced);c.restore();let hash=2166136261;for(const v of c.getImageData(100,20,160,170).data)hash=Math.imul(hash^v,16777619);return hash>>>0;}
  for(const [index,p] of BIOME_DUMPLINGS.entries()){
   const e={type:'enemy',species:'slime',dumplingVariant:p.id,x:0,y:0,hp:100,maxHp:100,rank:0,phase:0,radius:16,aquatic:p.habitat==='lake',gelMove:1,assault:{phase:'chase',elapsed:0}},normal=[],reduced=[];
   for(let i=0;i<4;i++){e.gelStep=i*1.5;e.ecoClock=i*.4;normal.push(signature(e,false));reduced.push(signature(e,true));bc.save();bc.translate(150+i*235,index*100+73);drawSlime(bc,e,0,false);bc.restore();}bc.fillText(p.name,8,index*100+45);
   if(new Set(normal).size<4)throw Error('软体动作未变化：'+p.id);if(new Set(reduced).size!==1)throw Error('低动态仍在抖动：'+p.id);hashes.push({id:p.id,normal,reduced:reduced[0]});
  }
  return {designCriterion:'biome-dumplings-png',art:biomeDumplingArtStats(),alphas,hashes};
 });
 await page.locator('#png-motion-review').screenshot({path:'output/dumpling-png/dynamic-frames.png'});await page.evaluate(()=>document.getElementById('png-motion-review').remove());
 // 用新的页面故意阻断一张必需PNG，启动必须明确报错而不是回退旧程序团子。
 const missing=await page.context().newPage();await missing.route('**/assets/biome-dumplings/snowcap.png',route=>route.abort());await missing.goto(new URL('/',page.url()).href);
 await missing.locator('#title-startup-error').waitFor({state:'visible',timeout:30000});result.missingResourceError=await missing.locator('#title-startup-error').textContent();if(!result.missingResourceError)throw Error('缺图没有明确错误');await missing.close();return result;
}
