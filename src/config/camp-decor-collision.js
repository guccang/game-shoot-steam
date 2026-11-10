// 装饰的真实脚底实体与展示/摆放外框分离，高处横梁、花环和鸟屋不封住下方空隙。
const supports={arch:[[-44,-6,-34,5],[34,-6,44,5]],crackers:[[-28,-5,-20,5],[20,-5,28,5]],birdhouse:[[-5,-5,5,3]],chime:[[-4,-5,4,3]],mailbox:[[-5,-5,5,3]],sign:[[-5,-5,5,3]],knot:[[-4,-5,4,3]],sachet:[[-4,-5,4,3]],wreath:[[-4,-5,4,3]]};
// 矩形相对装饰脚底坐标；实心花盆、桌面和石像仍保留看得见的底座范围。
export function campDecorCollisionRects(definition){if(!definition||definition.passable)return [];return supports[definition.form]||[[-definition.width/2,-definition.depth/2,definition.width/2,definition.depth/2]];}
