// 牛羊连续帧共享原片裁切、尺寸和脚底；运行时只选帧，不拉伸四肢。
import manifest from '../../assets/pasture/manifest.json' with {type:'json'};
const sheets=new Map(),clocks=new WeakMap();
export async function loadLivestockArt(){
 await Promise.all(Object.entries(manifest).map(async ([animal,s])=>{
  const img=new Image();img.src='/assets/pasture/'+s.file;
  try{await img.decode();}catch(cause){throw Error('牛羊动作图集加载失败：'+s.file,{cause});}
  if(s.facing!=='front')throw Error('动物图集必须使用正面帧：'+animal);
  const count=Math.max(...s.idle,...s.walk)+1;
  if(img.naturalWidth!==s.columns*s.cell[0]||img.naturalHeight<Math.ceil(count/s.columns)*s.cell[1])throw Error('牛羊图集尺寸有误：'+s.file);
  sheets.set(animal,img);
 }));
}
// 所有世界方向都使用同一正面动画，方向参数只属于世界轨迹和独立农具。
export function drawLivestock(c,animal,x,y,moving,time){
 const s=manifest[animal],img=sheets.get(animal);
 if(!img)throw Error('牛羊动作图集未就绪：'+animal);
 const mode=moving?'walk':'idle',sequence=s[mode];
 let actors=clocks.get(c);if(!actors){actors=new Map();clocks.set(c,actors);}
 let clock=actors.get(animal);
 if(!clock||clock.mode!==mode||time<clock.start){
  const first=clock?s.transitions[mode][clock.frame]:0;
  clock={mode,start:time,first,frame:sequence[first]};actors.set(animal,clock);
 }
 const frame=clock.frame=sequence[(clock.first+Math.floor((time-clock.start)*s.fps))%sequence.length];
 const [w,h]=s.cell,[ax,ay]=s.anchor,scale=animal==='ox'?.92:.57;
 c.drawImage(img,frame%s.columns*w,Math.floor(frame/s.columns)*h,w,h,x-ax*scale,y-ay*scale,w*scale,h*scale);
}
