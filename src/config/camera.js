// 镜头倍率与全景留白统一配置，缩放仅改变画布投影，不拉伸角色素材。
export const DEFAULT_CAMERA_Y=30;
// 同场景登乘的取景衔接只平滑座位位移，超出范围视为真正的场景跳转。
export const BOARDING_CAMERA=Object.freeze({seconds:.6,maxDistance:180});
// 普通战斗镜头和浮游炮飞行边界共用倍率，避免换枪后炮体仍按旧广角出屏。
export function defaultCombatZoom(width){return width<500?.85:1.05;}
// 七档覆盖窄横屏从全景到普通倍率的跨度，默认转双指缩放时不撞到旧六档上限。
export const CAMERA_VIEW = Object.freeze({ steps: 7, ratio: 1.35, forestRadius: 620,
  side: 24, top: 140, bottom: 200, maxZoom: 1.25, guardianScale: 1.3, guardianDefaultSpan: 1 });

// 怪潮前场占七成；响应速度按秒计算，屏幕限速避免快速反向时猛甩镜头。
export const HORDE_CAMERA = Object.freeze({ frontRatio: .7, response: 2, pixelsPerSecond: 300,
  // 主动移动方向稳定后才换构图，排除摇杆微动、短促闪避与自动瞄准抖动。
  movementSpeed: 18, directionHold: .45, directionDeadzone: Math.PI / 6, directionTolerance: Math.PI / 12 });
