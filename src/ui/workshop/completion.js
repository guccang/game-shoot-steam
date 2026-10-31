// 完成表现会话仅在保存成功后启动，复用施工层并随选择切换释放。
import { drawWorkshopCompletion } from '../../rendering/workshop-completion.js';

// 外部传入已提交结果；动画只更新画面，不调用交易接口。
export function createWorkshopCompletion({root,reduced}) {
  const host=root.defaultView,$=id=>root.getElementById(id),canvas=$('ws-construction'),c=canvas.getContext('2d'),bench=$('ws-bench');
  let data=null,frame=0,elapsed=1.2,last=0;
  // 使用实时热点坐标，窗口改变或滚动后仍围住同一个零件。
  function paint() {
    if(!data)return;
    const b=canvas.getBoundingClientRect(),s=$('ws-socket').getBoundingClientRect(),x=s.left+s.width/2-b.left,y=s.top+s.height/2-b.top;
    const points=[{x,y,width:data.width,height:data.height,flipX:x>b.width-70?-1:1,flipY:y>b.height-60?-1:1}];
    if(data.paired)points.push({...points[0],x:b.width-x});
    c.resetTransform();c.clearRect(0,0,canvas.width,canvas.height);c.save();c.scale(canvas.width/b.width,canvas.height/b.height);
    try {drawWorkshopCompletion(c,points,data.tool,elapsed,reduced());} finally {c.restore();}
    bench.dataset.completionPhase=elapsed<.35&&!reduced()?'retract':elapsed<1.15&&!reduced()?'focus':'settled';
  }
  // 取消只有本会话拥有的画面，不抹掉新一轮拆装或施工。
  function cancel() {
    host.cancelAnimationFrame(frame);frame=0;last=0;elapsed=1.2;
    if(data){c.resetTransform();c.clearRect(0,0,canvas.width,canvas.height);}
    data=null;bench.dataset.completed='false';delete bench.dataset.completionPhase;
  }
  // 普通重绘保留进度；查看旧外观或新目标立即终止上一次反馈。
  function show(next) {
    if(!next){cancel();return;}
    if(data?.plan!==next.plan){cancel();elapsed=1.2;}
    data=next;bench.dataset.completed='true';paint();
  }
  // 独立表现时钟在嵌套窗口及后台冻结，收拢后停帧保留静态描边。
  function tick(now) {
    const dt=last?Math.min(.05,(now-last)/1000):0;last=now;
    if(!root.hidden&&!root.querySelector('dialog[open]:not(#workshop-dialog)'))elapsed+=dt;
    paint();
    if(data&&elapsed<1.2)frame=host.requestAnimationFrame(tick);else frame=0;
  }
  // 成功提交后先收回工具，再突出新部件；减少动态不额外等待。
  function start() {
    if(!data)return;host.cancelAnimationFrame(frame);elapsed=reduced()?1.2:0;last=0;paint();
    if(!reduced())frame=host.requestAnimationFrame(tick);
  }
  return {show,start,cancel};
}
