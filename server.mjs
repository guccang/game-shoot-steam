// 本地静态服务：无需安装依赖即可运行森林巡游。
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {readBuildInfo} from './src/platform/server-build-info.mjs';
const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 4173);
const mime = { '.ttf': 'font/ttf', '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.wav': 'audio/wav', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm', '.gif': 'image/gif' };
// 支持媒体单段、开放末尾和后缀读取；无效或多段范围忽略，合法但越界返回false。
function byteRange(header,size){
  const match=/^bytes=(\d*)-(\d*)$/i.exec(header?.trim()||'');
  if(!match||!match[1]&&!match[2])return null;
  const first=match[1]?Number(match[1]):null,last=match[2]?Number(match[2]):null;
  if(first!==null&&last!==null&&last<first)return null;
  if(!size||first!==null&&first>=size||first===null&&last===0)return false;
  return first===null?{start:Math.max(0,size-last),end:size-1}:{start:first,end:Math.min(last??size-1,size-1)};
}
// 仅提供项目内的静态资源，并返回明确的错误状态。
const server=http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    // 指纹不缓存，刷新页面能核对新部署；浏览器不需要访问 .git。
    if(pathname==='/build-info.json'){
      const info=await readBuildInfo(root);
      res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
      res.end(JSON.stringify(info));return;
    }
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) { res.writeHead(403).end(); return; }
    const content = await readFile(file);
    const type=mime[extname(file)]||'application/octet-stream',size=content.length;
    const headers={'Content-Type':type+(/^(text\/|application\/json$|image\/svg\+xml$)/.test(type)?'; charset=utf-8':''),
      'Cache-Control':'no-cache','Accept-Ranges':'bytes','Content-Length':size};
    // HEAD返回完整资源元数据；未发布校验标记时If-Range按不匹配处理，避免拼接不同版本。
    const range=req.method==='GET'&&!req.headers['if-range']?byteRange(req.headers.range,size):null;
    if(range===false){res.writeHead(416,{...headers,'Content-Range':`bytes */${size}`,'Content-Length':0});res.end();return;}
    if(range){
      res.writeHead(206,{...headers,'Content-Range':`bytes ${range.start}-${range.end}/${size}`,'Content-Length':range.end-range.start+1});
      res.end(content.subarray(range.start,range.end+1));return;
    }
    res.writeHead(200,headers);
    res.end(req.method==='HEAD'?undefined:content);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(port, '0.0.0.0', () => console.log(`森林巡游已启动：http://localhost:${server.address().port}`));
