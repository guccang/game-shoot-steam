// 明确查询参数开启的美术试玩：使用内存存档，所有移动、射击和界面仍走正式应用。
import {freshProgress} from '../progression/progress.js';
import {grantVehicleArmament} from '../config/vehicle-armaments.js';
import {MAINLINE_IDS} from '../config/mainline.js';
import {TOWN_RESTORATIONS} from '../config/town-restoration.js';
import {STORAGE_KEYS,WORLD_SAVE_REVISION} from '../platform/storage.js';

// 独立内存Storage避免试玩自动保存覆盖已有进度；刷新从同一营地开始。
export function createArtPreviewStorage(){
 const progress=freshProgress();progress.arrival={version:2,phase:'complete',keys:true};
 progress.mainline.completed=[...MAINLINE_IDS];progress.mainline.phase='complete';
 progress.restoration.repaired=TOWN_RESTORATIONS.map(item=>item.id);
 progress.living.position={x:1030,y:800};progress.vehicleHulls[0]=1;progress.vehicleIndex=0;grantVehicleArmament(progress,0);
 const values=new Map([[STORAGE_KEYS.worldRevision,WORLD_SAVE_REVISION],[STORAGE_KEYS.progress,JSON.stringify(progress)],
  [STORAGE_KEYS.gameplay,JSON.stringify({pauseOnBlur:false})]]);
 return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
}

// 资源就绪后上车；昼夜使用已有预览开关与顶部时段按钮，不替换主循环。
export async function enterArtPreview(app){
 document.title='松果战车 · 暖色卡通动态试玩';
 app.menu.enter();if(!await app.ready)throw Error('动态试玩资源加载失败');
 const toggle=document.getElementById('living-preview');if(!toggle.checked)toggle.click();
 app.environment.autoTime=false;app.environment.autoWeather=false;
 document.querySelector('button[data-forest-season="summer"]').click();
 document.querySelector('button[data-weather="sun"]').click();
 document.querySelector('button[data-time="day"]').click();
 app.game.summonVehicle();app.refresh();document.activeElement?.blur();
}
