// 服务端版本元数据只返回提交指纹，不向浏览器暴露磁盘目录、分支或 Git 内容。
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {access} from 'node:fs/promises';
import {basename,dirname,join} from 'node:path';
const execute=promisify(execFile);
// 只接受有界十六进制指纹，拒绝环境变量中的路径或任意文案。
const validCommit=value=>typeof value==='string'&&/^[a-f0-9]{7,64}$/i.test(value);

// 本地工作树优先读取自己的 Git；无 Git 发布包兼容显式指纹及现有 releases/<短号>-<批次> 目录。
export async function readBuildInfo(root,environment=process.env){
  try{
    // 必须有本项目的 .git，不能误取部署目录父级的其他仓库。
    await access(join(root,'.git'));
    const options={cwd:root,windowsHide:true,timeout:3000,maxBuffer:1024*1024};
    const {stdout}=await execute('git',['rev-parse','HEAD'],options);
    const commit=stdout.trim();if(!validCommit(commit))throw Error('无效提交指纹');
    let modified=null;
    try{modified=!!(await execute('git',['status','--porcelain','--untracked-files=normal'],options)).stdout.trim();}catch{}
    return {commit:commit.toLowerCase(),short:commit.slice(0,7).toLowerCase(),modified,source:'git'};
  }catch{
    const explicit=environment.GAME_GIT_COMMIT?.trim();
    const release=basename(dirname(root))==='releases'?basename(root).match(/^([a-f0-9]{7,64})(?:-|$)/i)?.[1]:null;
    const commit=validCommit(explicit)?explicit:release;
    return commit?{commit:commit.toLowerCase(),short:commit.slice(0,7).toLowerCase(),modified:null,source:'deployment'}:
      {commit:null,short:null,modified:null,source:'unknown'};
  }
}
