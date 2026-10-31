// 剧情镜头保留已有构图，只为越出安全区的说话者和气泡做最小平移。
import { clamp } from '../core/math.js';

// 求能容纳所有头部锚点的最近镜头原点；画面装不下时优先当前说话者。
function fitAxis(origin, points, current, low, high, zoom) {
  const min=Math.max(...points.map(p=>p-high/zoom));
  const max=Math.min(...points.map(p=>p-low/zoom));
  return min<=max?clamp(origin,min,max):clamp(origin,current-high/zoom,current-low/zoom);
}

export class StoryCamera {
  // 保留上一帧画面、DOM量测与会话身份引用，不修改人物、剧情或战斗状态。
  constructor(){this.view=null;this.time=null;this.active=false;this.returning=false;this.layout=null;this.scene=null;}

  // 场景切换丢弃旧画面，防止从另一张地图或秘境平移回来。
  reset(){this.view=null;this.time=null;this.active=false;this.returning=false;this.layout=null;this.scene=null;}

  // 表现时钟独立于暂停中的战斗时钟；每帧位移有上限，后台返回不补跑。
  update(normal, speech, time, reduced=false, scene=null) {
    // 同一地图也能进入另一章节会话；先采用新场景视角，不能从森林旧构图缓动过去。
    if(this.scene!==scene){this.reset();this.scene=scene;}
    // 战斗圈只约束世界中的移动，不改变地图原有的倍率与角色跟随。
    const dt=this.time===null?0:clamp(time-this.time,0,.05);this.time=time;
    if(this.active&&!speech)this.returning=true;
    this.active=!!speech;
    if(!speech&&!this.returning){this.view={...normal};return this.view;}
    let view=this.view?{...this.view}:{...normal};
    if(view.width!==normal.width||view.height!==normal.height){
      // 调整窗口保留画面中心，用新的正常倍率重新计算可见范围。
      const w=normal.width/normal.zoom,h=normal.height/normal.zoom;
      view={...normal,x:view.x+(view.w-w)/2,y:view.y+(view.h-h)/2};
    }
    let target={...normal};
    if(speech){
      target={...view};
      const layout=this.layout;
      // 初次显示先沿用原画面，DOM完成当前整段对白的量测后再校正。
      if(layout?.key===speech.conversationKey){
        const speakers=speech.speakers,head=speech.anchor.y-speech.head;
        const top=layout.top+layout.height+14,bottom=Math.max(top,view.height-64);
        // 大型剧情人物可在表内声明身体半宽；未声明的旧人物保留原有镜头构图。
        const edges=speakers.flatMap(p=>[p.anchor.x-(p.halfWidth||0),p.anchor.x+(p.halfWidth||0)]);
        target.x=fitAxis(view.x,edges,speech.anchor.x,32,Math.max(32,view.width-32),view.zoom);
        target.y=fitAxis(view.y,speakers.map(p=>p.anchor.y-p.head),head,top,bottom,view.zoom);
      }
    }else if(Math.hypot(normal.x-view.x,normal.y-view.y)>Math.max(normal.w,normal.h)*1.5){
      // 返回森林时若恢复了远处位置，沿用场景切换，避免跨地图长距离飞行。
      this.returning=false;this.view={...normal};return this.view;
    }
    const dx=target.x-view.x,dy=target.y-view.y,distance=Math.hypot(dx,dy);
    const blend=reduced?1:Math.min(1,1-Math.exp(-10*dt),distance?240*dt/view.zoom/distance:1);
    const settled=distance*view.zoom<.2&&Math.abs(target.zoom-view.zoom)<.001;
    if(reduced||settled){view=target;if(!speech)this.returning=false;}
    else{
      view.x+=dx*blend;view.y+=dy*blend;view.zoom+=(target.zoom-view.zoom)*blend;
      view.w=view.width/view.zoom;view.h=view.height/view.zoom;
    }
    this.view=view;return view;
  }
}
