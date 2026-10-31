// 保存浏览器真实绘制的地图图集，尺寸/变体不完整时拒绝发布。
import fs from 'node:fs';import crypto from 'node:crypto';import path from 'node:path';
import {MAP_PREVIEW_VERSION} from '../src/rendering/map-preview-cache.js';
const log=fs.readFileSync(process.argv[2]||'output/playwright/art-style-switch/maps.txt','utf8');
const payload=log.split('### Result')[1]?.split('### Ran Playwright code')[0];if(!payload)throw Error('没有地图导出结果');
const images=JSON.parse(payload.trim()),names=['forest-spring','forest-summer','forest-autumn','forest-winter','jiuzhaigou-summer'];
if(images.length!==10)throw Error('两套地图必须完整');
for(const style of ['classic','clear']){
 const dir='assets/art-styles/'+style+'/map-preview/';fs.mkdirSync(dir,{recursive:true});const files=[];
 const sources={};
 // 记录风格入口和递归共享依赖的指纹，防止改绘制源码后继续使用过期地图。
 function collect(file){file=path.posix.normalize(file);if(sources[file])return;const source=fs.readFileSync(file,'utf8');sources[file]=crypto.createHash('sha256').update(source.replaceAll('\r\n','\n')).digest('hex');for(const m of source.matchAll(/(?:from\s*|import\s*\(?\s*)['"](\.[^'"]+)['"]/g))collect(path.posix.join(path.posix.dirname(file),m[1]));}
 for(const entry of ['ground-art','scenery','natural-terrain','jiuzhaigou'])collect('src/rendering/'+entry+'.js');
 for(const name of names){const entries=images.filter(i=>i.style===style&&i.name===name);if(entries.length!==1)throw Error('地图变体不完整');const data=Buffer.from(entries[0].png,'base64');if(data.readUInt32BE(16)!==720||data.readUInt32BE(20)!==560)throw Error('地图尺寸错误');fs.writeFileSync(dir+name+'.png',data);files.push({file:name+'.png',bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')});}
 fs.writeFileSync(dir+'manifest.json',JSON.stringify({style,version:MAP_PREVIEW_VERSION,width:720,height:560,description:'正式风格绘制器离线生成；玩家、任务和标识保持动态。',sources,files},null,2)+'\n');
}
console.log('两套风格共10张地图已保存');
