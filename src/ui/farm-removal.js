// 地块移除使用统一确认底板；取消不提交，确认后走近并在动作命中时保存。
import {createEventScope} from '../platform/events.js';
import {FARM_CROPS} from '../config/farm.js';
import {queueFarmWork,setFarmTool} from '../core/farming/farm.js';
export function createFarmRemoval({game,root,dialogs,onChange,onNotice}){
 const scope=createEventScope(),dialog=root.createElement('dialog');let selected=null,confirmed=false;
 dialog.id='farm-remove-dialog';dialog.className='ui-panel ui-panel--compact';dialog.setAttribute('aria-labelledby','farm-remove-title');
 dialog.innerHTML='<header class="ui-panel__header"><h2 id="farm-remove-title">移除地块？</h2><button id="farm-remove-close" class="ui-close" aria-label="取消移除">×</button></header><div class="ui-panel__body"><p id="farm-remove-description"></p></div><footer class="ui-panel__footer"><button id="farm-remove-cancel" class="ui-button">保留地块</button><button id="farm-remove-confirm" class="ui-button ui-button--danger">移除地块</button></footer>';
 root.body.append(dialog);dialogs.register(dialog.id,{focusId:'farm-remove-cancel'});
 // 确认对象按永久编号、地图与播种时间固定，避免关闭面板后作用到另一茬。
 function open(plot){selected={id:plot.id,mapId:plot.mapId,crop:plot.crop,plantedAt:plot.plantedAt};confirmed=false;
  root.getElementById('farm-remove-description').textContent=plot.crop===null?'将这块空田恢复为原地面，之后可以重新开垦。':`地里的${FARM_CROPS[plot.crop].name}也会一起清除，种子不返还，也不会获得收成。`;
  dialogs.open(dialog.id);
 }
 for(const id of ['farm-remove-close','farm-remove-cancel'])scope.on(root.getElementById(id),'click',()=>dialogs.close(dialog.id));
 scope.on(root.getElementById('farm-remove-confirm'),'click',()=>{confirmed=true;dialogs.close(dialog.id);});
 // 等统一弹窗管理器恢复游玩后再排队，暂停态不能偷偷移除田块。
 scope.on(dialog,'close',()=>{const target=selected;selected=null;if(!confirmed||!target)return;confirmed=false;
  if(game.mapId!==target.mapId){onNotice?.('位置已变化，请重新选择地块');return;}
  setFarmTool(game,'remove');const result=queueFarmWork(game,'remove',{plot:target.id,removal:{crop:target.crop,plantedAt:target.plantedAt}});onNotice?.(result.message);onChange();
 });
 // 随主场景销毁监听和对话框，不留下旧目标或可提交按钮。
 function dispose(){confirmed=false;selected=null;scope.dispose();dialog.remove();}
 return {open,dispose};
}
