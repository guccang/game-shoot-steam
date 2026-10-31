// 猫窝通过正式世界队列绘制，光照、镜像与深度沿用场景规则。
import {CAT_HOME} from '../config/cat-home.js';
import {drawBuildingArchitecture} from './building-architecture.js';
// 独立场景与室内不重复显示森林建筑。
export function catHomeObjects(game){return game.mapId==='forest'&&!game.cottage&&!game.realm&&!game.story?[{...CAT_HOME,type:'cat-home'}]:[];}
// 底座与墙体配置保持一致，不单独缩放门口或入口热点。
export function drawCatHome(c,item,night=0,winter=false){c.save();c.translate(item.x,item.y);drawBuildingArchitecture(c,'cat-home',winter,night);c.restore();}
