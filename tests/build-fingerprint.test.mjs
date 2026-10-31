// Git 指纹覆盖本地仓库、无 Git 发布包、失败状态及卸载后的异步隔离。
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readBuildInfo} from '../src/platform/server-build-info.mjs';
import {createBuildFingerprint} from '../src/ui/panels/build-fingerprint.js';
const run=promisify(execFile);
// 临时仓库只写入测试创建的目录，清理前核对绝对父路径。
async function repository(t){
 const dir=await mkdtemp(join(tmpdir(),'forest-fingerprint-'));
 t.after(async()=>{assert.equal(dirname(resolve(dir)),resolve(tmpdir()));await rm(dir,{recursive:true,force:true});});
 await run('git',['init','--quiet'],{cwd:dir});
 await writeFile(join(dir,'demo.txt'),'版本验证');await run('git',['add','demo.txt'],{cwd:dir});
 await run('git',['-c','user.name=测试','-c','user.email=test@example.invalid','commit','--quiet','-m','测试提交'],{cwd:dir});return dir;
}
// 只模拟两个文本节点，保留真实异步加载器及其清理行为。
function nodes(){
 const code={textContent:'加载中',setAttribute(name,value){this[name]=value;}},status={textContent:''};
 return {code,status,root:{getElementById:id=>id==='settings-git-fingerprint'?code:status}};
}

test('本项目 HEAD 与未提交修改状态真实一致，不被环境变量覆盖',async t=>{
 const dir=await repository(t),expected=(await run('git',['rev-parse','HEAD'],{cwd:dir})).stdout.trim();
 assert.deepEqual(await readBuildInfo(dir,{GAME_GIT_COMMIT:'abcdef0'}),{commit:expected,short:expected.slice(0,7),modified:false,source:'git'});
 await writeFile(join(dir,'demo.txt'),'尚未提交');assert.equal((await readBuildInfo(dir,{})).modified,true);
});

test('发布包支持显式 SHA 与当前发布目录，不误读父仓库或伪造未知版本',async t=>{
 const dir=await repository(t),child=join(dir,'package');
 assert.equal((await readBuildInfo(child,{})).source,'unknown');
 const hash='A'.repeat(40);assert.equal((await readBuildInfo(child,{GAME_GIT_COMMIT:hash})).commit,hash.toLowerCase());
 const release=join(dir,'releases','930e848-ltPUtN');assert.deepEqual(await readBuildInfo(release,{}),{commit:'930e848',short:'930e848',modified:null,source:'deployment'});
 assert.equal((await readBuildInfo(child,{GAME_GIT_COMMIT:'<script>bad</script>'})).commit,null);
});

test('界面显示短号、完整无障碍值与改动状态，请求禁用缓存',async()=>{
 const n=nodes();let request;
 const panel=createBuildFingerprint(n.root,async(url,options)=>{request={url,options};return {ok:true,json:async()=>({commit:'abcdef0123456789',modified:true})};});
 await panel.ready;assert.equal(n.code.textContent,'abcdef0');assert.equal(n.code.title,'abcdef0123456789');assert.match(n.code['aria-label'],/abcdef0123456789/);assert.equal(n.status.textContent,'未提交修改');
 assert.equal(request.url,'/build-info.json');assert.equal(request.options.cache,'no-store');panel.dispose();assert.equal(request.options.signal.aborted,true);
});

test('未知、非法响应和请求失败明确显示状态，不注入任意文本',async()=>{
 for(const info of [{commit:null},{commit:'<img onerror=bad>'}]){const n=nodes(),p=createBuildFingerprint(n.root,async()=>({ok:true,json:async()=>info}));await p.ready;assert.equal(n.code.textContent,'未提供');assert.equal(n.status.textContent,'');p.dispose();}
 const n=nodes(),p=createBuildFingerprint(n.root,async()=>({ok:false}));await p.ready;assert.equal(n.code.textContent,'读取失败');p.dispose();
});

test('卸载后迟到响应不得覆盖新设置页面',async()=>{
 const n=nodes();let complete;
 const p=createBuildFingerprint(n.root,()=>new Promise(resolve=>{complete=resolve;}));p.dispose();n.code.textContent='新页面';
 complete({ok:true,json:async()=>({commit:'abcdef0'})});await p.ready;assert.equal(n.code.textContent,'新页面');
});
