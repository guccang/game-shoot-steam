// 手机设置只提交显示偏好，风格切换不调用存档重载或战斗初始化。
import {ART_STYLES,artStyle,onArtStyleChange} from '../art-styles/state.js';
import {switchArtStyle} from '../art-styles/controller.js';
import {createEventScope} from '../platform/events.js';
// 沿用设置底板、原生按钮和暂停管理，异步载入期间防止重复切换。
export function createArtStyleControl(root,onChange){
 const scope=createEventScope(),group=root.getElementById('art-style-options'),hint=root.getElementById('art-style-hint');
 const buttons=ART_STYLES.map(style=>{const button=root.createElement('button');button.type='button';button.className='ui-button';button.dataset.artStyle=style.id;button.textContent=style.name;group.append(button);return button;});
 // 按钮状态直接反映正式绘制器选择，失败时不会显示未应用的风格。
 function sync(){for(const button of buttons){const selected=button.dataset.artStyle===artStyle();button.setAttribute('aria-pressed',String(selected));button.classList.toggle('ui-button--primary',selected);}}
 sync();const unsubscribe=onArtStyleChange(()=>{sync();onChange();});
 for(const button of buttons)scope.on(button,'click',async()=>{
  if(button.dataset.artStyle===artStyle())return;
  for(const item of buttons)item.disabled=true;hint.textContent='正在切换画面…';group.setAttribute('aria-busy','true');
  try{const result=await switchArtStyle(button.dataset.artStyle);hint.textContent=result.saved?'已切换，下次打开沿用此风格。':'已切换，本次无法保存显示偏好。';}
  catch(error){hint.textContent='切换失败，已保留当前风格。'+error.message;}
  finally{for(const item of buttons)item.disabled=false;group.removeAttribute('aria-busy');sync();}
 });
 // 设置卸载清除监听与动态按钮，避免重复装配。
 function dispose(){unsubscribe();scope.dispose();buttons.forEach(button=>button.remove());}
 return {dispose};
}
