// 普通场景与守护默认使用同一基础倍率；守护保留手动全景与缩放。
import { cameraOffsetLimits } from './view-safety.js';
import {nearest} from '../world/coordinates.js';
import { clamp } from '../core/math.js';
import { CAMERA_VIEW, HORDE_CAMERA, DEFAULT_CAMERA_Y, defaultCombatZoom, BOARDING_CAMERA } from '../config/camera.js';

// 沿稳定观察方向分配前后空间，不追随自动瞄准的瞬时枪口角度。
function hordeOffset(angle, width, height, zoom) {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const span = Math.min(width / Math.max(Math.abs(dx), 1e-9), height / Math.max(Math.abs(dy), 1e-9));
  const distance = (HORDE_CAMERA.frontRatio - .5) * span / zoom;
  return { x: dx * distance, y: dy * distance };
}

// 未指定档位使用普通战斗倍率跟随角色；零档仍手动查看完整战场。
export function battlefieldView(player, width, height, arena, step = null) {
  const cfg = CAMERA_VIEW, radius = arena?.radius || cfg.forestRadius;
  const top = Math.min(cfg.top, height * .22), bottom = Math.min(cfg.bottom, height * .3);
  const usableHeight = Math.max(1, height - top - bottom);
  const span = Math.min(Math.max(1, width - cfg.side * 2), usableHeight);
  const fit = span / (radius * 2 + 80);
  // 放大三成作为目标；默认最多拉近到完整边界，取消额外外围空白并留两像素防裁切。
  const defaultZoom = (width < 500 ? .85 : 1.05) / cfg.guardianDefaultSpan;
  const overview = Math.max(.01, Math.min(defaultZoom, fit * cfg.guardianScale, Math.max(1, span - 2) / (radius * 2)));
  const defaultStep = Math.log(defaultZoom / overview) / Math.log(cfg.ratio);
  const zoomStep = step === null ? defaultStep : clamp(step, 0, cfg.steps);
  const zoom = step === null ? defaultZoom : Math.min(cfg.maxZoom, overview * cfg.ratio ** zoomStep);
  // 告知触摸控制器实际倍率上限，宽屏封顶后反向缩小不产生空拖区间。
  const maxZoomStep = clamp(Math.log(cfg.maxZoom / overview) / Math.log(cfg.ratio), 0, cfg.steps);
  // 从默认倍率开始捏合时保持角色中心，不因切换到手动模式突然跳回祭坛。
  const follow = step === null ? 1 : Math.min(1, zoomStep / Math.max(.001, defaultStep)), center = arena || player;
  const x = center.x + (player.x - center.x) * follow;
  const y = center.y + (player.y - center.y) * follow;
  return { x: x - width / zoom / 2, y: y - (top + usableHeight / 2) / zoom,
    w: width / zoom, h: height / zoom, width, height, zoom, zoomStep, maxZoomStep };
}

export class CombatCamera {
  // 镜头仅保存视觉偏移，不影响目标锁定、角色位置或子弹方向。
  constructor() {
    this.x = 0;
    this.y = 30;
    this.time = null;
    this.width = 0;
    this.height = 0;
    this.zoomStep = 0;
    this.guardianDefault = true;
    this.guardianSession = null;
    this.hordeTransition = false;
    this.hordeActive = false;
    this.hordeAngle = null;
    this.hordeCandidate = null;
    this.hordeCandidateTime = 0;
    this.hordeSession = null;
    this.boardingAnchor = null;
  }
  // 行进意图确认后才调整观察方向；原 vx/vy 由移动输入驱动，受击和后坐使用独立分量。
  updateHordeHeading(player, session, dt, entered) {
    if (entered || this.hordeSession !== session || this.hordeAngle === null) {
      const gate = session?.gate;
      this.hordeAngle = gate && Math.hypot(gate.nx, gate.ny) > 0
        ? Math.atan2(gate.ny, gate.nx) : Number.isFinite(player.angle) ? player.angle : -Math.PI / 2;
      this.hordeSession = session;
      this.hordeCandidate = null;
      this.hordeCandidateTime = 0;
    }
    if (dt <= 0) return this.hordeAngle;
    const vx = player.vx || 0, vy = player.vy || 0;
    const angle = Math.atan2(vy, vx);
    const delta = Math.atan2(Math.sin(angle - this.hordeAngle), Math.cos(angle - this.hordeAngle));
    if (Math.hypot(vx, vy) < HORDE_CAMERA.movementSpeed || Math.abs(delta) < HORDE_CAMERA.directionDeadzone) {
      this.hordeCandidate = null;
      this.hordeCandidateTime = 0;
      return this.hordeAngle;
    }
    const candidateDelta = this.hordeCandidate === null ? Infinity
      : Math.abs(Math.atan2(Math.sin(angle - this.hordeCandidate), Math.cos(angle - this.hordeCandidate)));
    if (candidateDelta > HORDE_CAMERA.directionTolerance) {
      this.hordeCandidate = angle;
      this.hordeCandidateTime = 0;
    }
    this.hordeCandidateTime += dt;
    if (this.hordeCandidateTime + 1e-9 >= HORDE_CAMERA.directionHold) {
      this.hordeAngle = angle;
      this.hordeCandidate = null;
      this.hordeCandidateTime = 0;
    }
    return this.hordeAngle;
  }
  // 按钮、滑条和双指共用有界倍率，保留小数以连续缩放画面。
  setZoomStep(step) {
    this.guardianDefault = false;
    this.zoomStep = Number.isFinite(step) ? clamp(step, 0, CAMERA_VIEW.steps) : 0;
    return this.zoomStep;
  }
  // 守护女神单独取景；普通场景及独立预览共用原版武器镜头与稳定射线校验。
  update(player, width, height, guide = null, time = 0, reduced = false, framing = null) {
    // 浮游炮恢复普通跟随；自动炮体选敌不改变视野与观察中心。
    if(guide?.kind==='funnel')guide=null;
    // 跑步与肉鸽远征使用默认战斗镜头，不随携带或抽取的武器切换广角与注视点。
    if(framing?.mode==='race'||framing?.mode==='rogue')guide=null;
    // 团山独占终场构图。固定倍率为冠顶、跃砸和顶栏留白，镜头随脚底移动，爆散时沿用同一锚点。
    const giant=framing?.horde?.spoils||framing?.giant;
    if(giant){
      const anchor=nearest(giant,player);
      const top=Math.min(172,height*.30), bottom=Math.min(62,height*.12);
      const zoom=Math.min(defaultCombatZoom(width),(width-20)/456,(height-top-bottom)/565);
      const w=width/zoom,h=height/zoom;
      const left=Math.min(anchor.x-182,player.x-55),right=Math.max(anchor.x+182,player.x+55);
      const high=Math.min(anchor.y-420,player.y-85),low=Math.max(anchor.y+68,player.y+42);
      const x=clamp((left+right-w)/2,player.x-w+55,player.x-55);
      const y=clamp((high+low-h-(top-bottom)/zoom)/2,player.y-h+bottom/zoom+42,player.y-top/zoom-65);
      return {x,y,w,h,width,height,zoom};
    }
    // 球场始终同屏，上方目标区与下方走位区不随自动瞄准来回晃动。
    if(framing?.mode==='football'){
      this.hordeTransition = false;
      this.hordeActive = false;
      this.time=null;const zoom=Math.min((width-16)/640,Math.max(180,height-280)/650,1),a=framing.arena;
      return {x:a.x-width/zoom/2,y:a.y-(140+(height-280)/2)/zoom,w:width/zoom,h:height/zoom,width,height,zoom,zoomStep:0,maxZoomStep:0};
    }
    if (framing?.mode === 'guardian') {
      this.hordeTransition = false;
      this.hordeActive = false;
      // 每次进入新防守局恢复默认；同局换波、打开面板和暂停不覆盖手动倍率。
      if (framing.session && framing.session !== this.guardianSession) {
        this.guardianSession = framing.session;
        this.guardianDefault = true;
      }
      // 守护期间清除普通镜头的跟随时钟，离开时按新场景重建正常视角。
      this.time = null;
      const view = battlefieldView(player, width, height, framing.arena, this.guardianDefault ? null : this.zoomStep);
      this.zoomStep = view.zoomStep;
      return view;
    }
    // 普通场景不能继承守护女神的缩放，也不再经过全景适配公式。
    this.zoomStep = 0;
    this.guardianDefault = true;
    this.guardianSession = null;
    const sniper = guide?.kind === 'sniper' || guide?.kind === 'drone';
    // 狙击保持约四成广角，脉冲以原始倍率换算为宽高增加两成，均不随目标变化。
    const baseZoom = defaultCombatZoom(width);
    const zoom = sniper
      ? width < 500
        ? 0.6
        : 0.75
      : guide?.kind === 'pulse'
        ? baseZoom / 1.2
        : baseZoom;
    // 仅接受存活战斗目标的注视点；树木、空目标及死亡残留统一回到角色跟随。
    const target = guide?.target;
    const focus =
      !sniper && (target?.type === 'enemy' || target?.type === 'boss') && target.hp > 0
        ? guide.focus
        : null;
    const limits = cameraOffsetLimits(width, height, zoom);
    const horde = Boolean(framing?.horde);
    const hordeChanged = horde !== this.hordeActive;
    const dt = this.time === null ? 0 : Math.max(0, Math.min(0.1, time - this.time));
    this.hordeActive = horde;
    if (horde) this.hordeTransition = true;
    const offset = horde ? hordeOffset(this.updateHordeHeading(player, framing.horde, dt, hordeChanged), width, height, zoom) : null;
    const x = clamp(offset ? offset.x : focus ? (focus.x - player.x) / 2 : 0, limits.minX, limits.maxX);
    const y = clamp(
      offset ? offset.y : focus ? (focus.y - player.y) / 2 : guide?.kind === 'drone' ? 0 : DEFAULT_CAMERA_Y,
      limits.minY,
      limits.maxY,
    );
    const snap =
      (!this.hordeTransition && (sniper || reduced)) ||
      this.time === null ||
      // 怪潮进入会重建时钟，退出会恢复森林旧时钟；这两种情况保留偏移再缓动。
      (time < this.time && !hordeChanged) ||
      this.width !== width ||
      this.height !== height;
    // 怪潮转向及退出都缓动；减少动态模式也避免瞬切，不附加摇晃或缩放。
    const blend = 1 - Math.exp(-(this.hordeTransition ? HORDE_CAMERA.response : 3) * dt),
      limit = ((this.hordeTransition ? HORDE_CAMERA.pixelsPerSecond : 120) * dt) / zoom;
    this.x = snap ? x : this.x + Math.max(-limit, Math.min(limit, (x - this.x) * blend));
    this.y = snap ? y : this.y + Math.max(-limit, Math.min(limit, (y - this.y) * blend));
    // 缓动过程也执行硬限制，覆盖反冲、切目标、重置时间和窗口变窄的首帧。
    this.x = clamp(this.x, limits.minX, limits.maxX);
    this.y = clamp(this.y, limits.minY, limits.maxY);
    if (!horde && Math.hypot(this.x - x, this.y - y) * zoom < .5) this.hordeTransition = false;
    this.time = time;
    this.width = width;
    this.height = height;
    // 登乘时脚底会移到车位；独立缓动世界锚点，兼容渲染插值，避免抵消后又跳回。
    let anchor=player;
    if(this.boardingAnchor){
      const a=this.boardingAnchor,target=nearest(a.body||player,player),seat=a.to||target,from=nearest(a,seat),distance=Math.hypot(from.x-seat.x,from.y-seat.y);
      if(distance>BOARDING_CAMERA.maxDistance){this.boardingAnchor=null;}
      else{
        // 只消退登乘产生的位移，正常驾驶实时跟随，不在过渡末尾追赶整段车程。
        a.elapsed+=dt;const remaining=Math.max(0,1-a.elapsed/BOARDING_CAMERA.seconds);
        anchor={x:target.x+(from.x-seat.x)*remaining,y:target.y+(from.y-seat.y)*remaining};
        if(a.elapsed>=BOARDING_CAMERA.seconds)this.boardingAnchor=null;
      }
    }
    return {
      x: anchor.x + this.x - width / zoom / 2,
      y: anchor.y + this.y - height / zoom / 2,
      w: width / zoom,
      h: height / zoom,
      width,
      height,
      zoom,
    };
  }
}
