import {createHomeConstruction} from './home-construction.js';
import {HOME_DIRECTIONS,homeFloors} from '../config/home-construction.js';
import {catLoad} from '../progression/load-weight.js';
import {createCottageStorage} from './cottage-storage.js';
import {createCatHome} from './cat-home.js';
import {createShopkeeperInteraction} from './shopkeeper-interaction.js';
// 小屋操作层只处理室内服务；停驻载具由正式移动时钟自动上车。
import {createHomeDecor} from './home-decor.js';
import {createRoomExit} from './room-exit.js';
import {interiorLayout} from '../config/workshop-interiors.js';
import {createEventScope} from '../platform/events.js';
import {COTTAGE} from '../config/cottage.js';
import {calendarView} from '../world/living-calendar.js';

// 热点只有靠近车辆时出现，不遮住建筑，也不让远处点击传送上车。
export function createCampHome({game,renderer,root,input,onChange,openWorkshop,dialogs,onDecorChange,onCharacter,onTalk}){
 const scope=createEventScope(),frame=root.getElementById('game-frame'),panel=root.createElement('section');
 panel.id='cottage-controls';panel.hidden=true;panel.innerHTML='<header><b>巡林小屋</b><small id="cottage-date"></small></header><footer><p id="cottage-notice" role="status"></p><div><button id="cottage-character" class="ui-button">当前猫猫</button></div></footer>';
 frame.append(panel);
 const roomExit=createRoomExit({game,renderer,root,panel,input,onChange});
 const catHome=createCatHome({game,root,dialogs,input,onChange:onDecorChange});
 const storage=createCottageStorage({game,renderer,root,panel,dialogs,input,onChange:onDecorChange});
 const homeDecor=createHomeDecor({game,root,panel,dialogs,input,onChange:onDecorChange});
 const construction=createHomeConstruction({game,root,panel,dialogs,input,onChange:onDecorChange});
 const shopkeeper=createShopkeeperInteraction({game,renderer,root,panel,input,openService,onTalk});
 // 室内入口不依赖移动或接近售货员，超载时也能整理随身物品。
 scope.on(panel.querySelector('#cottage-character'),'click',()=>{input.reset();onCharacter();});
 // 售货员与家具都保留短按，柜台前固定步长候停继续自动打开服务。
 function tap(e){if(game.cottage){if(!shopkeeper.tap(e))storage.tap(e);return true;}return false;}
 // 猫窝与家具服务也沿用统一候停，其他房间交给原应用服务路由。
 function openService(kind,index){if(kind==='construction')construction.open('build');else if(kind==='cat-home')catHome.open();else if(kind==='furniture')homeDecor.open();else openWorkshop(kind,index);}
 // 世界热点和室内面板都从当前记录投影，不积累离场车辆或重复DOM。
 function render(){
  const room=game.cottage;frame.classList.toggle('inside-cottage',!!room);panel.hidden=!room;storage.render();roomExit.render();homeDecor.render();catHome.render();construction.render();shopkeeper.render();
  panel.dataset.room=room?.kind||'cottage';panel.dataset.balcony=String(!!room?.balcony);panel.querySelector('header b').textContent=interiorLayout(room).name;
  if(room){
   const overloaded=catLoad(game).overloaded,unavailable=!!room.sleep||!['playing','paused'].includes(game.state);
   panel.querySelector('#cottage-character').disabled=unavailable;
   panel.querySelector('#cottage-date').textContent=calendarView(game.progress.living.calendar).label;
   const home=!room.kind||room.kind==='cottage';
   const near=home&&!room.floor&&Math.hypot(game.player.x-COTTAGE.bed.x,game.player.y-COTTAGE.bed.y)<=COTTAGE.bedRadius;
   const notice=panel.querySelector('#cottage-notice');
   // 睡醒结果保留在屋内底部，独立纸色底板让回血和保存失败信息都清楚可读。
   notice.dataset.result=String(home&&!!room.restResult&&!room.sleep&&!room.exitElapsed);
   notice.textContent=(room.stairsElapsed!=null?'楼梯前站定 1 秒'+(room.floor+1>=homeFloors(game.progress.homeDecor)?'下楼':'上楼')+' · 移开可取消':room.stairsLatch?'已到'+('第 '+((room.floor||0)+1)+' 楼')+'，移开楼梯后可再次上下楼。':room.storageNotice)|| (room.sleep?room.notice:room.exitElapsed>0?'即将出门 · 移开可取消':!home?'点击售货员，或在柜台前站定 1 秒打开服务；门口站定 1 秒出门。':room.restResult?room.restResult:near?'床前站定 1 秒自动睡到明早，恢复全部生命；移开可取消。':room.floor?'本层可布置家具；靠近楼梯或电梯后，点击「楼层通行」选择目的楼层。':'床边可休息。装扮小屋摆放家具；右侧楼梯前站定 1 秒上楼。');
   if(room.balcony)notice.textContent=`第 ${room.floor+1} 楼${HOME_DIRECTIONS[room.balcony].name}侧阳台 · 栏杆内可自由走动；回到下方门垫站定 1 秒返回。`;
   else if(room.balconyElapsed>0)notice.textContent='阳台门前站定 1 秒走出 · 移开可取消';
   if(overloaded&&!room.sleep){notice.dataset.result='true';notice.textContent='背包载荷已满，只能缓慢行走。可到仓库存放物品，或打开「当前猫猫」→「整理背包」，减重后恢复正常速度。';}
  }

 }
 // 卸载清理动态热点，返回首页不能遗留室内样式。
 function dispose(){construction.dispose();shopkeeper.dispose();storage.dispose();catHome.dispose();homeDecor.dispose();roomExit.dispose();scope.dispose();renderer.interiorArt=null;panel.remove();frame.classList.remove('inside-cottage');}
 return {tap,render,dispose,openService,openHomeDecor:homeDecor.open};
}
