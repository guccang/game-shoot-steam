// 固定正式工作台时间，记录冬季六组昼夜像素摘要，保证本轮不改变已确认的雪景。
async (page) => {
 return await page.evaluate(async()=>{
  const {renderVisualCase}=await import('/src/rendering/visual-review.js');
  const result=[];
  for(let i=0;i<6;i++)for(const night of [false,true]) {
   const canvas=document.createElement('canvas');canvas.width=600;canvas.height=500;
   await renderVisualCase(canvas.getContext('2d'),`landscape-group-${i}-winter${night?'-night':''}`,1);
   const data=canvas.getContext('2d').getImageData(0,0,600,500).data;
   const hash=await crypto.subtle.digest('SHA-256',data);
   result.push(Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join(''));
  }
  return result;
 });
}
