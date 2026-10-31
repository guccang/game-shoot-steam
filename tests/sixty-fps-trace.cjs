// 在正式运行窗口采集调用栈，定位强制布局的具体触发者。
async page=>{
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:500});await cdp.send('Profiler.start');
 await cdp.send('Tracing.start',{categories:'devtools.timeline,disabled-by-default-devtools.timeline.stack',transferMode:'ReturnAsStream'});
 await page.waitForTimeout(2500);
 const done=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));await cdp.send('Tracing.end');const {stream}=await done;
 let raw='';for(;;){const part=await cdp.send('IO.read',{handle:stream});raw+=part.data;if(part.eof)break;}await cdp.send('IO.close',{handle:stream});
 const {profile}=await cdp.send('Profiler.stop');await cdp.detach();
 const events=JSON.parse(raw).traceEvents,layout=events.filter(e=>['Layout','UpdateLayoutTree'].includes(e.name)&&e.dur);
 const nodes=new Map(profile.nodes.map(n=>[n.id,{...n,ms:0}]));profile.samples?.forEach((id,i)=>nodes.get(id).ms+=(profile.timeDeltas[i]||0)/1000);
 return {layout:layout.sort((a,b)=>b.dur-a.dur).slice(0,12).map(e=>({name:e.name,ms:e.dur/1000,args:e.args})),cpu:[...nodes.values()].sort((a,b)=>b.ms-a.ms).slice(0,25).map(n=>({ms:n.ms,...n.callFrame})),summary:await page.evaluate(()=>a.diagnostics.monitor.summary())};
}
