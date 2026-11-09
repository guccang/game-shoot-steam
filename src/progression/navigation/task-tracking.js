// 追踪选择只保存稳定任务身份，不复制阶段、坐标、完成记录或奖励。
import {LIVING_REQUESTS} from '../../config/living-world.js';
import {TOWN_RESTORATIONS} from '../../config/town-restoration.js';
// 旧档无选择时保留自动衔接；非法或已结束委托回退到仍在进行的任务。
export function normalizeTaskTracking(raw,living,restoration){
  if(raw?.kind==='restoration')return TOWN_RESTORATIONS.some(f=>f.id===raw.id)&&!restoration?.repaired.includes(raw.id)?{kind:'restoration',id:raw.id}:null;
  if(raw?.kind==='none')return {kind:'none'};
  if(raw?.kind==='mainline')return {kind:'mainline'};
  const spec=LIVING_REQUESTS.find(q=>q.id===raw?.id),record=spec&&living?.requests[spec.id];
  return raw?.kind==='living'&&record&&!record.completed&&record.stage>=0&&record.stage<spec.steps.length?{kind:'living',id:spec.id}:null;
}
// 显式追踪主线时不被旧委托抢占；兼容旧档按配置顺序选择一个有效请求。
export function trackedLivingId(progress){
  if(['mainline','none','restoration'].includes(progress?.taskTracking?.kind))return null;
  const active=LIVING_REQUESTS.filter(spec=>{const r=progress?.living?.requests[spec.id];return r&&!r.completed&&r.stage>=0&&r.stage<spec.steps.length;});
  return (active.find(q=>q.id===progress?.taskTracking?.id)||active[0])?.id||null;
}
