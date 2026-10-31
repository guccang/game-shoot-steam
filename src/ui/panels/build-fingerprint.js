// 设置标题内的只读 Git 指纹，一次加载，不阻塞游戏初始化或读取玩家存档。
export function createBuildFingerprint(root,fetcher=globalThis.fetch){
  const code=root.getElementById('settings-git-fingerprint'),status=root.getElementById('settings-git-state');
  code.textContent='加载中';code.title='';code.setAttribute('aria-label','Git 指纹加载中');status.textContent='';
  const controller=new AbortController();let disposed=false;
  const timeout=setTimeout(()=>controller.abort(),5000);
  // 只展示经过校验的十六进制提交号，不把服务器错误或任意 HTML 放到设置中。
  async function load(){
    try{
      const response=await fetcher('/build-info.json',{cache:'no-store',signal:controller.signal});
      if(!response.ok)throw Error('版本读取失败');
      const info=await response.json();if(disposed)return;
      const valid=typeof info.commit==='string'&&/^[a-f0-9]{7,64}$/i.test(info.commit);
      code.textContent=valid?info.commit.slice(0,7).toLowerCase():'未提供';
      code.title=valid?info.commit.toLowerCase():'发布包未提供 Git 指纹';
      code.setAttribute('aria-label',valid?`Git 指纹 ${info.commit.toLowerCase()}`:'Git 指纹未提供');
      status.textContent=valid&&info.modified===true?'未提交修改':'';
    }catch{
      if(!disposed){code.textContent='读取失败';code.title='暂时无法读取版本信息';code.setAttribute('aria-label','Git 指纹读取失败');}
    }finally{clearTimeout(timeout);}
  }
  const ready=load();
  // 卸载后取消请求与计时，旧回调不会覆盖重新创建的设置页面。
  function dispose(){disposed=true;clearTimeout(timeout);controller.abort();}
  return {ready,dispose};
}
