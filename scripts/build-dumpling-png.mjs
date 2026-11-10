// 将imagegen透明四分区部件图规范化为512图集；只裁切空边和缩小，不重绘生成内容。
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {BIOME_DUMPLINGS} from '../src/config/biome-dumplings.js';
const require=createRequire(import.meta.url),sharp=require(process.env.SHARP_MODULE||'sharp');
const root=new URL('../assets/biome-dumplings/',import.meta.url),files=await readdir(new URL('source/',root)),entries={};
for(const profile of BIOME_DUMPLINGS){
 if(!files.includes(profile.id+'.png'))throw Error('缺少imagegen源图：'+profile.id);
 const source=await readFile(new URL('source/'+profile.id+'.png',root)),meta=await sharp(source).metadata();
 if(!meta.hasAlpha)throw Error('生成图没有透明通道：'+profile.id);
 const overlays=[],parts={};
 for(const [index,name] of ['body','crown','left','right'].entries()){
  const region={left:(index%2)*Math.floor(meta.width/2),top:Math.floor(index/2)*Math.floor(meta.height/2),width:Math.floor(meta.width/2),height:Math.floor(meta.height/2)};
  const {data,info}=await sharp(source).extract(region).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let x0=info.width,y0=info.height,x1=-1,y1=-1,visible=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>16){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);visible++;}
  if(visible<20){if(name==='body'||name==='crown'&&profile.id!=='vine')throw Error('必需部件为空：'+profile.id+'/'+name);parts[name]=null;continue;}
  if(x0<4||y0<4||x1>info.width-5||y1>info.height-5)throw Error('部件越过分区安全边缘：'+profile.id+'/'+name);
  const cut={left:region.left+x0-2,top:region.top+y0-2,width:x1-x0+5,height:y1-y0+5};
  const resized=await sharp(source).extract(cut).resize({width:236,height:236,fit:'inside'}).png().toBuffer(),out=await sharp(resized).metadata();
  const left=(index%2)*256+Math.floor((256-out.width)/2),top=Math.floor(index/2)*256+Math.floor((256-out.height)/2);
  overlays.push({input:resized,left,top});parts[name]=[left,top,out.width,out.height];
 }
 const buffer=await sharp({create:{width:512,height:512,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(overlays).png({compressionLevel:9}).toBuffer();
 await writeFile(new URL(profile.id+'.png',root),buffer);
 entries[profile.id]={file:profile.id+'.png',size:[512,512],parts,bytes:buffer.length,sourceSha256:createHash('sha256').update(source).digest('hex')};
}
await writeFile(new URL('manifest.json',root),JSON.stringify({version:1,description:'十五种地貌团子透明PNG独立部件，脚底及动作由正式运行时驱动',entries},null,2)+'\n');
console.log(JSON.stringify({count:Object.keys(entries).length,bytes:Object.values(entries).reduce((sum,e)=>sum+e.bytes,0),decodedBytes:Object.keys(entries).length*512*512*4}));

