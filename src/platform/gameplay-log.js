// 有界操作日志：独立于游戏存档和性能开关，只保存脱敏后的诊断副本。
export const GAMEPLAY_LOG_VERSION=1;
export const GAMEPLAY_LOG_LIMITS={entries:1500,chars:500000,eventChars:12000};

// 日志中的地址去掉参数、片段和凭据，防止异常堆栈带入访问令牌。
function safeText(value){return value.slice(0,2000).replace(/https?:\/\/[^\s)"<>]+/g,text=>{try{const url=new URL(text);return url.origin+url.pathname;}catch{return '[地址]';}});}
// 拒绝循环、深层对象和敏感字段；不调用游戏实体的序列化方法。
export function diagnosticValue(value,depth=0,seen=new WeakSet(),budget={left:2000}){
 if(--budget.left<0)return '[数量截断]';
 if(value===null||value===undefined)return null;
 if(typeof value==='string')return safeText(value);
 if(typeof value==='number')return Number.isFinite(value)?Math.round(value*100)/100:null;
 if(typeof value==='boolean')return value;
 if(typeof value!=='object')return '['+typeof value+']';
 if(seen.has(value))return '[循环引用]';
 if(depth>=6)return '[深度截断]';
 seen.add(value);
 if(value instanceof Error)return {name:value.name,message:safeText(value.message),stack:safeText(value.stack||'')};
 if(Array.isArray(value))return value.slice(0,64).map(item=>diagnosticValue(item,depth+1,seen,budget));
 const result=Object.create(null);
 for(const key of Object.keys(value).slice(0,64)){
  if(budget.left<=0){result.truncated=true;break;}
  if(/password|token|secret|cookie|authorization|email/i.test(key)){result[key]='[已隐藏]';continue;}
  try{const property=Object.getOwnPropertyDescriptor(value,key);result[key]=property&&'value' in property?diagnosticValue(property.value,depth+1,seen,budget):'[访问器]';}catch{result[key]='[不可读取]';}
 }
 return result;
}

// 环形容量同时限制条数与字符数，连续射击或长时间游玩不会无限占用内存。
export class GameplayLog{
 constructor({now=()=>performance.now(),date=()=>new Date().toISOString(),limits={}}={}){
  this.now=now;this.date=date;this.limits={...GAMEPLAY_LOG_LIMITS,...limits};this.startedAt=date();this.start=now();
  this.sessionId=this.startedAt+'-'+Math.random().toString(36).slice(2,9);this.entries=[];this.chars=0;this.dropped=0;this.sequence=0;this.state={};
 }
 // 在记录时复制数据，后续游戏变更不能改写已经发生的事件。
 record(kind,name,data=null){
  try{
   let clean=diagnosticValue(data),encoded=JSON.stringify(clean);
   if(encoded.length>this.limits.eventChars)clean={truncated:true,originalChars:encoded.length,preview:encoded.slice(0,1000)};
   const entry={seq:++this.sequence,at:this.date(),elapsedMs:Math.round(this.now()-this.start),kind,name:safeText(String(name)).slice(0,100),data:clean};
   const size=JSON.stringify(entry).length;
   if(size>this.limits.chars){this.dropped++;return;}
   this.entries.push({entry,size});this.chars+=size;
   while(this.entries.length>this.limits.entries||this.chars>this.limits.chars){this.chars-=this.entries.shift().size;this.dropped++;}
  }catch{this.dropped++;}
 }
 // 每个玩法单独比较；静止不重复刷屏，移动车辆也不会重复保存全部任务表。
 capture(state,reason='sample'){
  const next=diagnosticValue(state),changes={};
  for(const key of Object.keys(next))if(JSON.stringify(next[key])!==JSON.stringify(this.state[key]))changes[key]=next[key];
  this.state=next;if(Object.keys(changes).length)this.record('state',reason,{changes});
 }
 // 导出最新状态和完整时间顺序，明确标注覆盖数量，避免误认为是全程录像。
 report(){return {schemaVersion:GAMEPLAY_LOG_VERSION,sessionId:this.sessionId,startedAt:this.startedAt,exportedAt:this.date(),limits:{...this.limits},dropped:this.dropped,latestState:diagnosticValue(this.state),entries:this.entries.map(item=>structuredClone(item.entry))};}
 // 只清除诊断数据，序号继续递增以区分主动清除与新会话。
 clear(){this.entries=[];this.chars=0;this.dropped=0;this.state={};this.record('session','log-cleared');}
}
