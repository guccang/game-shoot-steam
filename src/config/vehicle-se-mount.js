// 车尾外置挂架沿屏幕横轴布置，炮塔转向不会改变装置挂点。
import {vehicleFenceFootprint} from './vehicle-fence-footprint.js';
const order=['rocket','protection','combat','shield','autopilot','flare'];
// 按底盘宽度收紧小型载具的槽距，保持每个已安装模块都有独立位置。
export function rearSEMount(player,hull,installed,key){
 const footprint=vehicleFenceFootprint({active:true,index:hull});
 const slots=order.filter(id=>installed.includes(id));
 const pitch=Math.min(20,Math.max(14,footprint.x*.48));
 const index=slots.indexOf(key);
 return {x:player.x+(index-(slots.length-1)/2)*pitch,y:player.y-footprint.y-6,pitch};
}
